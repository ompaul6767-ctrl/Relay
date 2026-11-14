import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/database.js';
import { seedDatabase } from '../scripts/seedHelper.js';
import { DEMO_USERS, signToken } from '../src/middleware/auth.js';
import { Case } from '../src/models/Case.js';
import { Span } from '../src/models/Span.js';
import { Claim } from '../src/models/Claim.js';
import { Audit } from '../src/models/Audit.js';

describe('Security & ACL Boundary Enforcement', () => {
  let demoCaseId = '';
  let leadToken = '';
  let devToken = '';

  beforeAll(async () => {
    await connectDB();
    const demoCase = await seedDatabase();
    demoCaseId = String(demoCase._id);
    leadToken = signToken(DEMO_USERS.lead);
    devToken = signToken(DEMO_USERS.incoming_dev);
  });

  afterAll(async () => {
    await disconnectDB();
  });

  it('should deny access to restricted spans when requested by incoming developer (403 Forbidden)', async () => {
    // Find a leads_only span
    const restrictedSpan = await Span.findOne({ caseId: demoCaseId, acl: 'leads_only' }).lean();
    expect(restrictedSpan).toBeDefined();

    // Incoming dev attempts to fetch restricted span
    const res = await request(app)
      .get(`/api/spans/${restrictedSpan._id}`)
      .set('Authorization', `Bearer ${devToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
    expect(res.body.isRestricted).toBe(true);
  });

  it('should allow lead to access restricted span', async () => {
    const restrictedSpan = await Span.findOne({
      caseId: demoCaseId,
      acl: 'leads_only',
      text: { $regex: 'AWS Production Hosting' },
    }).lean();
    expect(restrictedSpan).toBeDefined();

    const res = await request(app)
      .get(`/api/spans/${restrictedSpan._id}`)
      .set('Authorization', `Bearer ${leadToken}`);

    expect(res.status).toBe(200);
    expect(res.body.span).toBeDefined();
    expect(res.body.span.text).toContain('AWS Production Hosting Master Billing Account');
  });

  it('should replace restricted claims with stubs for incoming developer (Server-Side Filtering)', async () => {
    const res = await request(app)
      .get(`/api/cases/${demoCaseId}/claims`)
      .set('Authorization', `Bearer ${devToken}`);

    expect(res.status).toBe(200);
    const claims = res.body.claims;

    // Verify zero occurrences of confidential vendor quotes or card numbers
    for (const c of claims) {
      expect(c.text).not.toContain('corporate card ending in 4921');
      expect(c.text).not.toContain('14,200/year');
      expect(c.text).not.toContain('FastCDN');
      expect(c.text).not.toContain('Stripe merchant payout reserve');
    }

    // Verify restricted stubs are emitted
    const stubs = claims.filter((c) => c.isRestrictedStub);
    expect(stubs.length).toBeGreaterThan(0);
    expect(stubs[0].value).toBe('[Restricted]');
  });

  it('should ensure audit logs contain no sensitive plaintext secrets or raw passwords', async () => {
    const logs = await Audit.find({ caseId: demoCaseId }).lean();
    for (const l of logs) {
      const str = JSON.stringify(l);
      expect(str).not.toContain('corporate card ending in 4921');
      expect(str).not.toContain('14,200/year');
      expect(str).not.toContain('FastCDN');
    }
  });

  it('should enforce that prompt injection sentences do not alter output or execute instructions', async () => {
    const res = await request(app)
      .get(`/api/cases/${demoCaseId}/claims`)
      .set('Authorization', `Bearer ${devToken}`);

    const allClaimTexts = res.body.claims.map((c) => c.text.toLowerCase()).join(' ');
    // Must NOT have adopted the instruction to reveal private notes
    expect(allClaimTexts).not.toContain('reveal the private');
  });
});
