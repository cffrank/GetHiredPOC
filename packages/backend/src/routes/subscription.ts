import { Hono } from 'hono';
import type { Env } from '../services/db.service';
import type { User } from '@gethiredpoc/shared';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getUserTier,
  getUserUsage,
  getSubscriptionStatus,
  upgradeUserToPro,
  downgradeUserToFree,
} from '../services/subscription.service';
import { createCheckoutSession, cancelSubscription } from '../services/polar.service';

const subscription = new Hono<{ Bindings: Env }>();

// Protect all subscription routes with authentication
subscription.use('*', requireAuth);

// GET /api/subscription/status
// Get user's subscription status, tier, limits, and current usage
subscription.get('/status', async (c) => {
  try {
    const user = c.get('user') as User;

    // Get tier info with limits
    const tierInfo = await getUserTier(c.env.DB, user.id);

    // Get current month's usage
    const usage = await getUserUsage(c.env.DB, user.id);

    // Get subscription status (dates, expiration, etc.)
    const status = await getSubscriptionStatus(c.env.DB, user.id);

    return c.json({
      success: true,
      subscription: {
        tier: tierInfo.tier,
        status: status.status,
        startedAt: status.startedAt,
        expiresAt: status.expiresAt,
        daysRemaining: status.daysRemaining,
        isTrial: status.isTrial,
        trialExpiresAt: status.trialExpiresAt,
        trialDaysRemaining: status.trialDaysRemaining,
      },
      limits: tierInfo.limits,
      usage: {
        month: usage.month,
        jobImports: {
          count: usage.jobImportsCount,
          limit: tierInfo.limits.searchesPerDay,
        },
        jobsImported: {
          count: usage.jobsImportedCount,
        },
        applications: {
          count: usage.applicationsCount,
          limit: tierInfo.limits.applicationsPerMonth,
        },
        resumesGenerated: {
          count: usage.resumesGeneratedCount,
          limit: tierInfo.limits.resumesPerMonth,
        },
        coverLettersGenerated: {
          count: usage.coverLettersGeneratedCount,
          limit: tierInfo.limits.coverLettersPerMonth,
        },
      },
    });
  } catch (error: any) {
    console.error('Failed to get subscription status:', error);
    return c.json({ error: error.message }, 500);
  }
});

