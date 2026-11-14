import { describe, it, expect } from 'vitest';
import { detectConflicts } from '../src/services/verification/conflictDetector.js';
import { detectGaps } from '../src/services/verification/gapDetector.js';
import { detectKeyPersonRisk } from '../src/services/verification/keyPersonDetector.js';

describe('Conflict Detection Engine', () => {
  it('should group claims by entityKey + attribute and flag conflicting values without auto-picking a winner', () => {
    const claims = [
      {
        type: 'owner',
        text: 'Owner of Payment Gateway is Aarav',
        entityKey: 'payment_gateway',
        attribute: 'owner',
        value: 'Aarav',
        status: 'Verified',
        spanRefs: [{ spanId: 'S1.L1', quote: 'Aarav', sourceName: 'tasks.csv' }],
      },
      {
        type: 'owner',
        text: 'Priya took over Payment Gateway',
        entityKey: 'payment_gateway',
        attribute: 'owner',
        value: 'Priya',
        status: 'Verified',
        spanRefs: [{ spanId: 'S2.L1', quote: 'Priya', sourceName: 'chat.json' }],
      },
    ];

    const processed = detectConflicts(claims);
    expect(processed.length).toBe(1);
    expect(processed[0].status).toBe('Conflicting');
    expect(processed[0].entityKey).toBe('payment_gateway');
    expect(processed[0].conflictDetails.conflictingValues.length).toBe(2);
    expect(processed[0].text).toContain('Aarav');
    expect(processed[0].text).toContain('Priya');
  });
});

describe('Gap Detection Engine', () => {
  it('should detect unassigned tasks, missing decision rationale, and open questions', () => {
    const spans = [
      {
        stableId: 'S1.L1',
        text: 'TASK-108: Notification Service Migration (No owner assigned)',
        metadata: { taskId: 'TASK-108', taskName: 'Notification Service Migration', owner: '' },
        acl: 'team',
      },
      {
        stableId: 'S1.L2',
        text: 'DECISION: We decided to migrate from REST to gRPC for the ticket scanner API.',
        acl: 'team',
      },
      {
        stableId: 'S1.L3',
        text: 'OPEN QUESTION: Who has the master encryption keys for QR code ticket generation?',
        acl: 'team',
      },
    ];

    const gaps = detectGaps({ spans, claims: [], departingMember: 'Aarav' });
    expect(gaps.length).toBe(3);

    const taskGap = gaps.find((g) => g.entityKey === 'TASK-108');
    expect(taskGap).toBeDefined();
    expect(taskGap.status).toBe('Missing');

    const decisionGap = gaps.find((g) => g.entityKey === 'decision_rationale');
    expect(decisionGap).toBeDefined();
    expect(decisionGap.status).toBe('Missing');

    const questionGap = gaps.find((g) => g.entityKey === 'open_question');
    expect(questionGap).toBeDefined();
    expect(questionGap.status).toBe('Missing');
  });
});

describe('Key-Person Risk Heuristic', () => {
  it('should flag an Inferred key-person risk if one author has >= 75% of >= 3 commits in a module', () => {
    const spans = [
      { stableId: 'S1.L1', text: 'feat(services/ticket-scanner): init', author: 'Aarav', metadata: { moduleName: 'services/ticket-scanner', author: 'Aarav' } },
      { stableId: 'S1.L2', text: 'perf(services/ticket-scanner): cache', author: 'Aarav', metadata: { moduleName: 'services/ticket-scanner', author: 'Aarav' } },
      { stableId: 'S1.L3', text: 'fix(services/ticket-scanner): buffer', author: 'Aarav', metadata: { moduleName: 'services/ticket-scanner', author: 'Aarav' } },
      { stableId: 'S1.L4', text: 'refactor(services/ticket-scanner): clean', author: 'Priya', metadata: { moduleName: 'services/ticket-scanner', author: 'Priya' } },
    ];

    const risks = detectKeyPersonRisk(spans);
    expect(risks.length).toBe(1);
    expect(risks[0].status).toBe('Inferred');
    expect(risks[0].value).toBe('Aarav');
    expect(risks[0].text).toContain('75% (3 of 4)');
  });
});
