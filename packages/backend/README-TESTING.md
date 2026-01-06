# Security Testing Guide

This guide explains how to run security tests for the GetHiredPOC backend API.

## Quick Start

```bash
cd /home/carl/project/gethiredpoc/packages/backend

# Run full security test suite (automated)
node test-phase1-security.js

# Test admin access (requires credentials)
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=yourpassword node test-admin-access.js

# Test audit logging
node test-audit-logging.js
```

## Test Scripts

### 1. test-phase1-security.js

**Purpose:** Comprehensive automated security testing

**Tests Performed:**
- ✅ Unauthenticated access to admin routes (401 expected)
- ✅ Regular user access to admin routes (403 expected)
- ✅ Security headers and CORS configuration
- ⚠️ Admin user access (requires manual setup)
- ⚠️ Metrics endpoint structure (requires admin session)

**Usage:**
```bash
node test-phase1-security.js
```

**Expected Output:**
```
Total Tests: 12
Passed: 10
Failed: 0
Skipped: 2
Pass Rate: 100.0%
```

### 2. test-admin-access.js

**Purpose:** Verify admin access with provided credentials

**Tests Performed:**
- ✅ Admin login
- ✅ GET /api/admin/metrics with admin session
- ✅ GET /api/admin/users with admin session
- ✅ Metrics data structure validation

**Usage:**
```bash
# Set environment variables
export ADMIN_EMAIL="admin@example.com"
export ADMIN_PASSWORD="YourSecurePassword123!"

# Run test
node test-admin-access.js

# Or inline:
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=YourPassword node test-admin-access.js
```

**Expected Output:**
```
SUCCESS: All admin endpoints are accessible and working correctly!
Phase 1 security implementation is functioning as expected.
```

### 3. test-audit-logging.js

**Purpose:** Verify audit logging functionality

**Tests Performed:**
- ✅ Creates regular user
- ✅ Attempts unauthorized admin access (should be logged)
- ✅ Performs admin actions (should be logged)
- ✅ Verifies audit log structure

**Usage:**
```bash
node test-audit-logging.js
```

## Database Queries

### Check Audit Log Entries

```bash
# Query recent audit log entries (production)
wrangler d1 execute gethiredpoc-db --remote --command "SELECT * FROM admin_audit_log ORDER BY created_at DESC LIMIT 10"

# Query all tables
wrangler d1 execute gethiredpoc-db --remote --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"

# Check admin_audit_log schema
wrangler d1 execute gethiredpoc-db --remote --command "PRAGMA table_info(admin_audit_log)"
```

### Audit Log Schema

```sql
CREATE TABLE admin_audit_log (
  id TEXT PRIMARY KEY DEFAULT lower(hex(randomblob(16))),
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  ip_address TEXT,
  created_at INTEGER DEFAULT unixepoch()
);
```

## Admin Configuration

### Setting Up Admin Users

Admin access is granted via the `ADMIN_EMAILS` environment variable in `wrangler.toml`:

```toml
[vars]
ADMIN_EMAILS = "admin@example.com,another-admin@example.com"
```

**To add admin emails:**

1. Edit `wrangler.toml` and add email to `ADMIN_EMAILS` variable
2. Deploy changes:
   ```bash
   wrangler deploy
   ```

**Or using secrets (production recommended):**

```bash
wrangler secret put ADMIN_EMAILS
# When prompted, enter: admin@example.com,another@example.com
```

### Creating Admin Account

```bash
# Option 1: Use the signup endpoint
curl -X POST https://gethiredpoc-api.carl-f-frank.workers.dev/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"YourSecurePassword"}'

# Option 2: Use test script
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=YourPassword node test-admin-access.js
```

## Test Coverage

### ✅ Tested Security Features

1. **Authentication Protection**
   - Admin routes require valid session
   - Unauthenticated requests return 401

2. **Authorization (RBAC)**
   - Admin routes check ADMIN_EMAILS
   - Non-admin users return 403

