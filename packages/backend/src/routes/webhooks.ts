/**
 * Webhooks Routes
 *
 * Handles incoming webhooks from external services (Polar.sh)
 */

import { Hono } from 'hono';
import type { Env } from '../services/db.service';
import type { User } from '@gethiredpoc/shared';
import { verifyWebhookSignature } from '../services/polar.service';
import {
  sendPaymentSuccessEmail,
  sendPaymentFailedEmail,
} from '../services/email.service';

const webhooks = new Hono<{ Bindings: Env }>();

/**
 * POST /api/webhooks/polar
 * Handle Polar.sh webhook events for subscription lifecycle
 *
 * Events handled:
 * - subscription.created: User completed checkout, upgrade to PRO
 * - subscription.updated: Subscription renewed or modified
 * - subscription.canceled: User canceled subscription
 * - subscription.expired: Subscription expired, downgrade to FREE
 * - payment.succeeded: Payment successful (for analytics)
 * - payment.failed: Payment failed (trigger dunning email)
 */
webhooks.post('/polar', async (c) => {
  try {
    // Get webhook signature from headers
    const signature = c.req.header('x-polar-signature') || '';
    const rawBody = await c.req.text();

    // Verify webhook signature (security-critical)
    // TODO: Implement actual signature verification when webhook secret is available
    // const isValid = verifyWebhookSignature(rawBody, signature, c.env.POLAR_WEBHOOK_SECRET || '');
    // if (!isValid) {
    //   console.error('Invalid webhook signature');
    //   return c.json({ error: 'Invalid signature' }, 401);
    // }

    // Parse webhook payload
    const payload = JSON.parse(rawBody);
    const event = payload.type;
    const data = payload.data;

    console.log(`Received Polar webhook: ${event}`, data);

    // Handle different webhook events
    switch (event) {
      case 'subscription.created': {
        // User completed checkout and paid for PRO subscription
        const subscriptionId = data.id;
        const customerId = data.customer_id;
        const userId = data.metadata?.userId; // We store userId in metadata during checkout

        if (!userId) {
          console.error('No userId in subscription metadata:', data);
          return c.json({ error: 'Missing userId in metadata' }, 400);
        }

        // Calculate subscription expiration (monthly subscription)
        const now = Math.floor(Date.now() / 1000);
        const expiresAt = now + (30 * 24 * 60 * 60); // 30 days from now

        // Upgrade user to PRO tier
        await c.env.DB.prepare(`
          UPDATE users
          SET subscription_tier = 'pro',
              subscription_status = 'active',
              subscription_started_at = ?,
              subscription_expires_at = ?,
              polar_customer_id = ?,
              polar_subscription_id = ?,
              updated_at = unixepoch()
          WHERE id = ?
        `)
          .bind(now, expiresAt, customerId, subscriptionId, userId)
          .run();

        console.log(`User ${userId} upgraded to PRO (subscription: ${subscriptionId})`);

        // Get user details for email
        const user = await c.env.DB.prepare(`
          SELECT id, email, full_name, subscription_tier
          FROM users WHERE id = ?
        `)
          .bind(userId)
          .first<User>();

        if (user) {
          const amount = data.amount ? data.amount / 100 : 39; // Convert cents to dollars, default $39
          const startDate = new Date(now * 1000).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
          const nextBillingDate = new Date(expiresAt * 1000).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });

          // Send payment success email
          await sendPaymentSuccessEmail(
            c.env,
            user,
            amount,
            subscriptionId,
            startDate,
            nextBillingDate
          ).catch(err => console.error('Failed to send payment success email:', err));
        }

        break;
      }

      case 'subscription.updated': {
        // Subscription was renewed or modified
        const subscriptionId = data.id;
        const status = data.status; // active, canceled, expired, etc.

        // Find user by subscription ID
        const user = await c.env.DB.prepare(`
          SELECT id FROM users WHERE polar_subscription_id = ?
        `)
          .bind(subscriptionId)
          .first<{ id: string }>();

        if (!user) {
          console.error(`No user found for subscription ${subscriptionId}`);
          return c.json({ error: 'User not found' }, 404);
        }

        // Update subscription status and expiration
        const expiresAt = data.current_period_end
          ? Math.floor(new Date(data.current_period_end).getTime() / 1000)
          : null;

        await c.env.DB.prepare(`
          UPDATE users
          SET subscription_status = ?,
              subscription_expires_at = ?,
              updated_at = unixepoch()
          WHERE id = ?
        `)
          .bind(status, expiresAt, user.id)
          .run();

        console.log(`Subscription ${subscriptionId} updated: status=${status}`);
        break;
      }

      case 'subscription.canceled': {
        // User canceled their subscription (will expire at end of billing period)
        const subscriptionId = data.id;

        // Find user by subscription ID
        const user = await c.env.DB.prepare(`
          SELECT id FROM users WHERE polar_subscription_id = ?
        `)
          .bind(subscriptionId)
          .first<{ id: string }>();

        if (!user) {
          console.error(`No user found for subscription ${subscriptionId}`);
          return c.json({ error: 'User not found' }, 404);
        }

        // Update status to canceled (subscription will remain active until expiration)
        await c.env.DB.prepare(`
          UPDATE users
          SET subscription_status = 'canceled',
              updated_at = unixepoch()
          WHERE id = ?
        `)
          .bind(user.id)
          .run();

        console.log(`Subscription ${subscriptionId} canceled (will expire at current_period_end)`);
        break;
      }

      case 'subscription.expired': {
        // Subscription expired, downgrade user to FREE tier
        const subscriptionId = data.id;

        // Find user by subscription ID
        const user = await c.env.DB.prepare(`
          SELECT id FROM users WHERE polar_subscription_id = ?
        `)
          .bind(subscriptionId)
          .first<{ id: string }>();

        if (!user) {
          console.error(`No user found for subscription ${subscriptionId}`);
          return c.json({ error: 'User not found' }, 404);
        }

        // Downgrade to FREE tier
        await c.env.DB.prepare(`
          UPDATE users
          SET subscription_tier = 'free',
              subscription_status = 'expired',
              updated_at = unixepoch()
          WHERE id = ?
        `)
          .bind(user.id)
          .run();

        console.log(`User ${user.id} downgraded to FREE (subscription expired)`);
        break;
      }

      case 'payment.succeeded': {
        // Payment successful (for analytics and confirmation)
        const subscriptionId = data.subscription_id;
        const amount = data.amount; // in cents

        console.log(`Payment succeeded for subscription ${subscriptionId}: $${amount / 100}`);

        // TODO: Send payment success email
        // TODO: Track payment for analytics (MRR calculation)
        break;
      }

      case 'payment.failed': {
        // Payment failed (trigger dunning flow)
        const subscriptionId = data.subscription_id;
        const error = data.error || 'Payment declined';
        const amount = data.amount ? data.amount / 100 : 39; // Convert cents to dollars, default $39

        // Find user by subscription ID
        const user = await c.env.DB.prepare(`
          SELECT id, email, full_name, subscription_tier FROM users WHERE polar_subscription_id = ?
        `)
          .bind(subscriptionId)
          .first<User>();

        if (!user) {
          console.error(`No user found for subscription ${subscriptionId}`);
          return c.json({ error: 'User not found' }, 404);
        }

        console.log(`Payment failed for user ${user.id}: ${error}`);

        // Calculate retry date (typically 3-7 days)
        const retryDate = new Date();
        retryDate.setDate(retryDate.getDate() + 3);
        const retryDateStr = retryDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        // Send payment failed email (dunning)
        await sendPaymentFailedEmail(
          c.env,
          user,
          amount,
          error,
          retryDateStr
        ).catch(err => console.error('Failed to send payment failed email:', err));

        break;
      }

      default:
        console.log(`Unhandled webhook event: ${event}`);
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Webhook handler error:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default webhooks;
