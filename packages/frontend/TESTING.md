# Testing Guide for GetHiredPOC Frontend

## Playwright E2E Testing

This project uses Playwright for end-to-end testing of the frontend application.

### Quick Start

```bash
# Run UI-only tests (no backend required) - RECOMMENDED for quick checks
npm run test:e2e:ui-only

# Run all tests (requires backend API running)
npm run test:e2e

# Run tests with interactive UI (recommended)
npm run test:e2e:ui

# Run tests in headed mode (see the browser)
npm run test:e2e:headed

# Debug a specific test
npm run test:e2e:debug

# View last test report
npm run test:e2e:report
```

**⚠️ Important**: Most tests require the backend API to be running. See [Prerequisites](#prerequisites) below.

### Test Coverage

The test suite includes 23 tests across 4 test files:

#### 1. Smoke Tests (`smoke.spec.ts`)
- Basic app functionality
- Navigation between pages
- Responsive design
- Links to legal pages (ToS, Privacy Policy)

#### 2. Signup with Trial Tests (`signup-trial.spec.ts`)
- 14-day trial banner display
- ToS and Privacy Policy checkboxes
- Form validation
- Successful trial signup
- Trial badge display after signup

#### 3. Subscription Page Tests (`subscription-trial.spec.ts`)
- PRO Trial badge display
- Trial expiration information
- Days remaining counter
- Upgrade options for trial users
- Unlimited usage indicators

#### 4. Navigation Tests (`navigation-trial.spec.ts`)
- Trial badge in navigation bar
- "Keep PRO Access" button
- Badge consistency across pages
- User email with badge display

### Prerequisites

#### For UI-Only Tests (Smoke Tests)

No special requirements - just run:
```bash
npm run test:e2e:ui-only
```

#### For Full Integration Tests

1. **Install Playwright browsers** (first time only):
   ```bash
   npx playwright install chromium
   ```

2. **Start the backend API**:
   ```bash
   cd ../backend
   npm run dev
   # Backend should be running on http://localhost:8787
   ```

3. **Run database migrations** (first time only):
   ```bash
   # Apply the trial migration
   npx wrangler d1 execute DB --local --file=migrations/0018_add_trial_fields.sql
   ```

4. **Then run tests**:
   ```bash
   cd ../frontend
   npm run test:e2e
   ```

**Note**: 13 out of 23 tests require a running backend API. These tests verify:
- User signup with trial creation
- Authentication flows
- Trial badge display in navigation
- Subscription page with trial status
- Trial expiration and upgrade prompts

### Test Architecture

```
e2e/
├── fixtures.ts              # Common test utilities and helpers
├── smoke.spec.ts            # Basic smoke tests
├── signup-trial.spec.ts     # Trial signup flow tests
├── subscription-trial.spec.ts  # Trial subscription page tests
├── navigation-trial.spec.ts # Trial navigation badge tests
└── README.md                # Detailed testing documentation
```

### Writing Tests

Use the provided fixtures and helpers:

```typescript
import { test, expect, signupUser, generateTestEmail } from './fixtures';

test('my test', async ({ page }) => {
  const email = generateTestEmail();
  await signupUser(page, email, 'password123');

  await expect(page.locator('text=Welcome')).toBeVisible();
});
```

### Available Helper Functions

- `signupUser(page, email, password)` - Sign up a new user
- `loginUser(page, email, password)` - Log in an existing user
- `logoutUser(page)` - Log out the current user
- `generateTestEmail()` - Generate a unique test email

### Configuration

Playwright configuration is in `playwright.config.ts`:

- **Test directory**: `./e2e`
- **Base URL**: `http://localhost:5173` (auto-starts dev server)
- **Browser**: Chromium (Chrome/Edge)
- **Retry**: 2 times on CI, 0 times locally
- **Timeout**: Default 30s per test
- **Reports**: HTML report generated after test run

### CI/CD Integration

Tests are configured for CI/CD with:
- Automatic dev server startup
- Screenshot capture on failure
- Video recording on failure
- HTML reports for debugging
- Parallel execution where possible

### Troubleshooting

**Tests won't start:**
```bash
# Install browsers
npx playwright install chromium

# Check if dev server can start
npm run dev
```

**Tests fail with timeout:**
- Ensure backend API is running
- Check network connectivity
- Increase timeout in `playwright.config.ts` if needed

**Tests are flaky:**
- Use `page.waitForLoadState()` for dynamic content
- Use `waitForURL()` instead of hardcoded delays
- Add explicit waits for AJAX calls

**Need to debug a test:**
```bash
# Run in debug mode with Playwright Inspector
npm run test:e2e:debug

# Run specific test file
npx playwright test signup-trial.spec.ts --debug
```

### Best Practices

1. **Keep tests independent** - Each test should work in isolation
2. **Use unique test data** - Generate random emails to avoid conflicts
3. **Wait for conditions** - Use `waitFor*` methods instead of `setTimeout`
4. **Descriptive names** - Test names should clearly describe what's being tested
5. **Clean up data** - Remove test data when possible (or use unique identifiers)
6. **Use data-testid** - Add `data-testid` attributes for reliable element selection

### Example Test

```typescript
import { test, expect, generateTestEmail } from './fixtures';

test.describe('Feature Name', () => {
  test('should do something specific', async ({ page }) => {
    // Arrange
    const email = generateTestEmail();
    await page.goto('/signup');

    // Act
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Assert
    await expect(page.locator('text=Success')).toBeVisible();
  });
});
```

### Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Tests](https://playwright.dev/docs/debug)
- [CI/CD Integration](https://playwright.dev/docs/ci)

### Getting Help

For questions about testing:
1. Check the [e2e/README.md](./e2e/README.md) for detailed information
2. Review existing tests for patterns
3. Consult the Playwright documentation
4. Ask in team channels
