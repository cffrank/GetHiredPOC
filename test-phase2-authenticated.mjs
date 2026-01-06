/**
 * Phase 2: Authenticated Testing Script
 *
 * This script requires a valid admin session token to test
 * the full CRUD functionality of the AI prompts API.
 *
 * Usage:
 *   1. Login to production and get session token
 *   2. Set SESSION_TOKEN environment variable
 *   3. Run: SESSION_TOKEN="your-token" node test-phase2-authenticated.mjs
 */

const PRODUCTION_URL = 'https://gethiredpoc-api.carl-f-frank.workers.dev';
const SESSION_TOKEN = process.env.SESSION_TOKEN;

if (!SESSION_TOKEN) {
  console.error('❌ Error: SESSION_TOKEN environment variable not set');
  console.error('\nUsage:');
  console.error('  1. Login to production and obtain session token');
  console.error('  2. Run: SESSION_TOKEN="your-token" node test-phase2-authenticated.mjs');
  console.error('\nTo get a session token:');
  console.error('  1. Open https://gethiredpoc.pages.dev in browser');
  console.error('  2. Login as admin');
  console.error('  3. Open browser DevTools > Application > Cookies');
  console.error('  4. Copy the "session" cookie value');
  process.exit(1);
}

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║      Phase 2: Authenticated End-to-End Test Suite            ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');
console.log(`🌐 Testing: ${PRODUCTION_URL}`);
console.log(`🔑 Session Token: ${SESSION_TOKEN.substring(0, 10)}...\n`);

async function makeAuthenticatedRequest(path, options = {}) {
  const response = await fetch(`${PRODUCTION_URL}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      'Cookie': `session=${SESSION_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
  return response;
}

async function testAuthenticatedAccess() {
  console.log('🔓 Testing Authenticated Access...\n');

  // Test 1: List all prompts
  console.log('  1️⃣  GET /api/admin/prompts - List all prompts');
  const listResponse = await makeAuthenticatedRequest('/api/admin/prompts');
  console.log(`     Status: ${listResponse.status}`);

  if (listResponse.ok) {
    const prompts = await listResponse.json();
    console.log(`     ✅ Success! Found ${prompts.length} prompts:`);
    prompts.forEach(p => {
      console.log(`        - ${p.name} (v${p.version})`);
    });
  } else {
    console.log(`     ❌ Failed: ${await listResponse.text()}`);
  }

  // Test 2: Get specific prompt
  console.log('\n  2️⃣  GET /api/admin/prompts/cover_letter - Get specific prompt');
  const getResponse = await makeAuthenticatedRequest('/api/admin/prompts/cover_letter');
  console.log(`     Status: ${getResponse.status}`);

  if (getResponse.ok) {
    const prompt = await getResponse.json();
    console.log(`     ✅ Success!`);
    console.log(`        Name: ${prompt.name}`);
    console.log(`        Version: ${prompt.version}`);
    console.log(`        Template: ${prompt.template.substring(0, 100)}...`);
    console.log(`        Variables: ${prompt.variables.join(', ')}`);
  } else {
    console.log(`     ❌ Failed: ${await getResponse.text()}`);
  }

  // Test 3: Create new prompt
  console.log('\n  3️⃣  POST /api/admin/prompts - Create new prompt');
  const createResponse = await makeAuthenticatedRequest('/api/admin/prompts', {
    method: 'POST',
    body: JSON.stringify({
      name: 'test_prompt_automated',
      template: 'This is a test prompt created by automated testing. Variable: {{test_var}}',
      description: 'Automated test prompt - safe to delete',
      variables: ['test_var']
    })
  });
  console.log(`     Status: ${createResponse.status}`);

  if (createResponse.status === 201) {
    const created = await createResponse.json();
    console.log(`     ✅ Success! Created prompt: ${created.name}`);
  } else {
    const error = await createResponse.text();
    if (createResponse.status === 409) {
      console.log(`     ⚠️  Prompt already exists (OK for repeated runs)`);
    } else {
      console.log(`     ❌ Failed: ${error}`);
    }
  }

  // Test 4: Update prompt
  console.log('\n  4️⃣  PUT /api/admin/prompts/test_prompt_automated - Update prompt');
  const updateResponse = await makeAuthenticatedRequest('/api/admin/prompts/test_prompt_automated', {
    method: 'PUT',
    body: JSON.stringify({
      template: 'Updated test prompt. Variables: {{test_var}}, {{another_var}}',
      variables: ['test_var', 'another_var'],
      description: 'Updated by automated test'
    })
  });
  console.log(`     Status: ${updateResponse.status}`);

  if (updateResponse.ok) {
    const updated = await updateResponse.json();
    console.log(`     ✅ Success! Updated to version ${updated.version}`);
  } else {
    console.log(`     ❌ Failed: ${await updateResponse.text()}`);
  }

  // Test 5: Delete prompt
  console.log('\n  5️⃣  DELETE /api/admin/prompts/test_prompt_automated - Delete prompt');
  const deleteResponse = await makeAuthenticatedRequest('/api/admin/prompts/test_prompt_automated', {
    method: 'DELETE'
  });
  console.log(`     Status: ${deleteResponse.status}`);

  if (deleteResponse.status === 204) {
    console.log(`     ✅ Success! Prompt deleted`);
  } else {
    console.log(`     ❌ Failed: ${await deleteResponse.text()}`);
  }

  // Test 6: Verify deletion
  console.log('\n  6️⃣  GET /api/admin/prompts/test_prompt_automated - Verify deletion');
  const verifyResponse = await makeAuthenticatedRequest('/api/admin/prompts/test_prompt_automated');
  console.log(`     Status: ${verifyResponse.status}`);

  if (verifyResponse.status === 404) {
    console.log(`     ✅ Success! Prompt no longer exists`);
  } else {
    console.log(`     ❌ Failed: Prompt still exists`);
  }

  console.log('\n✨ Authenticated testing complete!\n');
}

// Run tests
testAuthenticatedAccess().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
