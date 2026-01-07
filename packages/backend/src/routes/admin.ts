import { Hono } from 'hono';
import type { Env } from '../services/db.service';
import type { User } from '@gethiredpoc/shared';
import { importJobsFromApify, importJobsForUser, importJobsForAllUsers } from '../services/apify.service';
import { canUserImport, recordImportRequest, updateImportStatus } from '../services/import-rate-limit.service';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';
import {
  getSystemMetrics,
  getAllUsers,
  recordAuditLog,
  updateUserRole,
} from '../services/admin.service';
import {
  getPrompt,
  listPrompts,
  upsertPrompt,
  deletePrompt,
} from '../services/ai-prompt.service';
import {
  getUserTier,
  canPerformAction,
  incrementUsage,
  getSubscriptionStatus,
} from '../services/subscription.service';
import {
  sendLimitWarningEmail,
  sendLimitReachedEmail,
  shouldSendLimitWarning,
} from '../services/email.service';

const admin = new Hono<{ Bindings: Env }>();

// CRITICAL SECURITY: Protect ALL admin routes with authentication and admin check
admin.use('*', requireAuth);
admin.use('*', requireAdmin);

// GET /api/admin/metrics
// Get system metrics for admin dashboard
admin.get('/metrics', async (c) => {
  try {
    const metrics = await getSystemMetrics(c.env);
    return c.json(metrics);
  } catch (error: any) {
    console.error('Failed to fetch metrics:', error);
    return c.json({ error: error.message }, 500);
  }
});

// GET /api/admin/users
// Get all users with pagination and search
admin.get('/users', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1', 10);
    const limit = parseInt(c.req.query('limit') || '20', 10);
    const searchQuery = c.req.query('search') || undefined;

    const result = await getAllUsers(c.env, { page, limit, searchQuery });
    return c.json(result);
  } catch (error: any) {
    console.error('Failed to fetch users:', error);
    return c.json({ error: error.message }, 500);
  }
});

