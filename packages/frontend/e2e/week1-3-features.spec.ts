import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Week 1-3: AI-First Platform Refactor
 *
 * Tests cover:
 * - Profile with tabs
 * - Interview Questions CRUD
 * - Advanced Job Search
 * - Fixed Chat Sidebar
 * - Job Details with tabs
 * - Version management for AI-generated content
 */

const BASE_URL = process.env.VITE_API_URL || 'http://localhost:5173';
const TEST_USER_EMAIL = `test-week3-${Date.now()}-${Math.floor(Math.random() * 1000)}@example.com`;
const TEST_USER_PASSWORD = 'TestPassword123!';

test.describe.serial('Week 1-3: Profile & Settings Refactor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('should signup with new required fields (first name, last name, phone, address)', async ({ page }) => {
    // Navigate to signup
    await page.click('text=Sign Up');
    await expect(page).toHaveURL(/.*signup/);

    // Fill in all required fields
    await page.fill('input[id="email"]', TEST_USER_EMAIL);
    await page.fill('input[id="password"]', TEST_USER_PASSWORD);
    await page.fill('input[id="firstName"]', 'John');
    await page.fill('input[id="lastName"]', 'Doe');
    await page.fill('input[id="phone"]', '5551234567');
    await page.fill('input[id="streetAddress"]', '123 Test St');
    await page.fill('input[id="city"]', 'San Francisco');
    await page.selectOption('select[id="state"]', 'CA');
    await page.fill('input[id="zipCode"]', '94102');

    // Check Terms of Service and Privacy Policy checkboxes
    await page.check('input[id="accept-tos"]');
    await page.check('input[id="accept-privacy"]');

    // Submit form
    await page.click('button:has-text("Start Free Trial")');

    // Should redirect to profile or jobs page after signup
    await expect(page).toHaveURL(/.*(jobs|profile)/, { timeout: 10000 });
  });

  test('should show Profile with 6 tabs', async ({ page }) => {
    // Login first
    await loginTestUser(page);

    // Navigate to Profile - click on user email/button to reveal profile link
    await page.click('text=test-week3');  // Click on email in nav
    await page.waitForTimeout(500);  // Wait for dropdown
    await page.goto(`${BASE_URL}/profile`);  // Navigate directly to profile
    await expect(page).toHaveURL(/.*profile/);

    // Check all 6 tabs are visible
    await expect(page.locator('text=Profile Info')).toBeVisible();
    await expect(page.locator('text=Experience')).toBeVisible();
    await expect(page.locator('text=Education')).toBeVisible();
    await expect(page.locator('text=Resume')).toBeVisible();
    await expect(page.locator('text=Interview Prep')).toBeVisible();
    await expect(page.locator('text=Settings')).toBeVisible();
  });

  test('should verify Resume and Settings removed from Navigation', async ({ page }) => {
    await loginTestUser(page);

    // Check navigation bar
    const nav = page.locator('nav');
    await expect(nav.locator('text=Resume')).not.toBeVisible();
    await expect(nav.locator('text=Settings')).not.toBeVisible();

    // But Jobs, Saved, Applications should still be there
    await expect(nav.locator('text=Jobs')).toBeVisible();
    await expect(nav.locator('text=Saved')).toBeVisible();
    await expect(nav.locator('text=Applications')).toBeVisible();
  });
});

