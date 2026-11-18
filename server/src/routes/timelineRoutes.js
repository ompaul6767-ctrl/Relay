import express from 'express';
import mongoose from 'mongoose';
import { authMiddleware, requireLead } from '../middleware/auth.js';
import { Case } from '../models/Case.js';
import { Claim } from '../models/Claim.js';
import { Span } from '../models/Span.js';
import { logAudit } from '../models/Audit.js';

const router = express.Router({ mergeParams: true });

/**
 * GET /api/cases/:id/timeline
 * Returns dated chronological timeline of claims (decisions, owner changes, conflicts, reversals).
 * Strict server-side ACL: restricted items returned only as stubs to unauthorized roles.
 * Conflicts formatted as side-by-side cards with newer evidence clearly flagged.
 */
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const caseId = req.params.id;
    const foundCase = await Case.findById(caseId);
    if (!foundCase) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const allowedAcls = req.user.allowedAcls || ['team'];
    const claims = await Claim.find({ caseId }).sort({ timelineDate: 1 }).lean();

    // Map spans for citation lookups
    const spans = await Span.find({ caseId }).lean();
    const spansMap = new Map(spans.map((s) => [s.stableId, s]));

    const timelineEvents = [];
    let restrictedCount = 0;

    for (const claim of claims) {
      const isAllowed = allowedAcls.includes(claim.acl);

      // Server-side ACL filtering: emit restricted stub if unauthorized
      if (!isAllowed) {
        restrictedCount++;
        timelineEvents.push({
          _id: claim._id,
          date: claim.timelineDate || claim.createdAt,
          dateEstimated: claim.dateEstimated || false,
          type: 'restricted',
          status: 'Restricted',
          isRestrictedStub: true,
          title: 'Restricted Milestones / Notes',
          summary: 'Confidential knowledge item (Requires lead authorization)',
          acl: claim.acl,
          sideBySide: null,
        });
        continue;
      }

      // Format conflicts with side-by-side evidence cards
      let sideBySide = null;
      if (claim.status === 'Conflicting') {
        const rawConflicting = claim.conflictDetails?.conflictingValues || [];
        const items = rawConflicting.map((cv) => {
          let itemDate = cv.date || null;
          let spanAuthor = 'Unknown';
          if (cv.spanId) {
            const sp = spansMap.get(cv.spanId);
            if (sp) {
              itemDate = itemDate || sp.timestamp;
              spanAuthor = sp.author || spanAuthor;
            }
          }

          return {
            value: typeof cv === 'string' ? cv : cv.value,
            quote: cv.quote || (typeof cv === 'string' ? cv : cv.value),
            source: cv.source || 'Project source',
            spanId: cv.spanId || '',
            author: spanAuthor,
            date: itemDate ? new Date(itemDate).toISOString() : null,
          };
        });

        // Determine which evidence is newer
        let newerIndex = -1;
        let latestTime = -1;
        items.forEach((it, idx) => {
          if (it.date) {
            const t = new Date(it.date).getTime();
            if (t > latestTime) {
              latestTime = t;
              newerIndex = idx;
            }
          }
        });

        sideBySide = {
          entityKey: claim.entityKey,
          attribute: claim.attribute,
          items,
          newerIndex,
        };
      }

      timelineEvents.push({
        _id: claim._id,
        date: claim.timelineDate || claim.createdAt,
        dateEstimated: claim.dateEstimated || false,
        type: claim.type,
        status: claim.status,
        title: claim.text,
        entityKey: claim.entityKey,
        attribute: claim.attribute,
        value: claim.value,
        acl: claim.acl,
        reviewDecision: claim.reviewDecision,
        isFromInterview: claim.isFromInterview || false,
        interviewAuthor: claim.interviewAuthor,
        isStale: claim.isStale || false,
        stalenessStatus: claim.stalenessStatus || 'fresh',
        stalenessReason: claim.stalenessReason || '',
        supersededByClaimId: claim.supersededByClaimId,
        citations: (claim.spanRefs || []).map((ref) => ({
          spanId: ref.spanId,
          quote: ref.quote,
          sourceName: ref.sourceName || spansMap.get(ref.spanId)?.sourceName || 'Source',
        })),
        sideBySide,
      });
    }

    // Sort chronologically
    timelineEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return res.json({
      events: timelineEvents,
      summary: {
        total: timelineEvents.length,
        conflicts: timelineEvents.filter((e) => e.status === 'Conflicting').length,
        staleCount: timelineEvents.filter((e) => e.isStale).length,
        restrictedStubsCount: restrictedCount,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
