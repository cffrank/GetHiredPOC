/**
 * Analytics Service
 *
 * Provides business metrics and insights for the admin analytics dashboard
 */

/**
 * Get Monthly Recurring Revenue (MRR) and growth
 */
export async function getMRR(db: D1Database): Promise<{
  current: number;
  lastMonth: number;
  growth: number;
}> {
  // Count active PRO users
  const proUsers = await db
    .prepare(`
      SELECT COUNT(*) as count
      FROM users
      WHERE subscription_tier = 'pro'
        AND subscription_status = 'active'
    `)
    .first<{ count: number }>();

  const currentMRR = (proUsers?.count || 0) * 39; // $39/month

  // Get last month's count (approximate from subscription_started_at)
  const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
  const lastMonthProUsers = await db
    .prepare(`
      SELECT COUNT(*) as count
      FROM users
      WHERE subscription_tier = 'pro'
        AND subscription_status = 'active'
        AND subscription_started_at < ?
    `)
    .bind(thirtyDaysAgo)
    .first<{ count: number }>();

  const lastMonthMRR = (lastMonthProUsers?.count || 0) * 39;
  const growth = lastMonthMRR > 0 ? ((currentMRR - lastMonthMRR) / lastMonthMRR) * 100 : 0;

  return {
    current: currentMRR,
    lastMonth: lastMonthMRR,
    growth: Math.round(growth * 10) / 10, // Round to 1 decimal
  };
}

/**
 * Get conversion funnel data (FREE → PRO upgrades by month)
 */
export async function getConversionFunnel(db: D1Database, months: number = 12) {
  const conversions = await db
    .prepare(`
      SELECT
        strftime('%Y-%m', datetime(subscription_started_at, 'unixepoch')) as month,
        COUNT(*) as upgrades
      FROM users
      WHERE subscription_tier = 'pro'
        AND subscription_started_at IS NOT NULL
        AND subscription_started_at > ?
      GROUP BY month
      ORDER BY month DESC
      LIMIT ?
    `)
    .bind(Math.floor(Date.now() / 1000) - (months * 30 * 24 * 60 * 60), months)
    .all();

  return conversions.results.map((row: any) => ({
    month: row.month,
    upgrades: row.upgrades,
  }));
}

/**
 * Get user activity metrics (DAU, WAU, MAU)
 */
export async function getUserActivityMetrics(db: D1Database) {
  const now = Math.floor(Date.now() / 1000);
  const oneDayAgo = now - (24 * 60 * 60);
  const sevenDaysAgo = now - (7 * 24 * 60 * 60);
  const thirtyDaysAgo = now - (30 * 24 * 60 * 60);

  // Daily Active Users (DAU)
  const dau = await db
    .prepare(`
      SELECT COUNT(DISTINCT user_id) as count
      FROM usage_tracking
      WHERE updated_at >= ?
    `)
    .bind(oneDayAgo)
    .first<{ count: number }>();

  // Weekly Active Users (WAU)
  const wau = await db
    .prepare(`
      SELECT COUNT(DISTINCT user_id) as count
      FROM usage_tracking
      WHERE updated_at >= ?
    `)
    .bind(sevenDaysAgo)
    .first<{ count: number }>();

  // Monthly Active Users (MAU)
  const mau = await db
    .prepare(`
      SELECT COUNT(DISTINCT user_id) as count
      FROM usage_tracking
      WHERE updated_at >= ?
    `)
    .bind(thirtyDaysAgo)
    .first<{ count: number }>();

  return {
    dau: dau?.count || 0,
    wau: wau?.count || 0,
    mau: mau?.count || 0,
  };
}

/**
 * Get churn metrics
 */
export async function getChurnMetrics(db: D1Database) {
  // Total PRO users (active + canceled)
  const totalPro = await db
    .prepare(`
      SELECT COUNT(*) as count
      FROM users
      WHERE subscription_tier = 'pro'
    `)
    .first<{ count: number }>();

  // Canceled PRO users
  const canceled = await db
    .prepare(`
      SELECT COUNT(*) as count
      FROM users
      WHERE subscription_tier = 'pro'
        AND subscription_status = 'canceled'
    `)
    .first<{ count: number }>();

  const totalProCount = totalPro?.count || 0;
  const canceledCount = canceled?.count || 0;
  const churnRate = totalProCount > 0 ? (canceledCount / totalProCount) * 100 : 0;

  return {
    totalPro: totalProCount,
    canceled: canceledCount,
    churnRate: Math.round(churnRate * 10) / 10, // Round to 1 decimal
  };
}

/**
 * Get usage breakdown by action type
 */
export async function getUsageBreakdown(db: D1Database, days: number = 30) {
  const daysAgo = Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60);

  const breakdown = await db
    .prepare(`
      SELECT
        action_type,
        SUM(count) as total_count
      FROM usage_tracking
      WHERE updated_at >= ?
      GROUP BY action_type
      ORDER BY total_count DESC
    `)
    .bind(daysAgo)
    .all();

  return breakdown.results.map((row: any) => ({
    type: row.action_type,
    count: row.total_count,
  }));
}

/**
 * Get top job searches (most searched keywords/titles)
 */
export async function getTopSearches(db: D1Database, limit: number = 10) {
  // Get job preferences that users have set
  const searches = await db
    .prepare(`
      SELECT
        job_title,
        COUNT(*) as search_count
      FROM job_preferences
      WHERE job_title IS NOT NULL
      GROUP BY job_title
      ORDER BY search_count DESC
      LIMIT ?
    `)
    .bind(limit)
    .all();

  return searches.results.map((row: any) => ({
    title: row.job_title,
    count: row.search_count,
  }));
}

/**
 * Get top locations (most searched job locations)
 */
export async function getTopLocations(db: D1Database, limit: number = 10) {
  const locations = await db
    .prepare(`
      SELECT
        location,
        COUNT(*) as search_count
      FROM job_preferences
      WHERE location IS NOT NULL
      GROUP BY location
      ORDER BY search_count DESC
      LIMIT ?
    `)
    .bind(limit)
    .all();

  return locations.results.map((row: any) => ({
    location: row.location,
    count: row.search_count,
  }));
}

/**
 * Get scraper performance (jobs by source)
 */
export async function getScraperPerformance(db: D1Database, days: number = 30) {
  const daysAgo = Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60);

  const performance = await db
    .prepare(`
      SELECT
        source,
        COUNT(*) as job_count
      FROM jobs
      WHERE created_at >= ?
      GROUP BY source
      ORDER BY job_count DESC
    `)
    .bind(daysAgo)
    .all();

  return performance.results.map((row: any) => ({
    source: row.source,
    count: row.job_count,
  }));
}

/**
 * Get user growth over time
 */
export async function getUserGrowth(db: D1Database, months: number = 12) {
  const growth = await db
    .prepare(`
      SELECT
        strftime('%Y-%m', datetime(created_at, 'unixepoch')) as month,
        COUNT(*) as new_users
      FROM users
      WHERE created_at > ?
      GROUP BY month
      ORDER BY month ASC
    `)
    .bind(Math.floor(Date.now() / 1000) - (months * 30 * 24 * 60 * 60))
    .all();

  return growth.results.map((row: any) => ({
    month: row.month,
    newUsers: row.new_users,
  }));
}