test.describe.serial('Week 1-2: Interview Questions Feature', () => {
  test('should create and delete interview question', async ({ page }) => {
    await loginTestUser(page);
    await page.goto(`${BASE_URL}/profile`);

    // Click on Interview Prep tab
    await page.click('text=Interview Prep');

    // Click Add Question button
    await page.click('text=Add Question');

    // Fill in question form
    await page.fill('textarea[id="question"]', 'Tell me about a time when you overcame a challenge');
    await page.fill('textarea[id="answer"]', 'At my previous job, I faced a difficult technical problem...');
    await page.check('input[type="checkbox"][id="isBehavioral"]');
    await page.selectOption('select[id="difficulty"]', 'medium');

    // Submit
    await page.click('button[type="submit"]:has-text("Save")');

    // Verify question appears
    await expect(page.locator('text=Tell me about a time when you overcame a challenge')).toBeVisible({ timeout: 5000 });

    // Delete the question
    await page.click('button[aria-label="Delete question"]');

    // Confirm deletion
    await page.click('button:has-text("Delete")');

    // Verify question is gone
    await expect(page.locator('text=Tell me about a time when you overcame a challenge')).not.toBeVisible({ timeout: 5000 });
  });

  test('should filter interview questions by type', async ({ page }) => {
    await loginTestUser(page);
    await page.goto(`${BASE_URL}/profile`);
    await page.click('text=Interview Prep');

    // Add behavioral question
    await page.click('text=Add Question');
    await page.fill('textarea[id="question"]', 'Behavioral test question');
    await page.check('input[type="checkbox"][id="isBehavioral"]');
    await page.click('button[type="submit"]:has-text("Save")');

    // Add technical question
    await page.click('text=Add Question');
    await page.fill('textarea[id="question"]', 'Technical test question');
    await page.click('button[type="submit"]:has-text("Save")');

    // Filter by behavioral
    await page.click('text=Behavioral');
    await expect(page.locator('text=Behavioral test question')).toBeVisible();
    await expect(page.locator('text=Technical test question')).not.toBeVisible();

    // Filter by technical
    await page.click('text=Technical');
    await expect(page.locator('text=Technical test question')).toBeVisible();
    await expect(page.locator('text=Behavioral test question')).not.toBeVisible();
  });
});

test.describe.serial('Week 2-3: Fixed Chat Sidebar', () => {
  test('should show fixed chat sidebar on right side', async ({ page }) => {
    await loginTestUser(page);
    await page.goto(`${BASE_URL}/jobs`);

    // Check chat sidebar is visible
    const chatSidebar = page.locator('div.fixed.right-0');
    await expect(chatSidebar).toBeVisible();

    // Should stay visible when scrolling
    await page.evaluate(() => window.scrollBy(0, 500));
    await expect(chatSidebar).toBeVisible();
  });

  test('should toggle chat sidebar', async ({ page }) => {
    await loginTestUser(page);
    await page.goto(`${BASE_URL}/jobs`);

    // Find minimize button
    const minimizeBtn = page.locator('button[aria-label="Minimize chat"]');
    await expect(minimizeBtn).toBeVisible();

    // Click to minimize
    await minimizeBtn.click();

    // Should show collapsed state with icon
    const openBtn = page.locator('button[aria-label="Open chat"]');
    await expect(openBtn).toBeVisible({ timeout: 2000 });

    // Click to expand again
    await openBtn.click();
    await expect(minimizeBtn).toBeVisible({ timeout: 2000 });
  });
});

test.describe.serial('Week 3: Advanced Job Search', () => {
  test('should show advanced filters by default', async ({ page }) => {
    await loginTestUser(page);
    await page.goto(`${BASE_URL}/jobs`);

    // Advanced filters should be visible by default
    await expect(page.locator('text=Keywords')).toBeVisible();
    await expect(page.locator('text=Locations')).toBeVisible();
    await expect(page.locator('text=Salary Range')).toBeVisible();
    await expect(page.locator('text=Experience Level')).toBeVisible();
  });

  test('should perform advanced search with multiple criteria', async ({ page }) => {
    await loginTestUser(page);
    await page.goto(`${BASE_URL}/jobs`);

    // Add keyword
    await page.fill('input[placeholder*="keyword"]', 'React');
    await page.click('button:has-text("Add")');

    // Add location
    await page.fill('input[placeholder*="location"]', 'San Francisco');
    await page.click('button:near(input[placeholder*="location"]):has-text("Add")');

    // Set salary range
    await page.fill('input[placeholder*="Min salary"]', '100000');
    await page.fill('input[placeholder*="Max salary"]', '150000');

    // Select experience level
    await page.check('input[type="checkbox"][value="senior"]');

    // Click search
    await page.click('button:has-text("Search")');

    // Should show results
    await expect(page.locator('text=matching jobs').or(page.locator('text=found'))).toBeVisible({ timeout: 10000 });
  });
});

