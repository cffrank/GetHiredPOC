import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import type { Env } from './services/db.service';
import { AppError } from './utils/errors';
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
import chat from './routes/chat';
import { getFile } from './services/storage.service';

const app = new Hono<{ Bindings: Env }>();

// Security headers — applied globally before all routes
app.use(secureHeaders({
  strictTransportSecurity: 'max-age=63072000; includeSubDomains; preload',
  xFrameOptions: 'SAMEORIGIN',
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
    objectSrc: ["'none'"],
    frameAncestors: ["'none'"],
  },
}));

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
app.route('/api/chat', chat);

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
  } catch (error: unknown) {
    return c.json({ error: error instanceof Error ? error.message : 'An unexpected error occurred' }, 500);
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
  if (err instanceof AppError) {
    return c.json({ error: err.message }, err.statusCode as any);
  }
  console.error('[UnhandledError]', err);
  return c.json({ error: 'Internal server error' }, 500);
});

/**
 * Deletes expired D1 session rows.
 *
 * KV sessions auto-expire via TTL and do not need cleanup.
 * The sessions table has an idx_sessions_expires_at index so this DELETE is fast.
 */
async function cleanupExpiredSessions(env: Env): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const result = await env.DB.prepare(
    'DELETE FROM sessions WHERE expires_at < ?'
  ).bind(now).run();
  console.log(`[SessionCleanup] Deleted ${result.meta.changes} expired sessions`);
}

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

    // Clean up expired D1 sessions alongside the daily job import
    ctx.waitUntil(cleanupExpiredSessions(env));
  }
};
