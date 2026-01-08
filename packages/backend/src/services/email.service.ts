import { Resend } from 'resend';
import { render } from '@react-email/render';
import type { Env } from './db.service';
import type { User } from '@gethiredpoc/shared';
import { LimitWarningEmail } from '../emails/LimitWarningEmail';
import { LimitReachedEmail } from '../emails/LimitReachedEmail';
import { PaymentSuccessEmail } from '../emails/PaymentSuccessEmail';
import { PaymentFailedEmail } from '../emails/PaymentFailedEmail';
import { MonthlyUsageSummary } from '../emails/MonthlyUsageSummary';
import { TrialWarningEmail } from '../emails/TrialWarningEmail';
import { TrialFinalWarningEmail } from '../emails/TrialFinalWarningEmail';
import { TrialExpiredEmail } from '../emails/TrialExpiredEmail';

export interface EmailPreferences {
  userId: string;
  digestEnabled: boolean;
  statusUpdatesEnabled: boolean;
  remindersEnabled: boolean;
  digestFrequency: 'daily' | 'weekly' | 'monthly';
}

/**
 * Send welcome email when user signs up
 */
export async function sendWelcomeEmail(
  env: Env,
  userEmail: string,
  userName?: string
): Promise<void> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('Resend API key not configured, skipping welcome email');
    return;
  }

  const resend = new Resend(apiKey);

  try {
    await resend.emails.send({
      from: 'GetHired POC <noreply@gethiredpoc.com>',
      to: userEmail,
      subject: 'Welcome to GetHired POC!',
      html: `
        <h2>Welcome to GetHired POC!</h2>
        <p>Hi ${userName || 'there'},</p>
        <p>We're excited to help you in your job search journey.</p>
        <h3>Get started by:</h3>
        <ol>
          <li>Uploading your resume</li>
          <li>Browsing available jobs</li>
          <li>Tracking your applications</li>
        </ol>
        <p>Best of luck!<br>The GetHired Team</p>
      `
    });

    console.log(`Welcome email sent to ${userEmail}`);
    await logEmail(env.DB, userEmail, 'welcome', 'Welcome to GetHired POC!', 'sent');
  } catch (error: any) {
    console.error('Resend error:', error.message);
    await logEmail(env.DB, userEmail, 'welcome', 'Welcome to GetHired POC!', 'failed');
  }
}

/**
 * Send application status update email
 */
export async function sendStatusUpdateEmail(
  env: Env,
  userEmail: string,
  jobTitle: string,
  company: string,
  newStatus: string
): Promise<void> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('Resend API key not configured, skipping status update email');
    return;
  }

  // Check if user has status updates enabled
  const prefs = await getEmailPreferences(env.DB, userEmail);
  if (!prefs.statusUpdatesEnabled) {
    console.log(`Status updates disabled for ${userEmail}`);
    return;
  }

  const resend = new Resend(apiKey);

  const statusMessages = {
    'applied': 'Your application has been submitted',
    'phone_screen': 'You have a phone screen scheduled',
    'interview': 'You have an interview scheduled',
    'offer': 'Congratulations! You received an offer',
    'rejected': 'Application status updated'
  };

  const message = statusMessages[newStatus as keyof typeof statusMessages] || 'Application status updated';
  const subject = `${message} - ${jobTitle} at ${company}`;

  try {
    await resend.emails.send({
      from: 'GetHired POC <noreply@gethiredpoc.com>',
      to: userEmail,
      subject,
      html: `
        <h2>${message}</h2>
        <p><strong>Job:</strong> ${jobTitle}</p>
        <p><strong>Company:</strong> ${company}</p>
        <p><strong>New Status:</strong> ${newStatus}</p>
        <p>Good luck!<br>The GetHired Team</p>
      `
    });

    console.log(`Status update email sent to ${userEmail}`);
    await logEmail(env.DB, userEmail, 'status_update', subject, 'sent');
  } catch (error: any) {
    console.error('Resend error:', error.message);
    await logEmail(env.DB, userEmail, 'status_update', subject, 'failed');
  }
}

/**
 * Get email preferences for a user
 */
