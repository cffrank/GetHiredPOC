# E2E Tests for GetHiredPOC Frontend

This directory contains end-to-end tests for the GetHiredPOC frontend application using Playwright.

## Test Structure

- **smoke.spec.ts** - Basic smoke tests to verify the app is running
- **signup-trial.spec.ts** - Tests for the signup flow with 14-day trial
- **subscription-trial.spec.ts** - Tests for the subscription page showing trial status
- **navigation-trial.spec.ts** - Tests for navigation with trial badge
- **fixtures.ts** - Common test utilities and helper functions

## Running Tests

### Run all tests (headless)
```bash
npm run test:e2e
```

### Run tests with UI mode (recommended for development)
```bash
npm run test:e2e:ui
```

### Run tests in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### Debug tests
```bash
npm run test:e2e:debug
```

### View test report
```bash
npm run test:e2e:report
```

## Prerequisites

1. **Backend API must be running**: The tests expect the backend to be available for authentication and data operations.

2. **Environment setup**: Make sure you have:
   - Node.js installed
   - Playwright browsers installed (`npx playwright install chromium`)
   - Backend API running on the expected URL

## Test Environment

Tests run against:
- **Development**: `http://localhost:5173` (default)
- **Custom URL**: Set `PLAYWRIGHT_BASE_URL` environment variable

The dev server will automatically start when running tests (configured in `playwright.config.ts`).

## Writing New Tests

1. Import fixtures from `./fixtures.ts`
2. Use helper functions for common operations (signup, login, logout)
3. Generate random test emails using `generateTestEmail()`
4. Follow the existing test patterns

Example:
```typescript
import { test, expect, signupUser, generateTestEmail } from './fixtures';

test.describe('My Feature', () => {
  test('should do something', async ({ page }) => {
    const email = generateTestEmail();
    await signupUser(page, email, 'password123');

    // Your test logic here
    await expect(page.locator('text=Success')).toBeVisible();
  });
});
```

## CI/CD Integration

Tests are configured to:
- Run in parallel (when possible)
- Retry failed tests 2 times on CI
- Generate HTML reports
- Capture screenshots on failure
- Record videos on failure

## Debugging Failed Tests

1. **View screenshots**: Check `test-results/` directory for failure screenshots
2. **Watch video**: Video recordings are saved for failed tests
3. **View trace**: Use `npx playwright show-trace trace.zip` to debug
4. **Run in debug mode**: `npm run test:e2e:debug` for step-by-step execution

## Best Practices

- Use `data-testid` attributes for reliable selectors (when needed)
- Keep tests independent - don't rely on state from other tests
- Use `test.beforeEach` for common setup
- Generate unique test data (emails, etc.) to avoid conflicts
- Clean up test data when possible
- Use descriptive test names that explain what is being tested

## Troubleshooting

### Tests fail to connect to backend
- Ensure backend is running on `http://localhost:8787` or configured URL
- Check CORS settings if testing against production backend

### Browser not found
- Run `npx playwright install chromium` to install browsers

### Tests timeout
- Increase timeout in `playwright.config.ts` if needed
- Check if dev server is starting properly
- Look for console errors in the browser

### Flaky tests
- Add explicit waits for dynamic content
- Use `waitForURL`, `waitForLoadState`, etc.
- Avoid using fixed timeouts - prefer waiting for conditions
