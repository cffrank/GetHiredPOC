import type { Env } from './db.service';
import { Resend } from 'resend';
import { getRecommendationsWithJobDetails } from './job-recommendations.service';

export async function sendDailyJobAlert(env: Env, userId: string): Promise<boolean> {
  try {
    // Get user
    const user = await env.DB.prepare(
      'SELECT * FROM users WHERE id = ?'
    ).bind(userId).first();

    if (!user || !user.email) {
      console.log(`[Job Alert] User ${userId} has no email`);
      return false;
    }

    // Check if user wants daily alerts
    if (!user.daily_job_alerts) {
      console.log(`[Job Alert] User ${userId} has daily alerts disabled`);
      return false;
    }

    // Get top 5 recommendations
    const recommendations = await getRecommendationsWithJobDetails(env, userId, 5);

    if (recommendations.length === 0) {
      console.log(`[Job Alert] No new recommendations for user ${userId}`);
      return false; // No new jobs to recommend
    }

    console.log(`[Job Alert] Sending ${recommendations.length} recommendations to ${user.email}`);

    // Build email HTML
    const jobsHtml = recommendations.map(({ match, job }) => {
      return `
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px; background: white;">
          <h3 style="margin: 0 0 8px 0; color: #1f2937; font-size: 18px;">${job.title}</h3>
          <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 14px;">${job.company} • ${job.location}${job.remote ? ' • Remote' : ''}</p>
          <div style="margin: 12px 0; padding: 8px; background: ${match.score >= 80 ? '#d1fae5' : match.score >= 60 ? '#dbeafe' : '#fef3c7'}; border-radius: 6px;">
            <p style="margin: 0; color: ${match.score >= 80 ? '#059669' : match.score >= 60 ? '#1d4ed8' : '#d97706'}; font-weight: bold;">
              ${match.score}% Match
            </p>
          </div>
          <p style="margin: 8px 0; color: #059669; font-weight: 600; font-size: 14px;">Why it's a good fit:</p>
          <ul style="margin: 4px 0; padding-left: 20px; color: #374151; font-size: 14px;">
            ${match.strengths.slice(0, 3).map(s => `<li style="margin-bottom: 4px;">${s}</li>`).join('')}
          </ul>
          ${match.concerns.length > 0 ? `
            <p style="margin: 8px 0; color: #d97706; font-weight: 600; font-size: 14px;">Things to consider:</p>
            <ul style="margin: 4px 0; padding-left: 20px; color: #92400e; font-size: 14px;">
              ${match.concerns.slice(0, 2).map(c => `<li style="margin-bottom: 4px;">${c}</li>`).join('')}
            </ul>
          ` : ''}
          <a href="${env.FRONTEND_URL || 'https://gethiredpoc.pages.dev'}/jobs/${job.id}"
             style="display: inline-block; margin-top: 12px; padding: 10px 20px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
            View Job & Apply
          </a>
        </div>
      `;
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f9fafb;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h1 style="margin: 0 0 8px 0; color: #1f2937; font-size: 24px;">Your Daily Job Recommendations</h1>
          <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 16px;">
            Hi${user.full_name ? ' ' + user.full_name : ''}, we found ${recommendations.length} great job ${recommendations.length === 1 ? 'match' : 'matches'} for you today!
          </p>
          ${jobsHtml}
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
          <p style="margin: 0; color: #9ca3af; font-size: 14px; text-align: center;">
            GetHiredPOC •
            <a href="${env.FRONTEND_URL || 'https://gethiredpoc.pages.dev'}/settings" style="color: #6b7280; text-decoration: underline;">Manage Preferences</a>
          </p>
        </div>
      </body>
      </html>
    `;

    // Send email using Resend
    const apiKey = env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('[Job Alert] Resend API key not configured');
      return false;
    }

    const resend = new Resend(apiKey);

    await resend.emails.send({
      from: 'GetHired POC <noreply@gethiredpoc.com>',
      to: user.email,
      subject: `${recommendations.length} New Job ${recommendations.length === 1 ? 'Match' : 'Matches'} for You!`,
      html
    });

    console.log(`[Job Alert] Successfully sent alert to ${user.email}`);
    return true;
  } catch (error: any) {
    console.error(`[Job Alert] Error sending alert to user ${userId}:`, error);
    return false;
  }
}

export async function sendDailyAlertsToAllUsers(env: Env): Promise<{ sent: number; skipped: number; errors: number }> {
  console.log('[Job Alerts] Starting daily alerts for all users');

  // Get all users who want daily alerts
  const users = await env.DB.prepare(`
    SELECT id, email FROM users
    WHERE daily_job_alerts = 1
  `).all();

  console.log(`[Job Alerts] Found ${users.results.length} users with daily alerts enabled`);

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const user of users.results) {
    try {
      const result = await sendDailyJobAlert(env, user.id);
      if (result) {
        sent++;
      } else {
        skipped++;
      }

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`[Job Alerts] Failed to send alert to user ${user.id}:`, error);
      errors++;
    }
  }

  console.log(`[Job Alerts] Completed: ${sent} sent, ${skipped} skipped, ${errors} errors`);
  return { sent, skipped, errors };
}