test.describe.serial('Week 3: Job Details with Tabs', () => {
  test('should show job details without tabs initially', async ({ page }) => {
    await loginTestUser(page);
    await page.goto(`${BASE_URL}/jobs`);

    // Click on first job
    await page.click('button:has-text("View Details")').first();

    // Should show job description
    await expect(page.locator('text=Job Description').or(page.locator('h1'))).toBeVisible();

    // Tabs should NOT be visible initially (no content generated)
    const tabsList = page.locator('[role="tablist"]');
    await expect(tabsList).not.toBeVisible();
  });

  test('should generate AI analysis and show Analysis tab', async ({ page }) => {
    await loginTestUser(page);
    await page.goto(`${BASE_URL}/jobs`);

    // Click on first job
    await page.click('button:has-text("View Details")').first();

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Click "Get AI Match Analysis" button
    const analyzeBtn = page.locator('button:has-text("Get AI Match Analysis")');
    if (await analyzeBtn.isVisible()) {
      await analyzeBtn.click();

      // Wait for analysis to complete
      await expect(page.locator('text=AI Match Analysis').or(page.locator('text=Match Score'))).toBeVisible({ timeout: 30000 });

      // Tab should now appear
      await expect(page.locator('[role="tablist"]')).toBeVisible();
      await expect(page.locator('[role="tab"]:has-text("Analysis")')).toBeVisible();
    }
  });

  test('should restrict resume generation to saved jobs only', async ({ page }) => {
    await loginTestUser(page);
    await page.goto(`${BASE_URL}/jobs`);

    // Click on first job
    await page.click('button:has-text("View Details")').first();
    await page.waitForLoadState('networkidle');

    // Resume/Cover Letter buttons should be disabled if not saved
    const resumeBtn = page.locator('button:has-text("Generate Tailored Resume")');
    if (await resumeBtn.isVisible()) {
      const isDisabled = await resumeBtn.isDisabled();

      // If disabled, save the job first
      if (isDisabled) {
        await page.click('button:has-text("Save Job")');
        await page.waitForTimeout(1000);

        // Now button should be enabled
        await expect(resumeBtn).toBeEnabled({ timeout: 5000 });
      }
    }
  });
});

test.describe.serial('Week 3: Version Management for Generated Content', () => {
  test('should create multiple resume versions', async ({ page }) => {
    await loginTestUser(page);
    await page.goto(`${BASE_URL}/jobs`);

    // Get to a saved job with AI features
    await page.click('text=Saved');
    await page.waitForLoadState('networkidle');

    if (await page.locator('text=No saved jobs').isVisible()) {
      test.skip();
      return;
    }

    // Click on first saved job
    await page.click('button:has-text("View Details")').first();
    await page.waitForLoadState('networkidle');

    // Generate first resume
    const resumeBtn = page.locator('button:has-text("Generate Tailored Resume")');
    if (await resumeBtn.isVisible() && await resumeBtn.isEnabled()) {
      await resumeBtn.click();

      // Wait for generation
      await expect(page.locator('text=Version 1').or(page.locator('[role="tab"]:has-text("Resume")'))).toBeVisible({ timeout: 30000 });

      // Generate second version
      if (await resumeBtn.isVisible()) {
        await resumeBtn.click();
        await expect(page.locator('text=Version 2')).toBeVisible({ timeout: 30000 });

        // Version dropdown should appear
        await expect(page.locator('select').filter({ hasText: 'Version' })).toBeVisible();
      }
    }
  });
});

// Helper function to login
async function loginTestUser(page) {
  await page.goto(BASE_URL);

  // Check if already logged in
  if (await page.locator('text=Logout').isVisible()) {
    return;
  }

  // Login
  await page.click('text=Login');
  await page.fill('input[id="email"]', TEST_USER_EMAIL);
  await page.fill('input[id="password"]', TEST_USER_PASSWORD);
  await page.click('button[type="submit"]');

  // Wait for login to complete - can land on jobs, profile, onboarding, or preferences
  await expect(page).toHaveURL(/.*(jobs|profile|onboarding|preferences)/, { timeout: 10000 });

  // If landed on onboarding or preferences, navigate to jobs
  if (page.url().includes('/onboarding') || page.url().includes('/preferences')) {
    await page.goto(`${BASE_URL}/jobs`);
  }
}