export async function getEmailPreferences(
  db: D1Database,
  userId: string
): Promise<EmailPreferences> {
  const result = await db.prepare(`
    SELECT user_id, digest_enabled, status_updates_enabled, reminders_enabled, digest_frequency
    FROM email_preferences
    WHERE user_id = ?
  `).bind(userId).first();

  if (!result) {
    // Return defaults if no preferences exist
    return {
      userId,
      digestEnabled: true,
      statusUpdatesEnabled: true,
      remindersEnabled: true,
      digestFrequency: 'weekly'
    };
  }

  return {
    userId: result.user_id as string,
    digestEnabled: Boolean(result.digest_enabled),
    statusUpdatesEnabled: Boolean(result.status_updates_enabled),
    remindersEnabled: Boolean(result.reminders_enabled),
    digestFrequency: (result.digest_frequency as string) as 'daily' | 'weekly' | 'monthly'
  };
}

/**
 * Update email preferences for a user
 */
export async function updateEmailPreferences(
  db: D1Database,
  userId: string,
  preferences: Partial<Omit<EmailPreferences, 'userId'>>
): Promise<void> {
  // Check if preferences exist
  const existing = await db.prepare('SELECT user_id FROM email_preferences WHERE user_id = ?')
    .bind(userId)
    .first();

  if (existing) {
    // Update existing preferences
    const updates: string[] = [];
    const values: any[] = [];

    if (preferences.digestEnabled !== undefined) {
      updates.push('digest_enabled = ?');
      values.push(preferences.digestEnabled ? 1 : 0);
    }
    if (preferences.statusUpdatesEnabled !== undefined) {
      updates.push('status_updates_enabled = ?');
      values.push(preferences.statusUpdatesEnabled ? 1 : 0);
    }
    if (preferences.remindersEnabled !== undefined) {
      updates.push('reminders_enabled = ?');
      values.push(preferences.remindersEnabled ? 1 : 0);
    }
    if (preferences.digestFrequency) {
      updates.push('digest_frequency = ?');
      values.push(preferences.digestFrequency);
    }

    if (updates.length > 0) {
      values.push(userId);
      await db.prepare(`
        UPDATE email_preferences SET ${updates.join(', ')}
        WHERE user_id = ?
      `).bind(...values).run();
    }
  } else {
    // Insert new preferences
    await db.prepare(`
      INSERT INTO email_preferences (user_id, digest_enabled, status_updates_enabled, reminders_enabled, digest_frequency)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      userId,
      preferences.digestEnabled ?? true ? 1 : 0,
      preferences.statusUpdatesEnabled ?? true ? 1 : 0,
      preferences.remindersEnabled ?? true ? 1 : 0,
      preferences.digestFrequency || 'weekly'
    ).run();
  }
}

/**
 * Log email send attempt
 */
async function logEmail(
  db: D1Database,
  userEmail: string,
  emailType: string,
  subject: string,
  status: string
): Promise<void> {
  // Get user ID from email
  const user = await db.prepare('SELECT id FROM users WHERE email = ?')
    .bind(userEmail)
    .first();

  if (!user) {
    console.warn(`User not found for email: ${userEmail}`);
    return;
  }

  await db.prepare(`
    INSERT INTO email_log (user_id, email_type, subject, status)
    VALUES (?, ?, ?, ?)
  `).bind(user.id, emailType, subject, status).run();
}

/**
 * Helper function to determine if limit warning should be sent
 */
export function shouldSendLimitWarning(current: number, limit: number): boolean {
  const percentage = (current / limit) * 100;
  // Send at 80% and 100%
  return percentage >= 80 && percentage < 100;
}

/**
 * Send limit warning email when user reaches 80% of their limit
 */
export async function sendLimitWarningEmail(
  env: Env,
  user: User,
  limitType: 'job searches' | 'applications' | 'resumes' | 'cover letters',
  current: number,
  limit: number
): Promise<void> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('Resend API key not configured, skipping limit warning email');
    return;
  }

  const resend = new Resend(apiKey);
  const percentage = Math.round((current / limit) * 100);
  const subject = `You've used ${percentage}% of your ${limitType} limit`;

  try {
    const html = await render(
      LimitWarningEmail({
        userName: user.full_name || 'there',
        limitType,
        current,
        limit,
        upgradeUrl: `${env.FRONTEND_URL || 'https://gethiredpoc.pages.dev'}/subscription`,
      })
    );

    await resend.emails.send({
      from: 'GetHiredPOC <noreply@gethiredpoc.com>',
      to: user.email,
      subject,
      html,
    });

    console.log(`Limit warning email sent to ${user.email}`);
    await logEmail(env.DB, user.email, 'limit_warning', subject, 'sent');
  } catch (error: any) {
    console.error('Failed to send limit warning email:', error.message);
    await logEmail(env.DB, user.email, 'limit_warning', subject, 'failed');
  }
}

/**
 * Send limit reached email when user hits 100% of their limit
 */
export async function sendLimitReachedEmail(
  env: Env,
  user: User,
  limitType: 'job searches' | 'applications' | 'resumes' | 'cover letters',
  limit: number,
  resetDate?: string
): Promise<void> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('Resend API key not configured, skipping limit reached email');
    return;
  }

  const resend = new Resend(apiKey);
  const subject = `You've reached your ${limitType} limit`;

  try {
    const html = await render(
      LimitReachedEmail({
        userName: user.full_name || 'there',
        limitType,
        limit,
        upgradeUrl: `${env.FRONTEND_URL || 'https://gethiredpoc.pages.dev'}/subscription`,
        resetDate,
      })
    );

    await resend.emails.send({
      from: 'GetHiredPOC <noreply@gethiredpoc.com>',
      to: user.email,
      subject,
      html,
    });

    console.log(`Limit reached email sent to ${user.email}`);
    await logEmail(env.DB, user.email, 'limit_reached', subject, 'sent');
  } catch (error: any) {
    console.error('Failed to send limit reached email:', error.message);
    await logEmail(env.DB, user.email, 'limit_reached', subject, 'failed');
  }
}

