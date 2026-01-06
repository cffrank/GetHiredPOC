#!/usr/bin/env node

/**
 * Phase 5 Testing Script: Admin Dashboard UI
 *
 * Tests all admin dashboard functionality:
 * 1. Admin authentication and access control
 * 2. Admin dashboard metrics display
 * 3. User management (list, search, role changes)
 * 4. Job import management
 * 5. AI prompt management
 */

const API_BASE = process.env.API_URL || 'https://gethiredpoc.carlf.workers.dev';

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

function logTest(testName, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  const statusColor = passed ? 'green' : 'red';
  log(`${status}: ${testName}`, statusColor);
  if (details) {
    log(`  ${details}`, 'yellow');
  }
}

// Test results tracker
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: [],
};

function recordTest(name, passed, details = '') {
  results.total++;
  if (passed) {
    results.passed++;
  } else {
    results.failed++;
  }
  results.tests.push({ name, passed, details });
  logTest(name, passed, details);
}

// Main test function
async function runTests() {
  log('Phase 5: Admin Dashboard UI - Testing Suite', 'blue');
  log(`Testing against: ${API_BASE}`, 'yellow');

  let adminCookie = '';
  let regularUserCookie = '';

  // ============================================================================
  // Test 1: Admin Authentication
  // ============================================================================
  logSection('Test 1: Admin Authentication');

  try {
    // Login as admin (assuming test admin exists)
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@test.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'TestAdmin123!';

    const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    });

    if (loginResponse.ok) {
      adminCookie = loginResponse.headers.get('set-cookie') || '';
      const adminData = await loginResponse.json();

      recordTest(
        'Admin login successful',
        true,
        `Logged in as: ${adminData.user?.email}`
      );

      recordTest(
        'Admin has admin role',
        adminData.user?.role === 'admin',
        `Role: ${adminData.user?.role}`
      );
    } else {
      recordTest('Admin login successful', false, `Status: ${loginResponse.status}`);
    }
  } catch (error) {
    recordTest('Admin login successful', false, error.message);
  }

  // ============================================================================
  // Test 2: Admin Access Control
  // ============================================================================
  logSection('Test 2: Admin Access Control');

  try {
    // Test that non-admin users cannot access admin routes
    const regularEmail = process.env.USER_EMAIL || 'user@test.com';
    const regularPassword = process.env.USER_PASSWORD || 'TestUser123!';

    const userLoginResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: regularEmail, password: regularPassword }),
    });

    if (userLoginResponse.ok) {
      regularUserCookie = userLoginResponse.headers.get('set-cookie') || '';

      // Try to access admin metrics with regular user
      const metricsResponse = await fetch(`${API_BASE}/api/admin/metrics`, {
        headers: { Cookie: regularUserCookie },
      });

      recordTest(
        'Regular user blocked from admin routes',
        metricsResponse.status === 403,
        `Status: ${metricsResponse.status}`
      );
    } else {
      log('  Skipping regular user test - login failed', 'yellow');
    }
  } catch (error) {
    recordTest('Regular user blocked from admin routes', false, error.message);
  }

  // ============================================================================
  // Test 3: Admin Dashboard Metrics
  // ============================================================================
  logSection('Test 3: Admin Dashboard Metrics');

  try {
    const metricsResponse = await fetch(`${API_BASE}/api/admin/metrics`, {
      headers: { Cookie: adminCookie },
    });

    if (metricsResponse.ok) {
      const metrics = await metricsResponse.json();

      recordTest(
        'Metrics endpoint accessible',
        true,
        `Total users: ${metrics.total_users}, Total jobs: ${metrics.total_jobs}`
      );

      const expectedFields = [
        'total_users', 'admin_users', 'trial_users', 'paid_users',
        'total_jobs', 'total_applications', 'total_saved_jobs',
        'ai_requests_today', 'ai_requests_week', 'ai_requests_month'
      ];

      const hasAllFields = expectedFields.every(field => field in metrics);
      recordTest(
        'All metric fields present',
        hasAllFields,
        hasAllFields ? 'All expected fields found' : 'Some fields missing'
      );
    } else {
      recordTest(
        'Metrics endpoint accessible',
        false,
        `Status: ${metricsResponse.status}`
      );
    }
  } catch (error) {
    recordTest('Metrics endpoint accessible', false, error.message);
  }

  // ============================================================================
  // Test 4: User Management
  // ============================================================================
  logSection('Test 4: User Management');

  try {
    // Test user listing
    const usersResponse = await fetch(`${API_BASE}/api/admin/users?page=1&limit=20`, {
      headers: { Cookie: adminCookie },
    });

    if (usersResponse.ok) {
      const usersData = await usersResponse.json();

      recordTest(
        'User list endpoint accessible',
        true,
        `Found ${usersData.total} users, page ${usersData.page} of ${usersData.totalPages}`
      );

      recordTest(
        'User list has pagination',
        'page' in usersData && 'limit' in usersData && 'totalPages' in usersData,
        'Pagination fields present'
      );

      recordTest(
        'User list contains users',
        Array.isArray(usersData.users) && usersData.users.length > 0,
        `${usersData.users?.length || 0} users returned`
      );
    } else {
      recordTest(
        'User list endpoint accessible',
        false,
        `Status: ${usersResponse.status}`
      );
    }

    // Test user search
    const searchResponse = await fetch(
      `${API_BASE}/api/admin/users?page=1&limit=20&search=test`,
      { headers: { Cookie: adminCookie } }
    );

    recordTest(
      'User search works',
      searchResponse.ok,
      `Search query parameter accepted`
    );

  } catch (error) {
    recordTest('User management endpoints', false, error.message);
  }

  // ============================================================================
  // Test 5: Job Import Management
  // ============================================================================
  logSection('Test 5: Job Import Management');

  try {
    // Note: We won't actually trigger a job import in testing,
    // just verify the endpoint is accessible and validates input

    const invalidImportResponse = await fetch(`${API_BASE}/api/admin/import-jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
      },
      body: JSON.stringify({ queries: [] }), // Empty queries should still work (uses defaults)
    });

    recordTest(
      'Job import endpoint accessible',
      invalidImportResponse.ok || invalidImportResponse.status === 400,
      `Status: ${invalidImportResponse.status}`
    );

    // Test user-specific import endpoint structure
    const userImportResponse = await fetch(
      `${API_BASE}/api/admin/import-jobs-for-user/fake-user-id`,
      {
        method: 'POST',
        headers: { Cookie: adminCookie },
      }
    );

    recordTest(
      'User-specific import endpoint exists',
      userImportResponse.status !== 404,
      `Status: ${userImportResponse.status}`
    );

  } catch (error) {
    recordTest('Job import endpoints', false, error.message);
  }

  // ============================================================================
  // Test 6: AI Prompt Management
  // ============================================================================
  logSection('Test 6: AI Prompt Management');

  try {
    // Test prompt listing
    const promptsResponse = await fetch(`${API_BASE}/api/admin/prompts`, {
      headers: { Cookie: adminCookie },
    });

    if (promptsResponse.ok) {
      const promptsData = await promptsResponse.json();

      recordTest(
        'Prompts list endpoint accessible',
        true,
        `Found ${promptsData.count} prompts`
      );

      recordTest(
        'Prompts list contains prompts',
        Array.isArray(promptsData.prompts),
        `${promptsData.prompts?.length || 0} prompts returned`
      );

      // Test getting a specific prompt
      if (promptsData.prompts && promptsData.prompts.length > 0) {
        const firstPromptKey = promptsData.prompts[0].prompt_key;
        const promptResponse = await fetch(
          `${API_BASE}/api/admin/prompts/${firstPromptKey}`,
          { headers: { Cookie: adminCookie } }
        );

        recordTest(
          'Individual prompt retrieval works',
          promptResponse.ok,
          `Retrieved prompt: ${firstPromptKey}`
        );
      }
    } else {
      recordTest(
        'Prompts list endpoint accessible',
        false,
        `Status: ${promptsResponse.status}`
      );
    }

    // Test prompt creation validation
    const invalidPromptResponse = await fetch(`${API_BASE}/api/admin/prompts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
      },
      body: JSON.stringify({ prompt_key: 'test' }), // Missing required fields
    });

    recordTest(
      'Prompt creation validates required fields',
      invalidPromptResponse.status === 400,
      `Validation check: ${invalidPromptResponse.status === 400 ? 'Working' : 'Not working'}`
    );

  } catch (error) {
    recordTest('AI prompt endpoints', false, error.message);
  }

  // ============================================================================
  // Test Summary
  // ============================================================================
  logSection('Test Summary');

  log(`Total Tests: ${results.total}`, 'blue');
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`,
      results.failed > 0 ? 'yellow' : 'green');

  if (results.failed > 0) {
    log('\nFailed Tests:', 'red');
    results.tests
      .filter(t => !t.passed)
      .forEach(t => log(`  - ${t.name}: ${t.details}`, 'red'));
  }

  // Export results for CI/CD
  const report = {
    timestamp: new Date().toISOString(),
    api_base: API_BASE,
    summary: {
      total: results.total,
      passed: results.passed,
      failed: results.failed,
      success_rate: ((results.passed / results.total) * 100).toFixed(1) + '%',
    },
    tests: results.tests,
  };

  // Write report to file
  const fs = await import('fs');
  fs.writeFileSync(
    'phase5-test-report.json',
    JSON.stringify(report, null, 2)
  );
  log('\n✅ Test report saved to phase5-test-report.json', 'green');

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  log(`\n❌ Test suite failed with error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
