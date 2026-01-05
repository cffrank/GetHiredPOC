import type { User } from '@gethiredpoc/shared';
import type { Env } from './db.service';

/**
 * Get system metrics for the admin dashboard
 * Returns aggregate statistics about users, jobs, and system health
 */
export async function getSystemMetrics(env: Env): Promise<{
  totalUsers: number;
  activeTrials: number;
  paidMembers: number;
  totalJobs: number;
  jobsThisWeek: number;
  aiRequests24h: number;
}> {
  const now = Math.floor(Date.now() / 1000);
  const oneWeekAgo = now - (7 * 24 * 60 * 60);
  const oneDayAgo = now - (24 * 60 * 60);

  // Count total users
  const totalUsersResult = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM users'
  ).first<{ count: number }>();

  // Count active trials (trial_started_at exists and membership_tier is 'trial')
  const activeTrialsResult = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM users WHERE membership_tier = ? AND trial_started_at IS NOT NULL'
  ).bind('trial').first<{ count: number }>();

  // Count paid members
  const paidMembersResult = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM users WHERE membership_tier = ?'
  ).bind('paid').first<{ count: number }>();

  // Count total jobs
  const totalJobsResult = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM jobs'
  ).first<{ count: number }>();

  // Count jobs added this week
  const jobsThisWeekResult = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM jobs WHERE created_at >= ?'
  ).bind(oneWeekAgo).first<{ count: number }>();

  // Count AI requests in last 24 hours (from system_metrics table)
  const aiRequestsResult = await env.DB.prepare(
    'SELECT SUM(metric_value) as total FROM system_metrics WHERE metric_key = ? AND recorded_at >= ?'
  ).bind('ai_request', oneDayAgo).first<{ total: number }>();

  return {
    totalUsers: totalUsersResult?.count || 0,
    activeTrials: activeTrialsResult?.count || 0,
    paidMembers: paidMembersResult?.count || 0,
    totalJobs: totalJobsResult?.count || 0,
    jobsThisWeek: jobsThisWeekResult?.count || 0,
    aiRequests24h: aiRequestsResult?.total || 0,
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