/**
 * Send payment success email after PRO subscription purchase
 */
export async function sendPaymentSuccessEmail(
  env: Env,
  user: User,
  amount: number,
  subscriptionId: string,
  startDate: string,
  nextBillingDate: string
): Promise<void> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('Resend API key not configured, skipping payment success email');
    return;
  }

  const resend = new Resend(apiKey);
  const subject = 'Thank you for upgrading to PRO!';

  try {
    const html = await render(
      PaymentSuccessEmail({
        userName: user.full_name || 'there',
        amount,
        subscriptionId,
        startDate,
        nextBillingDate,
        dashboardUrl: `${env.FRONTEND_URL || 'https://gethiredpoc.pages.dev'}/dashboard`,
      })
    );

    await resend.emails.send({
      from: 'GetHiredPOC <noreply@gethiredpoc.com>',
      to: user.email,
      subject,
      html,
    });

    console.log(`Payment success email sent to ${user.email}`);
    await logEmail(env.DB, user.email, 'payment_success', subject, 'sent');
  } catch (error: any) {
    console.error('Failed to send payment success email:', error.message);
    await logEmail(env.DB, user.email, 'payment_success', subject, 'failed');
  }
}

/**
 * Send payment failed email (dunning email)
 */
export async function sendPaymentFailedEmail(
  env: Env,
  user: User,
  amount: number,
  failureReason: string,
  retryDate: string
): Promise<void> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('Resend API key not configured, skipping payment failed email');
    return;
  }

  const resend = new Resend(apiKey);
  const subject = 'Action required: Payment failed';

  try {
    const html = await render(
      PaymentFailedEmail({
        userName: user.full_name || 'there',
        amount,
        failureReason,
        retryDate,
        updatePaymentUrl: `${env.FRONTEND_URL || 'https://gethiredpoc.pages.dev'}/subscription`,
      })
    );

    await resend.emails.send({
      from: 'GetHiredPOC <noreply@gethiredpoc.com>',
      to: user.email,
      subject,
      html,
    });

    console.log(`Payment failed email sent to ${user.email}`);
    await logEmail(env.DB, user.email, 'payment_failed', subject, 'sent');
  } catch (error: any) {
    console.error('Failed to send payment failed email:', error.message);
    await logEmail(env.DB, user.email, 'payment_failed', subject, 'failed');
  }
}

/**
 * Send monthly usage summary email
 */
