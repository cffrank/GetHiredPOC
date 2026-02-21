#!/usr/bin/env node

/**
 * Script to backfill embeddings for all user profiles
 *
 * Usage: node run-user-backfill.mjs
 *
 * This script:
 * 1. Logs in as admin
 * 2. Triggers the backfill-user-embeddings endpoint
 * 3. Displays progress and results
 * 4. Shows cost estimation
 */

const API_URL = 'https://gethiredpoc-api.carl-f-frank.workers.dev';
const ADMIN_EMAIL = 'carl.f.frank@gmail.com';
const ADMIN_PASSWORD = 'K16PB%!uaB1342g1$X2p';

/**
 * Main backfill process
 */
async function main() {
  console.log('========================================');
  console.log('   User Profile Embeddings Backfill');
  console.log('========================================\n');

  // Step 1: Login
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

  // Extract session cookie
  const setCookieHeader = loginResponse.headers.get('set-cookie');
  let sessionCookie = '';

  if (setCookieHeader) {
    const match = setCookieHeader.match(/session=([^;]+)/);
    if (match) {
      sessionCookie = `session=${match[1]}`;
    }
  }

  console.log('✅ Login successful!');
  console.log(`👤 User: ${loginData.user.email}`);
  console.log(`🔑 Role: ${loginData.user.role}\n`);

  // Step 2: Trigger backfill
  console.log('Step 2: Triggering user embeddings backfill...');
  console.log('⏳ This may take several minutes...\n');

  const backfillResponse = await fetch(`${API_URL}/api/admin/backfill-user-embeddings`, {
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
  console.log(`   Users processed: ${backfillData.processed}`);
  console.log(`   Users skipped: ${backfillData.skipped || 0} (no profile data)`);
  console.log(`   Users with errors: ${backfillData.errors || 0}`);
  console.log(`   Estimated cost: $${backfillData.estimatedCost?.toFixed(6) || '0.000000'}`);
  console.log(`\n💬 ${backfillData.message}\n`);

  console.log('🎉 All done! User profiles now have semantic embeddings.\n');
}

// Run the script
main().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
