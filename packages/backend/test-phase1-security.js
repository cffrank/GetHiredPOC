#!/usr/bin/env node

/**
 * Phase 1 Security Testing Script
 * Tests admin route protection, authentication, and audit logging
 *
 * Production API: https://gethiredpoc-api.carl-f-frank.workers.dev
 */

const API_BASE_URL = 'https://gethiredpoc-api.carl-f-frank.workers.dev';

// Color codes for terminal output
const COLORS = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

class TestRunner {
  constructor() {
    this.testResults = [];
    this.regularUserSession = null;
    this.regularUserEmail = null;
    this.adminUserSession = null;
    this.adminUserEmail = null;
  }

  log(message, color = 'reset') {
    console.log(`${COLORS[color]}${message}${COLORS.reset}`);
  }

  logSection(title) {
    console.log('\n' + '='.repeat(80));
    this.log(title, 'bold');
    console.log('='.repeat(80) + '\n');
  }

  addResult(testName, passed, details, expected, actual) {
    this.testResults.push({
      testName,
      passed,
      details,
      expected,
      actual
    });

    const status = passed ? 'PASS' : 'FAIL';
    const color = passed ? 'green' : 'red';
    this.log(`  ${status}: ${testName}`, color);
    if (details) {
      this.log(`      ${details}`, 'cyan');
    }
    if (!passed) {
      this.log(`      Expected: ${expected}`, 'yellow');
      this.log(`      Actual: ${actual}`, 'yellow');
    }
  }