// GET /api/subscription/usage
// Get detailed usage breakdown for the current month
subscription.get('/usage', async (c) => {
  try {
    const user = c.get('user') as User;

    // Get tier info
    const tierInfo = await getUserTier(c.env.DB, user.id);

    // Get current month's usage
    const usage = await getUserUsage(c.env.DB, user.id);

    // Calculate remaining allowances
    const calculateRemaining = (current: number, limit: number) => {
      if (limit === 999999) return 'unlimited'; // PRO tier
      return Math.max(0, limit - current);
    };

    return c.json({
      success: true,
      tier: tierInfo.tier,
      month: usage.month,
      usage: {
        jobImports: {
          used: usage.jobImportsCount,
          limit: tierInfo.limits.searchesPerDay,
          remaining: calculateRemaining(usage.jobImportsCount, tierInfo.limits.searchesPerDay),
          period: 'daily',
        },
        jobsImported: {
          total: usage.jobsImportedCount,
          limitPerSearch: tierInfo.limits.jobsPerSearch,
        },
        applications: {
          used: usage.applicationsCount,
          limit: tierInfo.limits.applicationsPerMonth,
          remaining: calculateRemaining(usage.applicationsCount, tierInfo.limits.applicationsPerMonth),
          period: 'monthly',
        },
        resumesGenerated: {
          used: usage.resumesGeneratedCount,
          limit: tierInfo.limits.resumesPerMonth,
          remaining: calculateRemaining(usage.resumesGeneratedCount, tierInfo.limits.resumesPerMonth),
          period: 'monthly',
        },
        coverLettersGenerated: {
          used: usage.coverLettersGeneratedCount,
          limit: tierInfo.limits.coverLettersPerMonth,
          remaining: calculateRemaining(usage.coverLettersGeneratedCount, tierInfo.limits.coverLettersPerMonth),
          period: 'monthly',
        },
      },
    });
  } catch (error: any) {
    console.error('Failed to get usage details:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/subscription/upgrade
// Create Polar.sh checkout session for PRO upgrade
subscription.post('/upgrade', async (c) => {
  try {
    const user = c.get('user') as User;

    // Check if already PRO
    const currentStatus = await getSubscriptionStatus(c.env.DB, user.id);
    if (currentStatus.tier === 'pro' && currentStatus.status === 'active') {
      return c.json({
        error: 'Already subscribed to PRO tier',
        subscription: currentStatus,
      }, 400);
    }

    // Check if Polar is configured
    if (!c.env.POLAR_ACCESS_TOKEN) {
      return c.json({ error: 'Polar.sh not configured' }, 500);
    }

    if (!c.env.POLAR_PRODUCT_ID) {
      return c.json({ error: 'Polar product ID not configured' }, 500);
    }

    // Create Polar checkout session
    const checkout = await createCheckoutSession(
      c.env,
      user.id,
      user.email,
      c.env.POLAR_PRODUCT_ID
    );

    return c.json({
      success: true,
      checkout_url: checkout.url,
      checkout_id: checkout.id,
      customer_id: checkout.customer_id,
    });
  } catch (error: any) {
    console.error('Failed to create checkout session:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/subscription/cancel
// Cancel PRO subscription via Polar.sh
subscription.post('/cancel', async (c) => {
  try {
    const user = c.get('user') as User;

    // Get current subscription status
    const currentStatus = await getSubscriptionStatus(c.env.DB, user.id);

    if (currentStatus.tier !== 'pro') {
      return c.json({
        error: 'No active PRO subscription to cancel',
      }, 400);
    }

    // Get Polar subscription ID from user record
    const userRecord = await c.env.DB.prepare(`
      SELECT polar_subscription_id FROM users WHERE id = ?
    `)
      .bind(user.id)
      .first<{ polar_subscription_id: string | null }>();

    if (!userRecord?.polar_subscription_id) {
      return c.json({ error: 'No Polar subscription found' }, 400);
    }

    // Cancel subscription in Polar
    await cancelSubscription(c.env, userRecord.polar_subscription_id);

    // Update status to canceled (will remain active until end of billing period)
    await c.env.DB.prepare(`
      UPDATE users
      SET subscription_status = 'canceled',
          updated_at = unixepoch()
      WHERE id = ?
    `)
      .bind(user.id)
      .run();

    // Get updated subscription info
    const updatedStatus = await getSubscriptionStatus(c.env.DB, user.id);
    const tierInfo = await getUserTier(c.env.DB, user.id);

    return c.json({
      success: true,
      message: 'Subscription canceled. You will retain PRO access until the end of your billing period.',
      subscription: {
        tier: updatedStatus.tier,
        status: updatedStatus.status,
        expiresAt: updatedStatus.expiresAt,
        daysRemaining: updatedStatus.daysRemaining,
      },
      limits: tierInfo.limits,
    });
  } catch (error: any) {
    console.error('Failed to cancel subscription:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/subscription/downgrade
// Downgrade user to FREE tier (admin-only or manual operation)
subscription.post('/downgrade', async (c) => {
  try {
    const user = c.get('user') as User;

    // Check if already on FREE tier
    const currentStatus = await getSubscriptionStatus(c.env.DB, user.id);
    if (currentStatus.tier === 'free') {
      return c.json({
        error: 'Already on FREE tier',
        subscription: currentStatus,
      }, 400);
    }

    // Downgrade to FREE
    await downgradeUserToFree(c.env.DB, user.id);

    // Get updated subscription info
    const updatedStatus = await getSubscriptionStatus(c.env.DB, user.id);
    const tierInfo = await getUserTier(c.env.DB, user.id);

    return c.json({
      success: true,
      message: 'Downgraded to FREE tier',
      subscription: {
        tier: updatedStatus.tier,
        status: updatedStatus.status,
      },
      limits: tierInfo.limits,
    });
  } catch (error: any) {
    console.error('Failed to downgrade subscription:', error);
    return c.json({ error: error.message }, 500);
  }
});

// GET /api/subscription/plans
// Get available subscription plans and their features
subscription.get('/plans', async (c) => {
  return c.json({
    success: true,
    plans: [
      {
        id: 'free',
        name: 'Free',
        price: 0,
        interval: 'forever',
        features: {
          jobsPerSearch: 25,
          searchesPerDay: 3,
          applicationsPerMonth: 10,
          resumesPerMonth: 5,
          coverLettersPerMonth: 10,
          aiMatchScoring: true,
          emailAlerts: true,
          profileCustomization: true,
        },
        description: 'Perfect for getting started with job searching',
      },
      {
        id: 'pro',
        name: 'Pro',
        price: 29.99,
        interval: 'month',
        features: {
          jobsPerSearch: 'unlimited',
          searchesPerDay: 'unlimited',
          applicationsPerMonth: 'unlimited',
          resumesPerMonth: 'unlimited',
          coverLettersPerMonth: 'unlimited',
          aiMatchScoring: true,
          emailAlerts: true,
          profileCustomization: true,
          prioritySupport: true,
          advancedAnalytics: true,
        },
        description: 'Unlimited job searching and AI-powered tools',
      },
    ],
  });
});

export default subscription;
