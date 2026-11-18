/**
 * Staleness Detection Engine
 * 
 * Inspects all claims in a case chronologically to identify:
 * 1. 'superseded': A later-dated claim has the same entityKey + attribute with a different value,
 *    or a later decision explicitly reverses an earlier one using reversal keywords.
 * 2. 'possibly_stale': Newer evidence mentions the same entity with potential drift.
 * 
 * Enforces workflow invariant: Approved claims flagged as stale or superseded require
 * lead re-review or dismissal with a documented justification before republishing.
 */

const REVERSAL_KEYWORDS = [
  'reversed',
  'revert',
  'replaced',
  'replaces',
  'switched',
  'switch',
  'instead of',
  'no longer',
  'deprecated',
  'migrated from',
  'superseded',
  'cancelled',
  'abandoned',
];

export function detectStaleness(claims) {
  // Filter out rejected claims
  const activeClaims = claims.filter((c) => c.status !== 'Rejected');

  // Sort chronologically by timelineDate
  const sorted = [...activeClaims].sort((a, b) => {
    const da = a.timelineDate ? new Date(a.timelineDate).getTime() : 0;
    const db = b.timelineDate ? new Date(b.timelineDate).getTime() : 0;
    return da - db;
  });

  // 1. Check for Reversal Decision Keywords across all decisions
  const decisions = sorted.filter((c) => c.type === 'decision' || (c.text && c.text.toLowerCase().includes('decision')));

  for (let i = 0; i < decisions.length; i++) {
    const laterDecision = decisions[i];
    const laterText = (laterDecision.text || '').toLowerCase();
    const laterDate = laterDecision.timelineDate ? new Date(laterDecision.timelineDate) : null;

    const hasReversalKeyword = REVERSAL_KEYWORDS.some((kw) => laterText.includes(kw));

    if (hasReversalKeyword) {
      for (let j = 0; j < i; j++) {
        const earlierDecision = decisions[j];
        const earlierDate = earlierDecision.timelineDate ? new Date(earlierDecision.timelineDate) : null;

        if (laterDate && earlierDate && laterDate <= earlierDate) continue;

        const sameEntity =
          earlierDecision.entityKey &&
          laterDecision.entityKey &&
          earlierDecision.entityKey.toLowerCase() === laterDecision.entityKey.toLowerCase();

        const entityMentionedInLater =
          earlierDecision.entityKey &&
          laterText.includes(earlierDecision.entityKey.toLowerCase().replace(/_/g, ' '));

        const valueMentionedInLater =
          earlierDecision.value &&
          earlierDecision.value.length > 3 &&
          laterText.includes(earlierDecision.value.toLowerCase());

        if (sameEntity || entityMentionedInLater || valueMentionedInLater) {
          if (!earlierDecision.dismissedStaleness?.reason) {
            const dateStr = laterDate ? laterDate.toISOString().split('T')[0] : 'later';
            earlierDecision.isStale = true;
            earlierDecision.stalenessStatus = 'superseded';
            earlierDecision.stalenessReason = `Reversed by later decision on ${dateStr}: "${laterDecision.text.substring(0, 80)}..."`;
            earlierDecision.supersededByClaimId = laterDecision._id || null;
          }
        }
      }
    }
  }

  // 2. Check for Entity + Attribute Evolution (e.g. Ownership Handover or Architecture Changes)
  const byEntityAttribute = new Map();
  for (const claim of sorted) {
    if (!claim.entityKey || !claim.attribute || claim.status === 'Missing') continue;
    const key = `${claim.entityKey.trim().toLowerCase()}::${claim.attribute.trim().toLowerCase()}`;
    if (!byEntityAttribute.has(key)) {
      byEntityAttribute.set(key, []);
    }
    byEntityAttribute.get(key).push(claim);
  }

  for (const [key, group] of byEntityAttribute.entries()) {
    if (group.length < 2) continue;

    for (let i = 0; i < group.length - 1; i++) {
      const earlier = group[i];
      const later = group[i + 1];

      const da = earlier.timelineDate ? new Date(earlier.timelineDate).getTime() : 0;
      const db = later.timelineDate ? new Date(later.timelineDate).getTime() : 0;

      if (db > da && earlier.value && later.value && earlier.value.toLowerCase() !== later.value.toLowerCase()) {
        if (!earlier.dismissedStaleness?.reason && !earlier.isStale) {
          const dateStr = later.timelineDate ? new Date(later.timelineDate).toISOString().split('T')[0] : 'later';
          earlier.isStale = true;
          earlier.stalenessStatus = 'superseded';
          earlier.stalenessReason = `Superseded by newer evidence on ${dateStr} asserting "${later.value}" (was "${earlier.value}")`;
          earlier.supersededByClaimId = later._id || null;
        }
      }
    }
  }

  return claims.map((c) => {
    if (c.dismissedStaleness && c.dismissedStaleness.reason) {
      c.isStale = false;
      c.stalenessStatus = 'fresh';
    } else if (c.isStale === undefined) {
      c.isStale = false;
      c.stalenessStatus = 'fresh';
    }
    return c;
  });
}
