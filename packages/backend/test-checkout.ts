/**
 * Test Polar checkout creation
 */

import { Polar } from '@polar-sh/sdk';

const POLAR_ACCESS_TOKEN = 'polar_oat_l6yAElW8qidrXIugfTzTISRqOr58vBORTW4Et3PNBIy';
const POLAR_PRODUCT_ID = 'fbfe9261-44b5-4a08-99b8-e094af09aa8f'; // Product ID (not price ID)
const POLAR_PRODUCT_PRICE_ID = 'd11b05ca-3f6d-4a15-8eb2-672a7e3866ab';
const FRONTEND_URL = 'https://gethiredpoc.pages.dev';

async function testCheckout() {
  const polar = new Polar({
    accessToken: POLAR_ACCESS_TOKEN,
    server: 'sandbox', // Use sandbox environment for testing
  });

  try {
    console.log('Creating test checkout session...\n');
    console.log('Price ID:', POLAR_PRODUCT_PRICE_ID);
    console.log('Success URL:', `${FRONTEND_URL}/subscription?success=true`);
    console.log('Cancel URL:', `${FRONTEND_URL}/subscription\n`);

    const checkout = await polar.checkouts.create({
      products: [POLAR_PRODUCT_ID],
      customerEmail: 'carl.f.frank@gmail.com',
      metadata: {
        userId: 'test-user-123',
        source: 'gethiredpoc-test',
      },
      successUrl: `${FRONTEND_URL}/subscription?success=true`,
    });

    console.log('✅ Checkout session created successfully!\n');
    console.log('Checkout ID:', checkout.id);
    console.log('Customer ID:', checkout.customerId);
    console.log('Checkout URL:', checkout.url);
    console.log('\nTest the checkout by visiting this URL:');
    console.log(checkout.url);

  } catch (error: any) {
    console.error('❌ Failed to create checkout:', error.message);
    console.error('Full error:', error);
  }
}

testCheckout();
