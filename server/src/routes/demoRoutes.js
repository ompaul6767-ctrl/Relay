import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Case } from '../models/Case.js';
import { Source } from '../models/Source.js';
import { Span } from '../models/Span.js';
import { Claim } from '../models/Claim.js';
import { Version } from '../models/Version.js';
import { Acknowledgement } from '../models/Acknowledgement.js';
import { Audit, logAudit } from '../models/Audit.js';
import { splitIntoSpans } from '../services/spanSplitter.js';
import { runReconstructionPipeline } from '../services/verification/engine.js';
import { DEMO_USERS, signToken } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

/**
 * POST /api/demo/seed
 * One-click demo loader. Initializes or resets "Campus Event Portal" demo project
 * with all 6 sources and planted scenarios.
 */
router.post('/seed', async (req, res, next) => {
  try {
    const seedDir = path.resolve(__dirname, '../../../seed');

    // 1. Reset or find demo case
    let demoCase = await Case.findOne({ title: 'Campus Event Portal' });
    if (demoCase) {
      // Clean previous data for this case
      await Source.deleteMany({ caseId: demoCase._id });
      await Span.deleteMany({ caseId: demoCase._id });
      await Claim.deleteMany({ caseId: demoCase._id });
      await Version.deleteMany({ caseId: demoCase._id });
      await Acknowledgement.deleteMany({ caseId: demoCase._id });
      await Audit.deleteMany({ caseId: demoCase._id });
      demoCase.status = 'in_review';
      demoCase.currentVersion = 0;
      await demoCase.save();
    } else {
      demoCase = await Case.create({
        title: 'Campus Event Portal',
        departingMemberName: 'Aarav',
        status: 'in_review',
        createdBy: 'Maya (Lead)',
      });
    }

    const caseId = demoCase._id;

    // 2. Load all synthetic source files from /seed
    const sourceDefinitions = [
      {
        filename: 'meeting_notes_sprint_kickoff.md',
        type: 'notes',
        name: 'meeting_notes_sprint_kickoff.md',
        acl: 'team',
      },
      {
        filename: 'meeting_notes_mid_cycle_review.md',
        type: 'notes',
        name: 'meeting_notes_mid_cycle_review.md',
        acl: 'team',
      },
      {
        filename: 'meeting_notes_architecture_retro.md',
        type: 'notes',
        name: 'meeting_notes_architecture_retro.md',
        acl: 'team',
      },
      {
        filename: 'tasks_export.csv',
        type: 'tasks_csv',
        name: 'tasks_export.csv',
        acl: 'team',
      },
      {
        filename: 'team_chat_export.json',
        type: 'chat_json',
        name: 'team_chat_export.json',
        acl: 'team',
      },
      {
        filename: 'repo_commits_and_issues.md',
        type: 'repo_export',
        name: 'repo_commits_and_issues.md',
        acl: 'team',
      },
      {
        filename: 'leads_private_notes.md',
        type: 'notes',
        name: 'leads_private_notes.md',
        acl: 'leads_only',
      },
    ];

    let totalSpans = [];

    for (let i = 0; i < sourceDefinitions.length; i++) {
      const def = sourceDefinitions[i];
      const filePath = path.join(seedDir, def.filename);
      let rawText = '';

      if (fs.existsSync(filePath)) {
        rawText = fs.readFileSync(filePath, 'utf-8');
      } else {
        rawText = `# Synthetic Source: ${def.name}\nDefault content for demo.`;
      }

      const sourceNumber = i + 1;
      const splitResult = splitIntoSpans({
        rawText,
        type: def.type,
        sourceNumber,
        acl: def.acl,
      });

      const sourceDoc = await Source.create({
        caseId,
        name: def.name,
        type: def.type,
        acl: def.acl,
        consentConfirmed: true,
        rawText: splitResult.maskedText,
        uploadedBy: def.acl === 'leads_only' ? 'Maya (Lead)' : 'Aarav',
        metadata: {
          secretsMaskedCount: splitResult.secretMaskStats.count,
        },
      });

      const spansToInsert = splitResult.spans.map((s) => ({
        ...s,
        caseId,
        sourceId: sourceDoc._id,
        sourceName: def.name,
      }));

      const createdSpans = await Span.insertMany(spansToInsert);
      totalSpans = totalSpans.concat(createdSpans);
    }

    // 3. Run Reconstruction & Verification Pipeline
    const pipelineResult = await runReconstructionPipeline({
      spans: totalSpans,
      departingMember: 'Aarav',
      includeRestricted: true,
    });

    const claimsToInsert = pipelineResult.claims.map((c) => ({
      ...c,
      caseId,
    }));

    const insertedClaims = await Claim.insertMany(claimsToInsert);

    // 4. Pre-approve several Verified claims so handover preview is populated immediately
    // Note: Conflicting and Missing claims remain pending for judge review!
    await Claim.updateMany(
      {
        caseId,
        status: { $in: ['Verified', 'Inferred'] },
        entityKey: { $ne: 'payment_gateway' }, // keep payment gateway conflict pending
      },
      {
        $set: {
          reviewDecision: 'approved',
          reviewedBy: 'Maya (Lead)',
        },
      }
    );

    // 5. Create Version 1 snapshot
    const approvedSnapshot = await Claim.find({ caseId, reviewDecision: 'approved' }).lean();
    const version1 = await Version.create({
      caseId,
      number: 1,
      approvedClaimSnapshot: approvedSnapshot,
      publishedBy: 'Maya (Lead)',
      publishedAt: new Date(),
      diffFromPrevious: { added: approvedSnapshot.length, modified: 0, removed: 0, details: [] },
    });

    demoCase.currentVersion = 1;
    demoCase.status = 'published';
    await demoCase.save();

    await logAudit({
      caseId,
      actor: 'Demo Seeder',
      role: 'lead',
      action: 'seed_demo_project',
      targetId: String(caseId),
      metadata: {
        sourcesCount: sourceDefinitions.length,
        spansCount: totalSpans.length,
        claimsCount: insertedClaims.length,
      },
    });

    // Generate JWTs for demo roles
    const tokens = {
      lead: signToken(DEMO_USERS.lead),
      incoming_dev: signToken(DEMO_USERS.incoming_dev),
      incoming_designer: signToken(DEMO_USERS.incoming_designer),
    };

    return res.json({
      success: true,
      case: demoCase,
      tokens,
      summary: {
        sourcesCount: sourceDefinitions.length,
        spansCount: totalSpans.length,
        claimsCount: insertedClaims.length,
        publishedVersion: 1,
        approvedClaimsCount: approvedSnapshot.length,
        plantedScenariosVerified: 6,
      },
      message: 'Demo project "Campus Event Portal" successfully loaded with all 6 planted scenarios.',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
