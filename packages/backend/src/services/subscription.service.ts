/**
 * Subscription Service
 *
 * Manages user subscription tiers, limits, and usage tracking.
 * Enforces tier-based restrictions on job imports, applications, and AI-generated content.
 */

// Subscription tier configuration
const TIER_LIMITS = {
  free: {
    jobsPerSearch: 25,
    searchesPerDay: 3,
    applicationsPerMonth: 10,
    resumesPerMonth: 5,
    coverLettersPerMonth: 10,
  },
  pro: {
    jobsPerSearch: 999999, // Unlimited (sentinel value)
    searchesPerDay: 999999, // Unlimited
    applicationsPerMonth: 999999, // Unlimited
    resumesPerMonth: 999999, // Unlimited
    coverLettersPerMonth: 999999, // Unlimited
  },
} as const;

export type SubscriptionTier = 'free' | 'pro';
export type UsageAction = 'job_import' | 'jobs_imported' | 'application' | 'resume' | 'cover_letter';

export interface UserTierInfo {
  tier: SubscriptionTier;
  limits: {
    jobsPerSearch: number;
    searchesPerDay: number;
    applicationsPerMonth: number;
    resumesPerMonth: number;
    coverLettersPerMonth: number;
  };
}

export interface UserUsage {
  month: string;
  jobImportsCount: number;
  jobsImportedCount: number;
  applicationsCount: number;
  resumesGeneratedCount: number;
  coverLettersGeneratedCount: number;
}

export interface ActionCheckResult {
  allowed: boolean;
  reason?: string;
  current?: number;
  limit?: number;
}

/**
 * Get the current month in YYYY-MM format
 */
function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Generate a unique ID for usage tracking records
 */
function generateUsageId(userId: string, month: string): string {
  return `usage_${userId}_${month}`;
}

/**
 * Get user's current tier and limits
 *
 * @param db - D1 Database instance
 * @param userId - User ID
 * @returns User tier information with limits
 */
export async function getUserTier(db: D1Database, userId: string): Promise<UserTierInfo> {
  const user = await db
    .prepare('SELECT subscription_tier, subscription_status, subscription_expires_at FROM users WHERE id = ?')
    .bind(userId)
    .first<{
      subscription_tier: SubscriptionTier;
      subscription_status: string;
      subscription_expires_at: number | null;
    }>();

  if (!user) {
    throw new Error('User not found');
  }

  // Check if pro subscription has expired
  let tier: SubscriptionTier = user.subscription_tier || 'free';

  if (tier === 'pro') {
    const now = Math.floor(Date.now() / 1000);
    const hasExpired = user.subscription_expires_at && user.subscription_expires_at < now;
    const isCanceled = user.subscription_status === 'expired' || user.subscription_status === 'canceled';

    if (hasExpired || isCanceled) {
      tier = 'free';
      // Update user tier to free if subscription has expired
      await db
        .prepare('UPDATE users SET subscription_tier = ?, subscription_status = ? WHERE id = ?')
        .bind('free', 'expired', userId)
        .run();
    }
  }

  return {
    tier,
    limits: TIER_LIMITS[tier],
  };
}

/**
 * Get or create user's usage record for the specified month
 *
 * @param db - D1 Database instance
 * @param userId - User ID
 * @param month - Month in YYYY-MM format (defaults to current month)
 * @returns Usage tracking record
 */
