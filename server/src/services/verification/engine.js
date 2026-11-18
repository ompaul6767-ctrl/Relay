import { extractClaims } from '../extractors/geminiExtractor.js';
import { verifyClaimCitations } from './quoteVerifier.js';
import { checkSupport } from './supportChecker.js';
import { detectConflicts } from './conflictDetector.js';
import { detectGaps } from './gapDetector.js';
import { detectKeyPersonRisk } from './keyPersonDetector.js';
import { detectStaleness } from './stalenessDetector.js';

/**
 * Full Reconstruction & Verification Engine
 * Orchestrates Extraction -> Heuristics -> Quote Verification -> Support Check -> Conflict Detection -> Gap Detection
 */
export async function runReconstructionPipeline({
  spans,
  departingMember = 'Aarav',
  includeRestricted = true,
}) {
  const spansMap = new Map(spans.map((s) => [s.stableId, s]));

  // Step 1: Claim Extraction (Gemini AI with automatic rule-based fallback)
  const extractionResult = await extractClaims({ spans, includeRestricted });
  let rawClaims = extractionResult.claims;

  // Step 2: Key-Person Heuristic Inference
  const keyPersonClaims = detectKeyPersonRisk(spans);
  rawClaims = [...rawClaims, ...keyPersonClaims];

  // Step 3: Deterministic Quote Verification
  const verifiedClaims = [];
  for (const claim of rawClaims) {
    const quoteCheck = verifyClaimCitations(claim, spansMap);
    if (!quoteCheck.isValid) {
      verifiedClaims.push({
        ...claim,
        status: 'Rejected',
        rejectionReason: quoteCheck.reason,
        spanRefs: quoteCheck.validatedSpanRefs,
      });
    } else {
      verifiedClaims.push({
        ...claim,
        spanRefs: quoteCheck.validatedSpanRefs,
      });
    }
  }

  // Step 4: Second-Pass Support Check for passing claims
  const supportedClaims = [];
  for (const claim of verifiedClaims) {
    if (claim.status === 'Rejected' || claim.status === 'Missing') {
      supportedClaims.push(claim);
      continue;
    }

    const quotes = (claim.spanRefs || []).map((r) => r.quote);
    const spanTexts = (claim.spanRefs || []).map((r) => spansMap.get(r.spanId)?.text || '');

    const supportResult = await checkSupport({
      claimText: claim.text,
      quotes,
      spanTexts,
    });

    let newStatus = claim.status;
    let verdict = supportResult.verdict;

    if (verdict === 'no') {
      // Demote to Inferred if previously Verified
      newStatus = 'Inferred';
    } else if (verdict === 'yes' && newStatus !== 'Inferred') {
      newStatus = 'Verified';
    }

    supportedClaims.push({
      ...claim,
      status: newStatus,
      aiSupportVerdict: verdict,
      supportReasoning: supportResult.reasoning,
    });
  }

  // Step 5: Conflict Detection (groups by entityKey + attribute)
  const nonRejectedClaims = supportedClaims.filter((c) => c.status !== 'Rejected');
  const rejectedClaims = supportedClaims.filter((c) => c.status === 'Rejected');
  const conflictResolvedClaims = detectConflicts(nonRejectedClaims);

  // Step 6: Gap Detection (unassigned tasks, decisions without reasons, open questions)
  const gapClaims = detectGaps({ spans, claims: conflictResolvedClaims, departingMember });

  // Merge all claims together
  const allClaims = [...conflictResolvedClaims, ...gapClaims, ...rejectedClaims];

  // Enforce strictest ACL from spans and derive evidence dates
  const datedClaims = allClaims.map((claim) => {
    let strictestAcl = claim.acl || 'team';
    let bestDate = null;
    let isEstimated = true;

    if (claim.spanRefs && claim.spanRefs.length > 0) {
      for (const ref of claim.spanRefs) {
        const span = spansMap.get(ref.spanId);
        if (span) {
          if (span.acl === 'leads_only') {
            strictestAcl = 'leads_only';
          }
          if (span.acl === 'owner_only' && strictestAcl !== 'leads_only') {
            strictestAcl = 'owner_only';
          }
          if (span.timestamp) {
            const d = new Date(span.timestamp);
            if (!isNaN(d.getTime())) {
              if (!bestDate || d > bestDate) {
                bestDate = d;
                isEstimated = false;
              }
            }
          }
        }
      }
    }

    if (!bestDate) {
      bestDate = new Date();
      isEstimated = true;
    }

    return {
      ...claim,
      acl: strictestAcl,
      timelineDate: claim.timelineDate || bestDate,
      dateEstimated: claim.dateEstimated !== undefined ? claim.dateEstimated : isEstimated,
    };
  });

  // Step 7: Staleness & Superseded Claims Detection (Improvement 3)
  const finalClaims = detectStaleness(datedClaims);

  // Calculate summary counts
  const summary = {
    total: finalClaims.length,
    byStatus: {
      Verified: finalClaims.filter((c) => c.status === 'Verified').length,
      Attested: finalClaims.filter((c) => c.status === 'Attested').length,
      Inferred: finalClaims.filter((c) => c.status === 'Inferred').length,
      Conflicting: finalClaims.filter((c) => c.status === 'Conflicting').length,
      Missing: finalClaims.filter((c) => c.status === 'Missing').length,
      Restricted: finalClaims.filter((c) => c.status === 'Restricted' || c.acl === 'leads_only').length,
      Rejected: finalClaims.filter((c) => c.status === 'Rejected').length,
    },
    byType: {
      owner: finalClaims.filter((c) => c.type === 'owner').length,
      decision: finalClaims.filter((c) => c.type === 'decision').length,
      risk: finalClaims.filter((c) => c.type === 'risk').length,
      dependency: finalClaims.filter((c) => c.type === 'dependency').length,
      question: finalClaims.filter((c) => c.type === 'question').length,
      action: finalClaims.filter((c) => c.type === 'action').length,
      fact: finalClaims.filter((c) => c.type === 'fact').length,
    },
    conflictsCount: finalClaims.filter((c) => c.status === 'Conflicting').length,
    gapsCount: finalClaims.filter((c) => c.status === 'Missing').length,
    staleCount: finalClaims.filter((c) => c.isStale).length,
  };

  return {
    claims: finalClaims,
    summary,
    usedFallback: extractionResult.usedFallback,
    bannerMessage: extractionResult.bannerMessage,
  };
}