  async makeRequest(endpoint, options = {}) {
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

  // Test 1: Admin routes without authentication
  async testUnauthenticatedAccess() {
    this.logSection('Test 1: Admin Route Protection - Unauthenticated Access');

    // Test GET /api/admin/metrics without auth
    const metricsResponse = await this.makeRequest('/api/admin/metrics');
    this.addResult(
      'GET /api/admin/metrics without auth',
      metricsResponse.status === 401,
      `Received status ${metricsResponse.status}`,
      '401 Unauthorized',
      metricsResponse.status.toString()
    );

    // Test GET /api/admin/users without auth
    const usersResponse = await this.makeRequest('/api/admin/users');
    this.addResult(
      'GET /api/admin/users without auth',
      usersResponse.status === 401,
      `Received status ${usersResponse.status}`,
      '401 Unauthorized',
      usersResponse.status.toString()
    );

    // Verify error messages are appropriate
    if (metricsResponse.data && metricsResponse.data.error) {
      this.addResult(
        'Metrics endpoint returns proper error message',
        metricsResponse.data.error.toLowerCase().includes('auth'),
        `Error message: "${metricsResponse.data.error}"`,
        'Message containing "auth"',
        metricsResponse.data.error
      );
    }
  }

  // Create a test user account
  async createTestUser(isAdmin = false) {
    const timestamp = Date.now();
    const email = isAdmin
      ? `admin-test-${timestamp}@example.com`
      : `user-test-${timestamp}@example.com`;
    const password = 'TestPassword123!';

    const response = await this.makeRequest('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (response.status === 200 || response.status === 201) {
      const setCookieHeader = response.headers.get('set-cookie');
      let sessionId = null;

      if (setCookieHeader) {
        const match = setCookieHeader.match(/session=([^;]+)/);
        if (match) {
          sessionId = match[1];
        }
      }

      return { email, password, sessionId, user: response.data.user };
    }

    return null;
  }

  // Login with existing user
  async loginUser(email, password) {
    const response = await this.makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (response.status === 200) {
      const setCookieHeader = response.headers.get('set-cookie');
      let sessionId = null;

      if (setCookieHeader) {
        const match = setCookieHeader.match(/session=([^;]+)/);
        if (match) {
          sessionId = match[1];
        }
      }

      return { sessionId, user: response.data.user };
    }

    return null;
  }

  // Test 2: Admin routes with regular user session
  async testRegularUserAccess() {
    this.logSection('Test 2: Admin Route Protection - Regular User Access');

    // Create regular user account
    this.log('Creating test user account...', 'cyan');
    const userAccount = await this.createTestUser(false);

    if (!userAccount) {
      this.addResult(
        'Create regular user account',
        false,
        'Failed to create test user',
        'Successfully create user',
        'User creation failed'
      );
      return;
    }

    this.regularUserEmail = userAccount.email;
    this.regularUserSession = userAccount.sessionId;

    this.addResult(
      'Create regular user account',
      true,
      `Created user: ${userAccount.email}`,
      'User created with session',
      'Success'
    );

    // Test GET /api/admin/metrics with regular user session
    const metricsResponse = await this.makeRequest('/api/admin/metrics', {
      headers: {
        'Cookie': `session=${this.regularUserSession}`
      }
    });

    this.addResult(
      'GET /api/admin/metrics with regular user session',
      metricsResponse.status === 403,
      `Received status ${metricsResponse.status}`,
      '403 Forbidden',
      metricsResponse.status.toString()
    );

    // Test GET /api/admin/users with regular user session
    const usersResponse = await this.makeRequest('/api/admin/users', {
      headers: {
        'Cookie': `session=${this.regularUserSession}`
      }
    });

    this.addResult(
      'GET /api/admin/users with regular user session',
      usersResponse.status === 403,
      `Received status ${usersResponse.status}`,
      '403 Forbidden',
      usersResponse.status.toString()
    );

    // Verify error messages indicate forbidden access
    if (metricsResponse.data && metricsResponse.data.error) {
      this.addResult(
        'Regular user receives "Admin access required" message',
        metricsResponse.data.error.toLowerCase().includes('admin'),
        `Error message: "${metricsResponse.data.error}"`,
        'Message containing "admin"',
        metricsResponse.data.error
      );
    }
  }

  // Test 3: Admin routes with admin user session
  async testAdminUserAccess() {
    this.logSection('Test 3: Admin Route Access - Admin User');

    this.log('NOTE: Admin user must be created manually with email matching ADMIN_EMAILS environment variable', 'yellow');
    this.log('Please enter admin credentials to test admin access:', 'cyan');

    // For automated testing, we'll skip interactive input
    // In a real scenario, you would either:
    // 1. Use environment variables for admin credentials
    // 2. Prompt for admin credentials interactively
    // 3. Have a pre-configured admin account

    this.log('Skipping admin user tests - requires manual admin account setup', 'yellow');
    this.addResult(
      'Admin user authentication',
      null,
      'Skipped - requires manual admin account configuration',
      'Admin session created',
      'Test skipped'
    );

    return;

    // Uncomment below if admin credentials are available:
    /*
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPassword123!';

    const adminLogin = await this.loginUser(adminEmail, adminPassword);

    if (!adminLogin) {
      this.addResult(
        'Login as admin user',
        false,
        'Failed to login with admin credentials',
        'Successfully login as admin',
        'Login failed'
      );
      return;
    }

    this.adminUserEmail = adminEmail;
    this.adminUserSession = adminLogin.sessionId;

    this.addResult(
      'Login as admin user',
      true,
      `Logged in as: ${adminEmail}`,
      'Admin session created',
      'Success'
    );

    // Test GET /api/admin/metrics with admin session
    const metricsResponse = await this.makeRequest('/api/admin/metrics', {
      headers: {
        'Cookie': `session=${this.adminUserSession}`
      }
    });

    this.addResult(
      'GET /api/admin/metrics with admin session',
      metricsResponse.status === 200,
      `Received status ${metricsResponse.status}`,
      '200 OK',
      metricsResponse.status.toString()
    );

    // Test GET /api/admin/users with admin session
    const usersResponse = await this.makeRequest('/api/admin/users', {
      headers: {
        'Cookie': `session=${this.adminUserSession}`
      }
    });

    this.addResult(
      'GET /api/admin/users with admin session',
      usersResponse.status === 200,
      `Received status ${usersResponse.status}`,
      '200 OK',
      usersResponse.status.toString()
    );
    */
  }

  // Test 4: Metrics endpoint functionality
  async testMetricsEndpointStructure() {
    this.logSection('Test 4: Metrics Endpoint Functionality');

    this.log('NOTE: This test requires an admin session to verify data structure', 'yellow');
    this.log('Skipping metrics structure validation - requires admin access', 'yellow');

    this.addResult(
      'Verify metrics data structure',
      null,
      'Skipped - requires admin session',
      'Valid metrics structure with totalUsers, activeTrials, paidMembers, etc.',
      'Test skipped'
    );

    // Uncomment below if admin session is available:
    /*
    if (!this.adminUserSession) {
      this.log('No admin session available for metrics structure test', 'yellow');
      return;
    }

    const response = await this.makeRequest('/api/admin/metrics', {
      headers: {
        'Cookie': `session=${this.adminUserSession}`
      }
    });

    if (response.status !== 200) {
      this.addResult(
        'Fetch metrics with admin session',
        false,
        `Failed to fetch metrics: ${response.status}`,
        '200 OK',
        response.status.toString()
      );
      return;
    }

    const expectedFields = [
      'totalUsers',
      'activeTrials',
      'paidMembers',
      'totalJobs',
      'jobsThisWeek',
      'aiRequests24h'
    ];

    const metrics = response.data;

    for (const field of expectedFields) {
      const hasField = metrics.hasOwnProperty(field);
      const isNumber = typeof metrics[field] === 'number';

      this.addResult(
        `Metrics contains "${field}" field`,
        hasField && isNumber,
        hasField ? `${field}: ${metrics[field]}` : 'Field missing',
        `Number value for ${field}`,
        hasField ? `${typeof metrics[field]}: ${metrics[field]}` : 'undefined'
      );
    }
    */
  }

  // Test 5: Verify security headers and CORS
  async testSecurityHeaders() {
    this.logSection('Test 5: Security Headers and CORS Configuration');

    const response = await this.makeRequest('/api/health');

    // Check CORS headers
    const corsOrigin = response.headers?.get('access-control-allow-origin');
    const corsCredentials = response.headers?.get('access-control-allow-credentials');
    const corsMethods = response.headers?.get('access-control-allow-methods');

    this.addResult(
      'CORS Access-Control-Allow-Origin header present',
      !!corsOrigin,
      `Origin: ${corsOrigin || 'Not set'}`,
      'Header present',
      corsOrigin ? 'Present' : 'Missing'
    );

    this.addResult(
      'CORS credentials enabled',
      corsCredentials === 'true',
      `Credentials: ${corsCredentials || 'Not set'}`,
      'true',
      corsCredentials || 'Not set'
    );

    // Test OPTIONS preflight request
    const preflightResponse = await this.makeRequest('/api/admin/metrics', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://example.com',
        'Access-Control-Request-Method': 'GET'
      }
    });

