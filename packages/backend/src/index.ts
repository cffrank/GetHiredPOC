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
import chat from './routes/chat';
import subscription from './routes/subscription';
import webhooks from './routes/webhooks';
import analytics from './routes/analytics';
import interviewQuestions from './routes/interview-questions';
import generatedContent from './routes/generated-content';
import gamification from './routes/gamification';
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
app.route('/api/applications', generatedContent);
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
app.route('/api/subscription', subscription);
app.route('/api/webhooks', webhooks);
app.route('/api/admin/analytics', analytics);
app.route('/api/interview-questions', interviewQuestions);
app.route('/api/gamification', gamification);

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
    const now = new Date();
    console.log('[Cron] Daily job import triggered at', now.toISOString());

    // Import jobs for all users with rate limiting
    const { importJobsForAllUsers } = await import('./services/apify.service');
    const { canRunDailyScraper, recordDailyScraperRun } = await import('./services/import-rate-limit.service');

    ctx.waitUntil(
      (async () => {
        // Check if daily limit has been reached
        const canRun = await canRunDailyScraper(env.DB, 'all', parseInt(env.MAX_DAILY_SCRAPER_RUNS || '10'));
        if (!canRun) {
          console.log('[Cron] Daily scraper limit reached, skipping import');
          return;
        }

        // Run imports
        const result = await importJobsForAllUsers(env);
        console.log('[Cron] Daily job import completed:', result);
        console.log('[Cron] Breakdown by source:', result.sources);

        // Record the run
        await recordDailyScraperRun(env.DB, 'all');

        // Check for expired trials and downgrade users
        console.log('[Cron] Checking for expired trials');
        const { checkExpiredTrials, getTrialsExpiringIn } = await import('./services/subscription.service');
        const { sendTrialWarningEmail, sendTrialFinalWarningEmail, sendTrialExpiredEmail } = await import('./services/email.service');

        // Check for expired trials
        const expiredUsers = await checkExpiredTrials(env.DB);
        console.log(`[Cron] Found ${expiredUsers.length} expired trials`);

        // Send trial expired emails
        for (const expiredUser of expiredUsers) {
          try {
            const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(expiredUser.id).first();
            if (user) {
              await sendTrialExpiredEmail(env, user as any);
              console.log(`[Cron] Trial expired email sent to ${expiredUser.email}`);
            }
          } catch (error: any) {
            console.error(`[Cron] Failed to send trial expired email to ${expiredUser.email}:`, error.message);
          }
        }

        // Check for trials expiring in 7 days
        const expiring7Days = await getTrialsExpiringIn(env.DB, 7);
        console.log(`[Cron] Found ${expiring7Days.length} trials expiring in 7 days`);

        for (const user of expiring7Days) {
          try {
            const fullUser = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(user.id).first();
            if (fullUser) {
              await sendTrialWarningEmail(env, fullUser as any, 7);
              console.log(`[Cron] 7-day warning sent to ${user.email}`);
            }
          } catch (error: any) {
            console.error(`[Cron] Failed to send 7-day warning to ${user.email}:`, error.message);
          }
        }

        // Check for trials expiring in 1 day
        const expiring1Day = await getTrialsExpiringIn(env.DB, 1);
        console.log(`[Cron] Found ${expiring1Day.length} trials expiring in 1 day`);

        for (const user of expiring1Day) {
          try {
            const fullUser = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(user.id).first();
            if (fullUser) {
              await sendTrialFinalWarningEmail(env, fullUser as any);
              console.log(`[Cron] Final warning sent to ${user.email}`);
            }
          } catch (error: any) {
            console.error(`[Cron] Failed to send final warning to ${user.email}:`, error.message);
          }
        }

        // If it's the 1st of the month, send monthly usage summaries
        if (now.getDate() === 1) {
          console.log('[Cron] First day of month - sending monthly usage summaries');
          const { sendMonthlyUsageSummary } = await import('./services/email.service');

          // Get last month's name
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const monthName = lastMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

          // Get all active users
          const users = await env.DB.prepare(`
            SELECT id, email, full_name, subscription_tier
            FROM users
            WHERE email IS NOT NULL
            ORDER BY id
          `).all();

          console.log(`[Cron] Sending monthly summaries to ${users.results.length} users`);

          // Send summary to each user
          for (const user of users.results) {
            try {
              // Get last month's usage
              const lastMonthStart = Math.floor(lastMonth.getTime() / 1000);
              const lastMonthEnd = Math.floor(now.getTime() / 1000);

              const usage = await env.DB.prepare(`
                SELECT
                  SUM(CASE WHEN action_type = 'job_import' THEN count ELSE 0 END) as job_searches,
                  SUM(CASE WHEN action_type = 'jobs_imported' THEN count ELSE 0 END) as jobs_imported,
                  SUM(CASE WHEN action_type = 'application' THEN count ELSE 0 END) as applications,
                  SUM(CASE WHEN action_type = 'resume' THEN count ELSE 0 END) as resumes_generated,
                  SUM(CASE WHEN action_type = 'cover_letter' THEN count ELSE 0 END) as cover_letters_generated
                FROM usage_tracking
                WHERE user_id = ?
                  AND updated_at >= ?
                  AND updated_at < ?
              `)
                .bind(user.id, lastMonthStart, lastMonthEnd)
                .first<{
                  job_searches: number;
                  jobs_imported: number;
                  applications: number;
                  resumes_generated: number;
                  cover_letters_generated: number;
                }>();

              if (usage) {
                await sendMonthlyUsageSummary(
                  env,
                  user as any,
                  monthName,
                  {
                    jobSearches: usage.job_searches || 0,
                    jobsImported: usage.jobs_imported || 0,
                    applications: usage.applications || 0,
                    resumesGenerated: usage.resumes_generated || 0,
                    coverLettersGenerated: usage.cover_letters_generated || 0,
                  }
                );
                console.log(`[Cron] Monthly summary sent to ${user.email}`);
              }
            } catch (error: any) {
              console.error(`[Cron] Failed to send monthly summary to ${user.email}:`, error.message);
            }
          }
        }
      })().catch(error => {
        console.error('[Cron] Daily job import failed:', error);
      })
    );
  }
};
