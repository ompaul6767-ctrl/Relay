import mongoose from 'mongoose';
import { Claim } from '../models/Claim.js';
import { Source } from '../models/Source.js';
import { Span } from '../models/Span.js';
import { InterviewQuestion } from '../models/InterviewQuestion.js';
import { logAudit } from '../models/Audit.js';
import { verifyClaimCitations } from './verification/quoteVerifier.js';

/**
 * Generates structured interview questions for a case based on:
 * - Missing claims (unassigned tasks, decisions without reasons, open questions)
 * - Conflicting claims
 * Idempotent: Preserves existing and answered questions.
 */
export async function generateInterviewQuestions(caseId, options = {}) {
  const claims = await Claim.find({ caseId }).lean();

  const missingClaims = claims.filter((c) => c.status === 'Missing');
  const conflictingClaims = claims.filter((c) => c.status === 'Conflicting');

  // Existing questions to avoid duplicates
  const existingQuestions = await InterviewQuestion.find({ caseId });
  const existingByTargetClaim = new Map();
  for (const q of existingQuestions) {
    if (q.targetClaimId) {
      existingByTargetClaim.set(String(q.targetClaimId), q);
    }
  }

  const newQuestionsToCreate = [];

  // 1. Process Missing Claims
  for (const claim of missingClaims) {
    const claimIdStr = String(claim._id);
    if (existingByTargetClaim.has(claimIdStr)) continue;

    let qType = 'custom';
    let questionText = '';
    const entityLabel = claim.entityKey ? claim.entityKey.replace(/_/g, ' ') : 'this component';

    if (claim.attribute === 'owner' || claim.type === 'owner' || claim.text.toLowerCase().includes('task with no owner')) {
      qType = 'missing_owner';
      questionText = `Who owns ${entityLabel}, and what is its current state and next steps?`;
    } else if (claim.type === 'decision' || claim.attribute === 'reason' || claim.text.toLowerCase().includes('decision with no recorded reason')) {
      qType = 'decision_reason';
      questionText = `Why was the decision for ${entityLabel} chosen, and what alternatives were rejected?`;
    } else if (claim.type === 'question' || claim.text.toLowerCase().includes('open question')) {
      qType = 'open_question';
      questionText = `Do you know the answer to the open question regarding ${entityLabel}: "${claim.text}"?`;
    } else {
      qType = 'missing_owner';
      questionText = `Can you clarify the status, owner, and rationale for: "${claim.text}"?`;
    }

    newQuestionsToCreate.push({
      caseId,
      targetClaimId: claim._id,
      type: qType,
      entityKey: claim.entityKey || '',
      attribute: claim.attribute || '',
      question: questionText,
      conflictingValues: [],
      suggestedContact: claim.suggestedPerson || options.departingMember || 'Aarav',
      status: 'open',
      acl: claim.acl || 'team',
    });
  }

  // 2. Process Conflicting Claims
  for (const claim of conflictingClaims) {
    const claimIdStr = String(claim._id);
    if (existingByTargetClaim.has(claimIdStr)) continue;

    const entityLabel = claim.entityKey ? claim.entityKey.replace(/_/g, ' ') : 'the system';
    const values = [];

    if (claim.conflictDetails && Array.isArray(claim.conflictDetails.conflictingValues)) {
      for (const cv of claim.conflictDetails.conflictingValues) {
        if (typeof cv === 'string') {
          values.push(cv);
        } else if (cv && typeof cv === 'object' && cv.value) {
          values.push(String(cv.value));
        }
      }
    } else if (claim.value) {
      values.push(String(claim.value));
    }

    const valueStr = values.length >= 2 ? `"${values[0]}" vs "${values[1]}"` : (values[0] || claim.value || 'competing claims');
    const questionText = `Sources disagree about ${entityLabel} (${claim.attribute || 'specification'}): ${valueStr}. Which is correct, and what is the context?`;

    newQuestionsToCreate.push({
      caseId,
      targetClaimId: claim._id,
      type: 'conflict',
      entityKey: claim.entityKey || '',
      attribute: claim.attribute || '',
      question: questionText,
      conflictingValues: values,
      suggestedContact: claim.suggestedPerson || options.departingMember || 'Aarav',
      status: 'open',
      acl: claim.acl || 'team',
    });
  }

  if (newQuestionsToCreate.length > 0) {
    await InterviewQuestion.insertMany(newQuestionsToCreate);
  }

  const allQuestions = await InterviewQuestion.find({ caseId }).sort({ createdAt: 1 }).lean();
  return allQuestions;
}