    this.addResult(
      'OPTIONS preflight request handled',
      preflightResponse.status === 204,
      `Preflight status: ${preflightResponse.status}`,
      '204 No Content',
      preflightResponse.status.toString()
    );
  }

  // Generate final report
  generateReport() {
    this.logSection('Test Summary Report');

    const passed = this.testResults.filter(r => r.passed === true).length;
    const failed = this.testResults.filter(r => r.passed === false).length;
    const skipped = this.testResults.filter(r => r.passed === null).length;
    const total = this.testResults.length;

    console.log(`Total Tests: ${total}`);
    this.log(`Passed: ${passed}`, 'green');
    this.log(`Failed: ${failed}`, 'red');
    this.log(`Skipped: ${skipped}`, 'yellow');

    const passRate = total > 0 ? ((passed / (total - skipped)) * 100).toFixed(1) : 0;
    console.log(`Pass Rate: ${passRate}%\n`);

    if (failed > 0) {
      this.logSection('Failed Tests Details');
      this.testResults
        .filter(r => r.passed === false)
        .forEach(result => {
          this.log(`\nTest: ${result.testName}`, 'red');
          this.log(`  Expected: ${result.expected}`, 'yellow');
          this.log(`  Actual: ${result.actual}`, 'yellow');
          if (result.details) {
            this.log(`  Details: ${result.details}`, 'cyan');
          }
        });
    }

    if (skipped > 0) {
      this.logSection('Skipped Tests');
      this.testResults
        .filter(r => r.passed === null)
        .forEach(result => {
          this.log(`\n  ${result.testName}`, 'yellow');
          this.log(`    ${result.details}`, 'cyan');
        });
    }

    this.logSection('Recommendations');

    if (failed === 0 && skipped === 0) {
      this.log('All security tests passed! Phase 1 implementation is working correctly.', 'green');
    } else {
      if (failed > 0) {
        this.log('CRITICAL: Some security tests failed. Review the failed tests above.', 'red');
      }

      if (skipped > 0) {
        this.log('\nTo complete testing:', 'yellow');
        this.log('1. Configure an admin user account with email matching ADMIN_EMAILS environment variable', 'cyan');
        this.log('2. Set environment variables ADMIN_EMAIL and ADMIN_PASSWORD for automated testing', 'cyan');
        this.log('3. Re-run this test script with admin credentials to verify admin access', 'cyan');
      }
    }

    console.log('\n');
  }

  async run() {
    this.log('Phase 1 Security Testing - GetHiredPOC API', 'bold');
    this.log(`API Base URL: ${API_BASE_URL}\n`, 'cyan');

    try {
      await this.testUnauthenticatedAccess();
      await this.testRegularUserAccess();
      await this.testAdminUserAccess();
      await this.testMetricsEndpointStructure();
      await this.testSecurityHeaders();
    } catch (error) {
      this.log(`\nUnexpected error during testing: ${error.message}`, 'red');
      console.error(error);
    }

    this.generateReport();
  }
}

// Run tests
const runner = new TestRunner();
runner.run().catch(console.error);
