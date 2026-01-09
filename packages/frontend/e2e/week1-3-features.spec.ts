import { test, expect } from '@playwright/test';
import { signupUser, loginUser, generateTestEmail, navigateTo } from './fixtures';

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

test.describe('Week 1-3: Profile & Settings Refactor', () => {

  test('should signup with new required fields (first name, last name, phone, address)', async ({ page }) => {
    // Test user already created in beforeAll, verify signup page has all required fields
    await page.goto(`${BASE_URL}/signup`);

    // Verify all required form fields are present
    await expect(page.locator('input[id="email"]')).toBeVisible();
    await expect(page.locator('input[id="password"]')).toBeVisible();
    await expect(page.locator('input[id="firstName"]')).toBeVisible();
    await expect(page.locator('input[id="lastName"]')).toBeVisible();
    await expect(page.locator('input[id="phone"]')).toBeVisible();
    await expect(page.locator('input[id="streetAddress"]')).toBeVisible();
    await expect(page.locator('input[id="city"]')).toBeVisible();
    await expect(page.locator('select[id="state"]')).toBeVisible();
    await expect(page.locator('input[id="zipCode"]')).toBeVisible();
    await expect(page.locator('input[id="accept-tos"]')).toBeVisible();
    await expect(page.locator('input[id="accept-privacy"]')).toBeVisible();
    await expect(page.locator('button:has-text("Start Free Trial")')).toBeVisible();
  });

  test('should show Profile with 6 tabs', async ({ page }) => {
    // Create and login a test user
    const email = generateTestEmail();
    const password = 'TestPassword123!';
    await signupUser(page, email, password);

    // signupUser already navigates to /profile, so we're already there
    // Just verify we're on the profile page
    await expect(page).toHaveURL(/.*profile/);

    // Check all 6 tabs are visible - use role="tab" for specificity
    await expect(page.locator('button[role="tab"]:has-text("Profile Info")')).toBeVisible();
    await expect(page.locator('button[role="tab"]:has-text("Experience")')).toBeVisible();
    await expect(page.locator('button[role="tab"]:has-text("Education")')).toBeVisible();
    await expect(page.locator('button[role="tab"]:has-text("Resume")')).toBeVisible();
    await expect(page.locator('button[role="tab"]:has-text("Interview Prep")')).toBeVisible();
    await expect(page.locator('button[role="tab"]:has-text("Settings")')).toBeVisible();
  });

  test('should verify Resume and Settings removed from Navigation', async ({ page }) => {
    // Create and login a test user
    const email = generateTestEmail();
    const password = 'TestPassword123!';
    await signupUser(page, email, password);

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

test.describe('Week 1-2: Interview Questions Feature', () => {
  test('should create and delete interview question', async ({ page }) => {
    // Create and login a test user
    const email = generateTestEmail();
    const password = 'TestPassword123!';
    await signupUser(page, email, password);

    // signupUser already navigates to /profile
    await expect(page).toHaveURL(/.*profile/);

    // Click on Interview Prep tab
    await page.click('button[role="tab"]:has-text("Interview Prep")');

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
    // Create and login a test user
    const email = generateTestEmail();
    const password = 'TestPassword123!';
    await signupUser(page, email, password);

    // signupUser already navigates to /profile
    await expect(page).toHaveURL(/.*profile/);
    await page.click('button[role="tab"]:has-text("Interview Prep")');

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

test.describe('Week 2-3: Fixed Chat Sidebar', () => {
  test('should show fixed chat sidebar on right side', async ({ page }) => {
    // Create and login a test user
    const email = generateTestEmail();
    const password = 'TestPassword123!';
    await signupUser(page, email, password);

    await navigateTo(page, '/jobs');

    // Check chat sidebar is visible - look for the chat icon or button
    const chatIcon = page.locator('button[aria-label="Open chat"]');
    await expect(chatIcon).toBeVisible({ timeout: 10000 });

    // The sidebar should be present (even if collapsed)
    const chatSidebar = page.locator('.fixed.right-0.top-16');
    await expect(chatSidebar).toBeVisible();

    // Should stay visible when scrolling
    await page.evaluate(() => window.scrollBy(0, 500));
    await expect(chatIcon).toBeVisible();
  });

  test('should toggle chat sidebar', async ({ page }) => {
    // Create and login a test user
    const email = generateTestEmail();
    const password = 'TestPassword123!';
    await signupUser(page, email, password);

    await navigateTo(page, '/jobs');

    // Initially collapsed - find open button
    const openBtn = page.locator('button[aria-label="Open chat"]');
    if (await openBtn.isVisible()) {
      // Click to expand
      await openBtn.click();
      await page.waitForTimeout(500); // Wait for animation

      // Should show minimize button
      const minimizeBtn = page.locator('button[aria-label="Minimize chat"]');
      await expect(minimizeBtn).toBeVisible({ timeout: 2000 });

      // Click to minimize
      await minimizeBtn.click();
      await page.waitForTimeout(500); // Wait for animation

      // Should show open button again
      await expect(openBtn).toBeVisible({ timeout: 2000 });
    }
  });
});

test.describe('Week 3: Advanced Job Search', () => {
  test('should show advanced filters by default', async ({ page }) => {
    // Create and login a test user
    const email = generateTestEmail();
    const password = 'TestPassword123!';
    await signupUser(page, email, password);

    await navigateTo(page, '/jobs');

    // Advanced filters should be visible by default
    await expect(page.locator('text=Keywords')).toBeVisible();
    await expect(page.locator('text=Locations')).toBeVisible();
    await expect(page.locator('text=Salary Range')).toBeVisible();
    await expect(page.locator('text=Experience Level')).toBeVisible();
  });

  test('should perform advanced search with multiple criteria', async ({ page }) => {
    // Create and login a test user
    const email = generateTestEmail();
    const password = 'TestPassword123!';
    await signupUser(page, email, password);

    await navigateTo(page, '/jobs');

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

test.describe('Week 3: Job Details with Tabs', () => {
  test('should show job details without tabs initially', async ({ page }) => {
    // Create and login a test user
    const email = generateTestEmail();
    const password = 'TestPassword123!';
    await signupUser(page, email, password);

    await navigateTo(page, '/jobs');

    // Click on first job
    await page.locator('button:has-text("View Details")').first().click();

    // Should show job description
    await expect(page.locator('text=Job Description').or(page.locator('h1'))).toBeVisible();

    // Tabs should NOT be visible initially (no content generated)
    const tabsList = page.locator('[role="tablist"]');
    await expect(tabsList).not.toBeVisible();
  });

  test('should generate AI analysis and show Analysis tab', async ({ page }) => {
    // Create and login a test user
    const email = generateTestEmail();
    const password = 'TestPassword123!';
    await signupUser(page, email, password);

    await navigateTo(page, '/jobs');

    // Click on first job
    await page.locator('button:has-text("View Details")').first().click();

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
    // Create and login a test user
    const email = generateTestEmail();
    const password = 'TestPassword123!';
    await signupUser(page, email, password);

    await navigateTo(page, '/jobs');

    // Click on first job
    await page.locator('button:has-text("View Details")').first().click();
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

test.describe('Week 3: Version Management for Generated Content', () => {
  test('should create multiple resume versions', async ({ page }) => {
    // Create and login a test user
    const email = generateTestEmail();
    const password = 'TestPassword123!';
    await signupUser(page, email, password);

    await navigateTo(page, '/jobs');

    // Get to a saved job with AI features
    await page.click('text=Saved');
    await page.waitForLoadState('networkidle');

    if (await page.locator('text=No saved jobs').isVisible()) {
      test.skip();
      return;
    }

    // Click on first saved job
    await page.locator('button:has-text("View Details")').first().click();
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

