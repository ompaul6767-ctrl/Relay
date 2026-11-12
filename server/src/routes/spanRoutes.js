import express from 'express';
import mongoose from 'mongoose';
import { authMiddleware } from '../middleware/auth.js';
import { Span } from '../models/Span.js';

const router = express.Router();

/**
 * GET /api/spans/:id
 * Returns the span ONLY if the caller's ACL allows it.
 * Supports query by MongoDB ObjectId or stableId (e.g. S1.L3) with ?caseId=
 */
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const idParam = req.params.id;
    const allowedAcls = req.user.allowedAcls || ['team'];

    let span;
    if (mongoose.Types.ObjectId.isValid(idParam)) {
      span = await Span.findById(idParam).lean();
    } else {
      // Find by stableId and caseId
      const caseId = req.query.caseId;
      if (!caseId) {
        return res.status(400).json({ error: 'caseId query parameter required when querying by stableId.' });
      }
      span = await Span.findOne({ stableId: idParam, caseId }).lean();
    }

    if (!span) {
      return res.status(404).json({ error: 'Span not found' });
    }

    // STRICT ACL ENFORCEMENT
    if (!allowedAcls.includes(span.acl)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Your role '${req.user.role}' is not authorized to view this restricted span. Required ACL: ${span.acl}`,
        isRestricted: true,
      });
    }

    return res.json({ span });
  } catch (err) {
    next(err);
  }
});

export default router;
