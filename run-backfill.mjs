#!/usr/bin/env node

/**
 * Script to login and run backfill embeddings via API
 *
 * Usage: node run-backfill.mjs
 */

const API_URL = 'https://gethiredpoc-api.carl-f-frank.workers.dev';
const ADMIN_EMAIL = 'carl.f.frank@gmail.com';
const ADMIN_PASSWORD = 'K16PB%!uaB1342g1$X2p';

async function main() {
  console.log('🚀 Starting backfill process...\n');

  // Step 1: Login to get auth token
  console.log('Step 1: Logging in as admin...');

  const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    })
  });

  if (!loginResponse.ok) {
    const error = await loginResponse.json();
    console.error('❌ Login failed:', error);
    process.exit(1);
  }

  const loginData = await loginResponse.json();

  // Extract session cookie from response
  const setCookieHeader = loginResponse.headers.get('set-cookie');
  let sessionCookie = '';

  if (setCookieHeader) {
    // Extract just the session=xxx part
    const match = setCookieHeader.match(/session=([^;]+)/);
    if (match) {
      sessionCookie = `session=${match[1]}`;
    }
  }

  console.log('✅ Login successful!');
  console.log(`👤 User: ${loginData.user.email}`);
  console.log(`🔑 Role: ${loginData.user.role}\n`);

  // Step 2: Trigger backfill
  console.log('Step 2: Triggering backfill embeddings...');
  console.log('⏳ This may take 2-3 minutes...\n');

  const backfillResponse = await fetch(`${API_URL}/api/admin/backfill-embeddings`, {
    method: 'POST',
    headers: {
      'Cookie': sessionCookie,
      'Content-Type': 'application/json'
    }
  });

  const backfillData = await backfillResponse.json();

  if (!backfillResponse.ok) {
    console.error('❌ Backfill failed:', backfillData.error);
    process.exit(1);
  }

  // Step 3: Display results
  console.log('✅ Backfill completed successfully!\n');
  console.log('📊 Results:');
  console.log(`   Jobs processed: ${backfillData.processed}`);
  console.log(`   Jobs with errors: ${backfillData.errors || 0}`);
  console.log(`   Jobs skipped: ${backfillData.skipped || 0}`);
  console.log(`   Estimated cost: $${backfillData.estimatedCost?.toFixed(4) || '0.0000'}`);
  console.log(`\n💬 ${backfillData.message}\n`);

  console.log('🎉 All done! Your jobs now have semantic embeddings.\n');
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
