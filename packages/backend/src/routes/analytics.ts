/**
 * Analytics Routes
 *
 * Admin-only routes for business metrics and insights
 */

import { Hono } from 'hono';
import type { Env } from '../services/db.service';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';
import {
  getMRR,
  getConversionFunnel,
  getUserActivityMetrics,
  getChurnMetrics,
  getUsageBreakdown,
  getTopSearches,
  getTopLocations,
  getScraperPerformance,
  getUserGrowth,
} from '../services/analytics.service';

const analytics = new Hono<{ Bindings: Env }>();

// Require admin auth for all analytics routes
analytics.use('*', requireAuth);
analytics.use('*', requireAdmin);

/**
 * GET /api/admin/analytics/mrr
 * Get Monthly Recurring Revenue and growth
 */
analytics.get('/mrr', async (c) => {
  try {
    const mrr = await getMRR(c.env.DB);
    return c.json(mrr);
  } catch (error: any) {
    console.error('Failed to get MRR:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /api/admin/analytics/conversions
 * Get FREE → PRO conversion funnel
 */
analytics.get('/conversions', async (c) => {
  try {
    const months = parseInt(c.req.query('months') || '12');
    const conversions = await getConversionFunnel(c.env.DB, months);
    return c.json(conversions);
  } catch (error: any) {
    console.error('Failed to get conversions:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /api/admin/analytics/activity
 * Get user activity metrics (DAU, WAU, MAU)
 */
analytics.get('/activity', async (c) => {
  try {
    const activity = await getUserActivityMetrics(c.env.DB);
    return c.json(activity);
  } catch (error: any) {
    console.error('Failed to get activity metrics:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /api/admin/analytics/churn
 * Get churn metrics
 */
analytics.get('/churn', async (c) => {
  try {
    const churn = await getChurnMetrics(c.env.DB);
    return c.json(churn);
  } catch (error: any) {
    console.error('Failed to get churn metrics:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /api/admin/analytics/usage-breakdown
 * Get usage breakdown by action type
 */
analytics.get('/usage-breakdown', async (c) => {
  try {
    const days = parseInt(c.req.query('days') || '30');
    const breakdown = await getUsageBreakdown(c.env.DB, days);
    return c.json(breakdown);
  } catch (error: any) {
    console.error('Failed to get usage breakdown:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /api/admin/analytics/top-searches
 * Get most searched job titles
 */
analytics.get('/top-searches', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '10');
    const searches = await getTopSearches(c.env.DB, limit);
    return c.json(searches);
  } catch (error: any) {
    console.error('Failed to get top searches:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /api/admin/analytics/top-locations
 * Get most searched job locations
 */
analytics.get('/top-locations', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '10');
    const locations = await getTopLocations(c.env.DB, limit);
    return c.json(locations);
  } catch (error: any) {
    console.error('Failed to get top locations:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /api/admin/analytics/scraper-performance
 * Get scraper performance (jobs by source)
 */
analytics.get('/scraper-performance', async (c) => {
  try {
    const days = parseInt(c.req.query('days') || '30');
    const performance = await getScraperPerformance(c.env.DB, days);
    return c.json(performance);
  } catch (error: any) {
    console.error('Failed to get scraper performance:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /api/admin/analytics/user-growth
 * Get user growth over time
 */
analytics.get('/user-growth', async (c) => {
  try {
    const months = parseInt(c.req.query('months') || '12');
    const growth = await getUserGrowth(c.env.DB, months);
    return c.json(growth);
  } catch (error: any) {
    console.error('Failed to get user growth:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /api/admin/analytics/overview
 * Get all analytics data in a single call (for dashboard)
 */
analytics.get('/overview', async (c) => {
  try {
    const [mrr, activity, churn, usageBreakdown, userGrowth] = await Promise.all([
      getMRR(c.env.DB),
      getUserActivityMetrics(c.env.DB),
      getChurnMetrics(c.env.DB),
      getUsageBreakdown(c.env.DB, 30),
      getUserGrowth(c.env.DB, 6),
    ]);

    return c.json({
      mrr,
      activity,
      churn,
      usageBreakdown,
      userGrowth,
    });
  } catch (error: any) {
    console.error('Failed to get analytics overview:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default analytics;
