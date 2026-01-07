import { Hono } from 'hono';
import type { Env } from '../services/db.service';
import { getCurrentUser } from '../services/auth.service';
import { getRecommendationsWithJobDetails } from '../services/job-recommendations.service';

const recommendations = new Hono<{ Bindings: Env }>();

// GET /api/recommendations - Get personalized job recommendations using vector similarity
recommendations.get('/', async (c) => {
  try {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Check KV cache first (1 hour TTL)
    const cacheKey = `recommendations:${user.id}`;
    const cached = await c.env.KV_CACHE.get(cacheKey);

    if (cached) {
      console.log(`[Recommendations] Cache hit for user ${user.id}`);

      // Track cost metrics for cached recommendations
      const { trackRecommendations } = await import('../services/cost-tracking.service');
      const cachedData = JSON.parse(cached);
      trackRecommendations(c.env, {
        userId: user.id,
        jobsReturned: cachedData.jobs?.length || 0,
        usedVectorSearch: true,
        wasCached: true,
      });

      return c.json(cachedData, 200);
    }

    console.log(`[Recommendations] Cache miss for user ${user.id}, generating recommendations`);

    // Get user embedding
    const { getCachedUserEmbedding } = await import('../services/user-embedding.service');
    const userEmbedding = await getCachedUserEmbedding(c.env, user.id);

    if (!userEmbedding) {
      console.log(`[Recommendations] No user embedding available for user ${user.id}`);
      return c.json({ jobs: [] }, 200);
    }

    // Search for similar jobs
    const { searchSimilarJobs } = await import('../services/vector.service');
    const similarJobs = await searchSimilarJobs(c.env, userEmbedding, 20);

    // Fetch full job details
    const jobIds = similarJobs.map(j => j.id);
    if (jobIds.length === 0) {
      console.log(`[Recommendations] No similar jobs found for user ${user.id}`);
      return c.json({ jobs: [] }, 200);
    }

    const placeholders = jobIds.map(() => '?').join(',');
    const result = await c.env.DB.prepare(
      `SELECT * FROM jobs WHERE id IN (${placeholders}) LIMIT 20`
    ).bind(...jobIds).all();

    // Merge with similarity scores
    const jobsWithScores = result.results.map((job: any) => {
      const match = similarJobs.find(s => s.id === job.id);
      return {
        ...job,
        similarity_score: match ? Math.round(match.score * 100) : 0
      };
    });

    // Sort by similarity score descending
    jobsWithScores.sort((a, b) => b.similarity_score - a.similarity_score);

    const response = { jobs: jobsWithScores };

    // Cache results for 1 hour (3600 seconds)
    await c.env.KV_CACHE.put(
      cacheKey,
      JSON.stringify(response),
      { expirationTtl: 3600 }
    );

    console.log(`[Recommendations] Generated ${jobsWithScores.length} recommendations for user ${user.id}`);

    // Track cost metrics for vector-based recommendations
    const { trackRecommendations } = await import('../services/cost-tracking.service');
    trackRecommendations(c.env, {
      userId: user.id,
      jobsReturned: jobsWithScores.length,
      usedVectorSearch: true,
      wasCached: false,
    });

    return c.json(response, 200);
  } catch (error: any) {
    console.error('[Recommendations] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// GET /api/recommendations/legacy - Get personalized job recommendations using legacy algorithm
recommendations.get('/legacy', async (c) => {
  try {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const limit = parseInt(c.req.query('limit') || '10');

    const results = await getRecommendationsWithJobDetails(c.env, user.id, limit);

    return c.json(results);
  } catch (error: any) {
    console.error('Get recommendations error:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default recommendations;
