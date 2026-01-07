import type { Env } from './db.service';

/**
 * Embed a newly created or imported job
 * This function handles the complete embedding workflow:
 * 1. Build embedding text from job data
 * 2. Generate embedding vector via OpenAI
 * 3. Store embedding in database
 * 4. Store embedding in Vectorize for similarity search
 */
export async function embedNewJob(env: Env, job: any): Promise<void> {
  try {
    const { generateEmbedding, buildJobEmbeddingText } = await import('./embedding.service');
    const { upsertJobEmbedding } = await import('./vector.service');

    // Build embedding text from job data
    const embeddingText = buildJobEmbeddingText({
      title: job.title,
      company: job.company,
      description: job.description || '',
      location: job.location || '',
      remote: job.remote === 1 || job.remote === true,
      hybrid: job.remote === 2 || job.hybrid === true,
      category: job.category_label || job.category_tag || '',
    });

    // Generate embedding vector
    const embedding = await generateEmbedding(env, embeddingText);

    // Store embedding in database as JSON
    await env.DB.prepare(
      'UPDATE jobs SET embedding = ?, embedding_updated_at = unixepoch() WHERE id = ?'
    )
      .bind(JSON.stringify(embedding), job.id)
      .run();

    // Store in Vectorize for similarity search
    await upsertJobEmbedding(env, job.id, embedding, {
      job_id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      remote: job.remote === 1 || job.remote === true,
      hybrid: job.remote === 2 || job.remote === true,
      category: job.category_label || job.category_tag,
      created_at: job.created_at || job.posted_date || Math.floor(Date.now() / 1000),
    });

    console.log(`[Job Embedding] Successfully generated embedding for job ${job.id} (${job.title})`);
  } catch (error: any) {
    console.error(`[Job Embedding] Failed to generate embedding for job ${job.id}:`, error);
    // Don't throw - embedding failures shouldn't break job creation/import
  }
}

/**
 * Batch embed multiple jobs (useful for bulk imports)
 */
export async function embedMultipleJobs(env: Env, jobs: any[]): Promise<void> {
  const { generateBatchEmbeddings, buildJobEmbeddingText } = await import('./embedding.service');
  const { batchUpsertJobEmbeddings } = await import('./vector.service');

  if (jobs.length === 0) return;

  try {
    // Build embedding texts for all jobs
    const embeddingTexts = jobs.map(job =>
      buildJobEmbeddingText({
        title: job.title,
        company: job.company,
        description: job.description || '',
        location: job.location || '',
        remote: job.remote === 1 || job.remote === true,
        hybrid: job.remote === 2 || job.remote === true,
        category: job.category_label || job.category_tag || '',
      })
    );

    // Generate all embeddings in batch (up to 100 at a time)
    const embeddings = await generateBatchEmbeddings(env, embeddingTexts);

    // Prepare data for database updates and vector upsert
    const jobsWithEmbeddings = jobs.map((job, index) => ({
      id: job.id,
      embedding: embeddings[index],
      metadata: {
        job_id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        remote: job.remote === 1 || job.remote === true,
        hybrid: job.remote === 2 || job.remote === true,
        category: job.category_label || job.category_tag,
        created_at: job.created_at || job.posted_date || Math.floor(Date.now() / 1000),
      }
    }));

    // Update all jobs in database with embeddings
    for (const jobData of jobsWithEmbeddings) {
      await env.DB.prepare(
        'UPDATE jobs SET embedding = ?, embedding_updated_at = unixepoch() WHERE id = ?'
      )
        .bind(JSON.stringify(jobData.embedding), jobData.id)
        .run();
    }

    // Batch upsert to Vectorize
    await batchUpsertJobEmbeddings(env, jobsWithEmbeddings);

    console.log(`[Job Embedding] Successfully generated embeddings for ${jobs.length} jobs`);
  } catch (error: any) {
    console.error(`[Job Embedding] Failed to generate batch embeddings:`, error);
    // Don't throw - batch embedding failures shouldn't break imports
  }
}
