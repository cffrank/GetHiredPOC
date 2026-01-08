import { Hono } from 'hono';
import type { Env } from '../services/db.service';
import { getSession, getCookie } from '../services/auth.service';
import {
  getJobs,
  getJobById,
  getSavedJobs,
  saveJob,
  unsaveJob,
  isSaved,
} from '../services/db.service';
import { findSimilarJobs } from '../services/vector.service';
import type { User } from '@gethiredpoc/shared';

type Variables = {
  env: Env;
};

const jobs = new Hono<{ Bindings: Env; Variables: Variables }>();

// Middleware to get user (optional)
async function getOptionalUser(c: any): Promise<User | null> {
  const sessionId = getCookie(c.req.raw, "session");
  if (!sessionId) return null;
  return await getSession(c.env, sessionId);
}

// Middleware to require auth
async function requireAuth(c: any): Promise<User> {
  const sessionId = getCookie(c.req.raw, "session");
  if (!sessionId) {
    throw new Error('Unauthorized');
  }

  const user = await getSession(c.env, sessionId);
  if (!user) {
    throw new Error('Session expired');
  }

  return user;
}

// GET /api/jobs
jobs.get('/', async (c) => {
  try {
    const query = c.req.query("q") || c.req.query("title") || undefined;
    const remote = c.req.query("remote");
    const location = c.req.query("location") || undefined;

    // Get user to exclude hidden jobs and filter by preferences
    const user = await getOptionalUser(c);

    let jobsList: any[] = [];

    // Try semantic search if query is provided
    if (query) {
      try {
        console.log('[API] Attempting semantic search for query:', query);
        const { generateEmbedding } = await import('../services/embedding.service');
        const { searchSimilarJobs } = await import('../services/vector.service');

        // Generate embedding for search query
        const queryEmbedding = await generateEmbedding(c.env, query);
        console.log('[API] Generated query embedding, searching similar jobs');

        // Search similar jobs
        const similarJobs = await searchSimilarJobs(c.env, queryEmbedding, 100, {
          remote: remote === 'true' ? true : undefined,
        });

        console.log(`[API] Found ${similarJobs.length} similar jobs from vector search`);

        // Get job IDs from vector search results
        const jobIds = similarJobs.map(j => j.id);

        if (jobIds.length > 0) {
          // Fetch full job details
          const placeholders = jobIds.map(() => '?').join(',');
          let dbQuery = `SELECT * FROM jobs WHERE id IN (${placeholders}) AND (is_complete = 1 OR (description IS NOT NULL AND description != ''))`;
          const params: any[] = [...jobIds];

          // Apply location filter if provided
          if (location) {
            dbQuery += ' AND location LIKE ?';
            params.push(`%${location}%`);
          }

          // Apply user hidden jobs filter if logged in
          if (user) {
            dbQuery += ` AND id NOT IN (
              SELECT job_id FROM hidden_jobs WHERE user_id = ?
            )`;
            params.push(user.id);
          }

          dbQuery += ' ORDER BY created_at DESC LIMIT 50';

          const result = await c.env.DB.prepare(dbQuery).bind(...params).all();
          jobsList = result.results || [];

          console.log(`[API] Retrieved ${jobsList.length} full job details after vector search`);
        } else {
          // Fallback: Vector search returned 0 results
          console.log('[API] Vector search returned 0 results, falling back to keyword search');
          // Extract main keywords from query (first 1-2 words are usually the job title)
          const keywords = query.split(' ').slice(0, 2).join(' ');
          jobsList = await getJobs(c.env, {
            title: keywords,  // Use extracted keywords instead of full query
            remote: remote === "true" ? true : remote === "false" ? false : undefined,
            location,
            userId: user?.id,
          });
        }
      } catch (error: any) {
        console.error('[API] Semantic search error, falling back to keyword search:', error.message);
        // Fall back to keyword search on error
        const keywords = query.split(' ').slice(0, 2).join(' ');
        jobsList = await getJobs(c.env, {
          title: keywords,  // Use extracted keywords
          remote: remote === "true" ? true : remote === "false" ? false : undefined,
          location,
          userId: user?.id,
        });
      }
    } else {
      // No query provided - use vector pre-filtering if user is logged in
      if (user) {
        try {
          console.log('[API] Attempting vector pre-filtering for user:', user.id);
          const { getCachedUserEmbedding } = await import('../services/user-embedding.service');
          const { searchSimilarJobs } = await import('../services/vector.service');

          // Get user's profile embedding
          const userEmbedding = await getCachedUserEmbedding(c.env, user.id);

          if (userEmbedding) {
            console.log('[API] Using vector pre-filtering for personalized feed');

            // Search for jobs similar to user profile
            const similarJobs = await searchSimilarJobs(c.env, userEmbedding, 100, {
              remote: remote === 'true' ? true : undefined,
            });

            console.log(`[API] Vector pre-filtering found ${similarJobs.length} matching jobs`);

            if (similarJobs.length > 0) {
              // Get job IDs from vector search results
              const jobIds = similarJobs.map(j => j.id);

              // Fetch full job details
              const placeholders = jobIds.map(() => '?').join(',');
              let dbQuery = `SELECT * FROM jobs WHERE id IN (${placeholders}) AND (is_complete = 1 OR (description IS NOT NULL AND description != ''))`;
              const params: any[] = [...jobIds];

              // Apply location filter if provided
              if (location) {
                dbQuery += ' AND location LIKE ?';
                params.push(`%${location}%`);
              }

              // Exclude hidden jobs
              dbQuery += ` AND id NOT IN (
                SELECT job_id FROM hidden_jobs WHERE user_id = ?
              )`;
              params.push(user.id);

              dbQuery += ' ORDER BY created_at DESC LIMIT 50';

              const result = await c.env.DB.prepare(dbQuery).bind(...params).all();
              jobsList = result.results || [];

              // Add similarity scores to jobs
              jobsList = jobsList.map((job: any) => {
                const match = similarJobs.find(s => s.id === job.id);
                return {
                  ...job,
                  vector_match_score: match ? Math.round(match.score * 100) : 0
                };
              });

              console.log(`[API] Retrieved ${jobsList.length} personalized jobs via vector pre-filtering`);
            } else {
              // Fallback to regular search
              console.log('[API] Vector pre-filtering returned 0 results, falling back to regular search');
              jobsList = await getJobs(c.env, {
                title: undefined,
                remote: remote === "true" ? true : remote === "false" ? false : undefined,
                location,
                userId: user.id,
              });
            }
          } else {
            // No user embedding available, fall back to regular search
            console.log('[API] No user embedding available, using regular search');
            jobsList = await getJobs(c.env, {
              title: undefined,
              remote: remote === "true" ? true : remote === "false" ? false : undefined,
              location,
              userId: user.id,
            });
          }
        } catch (error: any) {
          console.error('[API] Vector pre-filtering error, falling back to regular search:', error.message);
          // Fall back to regular search
          jobsList = await getJobs(c.env, {
            title: undefined,
            remote: remote === "true" ? true : remote === "false" ? false : undefined,
            location,
            userId: user.id,
          });
        }
      } else {
        // User not logged in, use regular filter-based search
        jobsList = await getJobs(c.env, {
          title: undefined,
          remote: remote === "true" ? true : remote === "false" ? false : undefined,
          location,
          userId: undefined,
        });
      }
    }

    // Check if vector pre-filtering was used
    const usedVectorPrefiltering = user && !query && jobsList.length > 0 && jobsList[0]?.vector_match_score !== undefined;

    // Filter jobs based on user preferences if logged in, not using query search, and not using vector pre-filtering
    if (user && !query && !usedVectorPrefiltering) {
      const { getJobSearchPreferences } = await import('../services/job-preferences.service');
      const preferences = await getJobSearchPreferences(c.env.DB, user.id);

      // Only filter if user has completed onboarding
      if (preferences.onboardingCompleted) {
        jobsList = jobsList.filter(job => {
          // Match job titles (case-insensitive partial match)
          if (preferences.desiredJobTitles.length > 0) {
            const titleMatch = preferences.desiredJobTitles.some(desiredTitle =>
              job.title.toLowerCase().includes(desiredTitle.toLowerCase()) ||
              desiredTitle.toLowerCase().includes(job.title.toLowerCase())
            );
            if (!titleMatch) return false;
          }

          // Match locations
          if (preferences.workLocations.length > 0) {
            const locationMatch = preferences.workLocations.some(desiredLoc => {
              const locLower = desiredLoc.toLowerCase();

              // Handle work mode preferences (3-state remote field)
              // remote = 0: On-site only
              // remote = 1: Remote only
              // remote = 2: Hybrid (both options)
              if (locLower === 'remote') {
                return job.remote === 1 || job.remote === 2; // Remote or Hybrid
              }
              if (locLower === 'on-site') {
                return job.remote === 0 || job.remote === 2; // On-site or Hybrid
              }
              if (locLower === 'hybrid') {
                return job.remote === 2; // Hybrid only
              }

              // Handle actual location strings
              // Check state field first (e.g., "WI", "Wisconsin", or "Madison, WI")
              if (job.state) {
                const stateLower = job.state.toLowerCase();

                // Direct state code match (e.g., "WI")
                if (locLower === stateLower) {
                  return true;
                }

                // State name match (e.g., "wisconsin")
                const stateNames: Record<string, string> = {
                  'al': 'alabama', 'ak': 'alaska', 'az': 'arizona', 'ar': 'arkansas', 'ca': 'california',
                  'co': 'colorado', 'ct': 'connecticut', 'de': 'delaware', 'fl': 'florida', 'ga': 'georgia',
                  'hi': 'hawaii', 'id': 'idaho', 'il': 'illinois', 'in': 'indiana', 'ia': 'iowa',
                  'ks': 'kansas', 'ky': 'kentucky', 'la': 'louisiana', 'me': 'maine', 'md': 'maryland',
                  'ma': 'massachusetts', 'mi': 'michigan', 'mn': 'minnesota', 'ms': 'mississippi',
                  'mo': 'missouri', 'mt': 'montana', 'ne': 'nebraska', 'nv': 'nevada', 'nh': 'new hampshire',
                  'nj': 'new jersey', 'nm': 'new mexico', 'ny': 'new york', 'nc': 'north carolina',
                  'nd': 'north dakota', 'oh': 'ohio', 'ok': 'oklahoma', 'or': 'oregon', 'pa': 'pennsylvania',
                  'ri': 'rhode island', 'sc': 'south carolina', 'sd': 'south dakota', 'tn': 'tennessee',
                  'tx': 'texas', 'ut': 'utah', 'vt': 'vermont', 'va': 'virginia', 'wa': 'washington',
                  'wv': 'west virginia', 'wi': 'wisconsin', 'wy': 'wyoming'
                };

                const stateName = stateNames[stateLower];
                if (stateName && locLower === stateName) {
                  return true;
                }

                // Check if location string contains state (e.g., "Madison, WI")
                const locParts = desiredLoc.split(',').map(s => s.trim().toLowerCase());
                if (locParts.length > 1) {
                  const lastPart = locParts[locParts.length - 1];
                  if (lastPart === stateLower || lastPart === stateName) {
                    return true;
                  }
                }
              }

              // Fallback to location string matching (for backward compatibility)
              return job.location.toLowerCase().includes(desiredLoc.toLowerCase());
            });

            if (!locationMatch) return false;
          }

          return true;
        });
      }
    }

    // Track cost metrics for job browsing
    if (user && !query) {
      const { trackJobBrowsing } = await import('../services/cost-tracking.service');

      // Get total job count for cost calculation
      const totalJobsResult = await c.env.DB.prepare('SELECT COUNT(*) as count FROM jobs').first<{ count: number }>();
      const totalJobs = totalJobsResult?.count || 0;

      trackJobBrowsing(c.env, {
        userId: user.id,
        vectorPrefilteringUsed: usedVectorPrefiltering,
        jobsReturned: jobsList.length,
        totalJobsInDb: totalJobs,
      });
    }

    return c.json({ jobs: jobsList }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// GET /api/jobs/:id
jobs.get('/:id', async (c) => {
  try {
    const jobId = c.req.param('id');
    const job = await getJobById(c.env, jobId);

    if (!job) {
      return c.json({ error: "Job not found" }, 404);
    }

    let saved = false;
    const user = await getOptionalUser(c);
    if (user) {
      saved = await isSaved(c.env, user.id, jobId);
    }

    return c.json({ job, saved }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// GET /api/jobs/:id/similar - Find similar jobs based on vector similarity
jobs.get('/:id/similar', async (c) => {
  try {
    const jobId = c.req.param('id');

    // Find similar jobs using vector similarity
    const similarResults = await findSimilarJobs(c.env, jobId, 10);

    // Fetch full job details for the similar jobs
    const jobIds = similarResults.map(r => r.id);

    if (jobIds.length === 0) {
      return c.json([]);
    }

    const placeholders = jobIds.map(() => '?').join(',');
    const jobs = await c.env.DB.prepare(
      `SELECT * FROM jobs WHERE id IN (${placeholders}) AND (is_complete = 1 OR (description IS NOT NULL AND description != ''))`
    )
      .bind(...jobIds)
      .all();

    // Merge similarity scores with job data
    const jobsWithScores = jobs.results.map((job: any) => {
      const result = similarResults.find(r => r.id === job.id);
      return {
        ...job,
        similarity_score: result ? Math.round(result.score * 100) : 0
      };
    });

    return c.json(jobsWithScores);
  } catch (error: any) {
    console.error('[API] Error finding similar jobs:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/jobs/:id/save
jobs.post('/:id/save', async (c) => {
  try {
    const user = await requireAuth(c);
    const jobId = c.req.param('id');

    await saveJob(c.env, user.id, jobId);
    return c.json({ success: true }, 200);
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Session expired') {
      return c.json({ error: error.message }, 401);
    }
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /api/jobs/:id/save
jobs.delete('/:id/save', async (c) => {
  try {
    const user = await requireAuth(c);
    const jobId = c.req.param('id');

    await unsaveJob(c.env, user.id, jobId);
    return c.json({ success: true }, 200);
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Session expired') {
      return c.json({ error: error.message }, 401);
    }
    return c.json({ error: error.message }, 500);
  }
});

// GET /api/jobs/saved
jobs.get('/saved/list', async (c) => {
  try {
    const user = await requireAuth(c);
    const jobsList = await getSavedJobs(c.env, user.id);
    return c.json({ jobs: jobsList }, 200);
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Session expired') {
      return c.json({ error: error.message }, 401);
    }
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/jobs/:id/analyze
jobs.post('/:id/analyze', async (c) => {
  try {
    const user = await requireAuth(c);
    const jobId = c.req.param('id');

    // Get job
    const job = await getJobById(c.env, jobId);
    if (!job) {
      return c.json({ error: "Job not found" }, 404);
    }

    // Use the real AI job matching service
    const { analyzeJobMatch } = await import('../services/job-matching.service');
    const match = await analyzeJobMatch(c.env, user, job);

    return c.json(match, 200);
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Session expired') {
      return c.json({ error: error.message }, 401);
    }
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/jobs/:id/hide - Hide a job from recommendations
jobs.post('/:id/hide', async (c) => {
  try {
    const user = await requireAuth(c);
    const jobId = c.req.param('id');

    // Check if job exists
    const job = await getJobById(c.env, jobId);
    if (!job) {
      return c.json({ error: 'Job not found' }, 404);
    }

    // Check if already hidden
    const existing = await c.env.DB.prepare(
      'SELECT id FROM hidden_jobs WHERE user_id = ? AND job_id = ?'
    ).bind(user.id, jobId).first();

    if (existing) {
      return c.json({ message: 'Job already hidden' }, 200);
    }

    // Hide the job
    await c.env.DB.prepare(
      'INSERT INTO hidden_jobs (user_id, job_id) VALUES (?, ?)'
    ).bind(user.id, jobId).run();

    return c.json({ success: true }, 201);
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Session expired') {
      return c.json({ error: error.message }, 401);
    }
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /api/jobs/:id/hide - Unhide a job
jobs.delete('/:id/hide', async (c) => {
  try {
    const user = await requireAuth(c);
    const jobId = c.req.param('id');

    await c.env.DB.prepare(
      'DELETE FROM hidden_jobs WHERE user_id = ? AND job_id = ?'
    ).bind(user.id, jobId).run();

    return c.json({ success: true }, 200);
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Session expired') {
      return c.json({ error: error.message }, 401);
    }
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/jobs/advanced-search - Advanced multi-criteria search
jobs.post('/advanced-search', async (c) => {
  try {
    const user = await getOptionalUser(c);
    const body = await c.req.json();

    const {
      keywords = [],
      locations = [],
      salary_min,
      salary_max,
      experience_level = [],
      remote, // 'remote' | 'hybrid' | 'onsite' | 'any'
      required_skills = [],
      job_type = [],
      limit = 20
    } = body;

    // Validate limit
    const maxResults = Math.min(limit || 20, 100);

    let jobsList: any[] = [];
    let whereConditions: string[] = [];
    let params: any[] = [];

    // Build SQL query conditions
    // Keywords - search in title and description
    if (keywords.length > 0) {
      const keywordConditions = keywords.map(() => '(title LIKE ? OR description LIKE ?)');
      whereConditions.push(`(${keywordConditions.join(' OR ')})`);
      keywords.forEach((keyword: string) => {
        params.push(`%${keyword}%`, `%${keyword}%`);
      });
    }

    // Locations
    if (locations.length > 0) {
      const locationConditions = locations.map(() => 'location LIKE ?');
      whereConditions.push(`(${locationConditions.join(' OR ')})`);
      locations.forEach((loc: string) => {
        params.push(`%${loc}%`);
      });
    }

    // Salary range
    if (salary_min !== undefined) {
      whereConditions.push('salary_max >= ?');
      params.push(salary_min);
    }
    if (salary_max !== undefined) {
      whereConditions.push('salary_min <= ?');
      params.push(salary_max);
    }

    // Remote work type
    if (remote && remote !== 'any') {
      if (remote === 'remote') {
        whereConditions.push('remote = 1');
      } else if (remote === 'hybrid') {
        whereConditions.push('remote = 2');
      } else if (remote === 'onsite') {
        whereConditions.push('remote = 0');
      }
    }

    // Experience level (search in title or description)
    if (experience_level.length > 0) {
      const expConditions = experience_level.map(() => '(title LIKE ? OR description LIKE ?)');
      whereConditions.push(`(${expConditions.join(' OR ')})`);
      experience_level.forEach((level: string) => {
        params.push(`%${level}%`, `%${level}%`);
      });
    }

    // Required skills (search in description or requirements)
    if (required_skills.length > 0) {
      const skillConditions = required_skills.map(() => '(description LIKE ? OR requirements LIKE ?)');
      whereConditions.push(`(${skillConditions.join(' OR ')})`);
      required_skills.forEach((skill: string) => {
        params.push(`%${skill}%`, `%${skill}%`);
      });
    }

    // Job type (full-time, contract, etc.) - search in description
    if (job_type.length > 0) {
      const typeConditions = job_type.map(() => 'description LIKE ?');
      whereConditions.push(`(${typeConditions.join(' OR ')})`);
      job_type.forEach((type: string) => {
        params.push(`%${type}%`);
      });
    }

    // Exclude hidden jobs if user is logged in
    if (user) {
      whereConditions.push(`id NOT IN (SELECT job_id FROM hidden_jobs WHERE user_id = ?)`);
      params.push(user.id);
    }

    // Build final query
    let query = 'SELECT * FROM jobs WHERE (is_complete = 1 OR (description IS NOT NULL AND description != \'\'))';
    if (whereConditions.length > 0) {
      query += ` AND ${whereConditions.join(' AND ')}`;
    }
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(maxResults);

    console.log('[Advanced Search] Query:', query);
    console.log('[Advanced Search] Params:', params);

    const result = await c.env.DB.prepare(query).bind(...params).all();
    jobsList = result.results || [];

    // Try to enhance with vector search if we have keywords
    if (keywords.length > 0 && jobsList.length > 0) {
      try {
        const { generateEmbedding } = await import('../services/embedding.service');
        const { searchSimilarJobs } = await import('../services/vector.service');

        // Generate embedding for first keyword (most important)
        const queryEmbedding = await generateEmbedding(c.env, keywords[0]);

        // Get job IDs from current results
        const jobIds = jobsList.map(j => j.id);

        // Search vector DB for these specific jobs
        const vectorResults = await searchSimilarJobs(c.env, queryEmbedding, 1000);

        // Add similarity scores to matching jobs
        jobsList = jobsList.map((job: any) => {
          const match = vectorResults.find(v => v.id === job.id);
          return {
            ...job,
            relevance_score: match ? Math.round(match.score * 100) : 0
          };
        });

        // Sort by relevance score if available
        jobsList.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
      } catch (error: any) {
        console.error('[Advanced Search] Vector enhancement error:', error.message);
        // Continue without vector enhancement
      }
    }

    return c.json({
      jobs: jobsList,
      count: jobsList.length,
      filters: body
    }, 200);
  } catch (error: any) {
    console.error('[Advanced Search] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default jobs;
