/**
 * Conflict Detector
 * Groups claims by entityKey + attribute (e.g. owner of "payment gateway").
 * If different values are asserted from different sources/spans, produces a Conflicting claim
 * showing both sources, dates, and values. Never auto-picks a winner.
 */

export function detectConflicts(claims) {
  const groups = new Map();
  const nonGroupableClaims = [];

  for (const claim of claims) {
    // Only group claims that have an explicit entityKey and attribute
    if (!claim.entityKey || !claim.attribute || claim.status === 'Missing' || claim.status === 'Rejected') {
      nonGroupableClaims.push(claim);
      continue;
    }

    const key = `${claim.entityKey.trim().toLowerCase()}::${claim.attribute.trim().toLowerCase()}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(claim);
  }

  const processedClaims = [...nonGroupableClaims];

  for (const [key, group] of groups.entries()) {
    if (group.length === 1) {
      processedClaims.push(group[0]);
      continue;
    }

    // Check if the values actually conflict (case-insensitive normalized check)
    const normalizedValues = new Set(
      group.map((c) => c.value?.trim().toLowerCase()).filter(Boolean)
    );

    if (normalizedValues.size <= 1) {
      // All values agree, keep them (or keep first with combined citations)
      processedClaims.push(...group);
      continue;
    }

    // We have a true conflict!
    const [entityKey, attribute] = key.split('::');
    const conflictingItems = group.map((c) => {
      const sourceName = c.spanRefs?.[0]?.sourceName || 'Unknown source';
      const quote = c.spanRefs?.[0]?.quote || '';
      const spanId = c.spanRefs?.[0]?.spanId || '';
      return {
        value: c.value,
        source: sourceName,
        spanId,
        quote,
        date: c.timelineDate || null,
        originalText: c.text,
      };
    });

    const valuesSummary = group.map((c) => c.value).join(' vs ');
    const conflictDescription = `Conflicting ${attribute} for ${entityKey.replace(/_/g, ' ')}: ${conflictingItems
      .map((item) => `"${item.value}" (from ${item.source || item.spanId})`)
      .join(' vs ')}. A human lead must resolve this dispute.`;

    // Combine span refs
    const allSpanRefs = [];
    const seenSpans = new Set();
    group.forEach((c) => {
      (c.spanRefs || []).forEach((ref) => {
        if (!seenSpans.has(ref.spanId)) {
          seenSpans.add(ref.spanId);
          allSpanRefs.push(ref);
        }
      });
    });

    // Create the merged Conflicting claim
    const conflictClaim = {
      type: group[0].type || 'owner',
      text: conflictDescription,
      entityKey,
      attribute,
      value: valuesSummary,
      status: 'Conflicting',
      spanRefs: allSpanRefs,
      acl: group.some((c) => c.acl === 'leads_only') ? 'leads_only' : 'team',
      domains: Array.from(new Set(group.flatMap((c) => c.domains || ['tech']))),
      reviewDecision: 'pending',
      aiSupportVerdict: 'partial',
      conflictDetails: {
        entityKey,
        attribute,
        conflictingValues: conflictingItems,
      },
    };

    processedClaims.push(conflictClaim);
  }

  return processedClaims;
}
