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

export default admin;