export async function sendMonthlyUsageSummary(
  env: Env,
  user: User,
  month: string,
  usage: {
    jobSearches: number;
    jobsImported: number;
    applications: number;
    resumesGenerated: number;
    coverLettersGenerated: number;
  }
): Promise<void> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('Resend API key not configured, skipping monthly summary email');
    return;
  }

  const resend = new Resend(apiKey);
  const subject = `Your ${month} usage summary`;

  try {
    const html = await render(
      MonthlyUsageSummary({
        userName: user.full_name || 'there',
        month,
        tier: user.subscription_tier === 'pro' ? 'pro' : 'free',
        usage,
        dashboardUrl: `${env.FRONTEND_URL || 'https://gethiredpoc.pages.dev'}/dashboard`,
        upgradeUrl: user.subscription_tier !== 'pro'
          ? `${env.FRONTEND_URL || 'https://gethiredpoc.pages.dev'}/subscription`
          : undefined,
      })
    );

    await resend.emails.send({
      from: 'GetHiredPOC <noreply@gethiredpoc.com>',
      to: user.email,
      subject,
      html,
    });

    console.log(`Monthly usage summary sent to ${user.email}`);
    await logEmail(env.DB, user.email, 'monthly_summary', subject, 'sent');
  } catch (error: any) {
    console.error('Failed to send monthly summary email:', error.message);
    await logEmail(env.DB, user.email, 'monthly_summary', subject, 'failed');
  }
}

/**
 * Send trial warning email (7 days before expiry)
 */
export async function sendTrialWarningEmail(
  env: Env,
  user: User,
  daysRemaining: number
): Promise<void> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('Resend API key not configured, skipping trial warning email');
    return;
  }

  const resend = new Resend(apiKey);
  const subject = `Your PRO trial expires in ${daysRemaining} days`;

  try {
    const html = await render(
      TrialWarningEmail({
        userName: user.full_name || 'there',
        daysRemaining,
        upgradeUrl: `${env.FRONTEND_URL || 'https://gethiredpoc.pages.dev'}/subscription`,
      })
    );

    await resend.emails.send({
      from: 'GetHiredPOC <noreply@gethiredpoc.com>',
      to: user.email,
      subject,
      html,
    });

    console.log(`Trial warning email sent to ${user.email}`);
    await logEmail(env.DB, user.email, 'trial_warning', subject, 'sent');
  } catch (error: any) {
    console.error('Failed to send trial warning email:', error.message);
    await logEmail(env.DB, user.email, 'trial_warning', subject, 'failed');
  }
}

/**
 * Send trial final warning email (1 day before expiry)
 */
export async function sendTrialFinalWarningEmail(
  env: Env,
  user: User
): Promise<void> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('Resend API key not configured, skipping trial final warning email');
    return;
  }

  const resend = new Resend(apiKey);
  const subject = 'Your PRO trial expires tomorrow!';

  try {
    const html = await render(
      TrialFinalWarningEmail({
        userName: user.full_name || 'there',
        upgradeUrl: `${env.FRONTEND_URL || 'https://gethiredpoc.pages.dev'}/subscription`,
      })
    );

    await resend.emails.send({
      from: 'GetHiredPOC <noreply@gethiredpoc.com>',
      to: user.email,
      subject,
      html,
    });

    console.log(`Trial final warning email sent to ${user.email}`);
    await logEmail(env.DB, user.email, 'trial_final_warning', subject, 'sent');
  } catch (error: any) {
    console.error('Failed to send trial final warning email:', error.message);
    await logEmail(env.DB, user.email, 'trial_final_warning', subject, 'failed');
  }
}

/**
 * Send trial expired email
 */
export async function sendTrialExpiredEmail(
  env: Env,
  user: User
): Promise<void> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('Resend API key not configured, skipping trial expired email');
    return;
  }

  const resend = new Resend(apiKey);
  const subject = 'Your PRO trial has ended';

  try {
    const html = await render(
      TrialExpiredEmail({
        userName: user.full_name || 'there',
        upgradeUrl: `${env.FRONTEND_URL || 'https://gethiredpoc.pages.dev'}/subscription`,
      })
    );

    await resend.emails.send({
      from: 'GetHiredPOC <noreply@gethiredpoc.com>',
      to: user.email,
      subject,
      html,
    });

    console.log(`Trial expired email sent to ${user.email}`);
    await logEmail(env.DB, user.email, 'trial_expired', subject, 'sent');
  } catch (error: any) {
    console.error('Failed to send trial expired email:', error.message);
    await logEmail(env.DB, user.email, 'trial_expired', subject, 'failed');
  }
}
