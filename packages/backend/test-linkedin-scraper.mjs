#!/usr/bin/env node
/**
 * Test LinkedIn scraper with cookie authentication
 */

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
const ACTOR_ID = 'curious_coder~linkedin-jobs-search-scraper';

if (!APIFY_API_TOKEN) {
  console.error('❌ APIFY_API_TOKEN environment variable required');
  process.exit(1);
}

// Read cookie from stdin or use test cookie
async function getCookie() {
  if (process.argv[2] === '--cookie') {
    return process.argv[3];
  }

  console.log('📋 Paste your LinkedIn cookies JSON (from Cookie-Editor) and press Enter:');
  console.log('   (It should be a JSON array starting with [ and ending with ])');
  console.log('');

  return new Promise((resolve) => {
    let data = '';
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      resolve(data.trim());
    });
  });
}

async function startActorRun(input) {
  console.log('\n🚀 Starting LinkedIn scraper...');

  const response = await fetch(
    `https://api.apify.com/v2/acts/${ACTOR_ID}/runs`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${APIFY_API_TOKEN}`
      },
      body: JSON.stringify(input)
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to start actor: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.data.id;
}

async function pollRunStatus(runId) {
  console.log('⏳ Waiting for scraper to complete...');

  const delays = [5000, 10000, 20000, 30000]; // Exponential backoff
  let delayIndex = 0;
  let attempts = 0;
  const maxAttempts = 30; // 5 minutes max

  while (attempts < maxAttempts) {
    const response = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}`,
      {
        headers: {
          'Authorization': `Bearer ${APIFY_API_TOKEN}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get run status: ${response.status}`);
    }

    const data = await response.json();
    const status = data.data.status;

    console.log(`   Status: ${status} (attempt ${attempts + 1}/${maxAttempts})`);

    if (status === 'SUCCEEDED') {
      return data.data.defaultDatasetId;
    }

    if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
      throw new Error(`Scraper ${status.toLowerCase()}`);
    }

    // Wait before next poll
    const delay = delays[Math.min(delayIndex, delays.length - 1)];
    await new Promise(resolve => setTimeout(resolve, delay));
    delayIndex++;
    attempts++;
  }

  throw new Error('Timeout waiting for scraper to complete');
}

async function fetchResults(datasetId) {
  console.log('\n📥 Fetching results...');

  const response = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items`,
    {
      headers: {
        'Authorization': `Bearer ${APIFY_API_TOKEN}`
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch results: ${response.status}`);
  }

  return await response.json();
}

async function testScraper() {
  try {
    // Get cookie
    const cookieStr = await getCookie();

    // Validate JSON
    let cookies;
    try {
      cookies = JSON.parse(cookieStr);
      if (!Array.isArray(cookies)) {
        throw new Error('Cookies must be a JSON array');
      }
      console.log(`✅ Cookie JSON is valid (${cookies.length} cookies found)`);
    } catch (error) {
      console.error('❌ Invalid JSON format:', error.message);
      console.error('   Make sure you exported in JSON format from Cookie-Editor');
      process.exit(1);
    }

    // Check for required cookies
    const cookieNames = cookies.map(c => c.name);
    const hasLiAt = cookieNames.includes('li_at');
    const hasJSession = cookieNames.includes('JSESSIONID');

    console.log(`   Found li_at: ${hasLiAt ? '✅' : '❌'}`);
    console.log(`   Found JSESSIONID: ${hasJSession ? '✅' : '❌'}`);

    if (!hasLiAt || !hasJSession) {
      console.warn('⚠️  Warning: Missing required cookies (li_at and/or JSESSIONID)');
      console.warn('   Scraper may fail without these cookies');
    }

    // Build test input
    const testQuery = 'software engineer';
    const testLocation = 'United States';
    const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(testQuery)}&location=${encodeURIComponent(testLocation)}`;

    const input = {
      searchUrl: searchUrl,
      cookies: cookies,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      proxy: {
        useApifyProxy: true,
        apifyProxyCountry: 'US'
      }
    };

    console.log(`\n🔍 Test search: "${testQuery}" in "${testLocation}"`);
    console.log(`   URL: ${searchUrl}`);

    // Start scraper
    const runId = await startActorRun(input);
    console.log(`   Run ID: ${runId}`);

    // Wait for completion
    const datasetId = await pollRunStatus(runId);

    // Fetch results
    const results = await fetchResults(datasetId);

    // Display results
    console.log('\n' + '='.repeat(60));
    console.log(`✅ SUCCESS! Found ${results.length} jobs`);
    console.log('='.repeat(60));

    if (results.length > 0) {
      console.log('\n📋 Sample Results:');
      results.slice(0, 3).forEach((job, idx) => {
        console.log(`\n${idx + 1}. ${job.title || 'N/A'}`);
        console.log(`   Company: ${job.company || 'N/A'}`);
        console.log(`   Location: ${job.location || 'N/A'}`);
        console.log(`   URL: ${job.url || 'N/A'}`);
        if (job.salary) {
          console.log(`   Salary: ${job.salary}`);
        }
        if (job.description) {
          console.log(`   Description: ${job.description.substring(0, 100)}...`);
        }
      });

      console.log('\n✅ Cookie is working! You can now use this cookie in the admin UI.');
      console.log('\nNext steps:');
      console.log('1. Copy the same JSON you pasted here');
      console.log('2. Go to Admin Dashboard → Job Import Management');
      console.log('3. Click "Configure Cookie" and paste the JSON');
      console.log('4. Click "Save Cookie"');
      console.log('5. Run a bulk import with LinkedIn selected');
    } else {
      console.log('\n⚠️  Warning: Scraper ran successfully but returned 0 jobs');
      console.log('   This could mean:');
      console.log('   - Cookie is expired or invalid');
      console.log('   - LinkedIn is blocking the request');
      console.log('   - Search query returned no results');
      console.log('\n   Try logging into LinkedIn and re-exporting cookies');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run test
console.log('🧪 LinkedIn Scraper Test\n');
console.log('This will test the curious_coder/linkedin-jobs-search-scraper');
console.log('with your LinkedIn cookies.\n');

testScraper().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
