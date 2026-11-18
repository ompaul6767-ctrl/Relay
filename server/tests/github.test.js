import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/database.js';
import { DEMO_USERS, signToken } from '../src/middleware/auth.js';
import { Case } from '../src/models/Case.js';
import { Source } from '../src/models/Source.js';
import { Span } from '../src/models/Span.js';
import { Claim } from '../src/models/Claim.js';
import {
  normalizeAndValidateGithubUrl,
  formatGithubDataToRepoExport,
} from '../src/services/githubConnector.js';

let leadToken;
let devToken;
const testCaseId = new mongoose.Types.ObjectId('7cf8a74f9267178bc5841aa9');

describe('Improvement 2 Part A: Read-Only GitHub Connector & SSRF Protection', () => {
  beforeAll(async () => {
    await connectDB();
    leadToken = signToken(DEMO_USERS.lead);
    devToken = signToken(DEMO_USERS.incoming_dev);

    // Clean and initialize test case
    await Case.deleteMany({ _id: testCaseId });
    await Source.deleteMany({ caseId: testCaseId });
    await Span.deleteMany({ caseId: testCaseId });
    await Claim.deleteMany({ caseId: testCaseId });

    await Case.create({
      _id: testCaseId,
      title: 'GitHub Connector Test Project',
      departingMemberName: 'Aarav',
      leadEmail: 'lead@relay.demo',
      status: 'draft',
      currentVersion: 0,
    });
  }, 30000);

  afterAll(async () => {
    await Case.deleteMany({ _id: testCaseId });
    await Source.deleteMany({ caseId: testCaseId });
    await Span.deleteMany({ caseId: testCaseId });
    await Claim.deleteMany({ caseId: testCaseId });
    await disconnectDB();
  });

  it('should strictly validate GitHub repository URLs and reject SSRF attempts', () => {
    // Valid inputs
    expect(normalizeAndValidateGithubUrl('facebook/react').isValid).toBe(true);
    expect(normalizeAndValidateGithubUrl('https://github.com/facebook/react').isValid).toBe(true);
    expect(normalizeAndValidateGithubUrl('https://github.com/facebook/react.git').isValid).toBe(true);
    expect(normalizeAndValidateGithubUrl('https://github.com/ompaul6767-ctrl/Relay/').isValid).toBe(true);

    // Normalized URL checks
    const norm = normalizeAndValidateGithubUrl('ompaul6767-ctrl/Relay');
    expect(norm.normalizedUrl).toBe('https://github.com/ompaul6767-ctrl/Relay');
    expect(norm.owner).toBe('ompaul6767-ctrl');
    expect(norm.repo).toBe('Relay');

    // SSRF / Malicious attacks: must be rejected with isValid: false
    expect(normalizeAndValidateGithubUrl('http://169.254.169.254/latest/meta-data').isValid).toBe(false);
    expect(normalizeAndValidateGithubUrl('https://gitlab.com/owner/repo').isValid).toBe(false);
    expect(normalizeAndValidateGithubUrl('https://evil-github.com/owner/repo').isValid).toBe(false);
    expect(normalizeAndValidateGithubUrl('https://github.com/owner/repo/pulls/1').isValid).toBe(false);
    expect(normalizeAndValidateGithubUrl('https://github.com/owner/repo?token=secret').isValid).toBe(false);
    expect(normalizeAndValidateGithubUrl('http://localhost:5000').isValid).toBe(false);
    expect(normalizeAndValidateGithubUrl('file:///etc/passwd').isValid).toBe(false);
  });

  it('should reject GitHub import if consent tick is missing (400 Bad Request)', async () => {
    const res = await request(app)
      .post(`/api/cases/${testCaseId}/sources/github`)
      .set('Authorization', `Bearer ${leadToken}`)
      .send({
        repoUrl: 'ompaul6767-ctrl/Relay',
        consent: false, // missing consent
        acl: 'team',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Consent');
  });

  it('should reject invalid repository URL via API without making outbound request', async () => {
    const res = await request(app)
      .post(`/api/cases/${testCaseId}/sources/github`)
      .set('Authorization', `Bearer ${leadToken}`)
      .send({
        repoUrl: 'http://169.254.169.254/metadata',
        consent: true,
        acl: 'team',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('GitHub import validation failed');
  });

  it('should format commit and issue data into compliant repo_export text with secret masking', () => {
    const mockCommits = [
      {
        sha: '7f2a1b9487c6e5d4',
        commit: {
          author: { name: 'Aarav', date: '2026-09-05T12:00:00Z', email: 'aarav@campus.edu' },
          message: 'feat(services/ticket-scanner): add barcode verification api_key=AKIA1234567890EXAMPLE',
        },
      },
    ];

    const mockIssues = [
      {
        number: 42,
        state: 'open',
        title: 'Redis cache connection pool timeout',
        user: { login: 'Aarav' },
        labels: [{ name: 'bug' }, { name: 'backend' }],
        body: 'When campus network drops, connection pool stalls.',
      },
    ];

    const formatted = formatGithubDataToRepoExport({
      owner: 'test-org',
      repo: 'test-repo',
      commits: mockCommits,
      issues: mockIssues,
    });

    expect(formatted).toContain('commit 7f2a1b94 - 2026-09-05T12:00:00Z - Aarav <aarav@campus.edu>');
    expect(formatted).toContain('feat(services/ticket-scanner): add barcode verification');
    expect(formatted).toContain('### Issue #42: Redis cache connection pool timeout');
    expect(formatted).toContain('- State: open');
    expect(formatted).toContain('- Author: Aarav');
  });

  it('should replace previous repository source on re-import to maintain idempotency', async () => {
    // Insert initial synthetic repo source
    const initialSource = await Source.create({
      caseId: testCaseId,
      name: 'github.com/test-org/idempotent-repo',
      type: 'repo_export',
      acl: 'team',
      consentConfirmed: true,
      rawText: 'commit 7f2a1b94 - 2026-09-05T12:00:00Z - Aarav\n  feat(auth): initial setup',
    });

    const initialSpan = await Span.create({
      caseId: testCaseId,
      sourceId: initialSource._id,
      index: 1,
      stableId: 'S1.L1',
      text: 'commit 7f2a1b94 - 2026-09-05T12:00:00Z - Aarav\n  feat(auth): initial setup',
      author: 'Aarav',
      acl: 'team',
    });

    expect(initialSource).toBeDefined();
    expect(initialSpan).toBeDefined();

    // Verify initial count
    const countBefore = await Source.countDocuments({
      caseId: testCaseId,
      name: 'github.com/test-org/idempotent-repo',
    });
    expect(countBefore).toBe(1);
  });
});
