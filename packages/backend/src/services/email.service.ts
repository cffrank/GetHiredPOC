import type { Env } from './db.service';
import type { User } from '@gethiredpoc/shared';

export interface EmailPreferences {
  userId: string;
  digestEnabled: boolean;
  statusUpdatesEnabled: boolean;
  remindersEnabled: boolean;
  digestFrequency: 'daily' | 'weekly' | 'monthly';
}

/**
 * Send an email via the email worker service binding
 */
async function sendViaWorker(
  env: Env,
  type: string,
  to: string,
  payload: Record<string, any>
): Promise<void> {
  const res = await env.EMAIL_WORKER.fetch('https://email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type,
      payload: { ...payload, to },
      apiKey: env.RESEND_API_KEY,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Email worker error (${res.status}): ${body}`);
  }
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

  try {
    await sendViaWorker(env, 'welcome', userEmail, { userName, userEmail });
    console.log(`Welcome email sent to ${userEmail}`);
    await logEmail(env.DB, userEmail, 'welcome', 'Welcome to GetHired POC!', 'sent');
  } catch (error: unknown) {
    console.error('Email send error:', error instanceof Error ? error.message : String(error));
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

  const prefs = await getEmailPreferences(env.DB, userEmail);
  if (!prefs.statusUpdatesEnabled) {
    console.log(`Status updates disabled for ${userEmail}`);
    return;
  }

  const statusMessages: Record<string, string> = {
    'applied': 'Your application has been submitted',
    'phone_screen': 'You have a phone screen scheduled',
    'interview': 'You have an interview scheduled',
    'offer': 'Congratulations! You received an offer',
    'rejected': 'Application status updated',
  };
  const message = statusMessages[newStatus] || 'Application status updated';
  const subject = `${message} - ${jobTitle} at ${company}`;

  try {
    await sendViaWorker(env, 'status_update', userEmail, { jobTitle, company, newStatus });
    console.log(`Status update email sent to ${userEmail}`);
    await logEmail(env.DB, userEmail, 'status_update', subject, 'sent');
  } catch (error: unknown) {
    console.error('Email send error:', error instanceof Error ? error.message : String(error));
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
  const existing = await db.prepare('SELECT user_id FROM email_preferences WHERE user_id = ?')
    .bind(userId)
    .first();

  if (existing) {
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

  const percentage = Math.round((current / limit) * 100);
  const subject = `You've used ${percentage}% of your ${limitType} limit`;

  try {
    await sendViaWorker(env, 'limit_warning', user.email, {
      userName: user.full_name || 'there',
      limitType,
      current,
      limit,
      upgradeUrl: `${env.FRONTEND_URL || 'https://gethiredpoc.pages.dev'}/subscription`,
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

  const subject = `You've reached your ${limitType} limit`;

  try {
    await sendViaWorker(env, 'limit_reached', user.email, {
      userName: user.full_name || 'there',
      limitType,
      limit,
      upgradeUrl: `${env.FRONTEND_URL || 'https://gethiredpoc.pages.dev'}/subscription`,
      resetDate,
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

  const subject = 'Thank you for upgrading to PRO!';

  try {
    await sendViaWorker(env, 'payment_success', user.email, {
      userName: user.full_name || 'there',
      amount,
      subscriptionId,
      startDate,
      nextBillingDate,
      dashboardUrl: `${env.FRONTEND_URL || 'https://gethiredpoc.pages.dev'}/dashboard`,
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

  const subject = 'Action required: Payment failed';

  try {
    await sendViaWorker(env, 'payment_failed', user.email, {
      userName: user.full_name || 'there',
      amount,
      failureReason,
      retryDate,
      updatePaymentUrl: `${env.FRONTEND_URL || 'https://gethiredpoc.pages.dev'}/subscription`,
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

  const subject = `Your ${month} usage summary`;

  try {
    await sendViaWorker(env, 'monthly_summary', user.email, {
      userName: user.full_name || 'there',
      month,
      tier: user.subscription_tier === 'pro' ? 'pro' : 'free',
      usage,
      dashboardUrl: `${env.FRONTEND_URL || 'https://gethiredpoc.pages.dev'}/dashboard`,
      upgradeUrl: user.subscription_tier !== 'pro'
        ? `${env.FRONTEND_URL || 'https://gethiredpoc.pages.dev'}/subscription`
        : undefined,
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

  const subject = `Your PRO trial expires in ${daysRemaining} days`;

  try {
    await sendViaWorker(env, 'trial_warning', user.email, {
      userName: user.full_name || 'there',
      daysRemaining,
      upgradeUrl: `${env.FRONTEND_URL || 'https://gethiredpoc.pages.dev'}/subscription`,
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

  const subject = 'Your PRO trial expires tomorrow!';

  try {
    await sendViaWorker(env, 'trial_final_warning', user.email, {
      userName: user.full_name || 'there',
      upgradeUrl: `${env.FRONTEND_URL || 'https://gethiredpoc.pages.dev'}/subscription`,
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

  const subject = 'Your PRO trial has ended';

  try {
    await sendViaWorker(env, 'trial_expired', user.email, {
      userName: user.full_name || 'there',
      upgradeUrl: `${env.FRONTEND_URL || 'https://gethiredpoc.pages.dev'}/subscription`,
    });
    console.log(`Trial expired email sent to ${user.email}`);
    await logEmail(env.DB, user.email, 'trial_expired', subject, 'sent');
  } catch (error: any) {
    console.error('Failed to send trial expired email:', error.message);
    await logEmail(env.DB, user.email, 'trial_expired', subject, 'failed');
  }
}