async function getOrCreateUsageRecord(
  db: D1Database,
  userId: string,
  month: string
): Promise<UserUsage> {
  const usageId = generateUsageId(userId, month);

  // Try to get existing record
  const existing = await db
    .prepare(`
      SELECT
        month,
        job_imports_count,
        jobs_imported_count,
        applications_count,
        resumes_generated_count,
        cover_letters_generated_count
      FROM usage_tracking
      WHERE user_id = ? AND month = ?
    `)
    .bind(userId, month)
    .first<{
      month: string;
      job_imports_count: number;
      jobs_imported_count: number;
      applications_count: number;
      resumes_generated_count: number;
      cover_letters_generated_count: number;
    }>();

  if (existing) {
    return {
      month: existing.month,
      jobImportsCount: existing.job_imports_count,
      jobsImportedCount: existing.jobs_imported_count,
      applicationsCount: existing.applications_count,
      resumesGeneratedCount: existing.resumes_generated_count,
      coverLettersGeneratedCount: existing.cover_letters_generated_count,
    };
  }

  // Create new record if it doesn't exist
  await db
    .prepare(`
      INSERT INTO usage_tracking (
        id, user_id, month,
        job_imports_count, jobs_imported_count,
        applications_count, resumes_generated_count, cover_letters_generated_count
      )
      VALUES (?, ?, ?, 0, 0, 0, 0, 0)
      ON CONFLICT(user_id, month) DO NOTHING
    `)
    .bind(usageId, userId, month)
    .run();

  return {
    month,
    jobImportsCount: 0,
    jobsImportedCount: 0,
    applicationsCount: 0,
    resumesGeneratedCount: 0,
    coverLettersGeneratedCount: 0,
  };
}

/**
 * Get user's current usage for the month
 *
 * @param db - D1 Database instance
 * @param userId - User ID
 * @param month - Month in YYYY-MM format (defaults to current month)
 * @returns User usage statistics for the month
 */
export async function getUserUsage(
  db: D1Database,
  userId: string,
  month?: string
): Promise<UserUsage> {
  const targetMonth = month || getCurrentMonth();
  return await getOrCreateUsageRecord(db, userId, targetMonth);
}

/**
 * Check if user can perform an action based on their tier limits
 *
 * @param db - D1 Database instance
 * @param userId - User ID
 * @param action - Action type to check
 * @param amount - Amount to add (defaults to 1)
 * @returns Result indicating if action is allowed and reason if not
 */
export async function canPerformAction(
  db: D1Database,
  userId: string,
  action: 'job_import' | 'application' | 'resume' | 'cover_letter',
  amount: number = 1
): Promise<ActionCheckResult> {
  // Get user tier and limits
  const { tier, limits } = await getUserTier(db, userId);

  // Get current usage
  const currentMonth = getCurrentMonth();
  const usage = await getOrCreateUsageRecord(db, userId, currentMonth);

  // Map action to limit and current usage
  let limit: number;
  let current: number;
  let actionName: string;

  switch (action) {
    case 'job_import':
      limit = limits.searchesPerDay;
      current = usage.jobImportsCount;
      actionName = 'job searches';

      // For daily limits, we need to check today's usage only
      // Since we track monthly, we'll approximate by checking if user is on free tier
      if (tier === 'free') {
        // Get today's date for daily limit checking
        const today = new Date().toISOString().split('T')[0];
        const todayUsage = await db
          .prepare(`
            SELECT COUNT(*) as count
            FROM usage_tracking
            WHERE user_id = ?
              AND month = ?
              AND date(created_at, 'unixepoch') = ?
          `)
          .bind(userId, currentMonth, today)
          .first<{ count: number }>();

        current = todayUsage?.count || usage.jobImportsCount;
      }
      break;

    case 'application':
      limit = limits.applicationsPerMonth;
      current = usage.applicationsCount;
      actionName = 'applications';
      break;

    case 'resume':
      limit = limits.resumesPerMonth;
      current = usage.resumesGeneratedCount;
      actionName = 'resume generations';
      break;

    case 'cover_letter':
      limit = limits.coverLettersPerMonth;
      current = usage.coverLettersGeneratedCount;
      actionName = 'cover letter generations';
      break;

    default:
      throw new Error(`Unknown action type: ${action}`);
  }

  // Check if adding the amount would exceed the limit
  if (current + amount > limit) {
    return {
      allowed: false,
      reason: `You've reached your ${tier.toUpperCase()} tier limit of ${limit} ${actionName} per ${action === 'job_import' ? 'day' : 'month'}. Upgrade to PRO for unlimited access.`,
      current,
      limit,
    };
  }

  return {
    allowed: true,
    current,
    limit,
  };
}

/**
 * Increment usage counter for a specific action
 *
 * @param db - D1 Database instance
 * @param userId - User ID
 * @param action - Action type to increment
 * @param amount - Amount to increment (defaults to 1)
 */
