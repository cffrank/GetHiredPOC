/**
 * Test script to list Polar products and create checkout
 */

import { Polar } from '@polar-sh/sdk';

const POLAR_ACCESS_TOKEN = 'polar_oat_l6yAElW8qidrXIugfTzTISRqOr58vBORTW4Et3PNBIy';

async function listProducts() {
  const polar = new Polar({
    accessToken: POLAR_ACCESS_TOKEN,
  });

  try {
    console.log('Fetching products from Polar...\n');

    // List all products
    const products = await polar.products.list({});

    console.log('Found products:', products);
    console.log('\nProduct details:');

    const items = products.result?.items || [];

    if (items && items.length > 0) {
      items.forEach((product: any) => {
        console.log('\n---');
        console.log('Product ID:', product.id);
        console.log('Name:', product.name);
        console.log('Description:', product.description);

        if (product.prices && product.prices.length > 0) {
          console.log('\nPrices:');
          product.prices.forEach((price: any) => {
            console.log('  - Price ID:', price.id);
            console.log('    Amount:', price.priceAmount / 100, price.priceCurrency);
            console.log('    Type:', price.type);
            console.log('    Recurring:', price.recurringInterval);
          });
        }
      });
    } else {
      console.log('\nNo products found. You may need to create a product in the Polar dashboard.');
      console.log('Go to: https://polar.sh/dashboard/products');
      console.log('\nCreate a product with:');
      console.log('- Name: GetHiredPOC PRO Monthly');
      console.log('- Price: $39.00 USD/month');
      console.log('- Recurring: Monthly');
    }

  } catch (error: any) {
    console.error('Error:', error.message);
    console.error('Full error:', error);
  }
}

listProducts();
