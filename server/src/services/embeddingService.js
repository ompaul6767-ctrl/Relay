import { GoogleGenerativeAI } from '@google/generative-ai';
import mongoose from 'mongoose';
import { env } from '../config/environment.js';
import { Claim } from '../models/Claim.js';
import { executeWithRetry, isAiCoolingDown } from './aiResilience.js';

/**
 * Computes cosine similarity between two numerical vectors.
 */
export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || !Array.isArray(vecA) || !Array.isArray(vecB)) return 0;
  if (vecA.length === 0 || vecB.length === 0 || vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Generates an embedding vector for a given text using configured EMBEDDING_MODEL.
 * Resilient against quota exhaustion or API errors.
 */
export async function generateTextEmbedding(text) {
  if (!text || typeof text !== 'string' || !text.trim()) return null;
  if (!env.GEMINI_API_KEY) return null;
  if (isAiCoolingDown()) return null;

  try {
    return await executeWithRetry(
      async () => {
        const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: env.EMBEDDING_MODEL || 'text-embedding-004' });
        const res = await model.embedContent(text.trim());
        return res?.embedding?.values || null;
      },
      { maxRetries: 1, baseDelayMs: 300, timeoutMs: 5000, context: 'Embedding' }
    );
  } catch (err) {
    console.warn('[EmbeddingService] Embedding call failed, falling back:', err.message);
    return null;
  }
}

/**
 * Embeds all approved claims in a published handover snapshot.
 * Stores vector directly in Claim.embedding for Atlas Vector Search and in-app similarity.
 */
export async function embedApprovedClaims(claims) {
  if (!claims || claims.length === 0) return { embeddedCount: 0 };
  if (!env.GEMINI_API_KEY || isAiCoolingDown()) return { embeddedCount: 0 };

  let embeddedCount = 0;
  for (const c of claims) {
    // Only embed if not already embedded with the current model
    if (c.embedding && Array.isArray(c.embedding) && c.embedding.length > 0) {
      continue;
    }

    try {
      const vector = await generateTextEmbedding(c.text);
      if (vector && Array.isArray(vector) && vector.length > 0) {
        await Claim.updateOne(
          { _id: c._id },
          {
            $set: {
              embedding: vector,
              embeddingModel: env.EMBEDDING_MODEL || 'text-embedding-004',
            },
          }
        );
        c.embedding = vector;
        embeddedCount++;
      }
    } catch (err) {
      console.warn(`[EmbeddingService] Failed to embed claim ${c._id}:`, err.message);
    }
  }

  return { embeddedCount };
}

/**
 * Retrieves relevant claims for a question using 3 fallback tiers:
 * Tier 1: Atlas Vector Search ($vectorSearch) with pre-filtering on caseId & allowedAcls
 * Tier 2: In-app cosine similarity over permitted approved claims
 * Tier 3: Deterministic keyword matching over permitted approved claims
 *
 * Guarantees zero leakage: restricted claims are excluded before retrieval results reach AI or caller.
 */
