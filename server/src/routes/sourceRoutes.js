import express from 'express';
import multer from 'multer';
import { createSourceSchema } from './validators.js';
import { authMiddleware } from '../middleware/auth.js';
import { Source } from '../models/Source.js';
import { Span } from '../models/Span.js';
import { Case } from '../models/Case.js';
import { logAudit } from '../models/Audit.js';
import { splitIntoSpans } from '../services/spanSplitter.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

const router = express.Router({ mergeParams: true });

/**
 * GET /api/cases/:id/sources
 * Returns all sources for the case (filtered by caller's ACL)
 */
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const caseId = req.params.id;
    const allowedAcls = req.user.allowedAcls || ['team'];

    const sources = await Source.find({
      caseId,
      acl: { $in: allowedAcls },
    })
      .sort({ createdAt: 1 })
      .lean();

    // Attach span count for each source
    const sourcesWithCounts = await Promise.all(
      sources.map(async (src) => {
        const spanCount = await Span.countDocuments({
          caseId,
          sourceId: src._id,
          acl: { $in: allowedAcls },
        });

        // Don't return raw sensitive text if incoming user
        const isRestricted = src.acl === 'leads_only' || src.acl === 'owner_only';
        return {
          ...src,
          rawText: !allowedAcls.includes(src.acl) ? '[Restricted]' : src.rawText,
          spanCount,
        };
      })
    );

    return res.json({ sources: sourcesWithCounts });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/cases/:id/sources
 * Ingests a new source (file upload or pasted text).
 * Validates consent tick, masks secrets, and creates stable spans.
 */
router.post('/', authMiddleware, upload.single('file'), async (req, res, next) => {
  try {
    const caseId = req.params.id;
    const foundCase = await Case.findById(caseId);
    if (!foundCase) {
      return res.status(404).json({ error: 'Case not found' });
    }

    let { name, type, acl, consentConfirmed, rawText } = req.body;

    // Handle file upload if present
    if (req.file) {
      if (!name) name = req.file.originalname;
      rawText = req.file.buffer.toString('utf-8');

      // Auto-detect type from file extension if not provided
      if (!type) {
        if (name.endsWith('.csv')) type = 'tasks_csv';
        else if (name.endsWith('.json')) type = 'chat_json';
        else if (name.endsWith('.md') || name.endsWith('.txt')) type = 'notes';
        else type = 'notes';
      }
    }

    // Cast consentConfirmed from string if sent via multipart form
    if (typeof consentConfirmed === 'string') {
      consentConfirmed = consentConfirmed === 'true' || consentConfirmed === '1';
    }

    // Zod validation
    const parse = createSourceSchema.safeParse({
      name,
      type,
      acl: acl || 'team',
      consentConfirmed,
      rawText,
    });

    if (!parse.success) {
      return res.status(400).json({
        error: 'Ingestion validation failed',
        details: parse.error.flatten().fieldErrors,
        message: 'Both an access label and consent confirmation ("I am authorised to use this source") are strictly required.',
      });
    }

    const validData = parse.data;

    // Determine source number for stable ID prefix (S1, S2, etc.)
    const existingCount = await Source.countDocuments({ caseId });
    const sourceNumber = existingCount + 1;

    // Split into spans and mask secrets
    let splitResult;
    try {
      splitResult = splitIntoSpans({
        rawText: validData.rawText,
        type: validData.type,
        sourceNumber,
        acl: validData.acl,
      });
    } catch (splitErr) {
      return res.status(400).json({
        error: 'Malformed source content',
        message: splitErr.message,
      });
    }

    // Create Source document
    const sourceDoc = await Source.create({
      caseId,
      name: validData.name,
      type: validData.type,
      acl: validData.acl,
      consentConfirmed: validData.consentConfirmed,
      rawText: splitResult.maskedText,
      uploadedBy: req.user.name,
      metadata: {
        secretsMaskedCount: splitResult.secretMaskStats.count,
        maskedTypes: splitResult.secretMaskStats.maskedTypes,
      },
    });

    // Create Spans with stableId (S{src}.L{line})
    const spansToInsert = splitResult.spans.map((s) => ({
      ...s,
      caseId,
      sourceId: sourceDoc._id,
      sourceName: validData.name,
    }));

    const insertedSpans = await Span.insertMany(spansToInsert);

    // Audit log
    await logAudit({
      caseId,
      actor: req.user.name,
      role: req.user.role,
      action: 'source_upload',
      targetId: String(sourceDoc._id),
      metadata: {
        sourceName: validData.name,
        type: validData.type,
        acl: validData.acl,
        spansCount: insertedSpans.length,
        secretsMasked: splitResult.secretMaskStats.count,
      },
    });

    return res.status(201).json({
      success: true,
      source: sourceDoc,
      spansCount: insertedSpans.length,
      secretsMaskedCount: splitResult.secretMaskStats.count,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
