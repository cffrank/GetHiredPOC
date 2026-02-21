#!/usr/bin/env node
/**
 * Test script for Apify job import
 * Tests the /api/admin/import-jobs endpoint
 */

const BACKEND_URL = 'https://gethiredpoc-api.carl-f-frank.workers.dev';

// You'll need to set these from your actual login
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'carl.f.frank@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  console.error('Error: ADMIN_PASSWORD environment variable required');
  console.log('Usage: ADMIN_PASSWORD="your-password" node test-apify-import.mjs');
  process.exit(1);
}

async function testImport() {
  console.log('🔐 Step 1: Logging in as admin...');

  // Login
  const loginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    })
  });

  if (!loginResponse.ok) {
    const error = await loginResponse.text();
    console.error('❌ Login failed:', error);
    process.exit(1);
  }

  const loginData = await loginResponse.json();
  console.log('✅ Logged in as:', loginData.user.email);

  const sessionToken = loginResponse.headers.get('set-cookie')
    ?.split(';')[0]
    ?.split('=')[1];

  if (!sessionToken) {
    console.error('❌ No session token received');
    process.exit(1);
  }

  console.log('✅ Session token received');

  console.log('\n📥 Step 2: Triggering job import...');
  console.log('Test query: "software engineer remote"');

  // Trigger import with a single test query
  const importResponse = await fetch(`${BACKEND_URL}/api/admin/import-jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `session=${sessionToken}`
    },
    body: JSON.stringify({
      queries: ['software engineer remote'],
      scrapers: ['linkedin', 'indeed', 'dice']
    })
  });

  if (!importResponse.ok) {
    const error = await importResponse.text();
    console.error('❌ Import failed:', error);
    process.exit(1);
  }

  const importData = await importResponse.json();
  console.log('\n✅ Import completed!');
  console.log(JSON.stringify(importData, null, 2));

  console.log('\n📊 Summary:');
  console.log(`- Total imported: ${importData.imported}`);
  console.log(`- Total updated: ${importData.updated}`);
  console.log(`- Errors: ${importData.errors}`);

  if (importData.byScraper) {
    console.log('\n📈 By Scraper:');
    Object.entries(importData.byScraper).forEach(([scraper, stats]) => {
      console.log(`  ${scraper}: ${stats.imported} imported, ${stats.updated} updated, ${stats.errors} errors`);
    });
  }
}

testImport().catch(error => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});
