import express from 'express';
import mongoose from 'mongoose';
import { authMiddleware, requireLead } from '../middleware/auth.js';
import { Case } from '../models/Case.js';
import { Claim } from '../models/Claim.js';
import { InterviewQuestion } from '../models/InterviewQuestion.js';
import { logAudit } from '../models/Audit.js';
import {
  generateInterviewQuestions,
  submitInterviewAnswer,
} from '../services/interviewEngine.js';

const router = express.Router({ mergeParams: true });

/**
 * POST /api/cases/:id/interview/generate
 * Generates structured interview questions for all Missing & Conflicting claims.
 * Idempotent: Does not duplicate existing or answered questions.
 */
router.post('/generate', authMiddleware, async (req, res, next) => {
  try {
    const caseId = req.params.id;
    const foundCase = await Case.findById(caseId);
    if (!foundCase) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const questions = await generateInterviewQuestions(caseId, {
      departingMember: foundCase.departingMemberName,
    });

    const allowedAcls = req.user.allowedAcls || ['team'];
    const visibleQuestions = questions.filter((q) => allowedAcls.includes(q.acl));

    await logAudit({
      caseId,
      actor: req.user.name,
      role: req.user.role,
      action: 'interview_generate',
      targetId: String(caseId),
      metadata: {
        totalGenerated: questions.length,
        visibleCount: visibleQuestions.length,
      },
    });

    const total = visibleQuestions.length;
    const answered = visibleQuestions.filter((q) => q.status === 'answered').length;
    const completionPercentage = total > 0 ? Math.round((answered / total) * 100) : 100;

    return res.json({
      success: true,
      questions: visibleQuestions,
      stats: {
        total,
        answered,
        open: visibleQuestions.filter((q) => q.status === 'open').length,
        skipped: visibleQuestions.filter((q) => q.status === 'skipped').length,
        reassigned: visibleQuestions.filter((q) => q.status === 'reassigned').length,
        completionPercentage,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/cases/:id/interview
 * Returns interview questions filtered strictly by caller's allowed ACLs.
 */
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const caseId = req.params.id;
    const allowedAcls = req.user.allowedAcls || ['team'];

    const questions = await InterviewQuestion.find({ caseId }).sort({ createdAt: 1 }).lean();
    const visibleQuestions = questions.filter((q) => allowedAcls.includes(q.acl));

    const total = visibleQuestions.length;
    const answered = visibleQuestions.filter((q) => q.status === 'answered').length;
    const open = visibleQuestions.filter((q) => q.status === 'open').length;
    const skipped = visibleQuestions.filter((q) => q.status === 'skipped').length;
    const reassigned = visibleQuestions.filter((q) => q.status === 'reassigned').length;
    const completionPercentage = total > 0 ? Math.round((answered / total) * 100) : 100;

    return res.json({
      questions: visibleQuestions,
      stats: {
        total,
        answered,
        open,
        skipped,
        reassigned,
        completionPercentage,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/cases/:id/interview/:questionId/answer
 * Departing member answers a question.
 * Stores answer as a span in 'interview' source and creates an Attested Claim.
 */
router.post('/:questionId/answer', authMiddleware, async (req, res, next) => {
  try {
    const { id: caseId, questionId } = req.params;
    const { answer, chosenValue, acl } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({ error: 'Invalid question ID' });
    }

    const question = await InterviewQuestion.findById(questionId);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Server-side ACL verification
    const allowedAcls = req.user.allowedAcls || ['team'];
    if (!allowedAcls.includes(question.acl)) {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have permission to view or answer this question.' });
    }

    const userAcl = acl && allowedAcls.includes(acl) ? acl : 'team';

    const result = await submitInterviewAnswer({
      caseId,
      questionId,
      answerText: answer,
      chosenValue,
      answeredBy: req.user.name,
      userAcl,
    });

    await logAudit({
      caseId,
      actor: req.user.name,
      role: req.user.role,
      action: 'interview_answer',
      targetId: String(questionId),
      metadata: {
        questionType: question.type,
        claimId: String(result.claim._id),
        alreadyAnswered: result.alreadyAnswered,
      },
    });

    return res.json({
      success: true,
      question: result.question,
      claim: result.claim,
      message: 'Answer successfully recorded as Attested evidence.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/cases/:id/interview/:questionId/skip
 * Marks a question as skipped (remains visible as a knowledge gap).
 */
router.post('/:questionId/skip', authMiddleware, async (req, res, next) => {
  try {
    const { questionId } = req.params;
    const question = await InterviewQuestion.findById(questionId);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    question.status = 'skipped';
    await question.save();

    await logAudit({
      caseId: question.caseId,
      actor: req.user.name,
      role: req.user.role,
      action: 'interview_skip',
      targetId: String(questionId),
      metadata: { questionType: question.type },
    });

    return res.json({
      success: true,
      question,
      message: 'Question skipped. Will remain recorded as an unresolved gap.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/cases/:id/interview/:questionId/reassign
 * Lead reassigns a question to another named contact.
 */
router.post('/:questionId/reassign', authMiddleware, requireLead, async (req, res, next) => {
  try {
    const { questionId } = req.params;
    const { suggestedContact } = req.body || {};

    if (!suggestedContact || !suggestedContact.trim()) {
      return res.status(400).json({ error: 'A contact name is required for reassignment.' });
    }

    const question = await InterviewQuestion.findById(questionId);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    question.status = 'reassigned';
    question.reassignedTo = suggestedContact.trim();
    question.suggestedContact = suggestedContact.trim();
    await question.save();

    await logAudit({
      caseId: question.caseId,
      actor: req.user.name,
      role: req.user.role,
      action: 'interview_reassign',
      targetId: String(questionId),
      metadata: { reassignedTo: suggestedContact.trim() },
    });

    return res.json({
      success: true,
      question,
      message: `Question reassigned to ${suggestedContact.trim()}.`,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
