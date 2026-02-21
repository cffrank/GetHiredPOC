import { Resend } from 'resend';
import type { Env } from './db.service';

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
  } catch (error: unknown) {
    console.error('Resend error:', error instanceof Error ? error.message : String(error));
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
  } catch (error: unknown) {
    console.error('Resend error:', error instanceof Error ? error.message : String(error));
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
