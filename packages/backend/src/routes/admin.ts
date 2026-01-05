import { Hono } from 'hono';
import type { Env } from '../services/db.service';
import type { User } from '@gethiredpoc/shared';
import { importJobsFromAdzuna, importJobsForUser } from '../services/adzuna.service';
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
// Trigger job import from Adzuna API
admin.post('/import-jobs', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { queries } = body;

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

    console.log(`Starting job import with ${searchQueries.length} search queries`);

    const result = await importJobsFromAdzuna(c.env, searchQueries);

    // Record audit log
    const currentUser = c.get('user') as User;
    await recordAuditLog(
      c.env,
      currentUser.id,
      'import_jobs',
      `Imported ${result.imported} jobs with ${searchQueries.length} queries`,
      c.req.header('CF-Connecting-IP')
    );

    return c.json({
      success: true,
      imported: result.imported,
      updated: result.updated,
      errors: result.errors,
      message: `Imported ${result.imported} new jobs, updated ${result.updated} existing jobs. ${result.errors} errors.`
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

    console.log(`Starting personalized job import for user ${userId}`);

    const result = await importJobsForUser(c.env, userId);

    // Record audit log
    const currentUser = c.get('user') as User;
    await recordAuditLog(
      c.env,
      currentUser.id,
      'import_jobs_for_user',
      `Imported ${result.imported} jobs for user ${userId}`,
      c.req.header('CF-Connecting-IP')
    );

    return c.json({
      success: true,
      userId,
      imported: result.imported,
      updated: result.updated,
      errors: result.errors,
      message: `Imported ${result.imported} new jobs, updated ${result.updated} existing jobs based on user preferences. ${result.errors} errors.`
    });
  } catch (error: any) {
    console.error('User job import error:', error);
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

export default admin;
