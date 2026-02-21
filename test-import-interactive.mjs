#!/usr/bin/env node
/**
 * Interactive test script for Apify job import
 */

import readline from 'readline';

const BACKEND_URL = 'https://gethiredpoc-api.carl-f-frank.workers.dev';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function testImport() {
  console.log('🧪 Apify Job Import Test\n');

  const email = await question('Admin email (default: carl.f.frank@gmail.com): ') || 'carl.f.frank@gmail.com';
  const password = await question('Admin password: ');

  if (!password) {
    console.error('❌ Password required');
    rl.close();
    process.exit(1);
  }

  console.log('\n🔐 Step 1: Logging in as admin...');

  try {
    // Login
    const loginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!loginResponse.ok) {
      const error = await loginResponse.text();
      console.error('❌ Login failed:', error);
      rl.close();
      process.exit(1);
    }

    const loginData = await loginResponse.json();
    console.log('✅ Logged in as:', loginData.user.email);
    console.log('   Role:', loginData.user.role);

    const sessionToken = loginResponse.headers.get('set-cookie')
      ?.split(';')[0]
      ?.split('=')[1];

    if (!sessionToken) {
      console.error('❌ No session token received');
      rl.close();
      process.exit(1);
    }

    console.log('✅ Session token received\n');

    // Ask for test query
    const query = await question('Search query (default: software engineer remote): ') || 'software engineer remote';

    console.log('\n📥 Step 2: Triggering job import...');
    console.log(`Query: "${query}"`);
    console.log('Scrapers: LinkedIn, Indeed, Dice\n');

    // Trigger import
    const importResponse = await fetch(`${BACKEND_URL}/api/admin/import-jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${sessionToken}`
      },
      body: JSON.stringify({
        queries: [query],
        scrapers: ['linkedin', 'indeed', 'dice']
      })
    });

    if (!importResponse.ok) {
      const error = await importResponse.text();
      console.error('❌ Import failed:', error);
      rl.close();
      process.exit(1);
    }

    const importData = await importResponse.json();
    console.log('✅ Import completed!\n');
    console.log('📊 Results:');
    console.log('─'.repeat(50));
    console.log(`Total imported: ${importData.imported}`);
    console.log(`Total updated:  ${importData.updated}`);
    console.log(`Errors:         ${importData.errors}`);

    if (importData.byScraper) {
      console.log('\n📈 By Scraper:');
      console.log('─'.repeat(50));
      Object.entries(importData.byScraper).forEach(([scraper, stats]) => {
        console.log(`${scraper.padEnd(10)}: ${stats.imported} imported, ${stats.updated} updated, ${stats.errors} errors`);
      });
    }

    console.log('\n✨ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    rl.close();
  }
}

testImport();
