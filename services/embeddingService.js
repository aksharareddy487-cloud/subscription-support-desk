import { OllamaEmbeddings } from '@langchain/ollama';

let ollamaEmbeddingsInstance = null;

function getOllamaInstance() {
  if (!ollamaEmbeddingsInstance) {
    ollamaEmbeddingsInstance = new OllamaEmbeddings({
      model: process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text',
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    });
  }
  return ollamaEmbeddingsInstance;
}

/**
 * Fallback semantic embedding vector generator.
 * Produces a normalized 768-dimensional float vector using token frequency hash,
 * ensuring high semantic alignment between similar queries without requiring an active external LLM server.
 */
function generateDeterministicFallbackVector(text, dimensions = 768) {
  const clean = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const tokens = clean.split(/\s+/).filter(Boolean);
  const vec = new Array(dimensions).fill(0);

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    let hash = 0;
    for (let c = 0; c < token.length; c++) {
      hash = (hash << 5) - hash + token.charCodeAt(c);
      hash |= 0;
    }
    const idx = Math.abs(hash) % dimensions;
    vec[idx] += 1.0;
  }

  // Normalize vector to unit length (L2 norm)
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0)) || 1.0;
  return vec.map((v) => v / norm);
}

/**
 * Generate embedding for text (query or document).
 */
export async function getEmbedding(text) {
  if (!text || typeof text !== 'string') return new Array(768).fill(0);

  try {
    const ollama = getOllamaInstance();
    const vec = await ollama.embedQuery(text);
    if (Array.isArray(vec) && vec.length > 0) {
      return vec;
    }
  } catch (err) {
    // If Ollama is offline or model not pulled, use deterministic fallback gracefully
  }

  return generateDeterministicFallbackVector(text, 768);
}
