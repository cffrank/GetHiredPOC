import { Hono } from 'hono';
import type { Env } from './services/db.service';
import auth from './routes/auth';
import jobs from './routes/jobs';
import applications from './routes/applications';
import profile from './routes/profile';
import admin from './routes/admin';
import resumes from './routes/resumes';
import workExperience from './routes/work-experience';
import education from './routes/education';
import emailPreferences from './routes/email-preferences';
import jobPreferences from './routes/job-preferences';
import exportRoutes from './routes/export';
import aiJobs from './routes/ai-jobs';
import recommendations from './routes/recommendations';
import linkedin from './routes/linkedin';
import { getFile } from './services/storage.service';

const app = new Hono<{ Bindings: Env }>();

// Manual CORS middleware for development
app.use('*', async (c, next) => {
  const origin = c.req.header('origin') || '*';

  c.header('Access-Control-Allow-Origin', origin);
  c.header('Access-Control-Allow-Credentials', 'true');
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  c.header('Access-Control-Max-Age', '86400');

  if (c.req.method === 'OPTIONS') {
    return c.body(null, 204);
  }

  await next();
});

// Routes
app.route('/api/auth', auth);
app.route('/api/jobs', jobs);
app.route('/api/applications', applications);
app.route('/api/profile', profile);
app.route('/api/admin', admin);
app.route('/api/resumes', resumes);
app.route('/api/work-experience', workExperience);
app.route('/api/education', education);
app.route('/api/email-preferences', emailPreferences);
app.route('/api/job-preferences', jobPreferences);
app.route('/api/export', exportRoutes);
app.route('/api/ai/jobs', aiJobs);
app.route('/api/recommendations', recommendations);
app.route('/api/linkedin', linkedin);

// File serving endpoint
app.get('/api/files/*', async (c) => {
  try {
    const path = c.req.path.replace('/api/files/', '');
    const file = await getFile(c.env, path);

    if (!file) {
      return c.json({ error: 'File not found' }, 404);
    }

    return new Response(file.body, {
      headers: {
        'Content-Type': file.httpMetadata?.contentType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: Date.now() });
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'Internal server error' }, 500);
});

// Cron trigger for daily job imports (runs at 1 AM UTC daily)
export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    console.log('[Cron] Daily job import triggered at', new Date().toISOString());

    // Import jobs for all users with deduplicated queries
    const { importJobsForAllUsers } = await import('./services/adzuna.service');

    ctx.waitUntil(
      importJobsForAllUsers(env).then(result => {
        console.log('[Cron] Daily job import completed:', result);
      }).catch(error => {
        console.error('[Cron] Daily job import failed:', error);
      })
    );
  }
};