// PUT /api/admin/users/:userId/role
// Update a user's role
admin.put('/users/:userId/role', async (c) => {
  try {
    const userId = c.req.param('userId');
    const { role } = await c.req.json();
    const currentUser = c.get('user') as User;

    if (!role || !['user', 'admin'].includes(role)) {
      return c.json({ error: 'Invalid role. Must be "user" or "admin"' }, 400);
    }

    const updatedUser = await updateUserRole(c.env, userId, role, currentUser.id);

    return c.json({
      success: true,
      user: updatedUser,
      message: `User role updated to ${role}`,
    });
  } catch (error: any) {
    console.error('Failed to update user role:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/admin/import-jobs
// Trigger job import from Apify scrapers
admin.post('/import-jobs', async (c) => {
  try {
    const currentUser = c.get('user') as User;
    const body = await c.req.json().catch(() => ({}));
    const { queries, scrapers, location, radius } = body;

    // Check subscription tier and limits
    const tierCheck = await canPerformAction(c.env.DB, currentUser.id, 'job_import');
    if (!tierCheck.allowed) {
      return c.json({
        error: 'Subscription limit reached',
        message: tierCheck.reason,
        current: tierCheck.current,
        limit: tierCheck.limit,
        upgradeUrl: '/subscription/upgrade',
      }, 402); // 402 Payment Required
    }

    // Get user's tier limits to apply jobsPerSearch
    const { tier, limits } = await getUserTier(c.env.DB, currentUser.id);
    const jobsPerSearch = limits.jobsPerSearch;

    const searchQueries = queries || [
      'software engineer remote',
      'web developer remote',
      'frontend engineer remote',
      'backend engineer remote',
      'full stack developer remote',
      'devops engineer remote',
      'data engineer remote',
      'machine learning engineer remote'
    ];

    const scraperTypes = scrapers || ['linkedin', 'indeed', 'dice'];
    const searchLocation = location || 'United States';
    const searchRadius = radius || '25';

    console.log(`[${tier.toUpperCase()}] Starting job import with ${searchQueries.length} search queries in ${searchLocation} (${searchRadius} miles), limit: ${jobsPerSearch} jobs per search`);

    // Call Apify import with tier-based job limit
    const result = await importJobsFromApify(c.env, searchQueries, searchLocation, jobsPerSearch, searchRadius);

    // Increment usage counters
    await incrementUsage(c.env.DB, currentUser.id, 'job_import', 1);
    await incrementUsage(c.env.DB, currentUser.id, 'jobs_imported', result.imported);

    // Check if limit warning or limit reached email should be sent
    if (tierCheck.current !== undefined && tierCheck.limit) {
      const newCurrent = tierCheck.current + 1;

      if (shouldSendLimitWarning(newCurrent, tierCheck.limit)) {
        // Send warning at 80%
        await sendLimitWarningEmail(
          c.env,
          currentUser,
          'job searches',
          newCurrent,
          tierCheck.limit
        ).catch(err => console.error('Failed to send limit warning email:', err));
      } else if (newCurrent >= tierCheck.limit) {
        // Send limit reached at 100%
        await sendLimitReachedEmail(
          c.env,
          currentUser,
          'job searches',
          tierCheck.limit
        ).catch(err => console.error('Failed to send limit reached email:', err));
      }
    }

    // Get subscription status for response
    const subscription = await getSubscriptionStatus(c.env.DB, currentUser.id);

    // Record audit log
    await recordAuditLog(
      c.env,
      currentUser.id,
      'import_jobs',
      `[${tier.toUpperCase()}] Imported ${result.imported} jobs with ${searchQueries.length} queries from LinkedIn, Indeed, and Dice`,
      c.req.header('CF-Connecting-IP')
    );

    return c.json({
      success: true,
      imported: result.imported,
      updated: result.updated,
      errors: result.errors,
      byScraper: {
        linkedin: { imported: result.sources.linkedin, updated: 0, errors: 0 },
        indeed: { imported: result.sources.indeed, updated: 0, errors: 0 },
        dice: { imported: result.sources.dice, updated: 0, errors: 0 }
      },
      message: `Imported ${result.imported} new jobs, updated ${result.updated} existing jobs.`,
      subscription: {
        tier: subscription.tier,
        jobsPerSearch: jobsPerSearch,
        searchesRemaining: tierCheck.limit ? tierCheck.limit - (tierCheck.current || 0) - 1 : undefined,
      }
    });
  } catch (error: any) {
    console.error('Job import error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/admin/import-jobs-for-user/:userId
// Import jobs based on a specific user's job search preferences
admin.post('/import-jobs-for-user/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const body = await c.req.json().catch(() => ({}));
    const { scrapers } = body;

    // Check rate limiting
    const rateLimitCheck = await canUserImport(c.env.DB, userId);
    if (!rateLimitCheck.allowed) {
      return c.json({
        error: 'Rate limit exceeded',
        message: 'User can import jobs once per 24 hours',
        nextAllowedAt: rateLimitCheck.nextAllowedAt
      }, 429);
    }

    const scraperTypes = scrapers || ['linkedin', 'indeed', 'dice'];

    console.log(`Starting personalized job import for user ${userId} with scrapers: ${scraperTypes.join(', ')}`);

    // Record import request - use 'all' if multiple scrapers, otherwise use the single scraper type
    const scraperType = scraperTypes.length > 1 ? 'all' : scraperTypes[0];
    const requestId = await recordImportRequest(c.env.DB, userId, scraperType);

    try {
      // Update status to running
      await updateImportStatus(c.env.DB, requestId, 'running');

      // Perform import (importJobsForUser uses all scrapers automatically)
      const result = await importJobsForUser(c.env, userId);

      // Update status to completed with stats
      await updateImportStatus(c.env.DB, requestId, 'completed', {
        imported: result.imported,
        updated: result.updated,
        errors: result.errors
      });

      // Record audit log
      const currentUser = c.get('user') as User;
      await recordAuditLog(
        c.env,
        currentUser.id,
        'import_jobs_for_user',
        `Imported ${result.imported} jobs for user ${userId} from LinkedIn, Indeed, and Dice`,
        c.req.header('CF-Connecting-IP')
      );

      return c.json({
        success: true,
        userId,
        imported: result.imported,
        updated: result.updated,
        errors: result.errors,
        byScraper: {
          linkedin: { imported: result.sources.linkedin, updated: 0, errors: 0 },
          indeed: { imported: result.sources.indeed, updated: 0, errors: 0 },
          dice: { imported: result.sources.dice, updated: 0, errors: 0 }
        },
        message: `Imported ${result.imported} new jobs, updated ${result.updated} existing jobs based on user preferences.`
      });
    } catch (importError: any) {
      // Update status to failed
      await updateImportStatus(c.env.DB, requestId, 'failed');
      throw importError;
    }
  } catch (error: any) {
    console.error('User job import error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/admin/backfill-embeddings
// Backfill embeddings for all jobs that don't have them
admin.post('/backfill-embeddings', async (c) => {
  try {
    const limit = c.req.query('limit') ? parseInt(c.req.query('limit')) : undefined;
    const currentUser = c.get('user') as User;

    const { backfillJobEmbeddings } = await import('../services/backfill.service');

    const result = await backfillJobEmbeddings(c.env, limit);

    // Record audit log
    await recordAuditLog(
      c.env,
      currentUser.id,
      'backfill_embeddings',
      `Backfilled ${result.processed} jobs with embeddings. Estimated cost: $${result.estimatedCost.toFixed(4)}`,
      c.req.header('CF-Connecting-IP')
    );

    return c.json({
      success: true,
      ...result,
      message: `Backfilled ${result.processed} jobs successfully. Estimated cost: $${result.estimatedCost.toFixed(4)}`
    });
  } catch (error: any) {
    console.error('[Admin] Backfill embeddings error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/admin/backfill-user-embeddings
// Backfill embeddings for all user profiles
admin.post('/backfill-user-embeddings', async (c) => {
  try {
    const limit = c.req.query('limit') ? parseInt(c.req.query('limit')) : undefined;
    const currentUser = c.get('user') as User;

    const { backfillUserEmbeddings } = await import('../services/backfill.service');

    const result = await backfillUserEmbeddings(c.env, limit);

    // Record audit log
    await recordAuditLog(
      c.env,
      currentUser.id,
      'backfill_user_embeddings',
      `Backfilled ${result.processed} user profiles with embeddings. Skipped ${result.skipped}. Estimated cost: $${result.estimatedCost.toFixed(4)}`,
      c.req.header('CF-Connecting-IP')
    );

    return c.json({
      success: true,
      ...result,
      message: `Backfilled ${result.processed} user profiles successfully. Skipped ${result.skipped} users with no profile data. Estimated cost: $${result.estimatedCost.toFixed(4)}`
    });
  } catch (error: any) {
    console.error('[Admin] Backfill user embeddings error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// AI PROMPT MANAGEMENT ENDPOINTS
// ============================================================================

// GET /api/admin/prompts
// List all AI prompts (configurable prompt templates)
admin.get('/prompts', async (c) => {
  try {
    const activeOnly = c.req.query('active_only') !== 'false'; // Default to true
    const prompts = await listPrompts(c.env, activeOnly);

    return c.json({
      success: true,
      count: prompts.length,
      prompts
    });
  } catch (error: any) {
    console.error('Failed to list prompts:', error);
    return c.json({ error: error.message }, 500);
  }
});

// GET /api/admin/prompts/:key
// Get a single AI prompt by key
admin.get('/prompts/:key', async (c) => {
  try {
    const promptKey = c.req.param('key');
    const prompt = await getPrompt(c.env, promptKey);

    if (!prompt) {
      return c.json({ error: 'Prompt not found' }, 404);
    }

    return c.json({
      success: true,
      prompt
    });
  } catch (error: any) {
    console.error('Failed to fetch prompt:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/admin/prompts
// Create or update an AI prompt
admin.post('/prompts', async (c) => {
  try {
    const body = await c.req.json();
    const currentUser = c.get('user') as User;

    // Validate required fields
    if (!body.prompt_key || !body.prompt_name || !body.prompt_template) {
      return c.json({
        error: 'Missing required fields: prompt_key, prompt_name, prompt_template'
      }, 400);
    }

    // Validate model_config is valid JSON if provided
    if (body.model_config) {
      try {
        JSON.parse(body.model_config);
      } catch (e) {
        return c.json({ error: 'Invalid JSON in model_config' }, 400);
      }
    }

    const prompt = await upsertPrompt(c.env, {
      prompt_key: body.prompt_key,
      prompt_name: body.prompt_name,
      prompt_template: body.prompt_template,
      description: body.description,
      model_config: body.model_config,
      version: body.version
    });

    // Record audit log
    await recordAuditLog(
      c.env,
      currentUser.id,
      'update_prompt',
      JSON.stringify({
        prompt_key: body.prompt_key,
        prompt_name: body.prompt_name,
        version: prompt.version
      }),
      c.req.header('CF-Connecting-IP')
    );

    return c.json({
      success: true,
      message: `Prompt '${body.prompt_key}' saved successfully`,
      prompt
    });
  } catch (error: any) {
    console.error('Failed to save prompt:', error);
    return c.json({ error: error.message }, 500);
  }
});

// PUT /api/admin/prompts/:key
// Update an existing AI prompt
admin.put('/prompts/:key', async (c) => {
  try {
    const promptKey = c.req.param('key');
    const body = await c.req.json();
    const currentUser = c.get('user') as User;

    // Check if prompt exists
    const existing = await getPrompt(c.env, promptKey);
    if (!existing) {
      return c.json({ error: 'Prompt not found' }, 404);
    }

    // Validate model_config is valid JSON if provided
    if (body.model_config) {
      try {
        JSON.parse(body.model_config);
      } catch (e) {
        return c.json({ error: 'Invalid JSON in model_config' }, 400);
      }
    }

    const prompt = await upsertPrompt(c.env, {
      prompt_key: promptKey,
      prompt_name: body.prompt_name || existing.prompt_name,
      prompt_template: body.prompt_template || existing.prompt_template,
      description: body.description !== undefined ? body.description : existing.description,
      model_config: body.model_config || existing.model_config,
      version: body.version
    });

    // Record audit log
    await recordAuditLog(
      c.env,
      currentUser.id,
      'update_prompt',
      JSON.stringify({
        prompt_key: promptKey,
        version: prompt.version
      }),
      c.req.header('CF-Connecting-IP')
    );

    return c.json({
      success: true,
      message: `Prompt '${promptKey}' updated successfully`,
      prompt
    });
  } catch (error: any) {
    console.error('Failed to update prompt:', error);
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /api/admin/prompts/:key
// Soft delete an AI prompt (set is_active = 0)
admin.delete('/prompts/:key', async (c) => {
  try {
    const promptKey = c.req.param('key');
    const currentUser = c.get('user') as User;

    const result = await deletePrompt(c.env, promptKey);

    if (!result) {
      return c.json({ error: 'Failed to delete prompt' }, 500);
    }

    // Record audit log
    await recordAuditLog(
      c.env,
      currentUser.id,
      'delete_prompt',
      JSON.stringify({ prompt_key: promptKey }),
      c.req.header('CF-Connecting-IP')
    );

    return c.json({
      success: true,
      message: `Prompt '${promptKey}' deleted successfully`
    });
  } catch (error: any) {
    console.error('Failed to delete prompt:', error);
    return c.json({ error: error.message }, 500);
  }
});

// GET /api/admin/linkedin-cookie/status
// Check if LinkedIn cookie is configured
admin.get('/linkedin-cookie/status', async (c) => {
  try {
    const cookie = await c.env.KV_CACHE.get('linkedin_scraper_cookie');
    return c.json({
      configured: !!cookie,
      lastUpdated: cookie ? await c.env.KV_CACHE.get('linkedin_scraper_cookie_updated') : null
    });
  } catch (error: any) {
    console.error('Failed to check LinkedIn cookie status:', error);
    return c.json({ error: error.message }, 500);
  }
});

// PUT /api/admin/linkedin-cookie
// Update LinkedIn cookie for scraping
admin.put('/linkedin-cookie', async (c) => {
  try {
    const { cookie } = await c.req.json();

    if (!cookie || typeof cookie !== 'string') {
      return c.json({ error: 'Cookie is required and must be a string' }, 400);
    }

    // Store cookie in KV (encrypted at rest by Cloudflare)
    await c.env.KV_CACHE.put('linkedin_scraper_cookie', cookie);
    await c.env.KV_CACHE.put('linkedin_scraper_cookie_updated', new Date().toISOString());

    // Record audit log
    const currentUser = c.get('user') as User;
    await recordAuditLog(
      c.env,
      currentUser.id,
      'update_linkedin_cookie',
      'Updated LinkedIn scraper cookie',
      c.req.header('CF-Connecting-IP')
    );

    return c.json({
      success: true,
      message: 'LinkedIn cookie updated successfully',
      updatedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Failed to update LinkedIn cookie:', error);
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /api/admin/linkedin-cookie
// Remove LinkedIn cookie
admin.delete('/linkedin-cookie', async (c) => {
  try {
    await c.env.KV_CACHE.delete('linkedin_scraper_cookie');
    await c.env.KV_CACHE.delete('linkedin_scraper_cookie_updated');

    // Record audit log
    const currentUser = c.get('user') as User;
    await recordAuditLog(
      c.env,
      currentUser.id,
      'delete_linkedin_cookie',
      'Deleted LinkedIn scraper cookie',
      c.req.header('CF-Connecting-IP')
    );

    return c.json({
      success: true,
      message: 'LinkedIn cookie deleted successfully'
    });
  } catch (error: any) {
    console.error('Failed to delete LinkedIn cookie:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default admin;
