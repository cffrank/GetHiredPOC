/**
 * Test Polar checkout creation
 */

import { Polar } from '@polar-sh/sdk';

const POLAR_ACCESS_TOKEN = 'polar_oat_QI5eRBOLZR0izR7a8kQYNbYVYt8qjjpS53EyT2UQRoP';
const POLAR_PRODUCT_ID = 'e866b778-608d-41fb-a308-78cdef850f92'; // Sandbox Product ID
const POLAR_PRODUCT_PRICE_ID = '0865b3bd-dd30-44e7-989d-123565fbb034'; // Sandbox Price ID
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
