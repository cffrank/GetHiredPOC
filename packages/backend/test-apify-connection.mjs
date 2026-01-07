#!/usr/bin/env node
/**
 * Test Apify API connection and actor IDs
 */

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;

if (!APIFY_API_TOKEN) {
  console.error('❌ APIFY_API_TOKEN environment variable required');
  console.log('Get your token from: https://console.apify.com/account/integrations');
  process.exit(1);
}

const actors = [
  { name: 'LinkedIn', id: 'curious_coder/linkedin-jobs-scraper' },
  { name: 'Indeed', id: 'curious_coder/indeed-scraper' },
  { name: 'Dice', id: 'orgupdate/dice-jobs-scraper' }
];

async function testActor(actor) {
  console.log(`\n🔍 Testing ${actor.name} (${actor.id})...`);

  try {
    // Test if actor exists
    const response = await fetch(
      `https://api.apify.com/v2/acts/${actor.id}`,
      {
        headers: {
          'Authorization': `Bearer ${APIFY_API_TOKEN}`
        }
      }
    );

    if (!response.ok) {
      console.error(`❌ ${actor.name} - HTTP ${response.status}`);
      const text = await response.text();
      console.error('   Error:', text);
      return false;
    }

    const data = await response.json();
    console.log(`✅ ${actor.name} - Found!`);
    console.log(`   Title: ${data.data.title}`);
    console.log(`   Username: ${data.data.username}`);
    console.log(`   Latest Version: ${data.data.taggedBuilds?.latest || 'N/A'}`);
    return true;
  } catch (error) {
    console.error(`❌ ${actor.name} - Error:`, error.message);
    return false;
  }
}

async function testConnection() {
  console.log('🧪 Testing Apify Connection\n');
  console.log('API Token:', APIFY_API_TOKEN.substring(0, 10) + '...');

  let allPassed = true;

  for (const actor of actors) {
    const passed = await testActor(actor);
    if (!passed) allPassed = false;
  }

  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('✅ All actors configured correctly!');
  } else {
    console.log('❌ Some actors failed - check the errors above');
  }
}

testConnection().catch(error => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});
