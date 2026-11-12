import { connectDB, disconnectDB } from '../src/config/database.js';
import { Case } from '../src/models/Case.js';
import { Source } from '../src/models/Source.js';
import { Span } from '../src/models/Span.js';
import { Claim } from '../src/models/Claim.js';
import { Version } from '../src/models/Version.js';
import { Acknowledgement } from '../src/models/Acknowledgement.js';
import { Audit, logAudit } from '../src/models/Audit.js';
import { splitIntoSpans } from '../src/services/spanSplitter.js';
import { runReconstructionPipeline } from '../src/services/verification/engine.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSeed() {
  console.log('🌱 [Seed Script] Starting synthetic demo seeding for "Campus Event Portal"...');
  await connectDB();

  const seedDir = path.resolve(__dirname, '../../seed');

  // Find or create demo case
  let demoCase = await Case.findOne({ title: 'Campus Event Portal' });
  if (demoCase) {
    console.log('🧹 [Seed] Cleaning existing data for Campus Event Portal...');
    await Source.deleteMany({ caseId: demoCase._id });
    await Span.deleteMany({ caseId: demoCase._id });
    await Claim.deleteMany({ caseId: demoCase._id });
    await Version.deleteMany({ caseId: demoCase._id });
    await Acknowledgement.deleteMany({ caseId: demoCase._id });
    await Audit.deleteMany({ caseId: demoCase._id });
  } else {
    demoCase = await Case.create({
      title: 'Campus Event Portal',
      departingMemberName: 'Aarav',
      status: 'in_review',
      createdBy: 'Maya (Lead)',
    });
  }

  const caseId = demoCase._id;
  console.log(`📁 [Seed] Case initialized: ID ${caseId}`);

  const sourceDefinitions = [
    { filename: 'meeting_notes_sprint_kickoff.md', type: 'notes', acl: 'team' },
    { filename: 'meeting_notes_mid_cycle_review.md', type: 'notes', acl: 'team' },
    { filename: 'meeting_notes_architecture_retro.md', type: 'notes', acl: 'team' },
    { filename: 'tasks_export.csv', type: 'tasks_csv', acl: 'team' },
    { filename: 'team_chat_export.json', type: 'chat_json', acl: 'team' },
    { filename: 'repo_commits_and_issues.md', type: 'repo_export', acl: 'team' },
    { filename: 'leads_private_notes.md', type: 'notes', acl: 'leads_only' },
  ];

  let totalSpans = [];

  for (let i = 0; i < sourceDefinitions.length; i++) {
    const def = sourceDefinitions[i];
    const filePath = path.join(seedDir, def.filename);
    const rawText = fs.readFileSync(filePath, 'utf-8');
    const sourceNumber = i + 1;

    const splitResult = splitIntoSpans({
      rawText,
      type: def.type,
      sourceNumber,
      acl: def.acl,
    });

    const sourceDoc = await Source.create({
      caseId,
      name: def.filename,
      type: def.type,
      acl: def.acl,
      consentConfirmed: true,
      rawText: splitResult.maskedText,
      uploadedBy: def.acl === 'leads_only' ? 'Maya (Lead)' : 'Aarav',
      metadata: { secretsMasked: splitResult.secretMaskStats.count },
    });

    const spansToInsert = splitResult.spans.map((s) => ({
      ...s,
      caseId,
      sourceId: sourceDoc._id,
      sourceName: def.filename,
    }));

    const createdSpans = await Span.insertMany(spansToInsert);
    totalSpans = totalSpans.concat(createdSpans);
    console.log(`  ✓ Loaded [${def.acl}] ${def.filename}: ${createdSpans.length} spans`);
  }

  console.log(`\n⚙️ [Seed] Running Reconstruction and Verification Pipeline...`);
  const pipelineResult = await runReconstructionPipeline({
    spans: totalSpans,
    departingMember: 'Aarav',
    includeRestricted: true,
  });

  const claimsToInsert = pipelineResult.claims.map((c) => ({
    ...c,
    caseId,
  }));
  const createdClaims = await Claim.insertMany(claimsToInsert);

  console.log(`  ✓ Total claims generated: ${createdClaims.length}`);
  console.log(`    - Verified: ${pipelineResult.summary.byStatus.Verified}`);
  console.log(`    - Conflicting: ${pipelineResult.summary.byStatus.Conflicting}`);
  console.log(`    - Missing (Gaps): ${pipelineResult.summary.byStatus.Missing}`);
  console.log(`    - Inferred: ${pipelineResult.summary.byStatus.Inferred}`);
  console.log(`    - Leads Only (Restricted): ${pipelineResult.summary.byStatus.Restricted}`);
  console.log(`    - Rejected: ${pipelineResult.summary.byStatus.Rejected}`);

  // Pre-approve verified claims so handover view has content
  await Claim.updateMany(
    {
      caseId,
      status: { $in: ['Verified', 'Inferred'] },
      entityKey: { $ne: 'payment_gateway' }, // leave conflict for lead review!
    },
    {
      $set: {
        reviewDecision: 'approved',
        reviewedBy: 'Maya (Lead)',
      },
    }
  );

  const approvedSnapshot = await Claim.find({ caseId, reviewDecision: 'approved' }).lean();
  await Version.create({
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
    actor: 'CLI Seed Runner',
    role: 'lead',
    action: 'seed_database',
    targetId: String(caseId),
    metadata: { totalClaims: createdClaims.length },
  });

  console.log(`\n🎉 [Seed] Seeding completed successfully! Version 1 published.`);
  await disconnectDB();
}

runSeed().catch((err) => {
  console.error('❌ [Seed Error]', err);
  process.exit(1);
});
