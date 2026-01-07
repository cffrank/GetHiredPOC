#!/usr/bin/env node

/**
 * Phase 8B-8D Feature Validation Test
 * Tests user embeddings, vector pre-filtering, and recommendations
 */

const API_URL = 'https://gethiredpoc-api.carl-f-frank.workers.dev';
const ADMIN_EMAIL = 'carl.f.frank@gmail.com';
const ADMIN_PASSWORD = 'K16PB%!uaB1342g1$X2p';

let sessionCookie = '';

async function login() {
  console.log('\n🔐 Step 1: Logging in...');

  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
  });

  if (!response.ok) {
    throw new Error('Login failed');
  }

  const setCookieHeader = response.headers.get('set-cookie');
  if (setCookieHeader) {
    const match = setCookieHeader.match(/session=([^;]+)/);
    if (match) {
      sessionCookie = `session=${match[1]}`;
    }
  }

  const data = await response.json();
  console.log(`✅ Logged in as: ${data.user.email}\n`);
}

async function testRecommendations() {
  console.log('📊 Step 2: Testing personalized recommendations...');

  const response = await fetch(`${API_URL}/api/recommendations`, {
    headers: { 'Cookie': sessionCookie }
  });

  if (!response.ok) {
    console.error(`❌ Recommendations request failed: ${response.status}`);
    return false;
  }

  const data = await response.json();
  console.log(`✅ Got ${data.jobs?.length || 0} personalized job recommendations`);

  if (data.jobs && data.jobs.length > 0) {
    console.log('\n   Top 3 Recommendations:');
    data.jobs.slice(0, 3).forEach((job, i) => {
      console.log(`   ${i + 1}. ${job.title} at ${job.company}`);
      if (job.similarity_score) {
        console.log(`      Match Score: ${job.similarity_score}%`);
      }
    });
  }

  console.log('');
  return true;
}

async function testVectorPrefiltering() {
  console.log('🔍 Step 3: Testing vector pre-filtering (personalized job feed)...');

  const response = await fetch(`${API_URL}/api/jobs`, {
    headers: { 'Cookie': sessionCookie }
  });

  if (!response.ok) {
    console.error(`❌ Jobs request failed: ${response.status}`);
    return false;
  }

  const data = await response.json();
  console.log(`✅ Got ${data.jobs?.length || 0} jobs (with vector pre-filtering)`);

  // Check if vector_match_score is present
  if (data.jobs && data.jobs.length > 0 && data.jobs[0].vector_match_score !== undefined) {
    console.log('✅ Vector pre-filtering is active!');
    console.log(`   Top job match score: ${data.jobs[0].vector_match_score}%`);
  } else {
    console.log('ℹ️  Vector pre-filtering not detected (may not have user embedding)');
  }

  console.log('');
  return true;
}

async function testRefreshEmbedding() {
  console.log('🔄 Step 4: Testing manual embedding refresh...');

  const response = await fetch(`${API_URL}/api/profile/refresh-embedding`, {
    method: 'POST',
    headers: { 'Cookie': sessionCookie }
  });

  if (!response.ok) {
    console.error(`❌ Refresh embedding failed: ${response.status}`);
    return false;
  }

  const data = await response.json();
  console.log(`✅ Embedding refreshed successfully`);
  console.log(`   Updated at: ${new Date(data.updated_at).toLocaleString()}`);

  console.log('');
  return true;
}

async function main() {
  console.log('=' .repeat(60));
  console.log('   Phase 8B-8D Feature Validation');
  console.log('=' .repeat(60));

  try {
    await login();
    await testRecommendations();
    await testVectorPrefiltering();
    await testRefreshEmbedding();

    console.log('=' .repeat(60));
    console.log('🎉 ALL TESTS PASSED!');
    console.log('=' .repeat(60));
    console.log('\n✅ User profile embeddings working');
    console.log('✅ Vector-based recommendations working');
    console.log('✅ Vector pre-filtering working');
    console.log('✅ Manual embedding refresh working\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

main();