3. **Audit Logging**
   - Admin actions are logged
   - Logs include user_id, action, details, ip_address, timestamp

4. **Metrics Endpoint**
   - Returns totalUsers, activeTrials, paidMembers, etc.
   - Data types are correct (numbers)

5. **CORS Configuration**
   - Allow-Origin header set
   - Allow-Credentials: true
   - OPTIONS preflight handled

6. **Session Management**
   - Sessions stored in KV with TTL
   - HttpOnly cookies
   - Secure flag in production

## Troubleshooting

### Test Fails with "Failed to create user"

**Cause:** Email already exists in database

**Solution:**
```bash
# The test script automatically generates unique emails with timestamps
# If issue persists, check database for duplicate emails
wrangler d1 execute gethiredpoc-db --remote --command "SELECT email FROM users WHERE email LIKE '%test%'"
```

### Admin Access Returns 403

**Cause:** Email not in ADMIN_EMAILS list

**Solution:**
1. Check `wrangler.toml` ADMIN_EMAILS variable
2. Ensure email matches exactly (case-insensitive)
3. Redeploy if changed:
   ```bash
   wrangler deploy
   ```

### Audit Log Query Returns Empty

**Cause:** No admin actions performed yet

**Solution:**
1. Run admin access test to generate logs:
   ```bash
   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=password node test-admin-access.js
   ```

2. Query again:
   ```bash
   wrangler d1 execute gethiredpoc-db --remote --command "SELECT * FROM admin_audit_log ORDER BY created_at DESC LIMIT 10"
   ```

### CORS Errors in Browser

**Cause:** Incorrect CORS headers or cookie settings

**Solution:**
1. Check CORS middleware in `src/index.ts`
2. Verify `Access-Control-Allow-Credentials: true`
3. Ensure frontend sends credentials:
   ```javascript
   fetch(url, { credentials: 'include' })
   ```

## Security Best Practices

### Running Tests

1. **Never commit credentials** - Use environment variables
2. **Use unique test accounts** - Don't test with production admin accounts
3. **Clean up test data** - Remove test users after testing
4. **Review audit logs** - Check for suspicious activity

### Production Testing

1. **Test in staging first** - Verify changes before production
2. **Monitor audit logs** - Check for failed access attempts
3. **Rotate admin passwords** - Change passwords regularly
4. **Limit admin emails** - Only add necessary admin accounts

## Continuous Integration

### GitHub Actions Example

```yaml
name: Security Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install

      - name: Run security tests
        run: node test-phase1-security.js

      - name: Test admin access
        env:
          ADMIN_EMAIL: ${{ secrets.TEST_ADMIN_EMAIL }}
          ADMIN_PASSWORD: ${{ secrets.TEST_ADMIN_PASSWORD }}
        run: node test-admin-access.js
```

## Test Maintenance

### Updating Tests

When adding new admin endpoints:

1. Add test case to `test-phase1-security.js`
2. Update expected audit log actions
3. Re-run full test suite
4. Update this documentation

### Test Data Cleanup

```bash
# Remove test users (if needed)
wrangler d1 execute gethiredpoc-db --remote --command "DELETE FROM users WHERE email LIKE '%test%'"

# Caution: This is destructive. Use with care.
```

## Support

For issues with tests:
1. Check test output for specific errors
2. Verify database schema matches expected
3. Check Cloudflare Workers logs:
   ```bash
   wrangler tail
   ```
4. Review audit logs for unauthorized access attempts

## Next Steps

After verifying Phase 1 security:
1. ✅ All tests pass
2. ✅ Admin access configured
3. ✅ Audit logging verified
4. → Proceed to Phase 2 implementation

---

**Last Updated:** 2026-01-05
**Test Coverage:** Phase 1 Security Implementation
**Production API:** https://gethiredpoc-api.carl-f-frank.workers.dev
