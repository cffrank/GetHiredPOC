import { Hono, type Context } from 'hono';
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
import { mockJobAnalysis } from '../services/ai.service';
import { scrapeJobFromUrl } from '../services/job-scrape.service';
import { saveOrUpdateJob } from '../services/job-import.service';
import type { User } from '@gethiredpoc/shared';
import { requireAuth, type AppVariables } from '../middleware/auth.middleware';
import { toMessage, AppError, NotFoundError } from '../utils/errors';

const jobs = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// Helper to get optional user (unauthenticated requests allowed)
async function getOptionalUser(
  c: Context<{ Bindings: Env; Variables: AppVariables }>
): Promise<User | null> {
  let sessionId = getCookie(c.req.raw, "session");
  if (!sessionId) {
    const authHeader = c.req.header('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      sessionId = authHeader.substring(7);
    }
  }
  if (!sessionId) return null;
  return await getSession(c.env, sessionId);
}

// GET /api/jobs
jobs.get('/', async (c) => {
  try {
    const rawTitle = c.req.query("title") || undefined;
    // Keep only alphanumeric, spaces, hyphens; cap at 50 chars to prevent D1 LIKE complexity errors
    const title = rawTitle ? rawTitle.replace(/[^a-zA-Z0-9\s-]/g, '').slice(0, 50).trim() || undefined : undefined;
    const remote = c.req.query("remote");
    const rawLocation = c.req.query("location") || undefined;
    const location = rawLocation ? rawLocation.replace(/[^a-zA-Z0-9\s-,]/g, '').slice(0, 50).trim() || undefined : undefined;
    const cursor = c.req.query("cursor") || undefined;
    const limitParam = c.req.query("limit");
    const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10) || 20), 100) : 20;

    // Get user to exclude hidden jobs and filter by preferences
    const user = await getOptionalUser(c);

    const paginated = await getJobs(c.env, {
      title,
      remote: remote === "true" ? true : remote === "false" ? false : undefined,
      location,
      userId: user?.id, // Pass userId to exclude hidden jobs
      cursor,
      limit,
    });

    let jobsList = paginated.jobs;

    // Filter jobs based on user preferences if logged in
    if (user) {
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

              // Location string matching
              return (job.location ?? '').toLowerCase().includes(desiredLoc.toLowerCase());
            });

            if (!locationMatch) return false;
          }

          return true;
        });
      }
    }

    return c.json({ jobs: jobsList, nextCursor: paginated.nextCursor, hasMore: paginated.hasMore }, 200);
  } catch (error: unknown) {
    return c.json({ error: toMessage(error) }, 500);
  }
});

// POST /api/jobs/import-url
jobs.post('/import-url', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json<{ url: string }>();
    const url = body.url?.trim();

    if (!url) {
      return c.json({ error: 'URL is required' }, 400);
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      return c.json({ error: 'Invalid URL' }, 400);
    }

    // Check if user already imported this URL
    const existing = await c.env.DB.prepare(
      'SELECT id FROM jobs WHERE external_url = ? AND user_id = ?'
    ).bind(url, user.id).first<{ id: string }>();

    if (existing) {
      const job = await getJobById(c.env, existing.id, user.id);
      return c.json({ job, alreadyExists: true }, 200);
    }

    // Scrape and parse the job posting
    const jobData = await scrapeJobFromUrl(c.env, url);

    // Save with user_id to make it private
    const result = await saveOrUpdateJob(c.env.DB, jobData, user.id);

    return c.json({ job: result.job, alreadyExists: false }, 201);
  } catch (error: unknown) {
    return c.json({ error: toMessage(error) }, 500);
  }
});

// GET /api/jobs/:id
jobs.get('/:id', async (c) => {
  try {
    const jobId = c.req.param('id');
    const user = await getOptionalUser(c);
    const job = await getJobById(c.env, jobId, user?.id);

    if (!job) {
      throw new NotFoundError('Job not found');
    }

    let saved = false;
    if (user) {
      saved = await isSaved(c.env, user.id, jobId);
    }

    return c.json({ job, saved }, 200);
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    return c.json({ error: toMessage(error) }, 500);
  }
});

// POST /api/jobs/:id/save
jobs.post('/:id/save', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const jobId = c.req.param('id');

    await saveJob(c.env, user.id, jobId);
    return c.json({ success: true }, 200);
  } catch (error: unknown) {
    return c.json({ error: toMessage(error) }, 500);
  }
});

// DELETE /api/jobs/:id/save
jobs.delete('/:id/save', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const jobId = c.req.param('id');

    await unsaveJob(c.env, user.id, jobId);
    return c.json({ success: true }, 200);
  } catch (error: unknown) {
    return c.json({ error: toMessage(error) }, 500);
  }
});

// GET /api/jobs/saved
jobs.get('/saved/list', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const jobsList = await getSavedJobs(c.env, user.id);
    return c.json({ jobs: jobsList }, 200);
  } catch (error: unknown) {
    return c.json({ error: toMessage(error) }, 500);
  }
});

// POST /api/jobs/:id/analyze
jobs.post('/:id/analyze', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const jobId = c.req.param('id');

    // Include profile version (updated_at) in cache key so stale results are never
    // served after the user updates their profile. Old keys expire via 7-day KV TTL.
    const profileVersion = user.updated_at || 0;
    const cacheKey = `job-analysis:${user.id}:${jobId}:v${profileVersion}`;
    const cached = await c.env.KV_CACHE.get(cacheKey);
    if (cached) {
      return c.json({ analysis: JSON.parse(cached), cached: true }, 200);
    }

    // Get job
    const job = await getJobById(c.env, jobId, user.id);
    if (!job) {
      throw new NotFoundError('Job not found');
    }

    // Parse skills and requirements
    const userSkills = user.skills ? JSON.parse(user.skills) : [];
    const jobRequirements = job.requirements ? JSON.parse(job.requirements) : [];

    // Generate analysis
    const analysis = await mockJobAnalysis(userSkills, jobRequirements);

    // Cache the result
    await c.env.KV_CACHE.put(cacheKey, JSON.stringify(analysis), {
      expirationTtl: 7 * 24 * 60 * 60,
    });

    return c.json({ analysis, cached: false }, 200);
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    return c.json({ error: toMessage(error) }, 500);
  }
});

// POST /api/jobs/:id/hide - Hide a job from recommendations
jobs.post('/:id/hide', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const jobId = c.req.param('id');

    // Check if job exists
    const job = await getJobById(c.env, jobId, user.id);
    if (!job) {
      throw new NotFoundError('Job not found');
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
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    return c.json({ error: toMessage(error) }, 500);
  }
});

// DELETE /api/jobs/:id/hide - Unhide a job
jobs.delete('/:id/hide', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const jobId = c.req.param('id');

    await c.env.DB.prepare(
      'DELETE FROM hidden_jobs WHERE user_id = ? AND job_id = ?'
    ).bind(user.id, jobId).run();

    return c.json({ success: true }, 200);
  } catch (error: unknown) {
    return c.json({ error: toMessage(error) }, 500);
  }
});

export default jobs;
