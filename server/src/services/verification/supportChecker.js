import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../config/environment.js';
import { normaliseWhitespace } from './quoteVerifier.js';

let geminiClient = null;
let aiTemporarilyUnavailable = false;
if (env.GEMINI_API_KEY) {
  try {
    geminiClient = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  } catch (e) {
    console.warn('[SupportChecker] Could not initialize Gemini client:', e.message);
  }
}

/**
 * Evaluates whether cited spans logically support the proposed claim.
 * Returns: { verdict: 'yes' | 'partial' | 'no', reasoning: string, usedAi: boolean }
 */
export async function checkSupport({ claimText, quotes, spanTexts }) {
  if (!quotes || quotes.length === 0) {
    return { verdict: 'partial', reasoning: 'No direct quotes available for support verification', usedAi: false };
  }

  // If Gemini API is available and hasn't experienced high demand/timeout, perform second-pass AI verification
  if (geminiClient && env.GEMINI_API_KEY && !aiTemporarilyUnavailable) {
    try {
      const model = geminiClient.getGenerativeModel({
        model: env.GEMINI_MODEL || 'gemini-3.8-flash',
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      });

      const prompt = `You are a strict factual consistency auditor for software project handovers.
Evaluate whether the provided source span quotes logically support the atomic claim.
Source Quotes:
${quotes.map((q, idx) => `[Quote ${idx + 1}]: "${q}"`).join('\n')}

Claim:
"${claimText}"

Respond with strict JSON adhering to this schema:
{
  "verdict": "yes" | "partial" | "no",
  "reasoning": "brief 1-sentence explanation"
}
Rules:
- "yes": The quote directly asserts or proves the claim.
- "partial": The quote relates to the claim but requires slight extrapolation.
- "no": The quote contradicts or completely fails to support the claim.`;

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Support check timed out')), 5000)
      );

      const result = await Promise.race([model.generateContent(prompt), timeoutPromise]);
      const responseText = result.response.text();
      const parsed = JSON.parse(responseText);

      if (['yes', 'partial', 'no'].includes(parsed.verdict)) {
        return {
          verdict: parsed.verdict,
          reasoning: parsed.reasoning || 'AI support check evaluated',
          usedAi: true,
        };
      }
    } catch (aiErr) {
      aiTemporarilyUnavailable = true;
      console.warn('[SupportChecker] Gemini call failed or quota reached, using deterministic rule fallback for subsequent checks:', aiErr.message);
    }
  }

  // Deterministic fallback support check
  return deterministicSupportCheck({ claimText, quotes });
}

export function deterministicSupportCheck({ claimText, quotes }) {
  const normClaim = normaliseWhitespace(claimText).toLowerCase();
  const allQuotes = quotes.map((q) => normaliseWhitespace(q).toLowerCase()).join(' ');

  // Tokenize claim words (excluding small stop words)
  const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'to', 'for', 'of', 'with', 'by']);
  const claimWords = normClaim
    .split(/[^a-z0-9_-]+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  if (claimWords.length === 0) {
    return { verdict: 'partial', reasoning: 'Deterministic check: Insufficient tokens in claim', usedAi: false };
  }

  let matchedWords = 0;
  for (const word of claimWords) {
    if (allQuotes.includes(word)) {
      matchedWords++;
    }
  }

  const overlapRatio = matchedWords / claimWords.length;

  // Check for contradiction signals
  const negationWords = ['not', 'never', 'refused', 'cancelled', 'rejected'];
  const claimHasNegation = negationWords.some((n) => normClaim.includes(n));
  const quoteHasNegation = negationWords.some((n) => allQuotes.includes(n));

  if (claimHasNegation !== quoteHasNegation && overlapRatio > 0.6) {
    return {
      verdict: 'no',
      reasoning: 'Deterministic check: Polarity mismatch / negation discrepancy between quote and claim',
      usedAi: false,
    };
  }

  if (overlapRatio >= 0.5) {
    return {
      verdict: 'yes',
      reasoning: `Deterministic check: High lexical support overlap (${Math.round(overlapRatio * 100)}%)`,
      usedAi: false,
    };
  } else if (overlapRatio >= 0.25) {
    return {
      verdict: 'partial',
      reasoning: `Deterministic check: Partial lexical support overlap (${Math.round(overlapRatio * 100)}%)`,
      usedAi: false,
    };
  } else {
    return {
      verdict: 'no',
      reasoning: `Deterministic check: Insufficient support in cited quote (${Math.round(overlapRatio * 100)}% overlap)`,
      usedAi: false,
    };
  }
}
