import { Hono } from 'hono';

// This is a special admin endpoint for backfilling embeddings
// Call it via: curl -X POST https://your-worker.workers.dev/admin/backfill-embeddings

interface Env {
  DB: D1Database;
  VECTORIZE: VectorizeIndex;
  OPENAI_API_KEY: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  AI_GATEWAY_TOKEN: string;
}

import { generateBatchEmbeddings, buildJobEmbeddingText } from '../services/embedding.service';
import { batchUpsertJobEmbeddings } from '../services/vector.service';

export async function backfillJobEmbeddings(env: Env, limit?: number): Promise<{
  processed: number;
  skipped: number;
  errors: number;
  estimatedCost: number;
}> {
  console.log('[Backfill] Starting job embeddings backfill...');

  // Get all jobs without embeddings
  const query = limit
    ? `SELECT * FROM jobs WHERE embedding IS NULL LIMIT ${limit}`
    : 'SELECT * FROM jobs WHERE embedding IS NULL';

  const jobs = await env.DB.prepare(query).all();

  if (!jobs.results || jobs.results.length === 0) {
    console.log('[Backfill] No jobs found without embeddings');
    return { processed: 0, skipped: 0, errors: 0, estimatedCost: 0 };
  }

  console.log(`[Backfill] Found ${jobs.results.length} jobs without embeddings`);

  let processed = 0;
  let errors = 0;
  const BATCH_SIZE = 50; // Process 50 at a time to stay under OpenAI limits

  // Process in batches
  for (let i = 0; i < jobs.results.length; i += BATCH_SIZE) {
    const batch = jobs.results.slice(i, i + BATCH_SIZE);
    console.log(`[Backfill] Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} jobs)`);

    try {
      // Build embedding texts
      const embeddingTexts = batch.map((job: any) =>
        buildJobEmbeddingText({
          title: job.title,
          company: job.company,
          description: job.description || '',
          location: job.location || '',
          remote: job.remote === 1,
          hybrid: job.hybrid === 1,
          category: job.category,
        })
      );

      // Generate embeddings in batch
      const embeddings = await generateBatchEmbeddings(env, embeddingTexts);

      // Update database and Vectorize
      for (let j = 0; j < batch.length; j++) {
        const job: any = batch[j];
        const embedding = embeddings[j];

        // Store embedding in database
        await env.DB.prepare(
          'UPDATE jobs SET embedding = ?, embedding_updated_at = unixepoch() WHERE id = ?'
        )
          .bind(JSON.stringify(embedding), job.id)
          .run();
      }

      // Batch upsert to Vectorize
      await batchUpsertJobEmbeddings(
        env,
        batch.map((job: any, idx: number) => ({
          id: job.id,
          embedding: embeddings[idx],
          metadata: {
            job_id: job.id,
            title: job.title,
            company: job.company,
            location: job.location,
            remote: job.remote === 1,
            hybrid: job.hybrid === 1,
            category: job.category,
            created_at: job.created_at,
          },
        }))
      );

      processed += batch.length;
      console.log(`[Backfill] Processed ${processed}/${jobs.results.length} jobs`);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error: any) {
      console.error(`[Backfill] Error processing batch:`, error);
      errors += batch.length;
    }
  }

  // Estimate cost: text-embedding-3-small costs $0.02 per 1M tokens
  // Average ~300 tokens per job
  const estimatedTokens = processed * 300;
  const estimatedCost = (estimatedTokens / 1_000_000) * 0.02;

  console.log('[Backfill] Backfill complete:', {
    processed,
    errors,
    estimatedCost: `$${estimatedCost.toFixed(4)}`,
  });

  return {
    processed,
    skipped: 0,
    errors,
    estimatedCost,
  };
}
