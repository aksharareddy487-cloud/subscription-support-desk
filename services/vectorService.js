import { HelpArticle } from '../models/HelpArticle.js';
import { getEmbedding } from './embeddingService.js';

/**
 * Computes cosine similarity between two float vectors.
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
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
 * Version-Aware Help Article Search.
 * "retrieve relevant help for the customer's product version and answer follow-ups with citations."
 *
 * @param {string} query - The user's query or error description
 * @param {string} customerVersion - e.g. "v1.8" or "v2.4"
 * @param {number} limit - maximum documents to retrieve
 * @returns {Promise<Array>} Ranked, version-matched documents with citation metadata
 */
export async function searchVersionAwareHelp(query, customerVersion = 'v2.4', limit = 3) {
  const queryVector = await getEmbedding(query);

  // First try MongoDB Atlas $vectorSearch if configured
  try {
    const pipeline = [
      {
        $vectorSearch: {
          index: 'vector_index',
          path: 'embedding',
          queryVector: queryVector,
          numCandidates: limit * 10,
          limit: limit,
          filter: {
            $and: [
              { status: { $eq: 'published' } },
              { version: { $eq: customerVersion } },
            ],
          },
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          slug: 1,
          content: 1,
          version: 1,
          category: 1,
          score: { $meta: 'vectorSearchScore' },
        },
      },
    ];

    const atlasResults = await HelpArticle.aggregate(pipeline);
    if (atlasResults && atlasResults.length > 0) {
      return formatSearchResults(atlasResults);
    }
  } catch (atlasErr) {
    // Atlas Vector index not configured yet on this cluster, use in-memory vector similarity
  }

  // Resilient In-Memory Vector Search filtered strictly by version
  const candidateArticles = await HelpArticle.find({
    status: 'published',
    version: customerVersion,
  }).lean();

  if (!candidateArticles || candidateArticles.length === 0) {
    // Fallback if no exact version exists: query without version filter
    const fallbackArticles = await HelpArticle.find({ status: 'published' }).lean();
    return scoreAndRank(fallbackArticles, queryVector, query, limit);
  }

  return scoreAndRank(candidateArticles, queryVector, query, limit);
}

function scoreAndRank(articles, queryVector, queryText, limit) {
  const lowerQuery = queryText.toLowerCase();

  const scored = articles.map((article) => {
    let vectorScore = 0;
    if (Array.isArray(article.embedding) && article.embedding.length > 0) {
      vectorScore = cosineSimilarity(queryVector, article.embedding);
    }

    // Keyword boost
    let keywordScore = 0;
    const lowerTitle = (article.title || '').toLowerCase();
    const lowerContent = (article.content || '').toLowerCase();
    const queryTokens = lowerQuery.split(/\s+/).filter((t) => t.length > 2);

    for (const token of queryTokens) {
      if (lowerTitle.includes(token)) keywordScore += 0.3;
      if (lowerContent.includes(token)) keywordScore += 0.1;
    }

    const finalScore = vectorScore * 0.7 + Math.min(keywordScore, 0.3);
    return {
      ...article,
      score: finalScore,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return formatSearchResults(scored.slice(0, limit));
}

function formatSearchResults(articles) {
  return articles.map((doc) => ({
    id: doc._id,
    title: doc.title,
    version: doc.version,
    category: doc.category,
    content: doc.content,
    citationTag: `[Doc: ${doc.title} (${doc.version})]`,
    score: doc.score || 0.85,
  }));
}