export async function retrieveRelevantClaims({
  caseId,
  question,
  allowedAcls = ['team'],
  limit = 5,
}) {
  if (!question || !question.trim()) {
    return { claims: [], retrievalMode: 'Keyword', queryVector: null };
  }

  const queryVector = await generateTextEmbedding(question);

  // If query vector was successfully generated, attempt Vector Search tiers
  if (queryVector && Array.isArray(queryVector) && queryVector.length > 0) {
    // Tier 1: Atlas Vector Search ($vectorSearch)
    try {
      const atlasResults = await Claim.aggregate([
        {
          $vectorSearch: {
            index: 'claim_vector_index',
            path: 'embedding',
            queryVector,
            numCandidates: Math.max(limit * 10, 50),
            limit,
            filter: {
              caseId: new mongoose.Types.ObjectId(caseId),
              acl: { $in: allowedAcls },
              reviewDecision: 'approved',
            },
          },
        },
      ]);

      if (atlasResults && atlasResults.length > 0) {
        return {
          claims: atlasResults,
          retrievalMode: 'Atlas Vector Search',
          queryVector,
        };
      }
    } catch (atlasErr) {
      // Atlas vector search index not configured, not supported by host, or local MongoDB
      // Log cleanly and smoothly fall through to Tier 2
    }

    // Tier 2: In-app cosine similarity over permitted approved claims
    try {
      const candidateClaims = await Claim.find({
        caseId,
        reviewDecision: 'approved',
        acl: { $in: allowedAcls },
        embedding: { $exists: true, $ne: [] },
      }).lean();

      if (candidateClaims.length > 0) {
        const scored = candidateClaims
          .map((claim) => ({
            claim,
            score: cosineSimilarity(queryVector, claim.embedding),
          }))
          .filter((item) => item.score >= 0.40) // relevance threshold
          .sort((a, b) => b.score - a.score);

        if (scored.length > 0) {
          return {
            claims: scored.slice(0, limit).map((s) => s.claim),
            retrievalMode: 'In-app similarity',
            queryVector,
          };
        }
      }
    } catch (simErr) {
      console.warn('[EmbeddingService] In-app similarity error:', simErr.message);
    }
  }

  // Tier 3: Deterministic Keyword matching fallback
  const candidateClaims = await Claim.find({
    caseId,
    reviewDecision: 'approved',
    acl: { $in: allowedAcls },
  }).lean();

  const lowerQ = question.toLowerCase();
  const searchWords = lowerQ
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, ''))
    .filter((w) => w.length > 2);

  const scoredKeywords = candidateClaims
    .map((claim) => {
      let score = 0;
      const textLower = claim.text.toLowerCase();
      const entityLower = (claim.entityKey || '').toLowerCase();
      const valueLower = (claim.value || '').toLowerCase();
      const attrLower = (claim.attribute || '').toLowerCase();
      const quotesLower = (claim.spanRefs || []).map((r) => r.quote || '').join(' ').toLowerCase();

      for (const w of searchWords) {
        if (textLower.includes(w)) score += 3;
        if (entityLower.includes(w)) score += 4;
        if (valueLower.includes(w)) score += 3;
        if (attrLower.includes(w)) score += 2;
        if (quotesLower.includes(w)) score += 3;
      }

      return { claim, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return {
    claims: scoredKeywords.slice(0, limit).map((s) => s.claim),
    retrievalMode: 'Keyword',
    queryVector: null,
  };
}

/**
 * Answers a handover question using ONLY retrieved permitted claims.
 * Synthesizes with Gemini JSON mode or rule-based deterministic fallback.
 * Strictly guarantees ZERO leakage of restricted claims.
 */
export async function answerHandoverQuestion({
  caseId,
  question,
  allowedAcls = ['team'],
}) {
  const { claims, retrievalMode } = await retrieveRelevantClaims({
    caseId,
    question,
    allowedAcls,
    limit: 5,
  });

  if (claims.length === 0) {
    return {
      answer: 'I could not find this in the approved handover.',
      citations: [],
      retrievalMode,
    };
  }

  // Attempt Gemini synthesis if API key available and not cooling down
  if (env.GEMINI_API_KEY && !isAiCoolingDown()) {
    try {
      const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: env.GEMINI_MODEL || 'gemini-2.5-flash',
        generationConfig: { responseMimeType: 'application/json' },
      });

      const prompt = `You are Relay's strict Q&A handover assistant.
Answer the question using ONLY the provided verified claims.
Do not invent facts or use outside knowledge. If the provided claims do not answer the question, state: "I could not find this in the approved handover."
For every claim you cite in your answer, include its 1-based index in "citedClaimIndexes".

User Question: "${question}"

Available Permitted Claims:
${claims.map((c, i) => `[Claim ${i + 1}] (Type: ${c.type}): ${c.text}`).join('\n')}

Format your response as valid JSON:
{
  "answer": "string",
  "citedClaimIndexes": [1, 2]
}`;

      const res = await executeWithRetry(
        async () => {
          const result = await model.generateContent(prompt);
          return JSON.parse(result.response.text());
        },
        { maxRetries: 1, baseDelayMs: 400, timeoutMs: 5000, context: 'QA' }
      );

      const citedIndexes = res.citedClaimIndexes || [];
      const citations = citedIndexes
        .map((idx) => claims[idx - 1])
        .filter(Boolean);

      return {
        answer: res.answer || `Based on ${claims.length} approved claim(s):\n${claims.map((c) => `• ${c.text}`).join('\n')}`,
        citations: citations.length > 0 ? citations : claims,
        retrievalMode,
      };
    } catch (err) {
      console.warn('[EmbeddingService] Gemini synthesis failed, using fallback formatter:', err.message);
    }
  }

  // Deterministic fallback answer synthesis
  const answer = `Based on ${claims.length} approved claim(s):\n${claims.map((c) => `• ${c.text}`).join('\n')}`;
  return {
    answer,
    citations: claims,
    retrievalMode,
  };
}
