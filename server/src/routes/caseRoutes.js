import express from 'express';
import mongoose from 'mongoose';
import { createCaseSchema, acknowledgeSchema, askQuestionSchema } from './validators.js';
import { authMiddleware, requireLead } from '../middleware/auth.js';
import { Case } from '../models/Case.js';
import { Source } from '../models/Source.js';
import { Span } from '../models/Span.js';
import { Claim } from '../models/Claim.js';
import { Version } from '../models/Version.js';
import { Acknowledgement } from '../models/Acknowledgement.js';
import { Audit, logAudit } from '../models/Audit.js';
import { runReconstructionPipeline } from '../services/verification/engine.js';
import { generateInterviewQuestions } from '../services/interviewEngine.js';
import { embedApprovedClaims, answerHandoverQuestion } from '../services/embeddingService.js';
import { env } from '../config/environment.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();

/**
 * GET /api/cases
 * Returns all cases with progress and status metadata
 */
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const cases = await Case.find().sort({ updatedAt: -1 }).lean();

    // Attach counts for each case
    const casesWithStats = await Promise.all(
      cases.map(async (c) => {
        const sourceCount = await Source.countDocuments({ caseId: c._id });
        const claimCount = await Claim.countDocuments({ caseId: c._id });
        const approvedCount = await Claim.countDocuments({ caseId: c._id, reviewDecision: 'approved' });
        const pendingCount = await Claim.countDocuments({ caseId: c._id, reviewDecision: 'pending' });

        return {
          ...c,
          stats: {
            sourceCount,
            claimCount,
            approvedCount,
            pendingCount,
          },
        };
      })
    );

    return res.json({ cases: casesWithStats });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/cases
 * Creates a new handover case
 */
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const parse = createCaseSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Validation failed', details: parse.error.flatten().fieldErrors });
    }

    const { title, departingMemberName } = parse.data;
    const newCase = await Case.create({
      title,
      departingMemberName,
      status: 'draft',
      createdBy: req.user.name,
    });

    await logAudit({
      caseId: newCase._id,
      actor: req.user.name,
      role: req.user.role,
      action: 'create_case',
      targetId: String(newCase._id),
      metadata: { title, departingMemberName },
    });

    return res.status(201).json({ success: true, case: newCase });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/cases/:id
 * Returns a specific case
 */
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const caseId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(caseId)) {
      return res.status(400).json({ error: 'Invalid case ID' });
    }

    const foundCase = await Case.findById(caseId).lean();
    if (!foundCase) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const sourceCount = await Source.countDocuments({ caseId });
    const claims = await Claim.find({ caseId }).lean();

    const allowedAcls = req.user.allowedAcls || ['team'];
    const visibleClaims = claims.filter((c) => allowedAcls.includes(c.acl));

    return res.json({
      case: foundCase,
      stats: {
        sourceCount,
        claimCount: visibleClaims.length,
        approvedCount: visibleClaims.filter((c) => c.reviewDecision === 'approved').length,
        pendingCount: visibleClaims.filter((c) => c.reviewDecision === 'pending').length,
        conflictsCount: visibleClaims.filter((c) => c.status === 'Conflicting').length,
        gapsCount: visibleClaims.filter((c) => c.status === 'Missing').length,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/cases/:id/reconstruct
 * Runs extraction & verification pipeline on all spans for this case.
 */
router.post('/:id/reconstruct', authMiddleware, async (req, res, next) => {
  try {
    const caseId = req.params.id;
    const foundCase = await Case.findById(caseId);
    if (!foundCase) {
      return res.status(404).json({ error: 'Case not found' });
    }

    // Retrieve all spans for this case
    const spans = await Span.find({ caseId }).lean();
    if (spans.length === 0) {
      return res.status(400).json({
        error: 'No sources found',
        message: 'Please connect and upload sources before running reconstruction.',
      });
    }

    // Include restricted spans in extraction only if user is lead
    const isLead = req.user.role === 'lead';

    const pipelineResult = await runReconstructionPipeline({
      spans,
      departingMember: foundCase.departingMemberName,
      includeRestricted: isLead,
    });

    // Remove existing claims for this case to rebuild fresh state
    await Claim.deleteMany({ caseId });

    // Insert newly extracted & verified claims
    const claimsToInsert = pipelineResult.claims.map((c) => ({
      ...c,
      caseId,
    }));

    const insertedClaims = await Claim.insertMany(claimsToInsert);

    // Auto-generate gap-driven interview questions for leaver (Improvement 1)
    try {
      await generateInterviewQuestions(caseId, {
        departingMember: foundCase.departingMemberName,
      });
    } catch (e) {
      console.warn('[Reconstruct] Auto interview generation note:', e.message);
    }

    // Update case status to in_review if it was draft
    if (foundCase.status === 'draft') {
      foundCase.status = 'in_review';
      await foundCase.save();
    }

    await logAudit({
      caseId,
      actor: req.user.name,
      role: req.user.role,
      action: 'reconstruct',
      targetId: String(caseId),
      metadata: {
        totalExtracted: insertedClaims.length,
        usedFallback: pipelineResult.usedFallback,
        conflictsCount: pipelineResult.summary.conflictsCount,
        gapsCount: pipelineResult.summary.gapsCount,
      },
    });

    return res.json({
      success: true,
      summary: pipelineResult.summary,
      usedFallback: pipelineResult.usedFallback,
      bannerMessage: pipelineResult.bannerMessage,
      claimsCount: insertedClaims.length,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/cases/:id/publish
 * Publishes approved claims as a new immutable version.
 * Requires Lead role.
 */
router.post('/:id/publish', authMiddleware, requireLead, async (req, res, next) => {
  try {
    const caseId = req.params.id;
    const foundCase = await Case.findById(caseId);
    if (!foundCase) {
      return res.status(404).json({ error: 'Case not found' });
    }

    // Fetch all currently approved claims
    const approvedClaims = await Claim.find({
      caseId,
      reviewDecision: 'approved',
    }).lean();

    if (approvedClaims.length === 0) {
      return res.status(400).json({
        error: 'No approved claims',
        message: 'You cannot publish an empty handover. Approve at least one verified or attested claim first.',
      });
    }

    // Staleness invariant (Section 7): Approved claims contradicted or superseded by newer evidence block unchanged republish
    const staleUndismissed = approvedClaims.filter(
      (c) => c.isStale && (!c.dismissedStaleness || !c.dismissedStaleness.reason)
    );

    if (staleUndismissed.length > 0) {
      return res.status(400).json({
        error: 'Publication blocked: stale claims detected',
        message: `Cannot publish unchanged: ${staleUndismissed.length} approved claim(s) have been contradicted or superseded by newer evidence. Please re-review, edit, reject, or dismiss them with a recorded justification.`,
        staleClaims: staleUndismissed.map((c) => ({
          id: c._id,
          text: c.text,
          stalenessReason: c.stalenessReason,
        })),
      });
    }

    // Exclude superseded claims from published version snapshot
    const publishableClaims = approvedClaims.filter((c) => c.stalenessStatus !== 'superseded');

    // Calculate next version number
    const latestVersion = await Version.findOne({ caseId }).sort({ number: -1 }).lean();
    const nextNumber = latestVersion ? latestVersion.number + 1 : 1;

    // Calculate diff from previous version
    let diff = { added: publishableClaims.length, modified: 0, removed: 0, details: [] };
    if (latestVersion && latestVersion.approvedClaimSnapshot) {
      const prevIds = new Set(latestVersion.approvedClaimSnapshot.map((c) => String(c._id)));
      const currIds = new Set(publishableClaims.map((c) => String(c._id)));

      let added = 0;
      let removed = 0;
      let modified = 0;

      for (const curr of publishableClaims) {
        if (!prevIds.has(String(curr._id))) {
          added++;
        } else {
          // Check if modified
          const prev = latestVersion.approvedClaimSnapshot.find((p) => String(p._id) === String(curr._id));
          if (prev && (prev.value !== curr.value || prev.text !== curr.text)) {
            modified++;
          }
        }
      }

      for (const prev of latestVersion.approvedClaimSnapshot) {
        if (!currIds.has(String(prev._id))) {
          removed++;
        }
      }

      diff = { added, modified, removed, details: [] };

      // Idempotency check: If nothing changed since the latest publish, return existing version cleanly
      if (added === 0 && modified === 0 && removed === 0 && foundCase.currentVersion === latestVersion.number) {
        return res.json({
          success: true,
          version: latestVersion,
          message: `Handover version ${latestVersion.number} is already published and up to date.`,
        });
      }
    }

    const versionDoc = await Version.create({
      caseId,
      number: nextNumber,
      approvedClaimSnapshot: publishableClaims,
      publishedBy: req.user.name,
      publishedAt: new Date(),
      diffFromPrevious: diff,
    });

    foundCase.status = 'published';
    foundCase.currentVersion = nextNumber;
    await foundCase.save();

    // Section 6 Part B: Embed approved claims using configured EMBEDDING_MODEL
    try {
      await embedApprovedClaims(publishableClaims);
    } catch (embedErr) {
      console.warn('[Publish] Non-fatal error embedding approved claims:', embedErr.message);
    }

    await logAudit({
      caseId,
      actor: req.user.name,
      role: req.user.role,
      action: 'publish_version',
      targetId: String(versionDoc._id),
      metadata: {
        versionNumber: nextNumber,
        claimsCount: approvedClaims.length,
        diff,
      },
    });

    return res.json({
      success: true,
      version: versionDoc,
      message: `Version ${nextNumber} published successfully with ${approvedClaims.length} approved claims.`,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/cases/:id/versions
 * Returns version history for the case
 */
router.get('/:id/versions', authMiddleware, async (req, res, next) => {
  try {
    const caseId = req.params.id;
    const versions = await Version.find({ caseId }).sort({ number: -1 }).lean();

    // Sanitize snapshots for incoming users (never leak restricted claims inside snapshots)
    const allowedAcls = req.user.allowedAcls || ['team'];
    const sanitizedVersions = versions.map((v) => {
      const filteredSnapshot = (v.approvedClaimSnapshot || []).filter((c) => allowedAcls.includes(c.acl));
      return {
        ...v,
        approvedClaimSnapshot: filteredSnapshot,
        claimCount: filteredSnapshot.length,
      };
    });

    return res.json({ versions: sanitizedVersions });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/cases/:id/audit
 * Returns audit trail logs for this case (strictly caseId filtered, no restricted content in logs)
 */
router.get('/:id/audit', authMiddleware, async (req, res, next) => {
  try {
    const caseId = req.params.id;
    const logs = await Audit.find({ caseId }).sort({ timestamp: -1 }).limit(100).lean();

    return res.json({ audit: logs });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/cases/:id/acknowledge
 * Incoming recipient acknowledges receipt of a specific version and can raise questions to lead.
 */
router.post('/:id/acknowledge', authMiddleware, async (req, res, next) => {
  try {
    const caseId = req.params.id;
    const parse = acknowledgeSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Validation failed', details: parse.error.flatten().fieldErrors });
    }

    const { versionNumber, question } = parse.data;

    const questionsList = [];
    if (question && question.trim()) {
      questionsList.push({
        text: question.trim(),
        createdAt: new Date(),
      });
    }

    const userIdStr = String(req.user.id || req.user._id);

    // Idempotency check: prevent duplicate acknowledgements for the same version by the same user
    const existingAck = await Acknowledgement.findOne({
      caseId,
      versionNumber,
      userId: userIdStr,
    });

    if (existingAck) {
      if (question && question.trim()) {
        existingAck.questionsRaised.push({
          text: question.trim(),
          createdAt: new Date(),
        });
        await existingAck.save();
      }
      return res.status(200).json({
        success: true,
        acknowledgement: existingAck,
        message: `Handover version ${versionNumber} already acknowledged by ${req.user.name}.`,
      });
    }

    const ack = await Acknowledgement.create({
      caseId,
      versionNumber,
      userId: userIdStr,
      userName: req.user.name,
      userRole: req.user.role,
      acknowledgedAt: new Date(),
      questionsRaised: questionsList,
    });

    await logAudit({
      caseId,
      actor: req.user.name,
      role: req.user.role,
      action: 'acknowledge_receipt',
      targetId: String(ack._id),
      metadata: {
        versionNumber,
        hasQuestion: Boolean(question),
      },
    });

    return res.status(201).json({
      success: true,
      acknowledgement: ack,
      message: `Handover version ${versionNumber} successfully acknowledged by ${req.user.name}.`,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/cases/:id/ask (Stretch feature)
 * Answers questions cited ONLY from approved claims that the viewer has permission to see.
 */
router.post('/:id/ask', authMiddleware, async (req, res, next) => {
  try {
    const caseId = req.params.id;
    const parse = askQuestionSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Validation failed', details: parse.error.flatten().fieldErrors });
    }

    const { question } = parse.data;
    const allowedAcls = req.user.allowedAcls || ['team'];

    // Section 6 Part B: Q&A Assistant using 3-tier retrieval (Atlas Vector Search -> In-app similarity -> Keyword)
    // Server-side pre-filtering strictly prevents restricted claim leakage
    const result = await answerHandoverQuestion({
      caseId,
      question,
      allowedAcls,
    });

    return res.json({
      answer: result.answer,
      citations: result.citations,
      retrievalMode: result.retrievalMode,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/cases/:id/claims/:claimId/dismiss-staleness
 * Lead records a documented justification to dismiss a staleness flag.
 * Audited per Section 7 specification.
 */
router.post('/:id/claims/:claimId/dismiss-staleness', authMiddleware, requireLead, async (req, res, next) => {
  try {
    const { id: caseId, claimId } = req.params;
    const { reason } = req.body || {};

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'A justification reason is required to dismiss a staleness flag.' });
    }

    const claim = await Claim.findOne({ _id: claimId, caseId });
    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    claim.isStale = false;
    claim.stalenessStatus = 'fresh';
    claim.dismissedStaleness = {
      dismissedBy: req.user.name,
      dismissedAt: new Date(),
      reason: reason.trim(),
    };
    await claim.save();

    await logAudit({
      caseId,
      actor: req.user.name,
      role: req.user.role,
      action: 'dismiss_staleness',
      targetId: String(claimId),
      metadata: { reason: reason.trim() },
    });

    return res.json({
      success: true,
      claim,
      message: 'Staleness flag dismissed with recorded justification.',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
