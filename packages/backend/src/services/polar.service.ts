/**
 * Polar.sh Service
 *
 * Handles payment processing and subscription management via Polar.sh
 * Polar.sh is a Merchant of Record platform that handles:
 * - Global tax compliance (VAT, GST, sales tax)
 * - Payment processing
 * - Subscription lifecycle management
 *
 * Pricing: 4% + 40¢ per transaction (includes tax handling)
 */

import { Polar } from '@polar-sh/sdk';
import type { Env } from './db.service';

/**
 * Initialize Polar SDK client
 *
 * @param accessToken - Polar access token
 * @param sandbox - Whether to use sandbox environment (default: false)
 */
export function createPolarClient(accessToken: string, sandbox: boolean = false): Polar {
  return new Polar({
    accessToken,
    server: sandbox ? 'sandbox' : 'production',
  });
}

/**
 * Create a checkout session for PRO subscription upgrade
 *
 * @param env - Environment bindings
 * @param userId - User ID for metadata
 * @param email - User email
 * @param productId - Polar product ID (not price ID)
 * @returns Checkout session with URL for redirect
 */
export async function createCheckoutSession(
  env: Env,
  userId: string,
  email: string,
  productId: string
): Promise<{
  id: string;
  url: string;
  customer_id: string;
}> {
  const isSandbox = env.POLAR_SANDBOX === 'true';
  const polar = createPolarClient(env.POLAR_ACCESS_TOKEN, isSandbox);

  try {
    const checkout = await polar.checkouts.create({
      products: [productId],
      customerEmail: email,
      metadata: {
        userId,
        source: 'gethiredpoc',
      },
      successUrl: `${env.FRONTEND_URL}/subscription?success=true`,
    });

    if (!checkout.url) {
      throw new Error('Checkout session created but no URL returned');
    }

    return {
      id: checkout.id,
      url: checkout.url,
      customer_id: checkout.customerId || '',
    };
  } catch (error: any) {
    console.error('Failed to create Polar checkout session:', error);
    throw new Error(`Polar checkout failed: ${error.message}`);
  }
}

/**
 * Retrieve customer details from Polar
 *
 * @param env - Environment bindings
 * @param customerId - Polar customer ID
 * @returns Customer details
 */
export async function retrieveCustomer(env: Env, customerId: string) {
  const isSandbox = env.POLAR_SANDBOX === 'true';
  const polar = createPolarClient(env.POLAR_ACCESS_TOKEN, isSandbox);

  try {
    const customer = await polar.customers.get(customerId);
    return customer;
  } catch (error: any) {
    console.error(`Failed to retrieve customer ${customerId}:`, error);
    throw new Error(`Failed to retrieve customer: ${error.message}`);
  }
}

/**
 * Retrieve subscription details from Polar
 *
 * @param env - Environment bindings
 * @param subscriptionId - Polar subscription ID
 * @returns Subscription details
 */
export async function retrieveSubscription(env: Env, subscriptionId: string) {
  const isSandbox = env.POLAR_SANDBOX === 'true';
  const polar = createPolarClient(env.POLAR_ACCESS_TOKEN, isSandbox);

  try {
    const subscription = await polar.subscriptions.get(subscriptionId);
    return subscription;
  } catch (error: any) {
    console.error(`Failed to retrieve subscription ${subscriptionId}:`, error);
    throw new Error(`Failed to retrieve subscription: ${error.message}`);
  }
}

/**
 * Cancel a subscription in Polar
 *
 * @param env - Environment bindings
 * @param subscriptionId - Polar subscription ID
 * @returns Canceled subscription details
 */
export async function cancelSubscription(env: Env, subscriptionId: string) {
  const isSandbox = env.POLAR_SANDBOX === 'true';
  const polar = createPolarClient(env.POLAR_ACCESS_TOKEN, isSandbox);

  try {
    const canceled = await polar.subscriptions.cancel(subscriptionId);
    return canceled;
  } catch (error: any) {
    console.error(`Failed to cancel subscription ${subscriptionId}:`, error);
    throw new Error(`Failed to cancel subscription: ${error.message}`);
  }
}

/**
 * Verify Polar webhook signature
 *
 * @param payload - Webhook payload
 * @param signature - Webhook signature from headers
 * @param secret - Webhook secret from Polar dashboard
 * @returns True if signature is valid
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  // Polar provides webhook signature verification
  // Implementation depends on Polar's webhook signing method
  // For now, this is a placeholder - check Polar docs for exact implementation
  try {
    // TODO: Implement actual signature verification when Polar webhook secret is available
    // This is a security-critical function
    return true; // TEMPORARY - replace with actual verification
  } catch (error: any) {
    console.error('Webhook signature verification failed:', error);
    return false;
  }
}
