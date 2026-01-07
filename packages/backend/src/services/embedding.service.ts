import OpenAI from 'openai';
import type { Env } from './db.service';

// OpenAI text-embedding-3-small produces 1536-dimensional vectors
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;
const MAX_BATCH_SIZE = 100; // OpenAI allows up to 100 inputs per batch

/**
 * Generate embedding for a single text string
 */
export async function generateEmbedding(
  env: Env,
  text: string
): Promise<number[]> {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  // Initialize OpenAI client with AI Gateway
  const openai = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    baseURL: `https://gateway.ai.cloudflare.com/v1/${env.CLOUDFLARE_ACCOUNT_ID}/jobmatch-ai-gateway-dev/openai`,
    defaultHeaders: {
      'cf-aig-authorization': `Bearer ${env.AI_GATEWAY_TOKEN}`,
    },
  });

  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.substring(0, 8000), // Truncate to ~8K chars to stay under token limit
      dimensions: EMBEDDING_DIMENSIONS,
    });

    return response.data[0].embedding;
  } catch (error: any) {
    console.error('[Embedding] Error generating embedding:', error);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

/**
 * Generate embeddings for multiple texts in batch (up to 100)
 */
export async function generateBatchEmbeddings(
  env: Env,
  texts: string[]
): Promise<number[][]> {
  if (texts.length === 0) return [];
  if (texts.length > MAX_BATCH_SIZE) {
    throw new Error(`Batch size ${texts.length} exceeds maximum ${MAX_BATCH_SIZE}`);
  }

  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const openai = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    baseURL: `https://gateway.ai.cloudflare.com/v1/${env.CLOUDFLARE_ACCOUNT_ID}/jobmatch-ai-gateway-dev/openai`,
    defaultHeaders: {
      'cf-aig-authorization': `Bearer ${env.AI_GATEWAY_TOKEN}`,
    },
  });

  try {
    const truncatedTexts = texts.map(t => t.substring(0, 8000));

    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: truncatedTexts,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    return response.data.map(item => item.embedding);
  } catch (error: any) {
    console.error('[Embedding] Error generating batch embeddings:', error);
    throw new Error(`Failed to generate batch embeddings: ${error.message}`);
  }
}

/**
 * Generate embedding text for a job (title + description + metadata)
 */
export function buildJobEmbeddingText(job: {
  title: string;
  company: string;
  description: string;
  location: string;
  remote?: boolean;
  hybrid?: boolean;
  category?: string;
}): string {
  return `
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Type: ${job.remote ? 'Remote' : job.hybrid ? 'Hybrid' : 'On-site'}
Category: ${job.category || 'General'}
Description: ${job.description.substring(0, 2000)}
`.trim();
}

/**
 * Generate embedding text for a user profile
 */
export function buildUserEmbeddingText(user: {
  bio?: string;
  skills?: string;
  location?: string;
}): string {
  const skills = user.skills ? JSON.parse(user.skills) : [];

  return `
Bio: ${user.bio || 'No bio provided'}
Skills: ${Array.isArray(skills) ? skills.join(', ') : 'No skills listed'}
Location: ${user.location || 'Not specified'}
`.trim();
}
