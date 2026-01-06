#!/usr/bin/env node

/**
 * Admin Access Testing Script
 * Tests admin functionality with provided credentials
 *
 * Usage:
 *   ADMIN_EMAIL=your-admin@example.com ADMIN_PASSWORD=yourpassword node test-admin-access.js
 */

const API_BASE_URL = 'https://gethiredpoc-api.carl-f-frank.workers.dev';

const COLORS = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  log(title, 'bold');
  console.log('='.repeat(80) + '\n');
}

async function makeRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    const contentType = response.headers.get('content-type');
    let data = null;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = { body: text };
    }

    return {
      status: response.status,
      data,
      headers: response.headers
    };
  } catch (error) {
    return {
      status: 0,
      data: { error: error.message },
      headers: null
    };
  }
}

async function testAdminAccess() {
  logSection('Admin Access Testing');

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    log('ERROR: Admin credentials not provided', 'red');
    log('Usage: ADMIN_EMAIL=your@email.com ADMIN_PASSWORD=yourpassword node test-admin-access.js', 'yellow');
    process.exit(1);
  }

  log(`Testing with admin email: ${adminEmail}`, 'cyan');

  // Step 1: Login as admin
  log('\n1. Logging in as admin...', 'cyan');
  const loginResponse = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: adminEmail,
      password: adminPassword
    })
  });

  if (loginResponse.status !== 200) {
    log(`Login failed with status ${loginResponse.status}`, 'red');
    log(`Error: ${JSON.stringify(loginResponse.data, null, 2)}`, 'red');

    // Try to create admin account if login failed
    log('\n2. Attempting to create admin account...', 'cyan');
    const signupResponse = await makeRequest('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: adminEmail,
        password: adminPassword
      })
    });

    if (signupResponse.status !== 200 && signupResponse.status !== 201) {
      log(`Signup also failed with status ${signupResponse.status}`, 'red');
      log(`Error: ${JSON.stringify(signupResponse.data, null, 2)}`, 'red');
      process.exit(1);
    }

    log('Admin account created successfully', 'green');
    log('NOTE: You need to add this email to ADMIN_EMAILS environment variable in Cloudflare Workers', 'yellow');
    log(`      wrangler secret put ADMIN_EMAILS`, 'yellow');
    log(`      Then enter: ${adminEmail}`, 'yellow');

    // Login again
    const retryLogin = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: adminEmail,
        password: adminPassword
      })
    });

    if (retryLogin.status !== 200) {
      log('Login after signup failed', 'red');
      process.exit(1);
    }

    loginResponse.status = retryLogin.status;
    loginResponse.data = retryLogin.data;
    loginResponse.headers = retryLogin.headers;
  }

  log('Login successful!', 'green');
  log(`User: ${loginResponse.data.user?.email}`, 'cyan');
  log(`Role: ${loginResponse.data.user?.role || 'user'}`, 'cyan');

  // Extract session cookie
  const setCookieHeader = loginResponse.headers.get('set-cookie');
  let sessionId = null;

  if (setCookieHeader) {
    const match = setCookieHeader.match(/session=([^;]+)/);
    if (match) {
      sessionId = match[1];
    }
  }

  if (!sessionId) {
    log('Failed to extract session cookie', 'red');
    process.exit(1);
  }

  log(`Session ID: ${sessionId.substring(0, 20)}...`, 'cyan');

  // Step 2: Test GET /api/admin/metrics
  log('\n3. Testing GET /api/admin/metrics...', 'cyan');
  const metricsResponse = await makeRequest('/api/admin/metrics', {
    headers: {
      'Cookie': `session=${sessionId}`
    }
  });

  log(`Status: ${metricsResponse.status}`, metricsResponse.status === 200 ? 'green' : 'red');

  if (metricsResponse.status === 200) {
    log('Metrics data:', 'cyan');
    console.log(JSON.stringify(metricsResponse.data, null, 2));
  } else if (metricsResponse.status === 403) {
    log('Access forbidden - user is not an admin', 'red');
    log('Please add this email to ADMIN_EMAILS environment variable:', 'yellow');
    log(`  wrangler secret put ADMIN_EMAILS`, 'yellow');
    log(`  Then enter: ${adminEmail}`, 'yellow');
    log('\nError response:', 'red');
    console.log(JSON.stringify(metricsResponse.data, null, 2));
  } else {
    log('Unexpected status code', 'red');
    console.log(JSON.stringify(metricsResponse.data, null, 2));
  }

  // Step 3: Test GET /api/admin/users
  log('\n4. Testing GET /api/admin/users...', 'cyan');
  const usersResponse = await makeRequest('/api/admin/users', {
    headers: {
      'Cookie': `session=${sessionId}`
    }
  });

  log(`Status: ${usersResponse.status}`, usersResponse.status === 200 ? 'green' : 'red');

  if (usersResponse.status === 200) {
    log('Users data:', 'cyan');
    log(`Total users: ${usersResponse.data.total}`, 'cyan');
    log(`Page: ${usersResponse.data.page} of ${usersResponse.data.totalPages}`, 'cyan');
    log(`Users on this page: ${usersResponse.data.users?.length || 0}`, 'cyan');

    if (usersResponse.data.users && usersResponse.data.users.length > 0) {
      log('\nSample user:', 'cyan');
      const sampleUser = usersResponse.data.users[0];
      console.log(JSON.stringify({
        id: sampleUser.id,
        email: sampleUser.email,
        role: sampleUser.role,
        membership_tier: sampleUser.membership_tier
      }, null, 2));
    }
  } else if (usersResponse.status === 403) {
    log('Access forbidden - user is not an admin', 'red');
    log('Error response:', 'red');
    console.log(JSON.stringify(usersResponse.data, null, 2));
  } else {
    log('Unexpected status code', 'red');
    console.log(JSON.stringify(usersResponse.data, null, 2));
  }

  // Step 4: Verify metrics data structure
  if (metricsResponse.status === 200) {
    log('\n5. Verifying metrics data structure...', 'cyan');
    const metrics = metricsResponse.data;
    const expectedFields = [
      'totalUsers',
      'activeTrials',
      'paidMembers',
      'totalJobs',
      'jobsThisWeek',
      'aiRequests24h'
    ];

    let allFieldsPresent = true;
    for (const field of expectedFields) {
      const hasField = metrics.hasOwnProperty(field);
      const isNumber = typeof metrics[field] === 'number';
      const status = hasField && isNumber ? 'PASS' : 'FAIL';
      const color = hasField && isNumber ? 'green' : 'red';

      log(`  ${status}: ${field} = ${metrics[field]} (${typeof metrics[field]})`, color);

      if (!hasField || !isNumber) {
        allFieldsPresent = false;
      }
    }

    if (allFieldsPresent) {
      log('\nAll expected metrics fields are present and valid!', 'green');
    } else {
      log('\nSome metrics fields are missing or have wrong type', 'red');
    }
  }

  // Summary
  logSection('Test Summary');

  if (metricsResponse.status === 200 && usersResponse.status === 200) {
    log('SUCCESS: All admin endpoints are accessible and working correctly!', 'green');
    log('Phase 1 security implementation is functioning as expected.', 'green');
  } else if (metricsResponse.status === 403 || usersResponse.status === 403) {
    log('CONFIGURATION NEEDED: User authenticated but not authorized as admin', 'yellow');
    log('\nNext steps:', 'cyan');
    log(`1. Set the ADMIN_EMAILS secret in Cloudflare Workers:`, 'cyan');
    log(`   cd /home/carl/project/gethiredpoc/packages/backend`, 'cyan');
    log(`   wrangler secret put ADMIN_EMAILS`, 'cyan');
    log(`   (When prompted, enter: ${adminEmail})`, 'cyan');
    log(`2. Re-run this test script to verify admin access`, 'cyan');
  } else {
    log('FAILURE: Unexpected errors occurred during testing', 'red');
  }

  console.log('\n');
}

testAdminAccess().catch(error => {
  log(`\nUnexpected error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
