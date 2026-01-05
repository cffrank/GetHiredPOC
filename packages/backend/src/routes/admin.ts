import { Hono } from 'hono';
import type { Env } from '../services/db.service';
import { importJobsFromAdzuna, importJobsForUser } from '../services/adzuna.service';

const admin = new Hono<{ Bindings: Env }>();

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
