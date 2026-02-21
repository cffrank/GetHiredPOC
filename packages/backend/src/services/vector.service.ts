import type { Env } from './db.service';

export interface VectorMetadata extends Record<string, string | number | boolean | string[] | null> {
  job_id?: string;
  user_id?: string;
  title?: string;
  company?: string;
  location?: string;
  remote?: boolean;
  hybrid?: boolean;
  category?: string;
  created_at?: number;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  metadata: VectorMetadata;
}

/**
 * Insert or update a job embedding in Vectorize
 */
export async function upsertJobEmbedding(
  env: Env,
  jobId: string,
  embedding: number[],
  metadata: VectorMetadata
): Promise<void> {
  try {
    await env.VECTORIZE.upsert([
      {
        id: `job_${jobId}`,
        values: embedding,
        metadata,
      },
    ]);

    console.log(`[Vector] Upserted job embedding: job_${jobId}`);
  } catch (error: any) {
    console.error(`[Vector] Error upserting job embedding:`, error);
    throw new Error(`Failed to upsert job embedding: ${error.message}`);
  }
}

/**
 * Insert or update a user profile embedding in Vectorize
 */
export async function upsertUserEmbedding(
  env: Env,
  userId: string,
  embedding: number[],
  metadata: VectorMetadata
): Promise<void> {
  try {
    await env.VECTORIZE.upsert([
      {
        id: `user_${userId}`,
        values: embedding,
        metadata,
      },
    ]);

    console.log(`[Vector] Upserted user embedding: user_${userId}`);
  } catch (error: any) {
    console.error(`[Vector] Error upserting user embedding:`, error);
    throw new Error(`Failed to upsert user embedding: ${error.message}`);
  }
}

/**
 * Batch upsert multiple job embeddings
 */
export async function batchUpsertJobEmbeddings(
  env: Env,
  jobs: Array<{
    id: string;
    embedding: number[];
    metadata: VectorMetadata;
  }>
): Promise<void> {
  try {
    const vectors = jobs.map(job => ({
      id: `job_${job.id}`,
      values: job.embedding,
      metadata: job.metadata,
    }));

    await env.VECTORIZE.upsert(vectors);

    console.log(`[Vector] Batch upserted ${jobs.length} job embeddings`);
  } catch (error: any) {
    console.error(`[Vector] Error batch upserting job embeddings:`, error);
    throw new Error(`Failed to batch upsert job embeddings: ${error.message}`);
  }
}

/**
 * Search for similar jobs using vector similarity
 */
export async function searchSimilarJobs(
  env: Env,
  queryEmbedding: number[],
  limit: number = 50,
  filter?: {
    remote?: boolean;
    category?: string;
  }
): Promise<VectorSearchResult[]> {
  try {
    // Build filter object for metadata filtering (Vectorize supports this)
    const metadataFilter: any = {};

    if (filter?.remote !== undefined) {
      metadataFilter.remote = filter.remote;
    }

    if (filter?.category) {
      metadataFilter.category = filter.category;
    }

    const results = await env.VECTORIZE.query(queryEmbedding, {
      topK: limit,
      filter: Object.keys(metadataFilter).length > 0 ? metadataFilter : undefined,
      returnMetadata: true,
    });

    return results.matches.map((match: any) => ({
      id: match.id.replace('job_', ''), // Remove prefix
      score: match.score,
      metadata: match.metadata || {},
    }));
  } catch (error: any) {
    console.error(`[Vector] Error searching similar jobs:`, error);
    throw new Error(`Failed to search similar jobs: ${error.message}`);
  }
}

/**
 * Find jobs similar to a specific job
 */
export async function findSimilarJobs(
  env: Env,
  jobId: string,
  limit: number = 10
): Promise<VectorSearchResult[]> {
  try {
    // Get the embedding for this job from the database
    const job = await env.DB.prepare(
      'SELECT embedding FROM jobs WHERE id = ?'
    )
      .bind(jobId)
      .first<{ embedding: string | null }>();

    if (!job || !job.embedding) {
      throw new Error(`Job ${jobId} not found or has no embedding`);
    }

    const embedding = JSON.parse(job.embedding);

    // Search for similar jobs, excluding the original
    const allResults = await searchSimilarJobs(env, embedding, limit + 1);

    // Filter out the original job
    return allResults
      .filter(result => result.id !== jobId)
      .slice(0, limit);
  } catch (error: any) {
    console.error(`[Vector] Error finding similar jobs:`, error);
    throw new Error(`Failed to find similar jobs: ${error.message}`);
  }
}

/**
 * Delete a job embedding
 */
export async function deleteJobEmbedding(
  env: Env,
  jobId: string
): Promise<void> {
  try {
    await env.VECTORIZE.deleteByIds([`job_${jobId}`]);
    console.log(`[Vector] Deleted job embedding: job_${jobId}`);
  } catch (error: any) {
    console.error(`[Vector] Error deleting job embedding:`, error);
    // Don't throw - deletion failures are non-critical
  }
}

/**
 * Delete a user embedding
 */
export async function deleteUserEmbedding(
  env: Env,
  userId: string
): Promise<void> {
  try {
    await env.VECTORIZE.deleteByIds([`user_${userId}`]);
    console.log(`[Vector] Deleted user embedding: user_${userId}`);
  } catch (error: any) {
    console.error(`[Vector] Error deleting user embedding:`, error);
    // Don't throw - deletion failures are non-critical
  }
}
