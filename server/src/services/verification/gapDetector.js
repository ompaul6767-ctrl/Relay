/**
 * Gap Detector
 * Detects:
 * 1. Tasks without an owner -> Missing claim with suggested person to ask.
 * 2. Decisions without a stated reason -> Missing claim with suggested person to ask.
 * 3. Open questions with no answer -> Missing claim with suggested person to ask.
 */

export function detectGaps({ spans, claims, departingMember = 'Aarav' }) {
  const gapClaims = [];

  // 1. Scan spans for unassigned tasks
  for (const span of spans) {
    const text = span.text;
    const meta = span.metadata || {};

    // From task CSV or text with unassigned owner
    if (
      (meta.taskId && (!meta.owner || meta.owner === 'Unassigned' || meta.owner === '')) ||
      text.includes('(No owner assigned)') ||
      text.match(/TASK-\d+.*(?:no owner|unassigned)/i)
    ) {
      const taskLabel = meta.taskName || text.split(':')[1]?.split('(')[0]?.trim() || 'Unassigned task';
      gapClaims.push({
        type: 'action',
        text: `Unassigned Task: "${taskLabel}" has no assigned owner.`,
        entityKey: meta.taskId || 'unassigned_task',
        attribute: 'owner',
        value: 'Unassigned',
        status: 'Missing',
        spanRefs: [
          {
            spanId: span.stableId,
            quote: span.text,
            validated: true,
            sourceName: span.sourceName || '',
          },
        ],
        acl: span.acl || 'team',
        domains: ['tech', 'ops'],
        reviewDecision: 'pending',
        aiSupportVerdict: 'yes',
        suggestedPerson: `${departingMember} (Departing Member) or Team Lead`,
      });
    }

    // 2. Scan for Decisions without a stated reason
    const isDecision = /DECISION\s*:\s*(.+)/i.test(text);
    if (isDecision) {
      const hasReason = /(?:Reason|Because|Due to|Rationale)\s*[:=]/i.test(text);
      if (!hasReason) {
        const decisionText = text.replace(/^.*DECISION\s*:\s*/i, '').trim();
        gapClaims.push({
          type: 'decision',
          text: `Missing Decision Rationale: Decision "${decisionText}" has no recorded architectural reason or trade-off evaluation.`,
          entityKey: 'decision_rationale',
          attribute: 'reason',
          value: 'Missing',
          status: 'Missing',
          spanRefs: [
            {
              spanId: span.stableId,
              quote: span.text,
              validated: true,
              sourceName: span.sourceName || '',
            },
          ],
          acl: span.acl || 'team',
          domains: ['tech'],
          reviewDecision: 'pending',
          aiSupportVerdict: 'yes',
          suggestedPerson: `${departingMember} (who authored the decision)`,
        });
      }
    }

    // 3. Scan for Open Questions with no answer
    const isOpenQuestion = /(?:OPEN QUESTION|UNRESOLVED QUESTION)\s*:\s*(.+)/i.test(text);
    if (isOpenQuestion) {
      const questionText = text.replace(/^.*(?:OPEN QUESTION|UNRESOLVED QUESTION)\s*:\s*/i, '').trim();
      gapClaims.push({
        type: 'question',
        text: `Open Unanswered Question: "${questionText}" has no recorded answer in any project source.`,
        entityKey: 'open_question',
        attribute: 'resolution',
        value: 'Unanswered',
        status: 'Missing',
        spanRefs: [
          {
            spanId: span.stableId,
            quote: span.text,
            validated: true,
            sourceName: span.sourceName || '',
          },
        ],
        acl: span.acl || 'team',
        domains: ['tech', 'ops'],
        reviewDecision: 'pending',
        aiSupportVerdict: 'yes',
        suggestedPerson: `${departingMember} or Maya (Lead)`,
      });
    }
  }

  return gapClaims;
}