/**
 * Submits an answer from the departing member:
 * 1. Creates an 'interview' Source if not present
 * 2. Creates a Span with the verbatim answer
 * 3. Creates an Attested Claim citing the exact quote
 * 4. Links to the InterviewQuestion and supersedes targetClaimId if conflict
 */
export async function submitInterviewAnswer({
  caseId,
  questionId,
  answerText,
  chosenValue,
  answeredBy,
  userAcl = 'team',
}) {
  const question = await InterviewQuestion.findById(questionId);
  if (!question) {
    throw new Error('Interview question not found');
  }

  // Idempotency: If already answered with same text, return existing claim
  if (question.status === 'answered' && question.answer?.claimId) {
    const existingClaim = await Claim.findById(question.answer.claimId);
    if (existingClaim) {
      return { question, claim: existingClaim, alreadyAnswered: true };
    }
  }

  const cleanAnswer = (answerText || '').trim();
  if (!cleanAnswer && !chosenValue) {
    throw new Error('An answer or selected value is required.');
  }

  const finalAnswerText = cleanAnswer || `Selected value: ${chosenValue}`;

  // 1. Find or create the 'interview' source
  let interviewSource = await Source.findOne({ caseId, type: 'interview' });
  if (!interviewSource) {
    interviewSource = await Source.create({
      caseId,
      name: 'Leaver Exit Interview',
      type: 'interview',
      uploadedBy: answeredBy || 'Departing Engineer',
      acl: userAcl,
      consentConfirmed: true,
      rawText: 'Recorded exit interview answers from departing engineer.',
    });
  }

  // 2. Generate a stable spanId and create Span
  const spanCount = await Span.countDocuments({ sourceId: interviewSource._id });
  const stableId = `INT.Q${spanCount + 1}`;

  const span = await Span.create({
    caseId,
    sourceId: interviewSource._id,
    sourceName: interviewSource.name,
    index: spanCount + 1,
    stableId,
    author: answeredBy || 'Departing Engineer',
    acl: userAcl,
    text: finalAnswerText,
    timestamp: new Date(),
  });

  // 3. Create the Attested Claim
  let targetClaim = null;
  if (question.targetClaimId) {
    targetClaim = await Claim.findById(question.targetClaimId);
  }

  const entityKey = question.entityKey || targetClaim?.entityKey || 'interview_handover';
  const attribute = question.attribute || targetClaim?.attribute || 'attested_fact';
  const finalValue = chosenValue || targetClaim?.value || finalAnswerText;

  const claimData = {
    caseId,
    type: targetClaim?.type || (question.type === 'missing_owner' ? 'owner' : 'fact'),
    entityKey,
    attribute,
    value: finalValue,
    text: `[Interview Attestation]: ${finalAnswerText}`,
    status: 'Attested',
    acl: userAcl,
    domains: targetClaim?.domains && targetClaim.domains.length > 0 ? targetClaim.domains : ['tech'],
    reviewDecision: 'pending', // Goes to lead for approval
    reviewedBy: null,
    isFromInterview: true,
    interviewAuthor: answeredBy,
    originInterviewQuestionId: question._id,
    supersedes: question.type === 'conflict' && targetClaim ? targetClaim._id : undefined,
    timelineDate: new Date(),
    dateEstimated: false,
    spanRefs: [
      {
        spanId: span.stableId,
        quote: finalAnswerText, // Exact quote verification invariant
        validated: true,
        sourceName: 'Leaver Exit Interview',
      },
    ],
  };

  const newClaim = await Claim.create(claimData);

  // 4. Update the Question
  question.status = 'answered';
  question.answer = {
    text: finalAnswerText,
    chosenValue: chosenValue || '',
    answeredBy,
    answeredAt: new Date(),
    spanId: span.stableId,
    claimId: newClaim._id,
    acl: userAcl,
  };
  await question.save();

  return { question, claim: newClaim, alreadyAnswered: false };
}
