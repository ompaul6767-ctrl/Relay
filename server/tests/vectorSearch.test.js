import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/database.js';
import { DEMO_USERS, signToken } from '../src/middleware/auth.js';
import { Case } from '../src/models/Case.js';
import { Claim } from '../src/models/Claim.js';
import {
  cosineSimilarity,
  retrieveRelevantClaims,
  answerHandoverQuestion,
} from '../src/services/embeddingService.js';

let leadToken;
let devToken;
const testCaseId = new mongoose.Types.ObjectId('8df8a74f9267178bc5841ab1');

describe('Improvement 2 Part B: Atlas Vector Search & 3-Tier Q&A Retrieval', () => {
  beforeAll(async () => {
    await connectDB();
    leadToken = signToken(DEMO_USERS.lead);
    devToken = signToken(DEMO_USERS.incoming_dev);

    // Clean test case
    await Case.deleteMany({ _id: testCaseId });
    await Claim.deleteMany({ caseId: testCaseId });

    await Case.create({
      _id: testCaseId,
      title: 'Vector Search Test Case',
      departingMemberName: 'Aarav',
      leadEmail: 'lead@relay.demo',
      status: 'published',
      currentVersion: 1,
    });

    // 3. Seed test approved claims with mock embeddings
    // Vector dimensions: 4 for unit testing simplicity
    await Claim.create([
      {
        caseId: testCaseId,
        type: 'fact',
        text: 'PostgreSQL cluster is configured for long term audit log retention.',
        entityKey: 'audit_log_database',
        attribute: 'database',
        value: 'PostgreSQL',
        status: 'Verified',
        reviewDecision: 'approved',
        acl: 'team',
        embedding: [1, 0, 0, 0],
        embeddingModel: 'text-embedding-004',
      },
      {
        caseId: testCaseId,
        type: 'owner',
        text: 'Aarav is the primary owner and maintainer of services/ticket-scanner.',
        entityKey: 'services/ticket-scanner',
        attribute: 'owner',
        value: 'Aarav',
        status: 'Verified',
        reviewDecision: 'approved',
        acl: 'team',
        embedding: [0, 1, 0, 0],
        embeddingModel: 'text-embedding-004',
      },
      {
        caseId: testCaseId,
        type: 'risk',
        text: 'Confidential: Master billing corporate credit card ending in 4921 used for AWS infrastructure.',
        entityKey: 'aws_billing_card',
        attribute: 'credit_card',
        value: '4921',
        status: 'Verified',
        reviewDecision: 'approved',
        acl: 'leads_only', // RESTRICTED
        embedding: [0, 0, 1, 0],
        embeddingModel: 'text-embedding-004',
      },
    ]);
  });

  afterAll(async () => {
    await Case.deleteMany({ _id: testCaseId });
    await Claim.deleteMany({ caseId: testCaseId });
    await disconnectDB();
  });

  it('should accurately compute cosine similarity between vectors', () => {
    // Identical vectors: similarity = 1.0
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1.0);

    // Orthogonal vectors: similarity = 0.0
    expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBeCloseTo(0.0);

    // Opposite vectors: similarity = -1.0
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1.0);

    // 45 degree angle: similarity = sqrt(2)/2 ≈ 0.7071
    expect(cosineSimilarity([1, 1], [1, 0])).toBeCloseTo(0.7071, 3);

    // Safe handling of null, empty, or mismatched vectors
    expect(cosineSimilarity(null, [1, 0])).toBe(0);
    expect(cosineSimilarity([], [])).toBe(0);
    expect(cosineSimilarity([1, 0], [1, 0, 0])).toBe(0);
  });

  it('should retrieve permitted claims using fallback tiers and report retrieval mode honestly', async () => {
    const result = await retrieveRelevantClaims({
      caseId: testCaseId,
      question: 'What database is used for audit logs?',
      allowedAcls: ['team'],
      limit: 5,
    });

    expect(result.claims).toBeDefined();
    expect(result.claims.length).toBeGreaterThan(0);
    expect(['Atlas Vector Search', 'In-app similarity', 'Keyword']).toContain(result.retrievalMode);

    // Top claim should be PostgreSQL claim
    const topClaim = result.claims[0];
    expect(topClaim.text).toContain('PostgreSQL');
  });

  it('should strictly isolate restricted claims during Q&A: zero leakage to incoming developer', async () => {
    // Incoming developer asks directly about AWS credit card billing
    const devAskRes = await request(app)
      .post(`/api/cases/${testCaseId}/ask`)
      .set('Authorization', `Bearer ${devToken}`)
      .send({ question: 'What is the corporate credit card number for AWS billing?' });

    expect(devAskRes.status).toBe(200);
    const body = devAskRes.body;

    // Incoming user must NOT receive any restricted content or citations
    expect(body.answer).not.toContain('4921');
    expect(body.answer).not.toContain('Master billing corporate credit card');
    for (const cit of body.citations || []) {
      expect(cit.acl).not.toBe('leads_only');
      expect(cit.text).not.toContain('4921');
    }
  });

  it('should allow lead to query and retrieve leads_only claims within their authorized scope', async () => {
    const leadAskRes = await request(app)
      .post(`/api/cases/${testCaseId}/ask`)
      .set('Authorization', `Bearer ${leadToken}`)
      .send({ question: 'What is the corporate credit card number for AWS billing?' });

    expect(leadAskRes.status).toBe(200);
    const body = leadAskRes.body;

    // Lead is authorized to see leads_only content
    expect(body.citations.some((c) => c.acl === 'leads_only')).toBe(true);
  });
});
