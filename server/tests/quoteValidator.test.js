import { describe, it, expect } from 'vitest';
import { verifyClaimCitations, normaliseWhitespace } from '../src/services/verification/quoteVerifier.js';

describe('Deterministic Quote Verifier', () => {
  const spansMap = new Map([
    [
      'S1.L3',
      {
        stableId: 'S1.L3',
        text: 'DECISION: We will use PostgreSQL timeseries for audit logging due to compliance query requirements.',
        sourceName: 'meeting_notes.md',
      },
    ],
  ]);

  it('should pass for exact verbatim quote match', () => {
    const claim = {
      type: 'decision',
      text: 'Switched to PostgreSQL for audit logging',
      spanRefs: [
        {
          spanId: 'S1.L3',
          quote: 'We will use PostgreSQL timeseries for audit logging',
        },
      ],
    };

    const res = verifyClaimCitations(claim, spansMap);
    expect(res.isValid).toBe(true);
    expect(res.validatedSpanRefs[0].validated).toBe(true);
  });

  it('should pass across whitespace and newline differences', () => {
    const claim = {
      type: 'decision',
      text: 'Switched to PostgreSQL',
      spanRefs: [
        {
          spanId: 'S1.L3',
          quote: 'We   will  use\nPostgreSQL   timeseries',
        },
      ],
    };

    const res = verifyClaimCitations(claim, spansMap);
    expect(res.isValid).toBe(true);
  });

  it('should fail deterministically when quote is altered or fabricated', () => {
    const claim = {
      type: 'decision',
      text: 'Fabricated decision',
      spanRefs: [
        {
          spanId: 'S1.L3',
          quote: 'We decided to use MongoDB Atlas on Azure cloud',
        },
      ],
    };

    const res = verifyClaimCitations(claim, spansMap);
    expect(res.isValid).toBe(false);
    expect(res.reason).toContain('citation failed');
  });

  it('should fail when cited span ID does not exist', () => {
    const claim = {
      type: 'fact',
      text: 'Some fact',
      spanRefs: [
        {
          spanId: 'S99.L999',
          quote: 'Non-existent quote',
        },
      ],
    };

    const res = verifyClaimCitations(claim, spansMap);
    expect(res.isValid).toBe(false);
    expect(res.reason).toContain('does not exist in this case');
  });
});
