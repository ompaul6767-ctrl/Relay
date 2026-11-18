import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/database.js';
import { seedDatabase } from '../scripts/seedHelper.js';
import { DEMO_USERS, signToken } from '../src/middleware/auth.js';
import { Case } from '../src/models/Case.js';
import { Claim } from '../src/models/Claim.js';
import { Span } from '../src/models/Span.js';
import { InterviewQuestion } from '../src/models/InterviewQuestion.js';
import { verifyClaimCitations } from '../src/services/verification/quoteVerifier.js';

describe('Improvement 1: Gap-Driven Leaver Interview', () => {
  let demoCaseId = '';
  let leadToken = '';
  let departToken = '';
  let devToken = '';

  beforeAll(async () => {
    await connectDB();
    const demoCase = await seedDatabase();
    demoCaseId = String(demoCase._id);
    leadToken = signToken(DEMO_USERS.lead);
    departToken = signToken(DEMO_USERS.departing);
    devToken = signToken(DEMO_USERS.incoming_dev);
  }, 30000);

  afterAll(async () => {
    await disconnectDB();
  });

  it('should generate interview questions for missing claims and conflicts (idempotent)', async () => {
    // 1. Generate interview questions via API
    const res = await request(app)
      .post(`/api/cases/${demoCaseId}/interview/generate`)
      .set('Authorization', `Bearer ${leadToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.questions.length).toBeGreaterThan(0);

    const questions = res.body.questions;
    const initialCount = questions.length;

    // Must have questions for missing claims and conflict
    const conflictQ = questions.find((q) => q.type === 'conflict' && q.entityKey === 'payment_gateway');
    const missingOwnerQ = questions.find((q) => q.type === 'missing_owner');
    const decisionReasonQ = questions.find((q) => q.type === 'decision_reason');

    expect(conflictQ).toBeDefined();
    expect(conflictQ.conflictingValues).toContain('Aarav');
    expect(conflictQ.conflictingValues).toContain('Priya');
    expect(missingOwnerQ).toBeDefined();
    expect(decisionReasonQ).toBeDefined();

    // 2. Idempotency test: Call generate again, verify no duplicates created
    const res2 = await request(app)
      .post(`/api/cases/${demoCaseId}/interview/generate`)
      .set('Authorization', `Bearer ${leadToken}`);

    expect(res2.status).toBe(200);
    expect(res2.body.questions.length).toBe(initialCount);
  });

  it('should allow departing member to answer a question, creating a span and an Attested claim with 100% valid citation', async () => {
    const openQuestion = await InterviewQuestion.findOne({
      caseId: demoCaseId,
      status: 'open',
      type: 'missing_owner',
    });
    expect(openQuestion).toBeDefined();

    const answerText = 'I handed this notification service migration over to Priya before departure.';

    const answerRes = await request(app)
      .post(`/api/cases/${demoCaseId}/interview/${openQuestion._id}/answer`)
      .set('Authorization', `Bearer ${departToken}`)
      .send({
        answer: answerText,
        acl: 'team',
      });

    expect(answerRes.status).toBe(200);
    expect(answerRes.body.success).toBe(true);
    expect(answerRes.body.claim).toBeDefined();

    const createdClaim = answerRes.body.claim;
    expect(createdClaim.status).toBe('Attested');
    expect(createdClaim.reviewDecision).toBe('pending'); // Enforces human approval gate
    expect(createdClaim.isFromInterview).toBe(true);
    expect(createdClaim.spanRefs.length).toBe(1);

    // Verify exact quote citation validity
    const span = await Span.findOne({ stableId: createdClaim.spanRefs[0].spanId });
    expect(span).toBeDefined();
    expect(span.text).toBe(answerText);

    const spansMap = new Map([[span.stableId, span]]);
    const citationCheck = verifyClaimCitations(createdClaim, spansMap);
    expect(citationCheck.isValid).toBe(true);

    // Verify question status transitioned to answered
    const updatedQ = await InterviewQuestion.findById(openQuestion._id);
    expect(updatedQ.status).toBe('answered');
    expect(updatedQ.answer.text).toBe(answerText);
  });

  it('should allow lead to approve interview answer and supersede conflicting claim', async () => {
    const conflictQuestion = await InterviewQuestion.findOne({
      caseId: demoCaseId,
      type: 'conflict',
      entityKey: 'payment_gateway',
    });
    expect(conflictQuestion).toBeDefined();

    // Departing member answers the conflict
    const answerRes = await request(app)
      .post(`/api/cases/${demoCaseId}/interview/${conflictQuestion._id}/answer`)
      .set('Authorization', `Bearer ${departToken}`)
      .send({
        answer: 'Priya took over payment gateway ownership completely starting Sprint 4.',
        chosenValue: 'Priya',
        acl: 'team',
      });

    expect(answerRes.status).toBe(200);
    const attestedClaim = answerRes.body.claim;

    // Lead approves the newly created Attested claim
    const approveRes = await request(app)
      .patch(`/api/claims/${attestedClaim._id}`)
      .set('Authorization', `Bearer ${leadToken}`)
      .send({
        action: 'approve',
        reviewNotes: 'Confirmed with team notes; Priya is canonical payment gateway owner.',
      });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.claim.reviewDecision).toBe('approved');

    // Target conflicting claim should be marked superseded
    if (attestedClaim.supersedes) {
      const originalConflictingClaim = await Claim.findById(attestedClaim.supersedes);
      expect(originalConflictingClaim.isStale).toBe(true);
      expect(originalConflictingClaim.stalenessStatus).toBe('superseded');
    }
  });

  it('should enforce strict server-side ACLs: incoming role cannot access restricted interview questions', async () => {
    // Mark one question as leads_only
    const leadsOnlyQ = await InterviewQuestion.create({
      caseId: demoCaseId,
      type: 'missing_owner',
      question: 'Confidential: Who has access to AWS master credentials?',
      acl: 'leads_only',
      status: 'open',
    });

    // Incoming dev fetches interview questions
    const devRes = await request(app)
      .get(`/api/cases/${demoCaseId}/interview`)
      .set('Authorization', `Bearer ${devToken}`);

    expect(devRes.status).toBe(200);
    const visibleIds = devRes.body.questions.map((q) => String(q._id));
    expect(visibleIds).not.toContain(String(leadsOnlyQ._id));

    // Incoming dev attempts to answer leads_only question directly
    const forbidRes = await request(app)
      .post(`/api/cases/${demoCaseId}/interview/${leadsOnlyQ._id}/answer`)
      .set('Authorization', `Bearer ${devToken}`)
      .send({ answer: 'Attempted answer' });

    expect(forbidRes.status).toBe(403);
    expect(forbidRes.body.error).toBe('Forbidden');
  });

  it('should handle skip and lead reassignment properly', async () => {
    const openQ = await InterviewQuestion.findOne({
      caseId: demoCaseId,
      status: 'open',
    });
    expect(openQ).toBeDefined();

    // Skip
    const skipRes = await request(app)
      .post(`/api/cases/${demoCaseId}/interview/${openQ._id}/skip`)
      .set('Authorization', `Bearer ${departToken}`);

    expect(skipRes.status).toBe(200);
    expect(skipRes.body.question.status).toBe('skipped');

    // Lead reassign
    const reassignRes = await request(app)
      .post(`/api/cases/${demoCaseId}/interview/${openQ._id}/reassign`)
      .set('Authorization', `Bearer ${leadToken}`)
      .send({ suggestedContact: 'Kavita (QA Lead)' });

    expect(reassignRes.status).toBe(200);
    expect(reassignRes.body.question.status).toBe('reassigned');
    expect(reassignRes.body.question.reassignedTo).toBe('Kavita (QA Lead)');
  });
});
