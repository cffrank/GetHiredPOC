import type { User } from '@gethiredpoc/shared';
import type { Env } from './db.service';

/**
 * Query Cloudflare AI Gateway analytics via GraphQL
 * Returns request count and estimated cost
 */
async function getAIGatewayMetrics(
  env: Env,
  hoursAgo: number
): Promise<{ requests: number; cost: number }> {
  if (!env.CLOUDFLARE_API_TOKEN) {
    console.warn('[Admin] CLOUDFLARE_API_TOKEN not configured, returning 0 for AI metrics');
    return { requests: 0, cost: 0 };
  }

  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const now = new Date();
  const startTime = new Date(now.getTime() - (hoursAgo * 60 * 60 * 1000));

  const query = `
    query($limit: Int!, $start: Time!, $end: Time!) {
      viewer {
        accounts(filter: { accountTag: "${accountId}" }) {
          requests: aiGatewayRequestsAdaptiveGroups(
            limit: $limit
            filter: { datetimeHour_geq: $start, datetimeHour_leq: $end }
          ) {
            count
            sum {
              tokensIn
              tokensOut
            }
            dimensions {
              gateway
              model
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {
          limit: 10000,
          start: startTime.toISOString(),
          end: now.toISOString(),
        },
      }),
    });

    if (!response.ok) {
      console.error('[Admin] AI Gateway API error:', response.status, await response.text());
      return { requests: 0, cost: 0 };
    }

    const data = await response.json() as any;

    // Sum all request counts and tokens from the gateway
    const requests = data?.data?.viewer?.accounts?.[0]?.requests || [];

    let totalRequests = 0;
    let totalTokensIn = 0;
    let totalTokensOut = 0;

    for (const r of requests) {
      if (r.dimensions.gateway === 'jobmatch-ai-gateway-dev') {
        totalRequests += r.count || 0;
        totalTokensIn += r.sum?.tokensIn || 0;
        totalTokensOut += r.sum?.tokensOut || 0;
      }
    }

    // Calculate cost based on GPT-4o-mini pricing
    // Input: $0.15 per 1M tokens, Output: $0.60 per 1M tokens
    const costIn = (totalTokensIn / 1_000_000) * 0.15;
    const costOut = (totalTokensOut / 1_000_000) * 0.60;
    const totalCost = costIn + costOut;

    console.log(`[Admin] AI Gateway (${hoursAgo}h): ${totalRequests} requests, ${totalTokensIn} input tokens, ${totalTokensOut} output tokens, $${totalCost.toFixed(4)}`);

    return { requests: totalRequests, cost: totalCost };
  } catch (error) {
    console.error('[Admin] Error fetching AI Gateway metrics:', error);
    return { requests: 0, cost: 0 };
  }
}

/**
 * Get system metrics for the admin dashboard
 * Returns aggregate statistics about users, jobs, and system health
 */
export async function getSystemMetrics(env: Env): Promise<{
  total_users: number;
  admin_users: number;
  trial_users: number;
  paid_users: number;
  total_jobs: number;
  total_applications: number;
  total_saved_jobs: number;
  ai_requests_today: number;
  ai_requests_week: number;
  ai_requests_month: number;
  ai_cost_today: number;
  ai_cost_week: number;
  ai_cost_month: number;
}> {
  const now = Math.floor(Date.now() / 1000);
  const oneDayAgo = now - (24 * 60 * 60);
  const oneWeekAgo = now - (7 * 24 * 60 * 60);
  const oneMonthAgo = now - (30 * 24 * 60 * 60);

  // Execute all queries in parallel
  const [
    totalUsersResult,
    adminUsersResult,
    trialUsersResult,
    paidUsersResult,
    totalJobsResult,
    totalApplicationsResult,
    totalSavedJobsResult,
    aiMetricsToday,
    aiMetricsWeek,
    aiMetricsMonth,
  ] = await Promise.all([
    // Count total users
    env.DB.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>(),

    // Count admin users
    env.DB.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?')
      .bind('admin').first<{ count: number }>(),

    // Count active trials
    env.DB.prepare('SELECT COUNT(*) as count FROM users WHERE membership_tier = ?')
      .bind('trial').first<{ count: number }>(),

    // Count paid members
    env.DB.prepare('SELECT COUNT(*) as count FROM users WHERE membership_tier = ?')
      .bind('paid').first<{ count: number }>(),

    // Count total jobs
    env.DB.prepare('SELECT COUNT(*) as count FROM jobs').first<{ count: number }>(),

    // Count total applications
    env.DB.prepare('SELECT COUNT(*) as count FROM applications').first<{ count: number }>(),

    // Count total saved jobs
    env.DB.prepare('SELECT COUNT(*) as count FROM saved_jobs').first<{ count: number }>(),

    // Get AI requests and costs from Cloudflare AI Gateway analytics
    getAIGatewayMetrics(env, 24),  // Last 24 hours
    getAIGatewayMetrics(env, 24 * 7),  // Last 7 days
    getAIGatewayMetrics(env, 24 * 30),  // Last 30 days
  ]);

  return {
    total_users: totalUsersResult?.count || 0,
    admin_users: adminUsersResult?.count || 0,
    trial_users: trialUsersResult?.count || 0,
    paid_users: paidUsersResult?.count || 0,
    total_jobs: totalJobsResult?.count || 0,
    total_applications: totalApplicationsResult?.count || 0,
    total_saved_jobs: totalSavedJobsResult?.count || 0,
    ai_requests_today: aiMetricsToday.requests,
    ai_requests_week: aiMetricsWeek.requests,
    ai_requests_month: aiMetricsMonth.requests,
    ai_cost_today: aiMetricsToday.cost,
    ai_cost_week: aiMetricsWeek.cost,
    ai_cost_month: aiMetricsMonth.cost,
  };
}

/**
 * Get all users with pagination
 * Returns list of users with role and membership information
 */
export async function getAllUsers(
  env: Env,
  options: {
    page?: number;
    limit?: number;
    searchQuery?: string;
  } = {}
): Promise<{
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const page = options.page || 1;
  const limit = options.limit || 20;
  const offset = (page - 1) * limit;

  let query = 'SELECT id, email, full_name, bio, location, skills, avatar_url, address, linkedin_url, role, membership_tier, membership_started_at, membership_expires_at, trial_started_at, created_at, updated_at FROM users';
  let countQuery = 'SELECT COUNT(*) as count FROM users';
  const bindings: any[] = [];

  // Add search filter if provided
  if (options.searchQuery) {
    const searchFilter = ' WHERE email LIKE ? OR full_name LIKE ?';
    query += searchFilter;
    countQuery += searchFilter;
    const searchPattern = `%${options.searchQuery}%`;
    bindings.push(searchPattern, searchPattern);
  }

  // Add pagination
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  bindings.push(limit, offset);

  // Execute queries
  const [usersResult, countResult] = await Promise.all([
    env.DB.prepare(query).bind(...bindings).all<User>(),
    env.DB.prepare(countQuery).bind(...(options.searchQuery ? [
      `%${options.searchQuery}%`,
      `%${options.searchQuery}%`
    ] : [])).first<{ count: number }>(),
  ]);

  const total = countResult?.count || 0;
  const totalPages = Math.ceil(total / limit);

  return {
    users: usersResult.results || [],
    total,
    page,
    limit,
    totalPages,
  };
}

/**
 * Record a system metric for analytics
 * Used to track AI requests, job imports, and other system events
 */
export async function recordMetric(
  env: Env,
  metricKey: string,
  metricValue: number
): Promise<void> {
  await env.DB.prepare(
    'INSERT INTO system_metrics (metric_key, metric_value) VALUES (?, ?)'
  ).bind(metricKey, metricValue).run();
}

/**
 * Record an admin audit log entry
 * Tracks all admin actions for security and compliance
 */
export async function recordAuditLog(
  env: Env,
  userId: string,
  action: string,
  details?: string,
  ipAddress?: string
): Promise<void> {
  await env.DB.prepare(
    'INSERT INTO admin_audit_log (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)'
  ).bind(userId, action, details || null, ipAddress || null).run();
}

/**
 * Get user-specific metrics
 * Returns statistics for a single user
 */
export async function getUserMetrics(
  env: Env,
  userId: string
): Promise<{
  savedJobs: number;
  applications: number;
  coverLettersGenerated: number;
}> {
  const [savedJobsResult, applicationsResult] = await Promise.all([
    env.DB.prepare('SELECT COUNT(*) as count FROM saved_jobs WHERE user_id = ?')
      .bind(userId).first<{ count: number }>(),
    env.DB.prepare('SELECT COUNT(*) as count FROM applications WHERE user_id = ?')
      .bind(userId).first<{ count: number }>(),
  ]);

  // Cover letters generated is tracked via system_metrics (would need to add user_id to track per-user)
  // For now, return 0 or implement a separate tracking mechanism

  return {
    savedJobs: savedJobsResult?.count || 0,
    applications: applicationsResult?.count || 0,
    coverLettersGenerated: 0, // TODO: Implement per-user tracking
  };
}

/**
 * Update a user's role
 * Only admins can change user roles
 */
export async function updateUserRole(
  env: Env,
  userId: string,
  role: 'user' | 'admin',
  adminUserId: string
): Promise<User> {
  // Update the user's role
  await env.DB.prepare(
    'UPDATE users SET role = ?, updated_at = ? WHERE id = ?'
  ).bind(role, Math.floor(Date.now() / 1000), userId).run();

  // Record audit log
  await recordAuditLog(env, adminUserId, 'update_user_role', `Changed user ${userId} role to ${role}`);

  // Fetch and return updated user
  const user = await env.DB.prepare(
    'SELECT id, email, full_name, bio, location, skills, avatar_url, address, linkedin_url, role, membership_tier, membership_started_at, membership_expires_at, trial_started_at, created_at, updated_at FROM users WHERE id = ?'
  ).bind(userId).first<User>();

  if (!user) {
    throw new Error('User not found');
  }

  return user;
}
