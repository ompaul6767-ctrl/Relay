import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/database.js';
import { seedDatabase } from '../scripts/seedHelper.js';
import { DEMO_USERS, signToken } from '../src/middleware/auth.js';
import { Case } from '../src/models/Case.js';
import { Claim } from '../src/models/Claim.js';
import { Audit } from '../src/models/Audit.js';

describe('Improvement 3: Conflict Timeline & Staleness Detection', () => {
  let demoCaseId = '';
  let leadToken = '';
  let devToken = '';

  beforeAll(async () => {
    await connectDB();
    const demoCase = await seedDatabase();
    demoCaseId = String(demoCase._id);
    leadToken = signToken(DEMO_USERS.lead);
    devToken = signToken(DEMO_USERS.incoming_dev);
  }, 30000);

  afterAll(async () => {
    await disconnectDB();
  });

  it('should order timeline events chronologically with derived evidence dates', async () => {
    const res = await request(app)
      .get(`/api/cases/${demoCaseId}/timeline`)
      .set('Authorization', `Bearer ${leadToken}`);

    expect(res.status).toBe(200);
    expect(res.body.events.length).toBeGreaterThan(0);

    const events = res.body.events;

    // Verify chronological order: date[i] <= date[i+1]
    for (let i = 0; i < events.length - 1; i++) {
      const da = new Date(events[i].date).getTime();
      const db = new Date(events[i + 1].date).getTime();
      expect(da).toBeLessThanOrEqual(db);
    }

    // Verify planted dates: Sep 1 2026 decision precedes Oct 20 2026 reversal
    const sepDecision = events.find((e) => (e.title || '').includes('MongoDB Atlas for audit log retention'));
    const octReversal = events.find((e) => (e.title || '').includes('reversed the audit log decision'));

    expect(sepDecision).toBeDefined();
    expect(octReversal).toBeDefined();
    expect(new Date(sepDecision.date).getTime()).toBeLessThan(new Date(octReversal.date).getTime());
  });

  it('should format side-by-side conflict cards with newer source clearly marked', async () => {
    const res = await request(app)
      .get(`/api/cases/${demoCaseId}/timeline`)
      .set('Authorization', `Bearer ${leadToken}`);

    expect(res.status).toBe(200);
    const conflictEvent = res.body.events.find(
      (e) => e.status === 'Conflicting' && e.sideBySide && e.entityKey === 'payment_gateway'
    );

    expect(conflictEvent).toBeDefined();
    expect(conflictEvent.sideBySide.items.length).toBeGreaterThanOrEqual(2);
    expect(conflictEvent.sideBySide.newerIndex).toBeGreaterThanOrEqual(0);

    // Verify each competing item has value, quote, source, date
    const itemA = conflictEvent.sideBySide.items[0];
    const itemB = conflictEvent.sideBySide.items[1];
    expect(itemA.value).toBeDefined();
    expect(itemA.quote).toBeDefined();
    expect(itemB.value).toBeDefined();
    expect(itemB.quote).toBeDefined();
  });

  it('should detect staleness on planted decision reversal (MongoDB Atlas superseded by PostgreSQL)', async () => {
    const claims = await Claim.find({ caseId: demoCaseId }).lean();
    const mongoClaim = claims.find((c) => (c.text || '').includes('MongoDB Atlas for audit log retention'));

    expect(mongoClaim).toBeDefined();
    expect(mongoClaim.isStale).toBe(true);
    expect(mongoClaim.stalenessStatus).toBe('superseded');
    expect(mongoClaim.stalenessReason).toContain('Reversed by later decision');
  });

  it('should block unchanged publishing when approved claims are stale', async () => {
    // Approve the stale MongoDB claim
    const staleClaim = await Claim.findOne({
      caseId: demoCaseId,
      isStale: true,
      stalenessStatus: 'superseded',
    });
    expect(staleClaim).toBeDefined();

    staleClaim.reviewDecision = 'approved';
    staleClaim.dismissedStaleness = undefined;
    await staleClaim.save();

    // Lead attempts to publish version containing stale claim
    const pubRes = await request(app)
      .post(`/api/cases/${demoCaseId}/publish`)
      .set('Authorization', `Bearer ${leadToken}`);

    expect(pubRes.status).toBe(400);
    expect(pubRes.body.error).toBe('Publication blocked: stale claims detected');
    expect(pubRes.body.staleClaims.length).toBeGreaterThan(0);
  });

  it('should allow lead to dismiss staleness with recorded justification and unblock publish', async () => {
    const staleClaim = await Claim.findOne({
      caseId: demoCaseId,
      isStale: true,
      stalenessStatus: 'superseded',
    });
    expect(staleClaim).toBeDefined();

    const justification = 'Audited with campus compliance: maintaining MongoDB cluster during grace period.';

    // Lead dismisses staleness
    const dismissRes = await request(app)
      .post(`/api/cases/${demoCaseId}/claims/${staleClaim._id}/dismiss-staleness`)
      .set('Authorization', `Bearer ${leadToken}`)
      .send({ reason: justification });

    expect(dismissRes.status).toBe(200);
    expect(dismissRes.body.success).toBe(true);
    expect(dismissRes.body.claim.isStale).toBe(false);

    // Verify audit record exists
    const auditLog = await Audit.findOne({
      caseId: demoCaseId,
      action: 'dismiss_staleness',
      targetId: String(staleClaim._id),
    });
    expect(auditLog).toBeDefined();
    expect(auditLog.metadata.reason).toBe(justification);

    // Publication should now succeed
    const pubRes = await request(app)
      .post(`/api/cases/${demoCaseId}/publish`)
      .set('Authorization', `Bearer ${leadToken}`);

    expect(pubRes.status).toBe(200);
    expect(pubRes.body.success).toBe(true);
  });

  it('should enforce strict server-side ACLs on timeline (zero confidential leakage)', async () => {
    const devRes = await request(app)
      .get(`/api/cases/${demoCaseId}/timeline`)
      .set('Authorization', `Bearer ${devToken}`);

    expect(devRes.status).toBe(200);
    const devEvents = devRes.body.events;

    // Zero leads-only text must be present
    for (const evt of devEvents) {
      if (evt.acl === 'leads_only') {
        expect(evt.isRestrictedStub).toBe(true);
        expect(evt.title).not.toContain('AWS Production Hosting Master Billing Account');
        expect(evt.title).not.toContain('Master Billing Account');
      }
    }
  });
});
