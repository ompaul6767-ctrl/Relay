import express from 'express';
import mongoose from 'mongoose';
import { patchClaimSchema, testCitationSchema } from './validators.js';
import { authMiddleware, requireLead } from '../middleware/auth.js';
import { Claim } from '../models/Claim.js';
import { Span } from '../models/Span.js';
import { Case } from '../models/Case.js';
import { logAudit } from '../models/Audit.js';
import { verifyClaimCitations } from '../services/verification/quoteVerifier.js';

const router = express.Router();

/**
 * GET /api/cases/:id/claims
 * Returns claims for a case, with STRICT server-side ACL filtering.
 * Restricted claims for unauthorized roles are replaced with stubs ("1 restricted item").
 */
router.get('/cases/:caseId/claims', authMiddleware, async (req, res, next) => {
  try {
    const caseId = req.params.caseId;
    const allowedAcls = req.user.allowedAcls || ['team'];

    const query = { caseId };

    // Status filter
    if (req.query.status) {
      query.status = req.query.status;
    }
    // Type filter
    if (req.query.type) {
      query.type = req.query.type;
    }
    // Review decision filter
    if (req.query.reviewDecision) {
      query.reviewDecision = req.query.reviewDecision;
    }
    // Domain filter
    if (req.query.domain) {
      query.domains = req.query.domain;
    }

    const claims = await Claim.find(query).sort({ createdAt: -1 }).lean();

    // SERVER-SIDE FILTERING:
    // If user's ACL doesn't allow a claim's ACL, NEVER send the text or quotes.
    // Instead, return an explicit Restricted Stub.
    const sanitizedClaims = [];
    let restrictedCount = 0;

    for (const claim of claims) {
      const isAllowed = allowedAcls.includes(claim.acl);

      if (!isAllowed) {
        restrictedCount++;
        // Emit a restricted stub as required by specification
        sanitizedClaims.push({
          _id: claim._id,
          caseId: claim.caseId,
          type: 'fact',
          text: 'Restricted knowledge item (Requires lead authorization)',
          entityKey: 'restricted_item',
          attribute: 'confidential',
          value: '[Restricted]',
          status: 'Restricted',
          acl: claim.acl,
          domains: claim.domains || ['ops'],
          reviewDecision: claim.reviewDecision,
          isRestrictedStub: true,
          spanRefs: [], // Never leak span citations or quotes
        });
      } else {
        sanitizedClaims.push(claim);
      }
    }

    return res.json({
      claims: sanitizedClaims,
      meta: {
        total: sanitizedClaims.length,
        restrictedStubsCount: restrictedCount,
        allowedAcls,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/claims/:id
 * Lead review actions: Approve, Edit, Reject, Resolve.
 */
router.patch('/:id', authMiddleware, requireLead, async (req, res, next) => {
  try {
    const claimId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(claimId)) {
      return res.status(400).json({ error: 'Invalid claim ID' });
    }

    const parse = patchClaimSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Validation failed', details: parse.error.flatten().fieldErrors });
    }

    const { action, value, text, reviewNotes } = parse.data;

    const claim = await Claim.findById(claimId);
    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    const previousStatus = claim.status;

    switch (action) {
      case 'approve':
        // Specification check: Conflicting, Inferred and Missing claims must be opened individually
        // (Handled at UI and enforced here)
        claim.reviewDecision = 'approved';
        claim.reviewedBy = req.user.name;
        if (reviewNotes) claim.reviewNotes = reviewNotes;

        // If this claim supersedes another claim (e.g. from leaver interview resolution)
        if (claim.supersedes) {
          await Claim.findByIdAndUpdate(claim.supersedes, {
            $set: {
              isStale: true,
              stalenessStatus: 'superseded',
              stalenessReason: `Superseded by attested interview claim (${claim._id})`,
              supersededByClaimId: claim._id,
            },
          });
        }
        break;

      case 'edit':
        // Becomes Attested with the reviewer's name
        if (text) claim.text = text;
        if (value) claim.value = value;
        claim.status = 'Attested';
        claim.reviewDecision = 'approved';
        claim.reviewedBy = req.user.name;
        claim.reviewNotes = reviewNotes || `Attested and confirmed by ${req.user.name}`;
        break;

      case 'reject':
        claim.reviewDecision = 'rejected';
        claim.status = 'Rejected';
        claim.reviewedBy = req.user.name;
        claim.rejectionReason = reviewNotes || 'Rejected by lead reviewer';
        break;

      case 'resolve':
        // For conflicts, the lead chooses the value and records why
        if (!value) {
          return res.status(400).json({ error: 'Resolving a conflict requires selecting or providing the winning value.' });
        }
        claim.value = value;
        claim.status = 'Attested';
        claim.reviewDecision = 'approved';
        claim.reviewedBy = req.user.name;
        claim.text = text || `Resolved conflict for ${claim.entityKey || 'item'}: Chosen value "${value}".`;
        claim.reviewNotes = reviewNotes || `Conflict resolved by lead ${req.user.name}: selected "${value}".`;
        break;
    }

    await claim.save();

    // Check if the case was already published; if so, editing creates a new version state
    const parentCase = await Case.findById(claim.caseId);
    if (parentCase && parentCase.status === 'published') {
      parentCase.status = 'in_review';
      await parentCase.save();
    }

    await logAudit({
      caseId: claim.caseId,
      actor: req.user.name,
      role: req.user.role,
      action: `claim_${action}`,
      targetId: String(claim._id),
      metadata: {
        action,
        previousStatus,
        newStatus: claim.status,
        reviewNotes,
      },
    });

    return res.json({
      success: true,
      claim,
      message: `Claim successfully updated (${action}).`,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/claims/bulk-approve
 * Bulk-approve claims. Allowed ONLY for claims with status 'Verified'.
 */
router.post('/bulk-approve', authMiddleware, requireLead, async (req, res, next) => {
  try {
    const { claimIds, caseId } = req.body;
    if (!Array.isArray(claimIds) || claimIds.length === 0) {
      return res.status(400).json({ error: 'claimIds array is required.' });
    }

    // Find all target claims
    const claims = await Claim.find({ _id: { $in: claimIds }, caseId });

    // Strict rule: "Bulk-approve is allowed only for Verified claims.
    // Conflicting, Inferred and Missing claims must be opened individually."
    const nonVerified = claims.filter((c) => c.status !== 'Verified');
    if (nonVerified.length > 0) {
      return res.status(400).json({
        error: 'Bulk approval disallowed',
        message: `Bulk approval is permitted ONLY for 'Verified' claims. Found ${nonVerified.length} claim(s) with status: ${nonVerified.map((c) => c.status).join(', ')}. These must be reviewed individually.`,
      });
    }

    await Claim.updateMany(
      { _id: { $in: claimIds } },
      {
        $set: {
          reviewDecision: 'approved',
          reviewedBy: req.user.name,
        },
      }
    );

    await logAudit({
      caseId,
      actor: req.user.name,
      role: req.user.role,
      action: 'bulk_approve',
      targetId: `${claimIds.length}_claims`,
      metadata: {
        count: claimIds.length,
      },
    });

    return res.json({
      success: true,
      approvedCount: claimIds.length,
      message: `Successfully bulk-approved ${claimIds.length} Verified claims.`,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/claims/test-fake-quote
 * Section 5.4: Test citation check button that submits a claim with a fake quote and shows it being rejected.
 */
router.post('/test-fake-quote', authMiddleware, async (req, res, next) => {
  try {
    const parse = testCitationSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Validation failed', details: parse.error.flatten().fieldErrors });
    }

    const { caseId, spanId, fakeQuote, claimText } = parse.data;

    // Retrieve span from database
    const span = await Span.findOne({ caseId, stableId: spanId }).lean();
    if (!span) {
      return res.status(404).json({ error: `Span with ID '${spanId}' not found in case.` });
    }

    // Build synthetic test claim
    const testClaim = {
      type: 'fact',
      text: claimText || 'Simulated claim submitted with a fabricated quote for citation verification testing',
      entityKey: 'test_citation_key',
      attribute: 'verification_test',
      value: 'Simulated Value',
      status: 'Verified',
      spanRefs: [
        {
          spanId: span.stableId,
          quote: fakeQuote,
        },
      ],
    };

    const spansMap = new Map([[span.stableId, span]]);
    const verification = verifyClaimCitations(testClaim, spansMap);

    return res.json({
      testExecuted: true,
      submittedSpanId: spanId,
      spanOriginalText: span.text,
      submittedFakeQuote: fakeQuote,
      verificationPassed: verification.isValid,
      resultingStatus: verification.isValid ? 'Verified' : 'Rejected',
      rejectionReason: verification.reason || null,
      explanation: verification.isValid
        ? 'The quote was found in the span.'
        : 'Citation validation failed deterministically: the exact quote does not appear in the span text.',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