export async function incrementUsage(
  db: D1Database,
  userId: string,
  action: UsageAction,
  amount: number = 1
): Promise<void> {
  const currentMonth = getCurrentMonth();
  const usageId = generateUsageId(userId, currentMonth);

  // Ensure record exists
  await getOrCreateUsageRecord(db, userId, currentMonth);

  // Map action to column name
  let columnName: string;
  switch (action) {
    case 'job_import':
      columnName = 'job_imports_count';
      break;
    case 'jobs_imported':
      columnName = 'jobs_imported_count';
      break;
    case 'application':
      columnName = 'applications_count';
      break;
    case 'resume':
      columnName = 'resumes_generated_count';
      break;
    case 'cover_letter':
      columnName = 'cover_letters_generated_count';
      break;
    default:
      throw new Error(`Unknown action type: ${action}`);
  }

  // Atomically increment the counter
  await db
    .prepare(`
      UPDATE usage_tracking
      SET ${columnName} = ${columnName} + ?,
          updated_at = unixepoch()
      WHERE user_id = ? AND month = ?
    `)
    .bind(amount, userId, currentMonth)
    .run();
}

/**
 * Upgrade user to PRO tier
 *
 * @param db - D1 Database instance
 * @param userId - User ID
 * @param durationMonths - Duration in months (defaults to 1)
 */
export async function upgradeUserToPro(
  db: D1Database,
  userId: string,
  durationMonths: number = 1
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + (durationMonths * 30 * 24 * 60 * 60); // Approximate month as 30 days

  await db
    .prepare(`
      UPDATE users
      SET subscription_tier = 'pro',
          subscription_status = 'active',
          subscription_started_at = ?,
          subscription_expires_at = ?,
          updated_at = unixepoch()
      WHERE id = ?
    `)
    .bind(now, expiresAt, userId)
    .run();
}

/**
 * Downgrade user to FREE tier
 *
 * @param db - D1 Database instance
 * @param userId - User ID
 */
export async function downgradeUserToFree(
  db: D1Database,
  userId: string
): Promise<void> {
  await db
    .prepare(`
      UPDATE users
      SET subscription_tier = 'free',
          subscription_status = 'canceled',
          updated_at = unixepoch()
      WHERE id = ?
    `)
    .bind(userId)
    .run();
}

/**
 * Get subscription status for a user
 *
 * @param db - D1 Database instance
 * @param userId - User ID
 * @returns Subscription status information
 */
export async function getSubscriptionStatus(
  db: D1Database,
  userId: string
): Promise<{
  tier: SubscriptionTier;
  status: string;
  startedAt: number | null;
  expiresAt: number | null;
  daysRemaining: number | null;
}> {
  const user = await db
    .prepare(`
      SELECT
        subscription_tier,
        subscription_status,
        subscription_started_at,
        subscription_expires_at
      FROM users
      WHERE id = ?
    `)
    .bind(userId)
    .first<{
      subscription_tier: SubscriptionTier;
      subscription_status: string;
      subscription_started_at: number | null;
      subscription_expires_at: number | null;
    }>();

  if (!user) {
    throw new Error('User not found');
  }

  let daysRemaining: number | null = null;
  if (user.subscription_expires_at) {
    const now = Math.floor(Date.now() / 1000);
    const secondsRemaining = user.subscription_expires_at - now;
    daysRemaining = Math.max(0, Math.ceil(secondsRemaining / (24 * 60 * 60)));
  }

  return {
    tier: user.subscription_tier || 'free',
    status: user.subscription_status || 'active',
    startedAt: user.subscription_started_at,
    expiresAt: user.subscription_expires_at,
    daysRemaining,
  };
}

/**
 * Reset usage for a new month (called by cron job)
 * This is automatically handled by the month-based tracking,
 * but this function can be used to clean up old records
 *
 * @param db - D1 Database instance
 * @param monthsToKeep - Number of months of history to keep (defaults to 12)
 */
export async function cleanupOldUsageRecords(
  db: D1Database,
  monthsToKeep: number = 12
): Promise<void> {
  const now = new Date();
  const cutoffDate = new Date(now.getFullYear(), now.getMonth() - monthsToKeep, 1);
  const cutoffMonth = `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, '0')}`;

  await db
    .prepare('DELETE FROM usage_tracking WHERE month < ?')
    .bind(cutoffMonth)
    .run();
}
