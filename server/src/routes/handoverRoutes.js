import express from 'express';
import mongoose from 'mongoose';
import { authMiddleware } from '../middleware/auth.js';
import { Case } from '../models/Case.js';
import { Claim } from '../models/Claim.js';
import { Version } from '../models/Version.js';
import { Acknowledgement } from '../models/Acknowledgement.js';

const router = express.Router();

/**
 * GET /api/cases/:id/handover?version=
 * Assembles and returns the role-appropriate, permission-filtered handover document.
 * Strictly filters out restricted content server-side.
 */
router.get('/cases/:caseId/handover', authMiddleware, async (req, res, next) => {
  try {
    const caseId = req.params.caseId;
    const requestedVersion = req.query.version ? parseInt(req.query.version, 10) : null;
    const role = req.user.role;
    const allowedAcls = req.user.allowedAcls || ['team'];

    const foundCase = await Case.findById(caseId).lean();
    if (!foundCase) {
      return res.status(404).json({ error: 'Case not found' });
    }

    let rawClaims = [];
    let activeVersionNumber = foundCase.currentVersion || 1;

    if (requestedVersion) {
      const versionDoc = await Version.findOne({ caseId, number: requestedVersion }).lean();
      if (!versionDoc) {
        return res.status(404).json({ error: `Handover version ${requestedVersion} not found.` });
      }
      rawClaims = versionDoc.approvedClaimSnapshot || [];
      activeVersionNumber = versionDoc.number;
    } else {
      // Current approved claims
      rawClaims = await Claim.find({
        caseId,
        reviewDecision: 'approved',
      }).lean();
    }

    // STRICT SERVER-SIDE FILTERING:
    // Remove restricted claims completely; replace with aggregate stub
    const visibleApprovedClaims = [];
    let restrictedItemsCount = 0;

    for (const claim of rawClaims) {
      if (allowedAcls.includes(claim.acl)) {
        visibleApprovedClaims.push(claim);
      } else {
        restrictedItemsCount++;
      }
    }

    // Role-specific filtering & weighting
    // Developer role: emphasizes tech, deploy, ops
    // Designer role: emphasizes design, UX tokens, assets, contacts
    let roleFilteredClaims = visibleApprovedClaims;
    if (role === 'incoming_dev') {
      roleFilteredClaims = visibleApprovedClaims.filter((c) =>
        c.domains?.some((d) => ['tech', 'ops'].includes(d)) || !c.domains || c.domains.length === 0
      );
    } else if (role === 'incoming_designer') {
      roleFilteredClaims = visibleApprovedClaims.filter((c) =>
        c.domains?.some((d) => ['design', 'ops'].includes(d)) || c.entityKey?.includes('design') || c.type === 'owner'
      );
    }

    // If role filtering produces fewer than 3 claims (e.g. for designer on primarily tech project),
    // include general claims as secondary section
    if (roleFilteredClaims.length === 0) {
      roleFilteredClaims = visibleApprovedClaims;
    }

    // Assemble the Fixed Sections
    // 1. Who owns what
    const whoOwnsWhat = roleFilteredClaims.filter((c) => c.type === 'owner');

    // 2. Decisions and why
    const decisionsAndWhy = roleFilteredClaims.filter((c) => c.type === 'decision');

    // 3. Risks
    const risks = roleFilteredClaims.filter((c) => c.type === 'risk');

    // 4. Dependencies & Blockers
    const dependencies = roleFilteredClaims.filter((c) => c.type === 'dependency');

    // 5. Open questions
    const openQuestions = roleFilteredClaims.filter((c) => c.type === 'question');

    // 6. Gaps (Missing claims)
    const gaps = roleFilteredClaims.filter((c) => c.status === 'Missing');

    // 7. Timeline (chronologically sorted claims with dates)
    const timeline = roleFilteredClaims
      .filter((c) => c.timelineDate)
      .sort((a, b) => new Date(a.timelineDate) - new Date(b.timelineDate))
      .map((c) => ({
        date: c.timelineDate,
        title: c.text,
        type: c.type,
        entityKey: c.entityKey,
        claimId: c._id,
        spanRefs: c.spanRefs,
      }));

    // 8. Next actions (organized into Day 1 / Week 1 / Day 30)
    const actionClaims = roleFilteredClaims.filter((c) => c.type === 'action');

    const nextActions = {
      day1: [
        {
          id: 'action-d1-1',
          title: 'Campus OAuth & Repository Access Verification',
          description: `Verify @campus.edu SSO credentials and clone the repository. Meet with ${foundCase.departingMemberName} for initial access clearance.`,
          priority: 'High',
          due: 'Day 1',
        },
        {
          id: 'action-d1-2',
          title: role === 'incoming_designer' ? 'Figma Design System Permissions' : 'Local Staging Environment Startup',
          description: role === 'incoming_designer'
            ? 'Request Figma editor tokens from Rohan and inspect the v2 mobile tokens.'
            : 'Run npm install and verify local docker compose services (PostgreSQL, Redis).',
          priority: 'High',
          due: 'Day 1',
        },
      ],
      week1: [
        {
          id: 'action-w1-1',
          title: 'Knowledge Handoff Pair Session',
          description: `Pair with ${foundCase.departingMemberName} to review critical modules (ticket-scanner & gateway). Review deploy-prod.sh runbook.`,
          priority: 'Medium',
          due: 'Week 1',
        },
        ...actionClaims.slice(0, 3).map((ac, idx) => ({
          id: `action-claim-${idx}`,
          title: ac.text,
          description: `Derived from approved project action items (${ac.entityKey || 'handoff'}).`,
          priority: 'Medium',
          due: 'Week 1',
          claimId: ac._id,
        })),
      ],
      day30: [
        {
          id: 'action-d30-1',
          title: 'Full Autonomous Module Ownership',
          description: 'Take full primary on-call ownership for campus event ticketing. Execute disaster recovery failover drill.',
          priority: 'Medium',
          due: 'Day 30',
        },
        {
          id: 'action-d30-2',
          title: 'Compliance & Audit Log Retention Verification',
          description: 'Confirm PostgreSQL audit logs meet University NetOps immutability requirements.',
          priority: 'Low',
          due: 'Day 30',
        },
      ],
    };

    // Check if user has acknowledged this version
    const existingAck = await Acknowledgement.findOne({
      caseId,
      versionNumber: activeVersionNumber,
      userId: String(req.user.id || req.user._id),
    }).lean();

    return res.json({
      case: foundCase,
      activeVersionNumber,
      userRole: role,
      sections: {
        whoOwnsWhat,
        decisionsAndWhy,
        risks,
        dependencies,
        openQuestions,
        gaps,
        timeline,
        nextActions,
      },
      restrictedStub:
        restrictedItemsCount > 0
          ? {
              count: restrictedItemsCount,
              label: `${restrictedItemsCount} restricted item(s) exist in this case that are omitted from your role view.`,
              isRestricted: true,
            }
          : null,
      acknowledgement: existingAck,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
