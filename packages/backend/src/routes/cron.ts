import { Hono } from 'hono';
import type { Env } from '../services/db.service';
import type { JobData } from '../services/job-import.service';

const cron = new Hono<{ Bindings: Env }>();

cron.post('/bulk-import', async (c) => {
  const apiKey = c.req.header('X-API-Key');
  if (!c.env.CRON_API_KEY || apiKey !== c.env.CRON_API_KEY) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const body = await c.req.json<{ jobs: JobData[] }>();
  if (!body.jobs || !Array.isArray(body.jobs)) {
    return c.json({ error: 'Invalid payload: expected { jobs: JobData[] }' }, 400);
  }

  const { saveOrUpdateJob } = await import('../services/job-import.service');
  const { embedNewJob } = await import('../services/job-embedding.service');

  let imported = 0;
  let updated = 0;
  let errors = 0;

  for (const jobData of body.jobs) {
    try {
      const result = await saveOrUpdateJob(c.env.DB, jobData);

      if (result.result === 'inserted') {
        imported++;
        embedNewJob(c.env, result.job).catch((err) => {
          console.error(`[BulkImport] Failed to embed job ${result.jobId}:`, err);
        });
      } else if (result.result === 'updated') {
        updated++;
      }
    } catch (err: any) {
      console.error('[BulkImport] Error saving job:', err.message);
      errors++;
    }
  }

  console.log(`[BulkImport] Done: ${imported} imported, ${updated} updated, ${errors} errors`);
  return c.json({ imported, updated, errors });
});

export default cron;
