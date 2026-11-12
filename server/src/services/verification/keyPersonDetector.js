/**
 * Heuristic Inference Detector (Key-Person Risk)
 * Rule: A person with at least 75% of at least 3 commits in a module is flagged
 * as the likely only person who knows that module (label: Inferred).
 */

export function detectKeyPersonRisk(spans) {
  const moduleCommits = new Map();

  for (const span of spans) {
    let moduleName = span.metadata?.moduleName;
    let author = span.metadata?.author || span.author;

    // If metadata did not catch module, regex test from text
    if (!moduleName && span.text) {
      const match = span.text.match(/\(([a-zA-Z0-9_\-\/]+)\)\s*:/);
      if (match) {
        moduleName = match[1];
      }
    }

    if (!moduleName) continue;
    // Standardize author name
    if (author) {
      author = author.split('<')[0].trim();
    }

    if (!moduleCommits.has(moduleName)) {
      moduleCommits.set(moduleName, []);
    }

    moduleCommits.get(moduleName).push({
      author,
      spanId: span.stableId,
      quote: span.text.split('\n')[0] || span.text,
      timestamp: span.timestamp,
    });
  }

  const riskClaims = [];

  for (const [moduleName, commits] of moduleCommits.entries()) {
    const total = commits.length;
    if (total < 3) continue; // Minimum 3 commits required by specification

    const authorCounts = new Map();
    for (const c of commits) {
      authorCounts.set(c.author, (authorCounts.get(c.author) || 0) + 1);
    }

    for (const [author, count] of authorCounts.entries()) {
      const fraction = count / total;
      if (fraction >= 0.75) {
        const percentage = Math.round(fraction * 100);
        const text = `Key-Person Risk (Heuristic): ${author} authored ${percentage}% (${count} of ${total}) commits in "${moduleName}". Flagged as the single primary point of failure/knowledge for this module.`;

        riskClaims.push({
          type: 'risk',
          text,
          entityKey: moduleName,
          attribute: 'key_person_dependency',
          value: author,
          status: 'Inferred',
          spanRefs: commits.slice(0, 3).map((c) => ({
            spanId: c.spanId,
            quote: c.quote,
            validated: true,
          })),
          acl: 'team',
          domains: ['tech'],
          reviewDecision: 'pending',
          aiSupportVerdict: 'yes',
        });
      }
    }
  }

  return riskClaims;
}
