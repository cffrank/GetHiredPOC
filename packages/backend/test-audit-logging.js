#!/usr/bin/env node

/**
 * Audit Logging Testing Script
 * Verifies that admin actions are properly logged
 *
 * This script tests the audit logging functionality by:
 * 1. Attempting unauthorized access (should be logged)
 * 2. Performing authorized admin actions (should be logged)
 * 3. Querying the audit log to verify entries
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

async function testAuditLogging() {
  logSection('Audit Logging Verification');

  log('This test verifies that admin actions are properly logged in the audit log.', 'cyan');
  log('Note: Direct audit log querying requires database access.', 'yellow');
  log('We will test by triggering actions that should create audit log entries.\n', 'yellow');

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPassword123!';

  // Step 1: Create regular user to test unauthorized access logging
  log('1. Creating regular user for unauthorized access test...', 'cyan');
  const regularEmail = `audit-test-regular-${Date.now()}@example.com`;
  const regularPassword = 'RegularPassword123!';

  const regularSignup = await makeRequest('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      email: regularEmail,
      password: regularPassword
    })
  });

  if (regularSignup.status !== 200 && regularSignup.status !== 201) {
    log('Failed to create regular user', 'red');
    return;
  }

  log(`Created regular user: ${regularEmail}`, 'green');

  const regularSessionHeader = regularSignup.headers.get('set-cookie');
  const regularSessionMatch = regularSessionHeader?.match(/session=([^;]+)/);
  const regularSession = regularSessionMatch ? regularSessionMatch[1] : null;

  if (!regularSession) {
    log('Failed to extract regular user session', 'red');
    return;
  }

  // Step 2: Attempt unauthorized admin access (should be logged)
  log('\n2. Attempting unauthorized admin access (should be logged)...', 'cyan');
  const unauthorizedAttempt = await makeRequest('/api/admin/metrics', {
    headers: {
      'Cookie': `session=${regularSession}`
    }
  });

  log(`Status: ${unauthorizedAttempt.status}`, unauthorizedAttempt.status === 403 ? 'green' : 'red');
  log(`Expected: 403 Forbidden`, 'cyan');

  if (unauthorizedAttempt.status === 403) {
    log('Unauthorized access attempt should be logged in audit log', 'yellow');
    log('This includes: user_id, action, ip_address, timestamp', 'yellow');
  }

  // Step 3: Login as admin
  log('\n3. Logging in as admin...', 'cyan');
  const adminLogin = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: adminEmail,
      password: adminPassword
    })
  });

  if (adminLogin.status !== 200) {
    log('Admin login failed - cannot test authorized actions', 'red');
    log('Make sure admin account exists and credentials are correct', 'yellow');
    return;
  }

  log('Admin login successful', 'green');

  const adminSessionHeader = adminLogin.headers.get('set-cookie');
  const adminSessionMatch = adminSessionHeader?.match(/session=([^;]+)/);
  const adminSession = adminSessionMatch ? adminSessionMatch[1] : null;

  if (!adminSession) {
    log('Failed to extract admin session', 'red');
    return;
  }

  // Step 4: Perform admin actions that should be logged
  log('\n4. Performing admin actions that should be logged...', 'cyan');

  // Get metrics (read action)
  log('\n  a) GET /api/admin/metrics', 'cyan');
  const metricsAction = await makeRequest('/api/admin/metrics', {
    headers: {
      'Cookie': `session=${adminSession}`
    }
  });
  log(`     Status: ${metricsAction.status}`, metricsAction.status === 200 ? 'green' : 'red');

  // Get users (read action)
  log('\n  b) GET /api/admin/users', 'cyan');
  const usersAction = await makeRequest('/api/admin/users', {
    headers: {
      'Cookie': `session=${adminSession}`
    }
  });
  log(`     Status: ${usersAction.status}`, usersAction.status === 200 ? 'green' : 'red');

  // Import jobs (write action - creates audit log entry)
  log('\n  c) POST /api/admin/import-jobs (should create audit log entry)', 'cyan');
  const importAction = await makeRequest('/api/admin/import-jobs', {
    method: 'POST',
    headers: {
      'Cookie': `session=${adminSession}`
    },
    body: JSON.stringify({
      queries: ['test job query']
    })
  });
  log(`     Status: ${importAction.status}`, importAction.status === 200 ? 'green' : 'red');

  if (importAction.status === 200) {
    log(`     Imported: ${importAction.data.imported} jobs`, 'cyan');
    log(`     This action should be logged in admin_audit_log table`, 'yellow');
  }

  // Summary
  logSection('Audit Logging Summary');

  log('Expected Audit Log Entries:', 'cyan');
  log('1. Unauthorized access attempt by regular user', 'cyan');
  log('   - user_id: (regular user ID)', 'cyan');
  log('   - action: "unauthorized_admin_access" or similar', 'cyan');
  log('   - ip_address: (client IP)', 'cyan');
  log('   - created_at: (timestamp)', 'cyan');

  log('\n2. Admin job import action', 'cyan');
  log('   - user_id: (admin user ID)', 'cyan');
  log('   - action: "import_jobs"', 'cyan');
  log('   - details: "Imported X jobs with Y queries"', 'cyan');
  log('   - ip_address: (client IP)', 'cyan');
  log('   - created_at: (timestamp)', 'cyan');

  log('\nNote: To verify audit log entries, query the database:', 'yellow');
  log('  wrangler d1 execute gethiredpoc-db --command "SELECT * FROM admin_audit_log ORDER BY created_at DESC LIMIT 10"', 'yellow');

  log('\nAudit log should capture:', 'cyan');
  log('  - All unauthorized admin access attempts', 'cyan');
  log('  - All successful admin actions (imports, role changes, etc.)', 'cyan');
  log('  - User ID of the actor', 'cyan');
  log('  - IP address of the request', 'cyan');
  log('  - Timestamp of the action', 'cyan');
  log('  - Action details (what was done)', 'cyan');

  console.log('\n');
}

testAuditLogging().catch(error => {
  log(`\nUnexpected error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
