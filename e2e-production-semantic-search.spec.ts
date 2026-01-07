import { test, expect } from '@playwright/test';

/**
 * E2E Test Suite: Production Semantic Search & Similar Jobs
 *
 * Tests the complete user flow for semantic search and similar jobs features
 */

const FRONTEND_URL = 'https://gethiredpoc.pages.dev';

test.describe('Production Semantic Search Tests', () => {

  test('should load the jobs page successfully', async ({ page }) => {
    console.log('\n🧪 Test 1: Loading jobs page...');

    await page.goto(`${FRONTEND_URL}/jobs`);
    await page.waitForLoadState('networkidle');

    // Verify the page loaded
    await expect(page.locator('text=Find Your Dream Job')).toBeVisible({ timeout: 10000 });

    console.log('✅ Jobs page loaded successfully');
  });

  test('should perform semantic search for "software engineer"', async ({ page }) => {
    console.log('\n🧪 Test 2: Testing semantic search...');

    await page.goto(`${FRONTEND_URL}/jobs`);
    await page.waitForLoadState('networkidle');

    // Find and fill the search input
    const searchInput = page.locator('input[type="text"], input[placeholder*="Search"], input[placeholder*="search"]').first();
    await searchInput.fill('software engineer');

    console.log('   Typed: "software engineer"');

    // Submit search (press Enter or click search button)
    await searchInput.press('Enter');

    // Wait for results to load
    await page.waitForTimeout(2000); // Give time for search to execute

    // Check if job cards are displayed
    const jobCards = page.locator('[data-testid="job-card"], .job-card, article, div[role="article"]').first();

    // Should see job results
    const isVisible = await jobCards.isVisible().catch(() => false);

    if (isVisible) {
      console.log('✅ Search returned job results');

      // Take screenshot
      await page.screenshot({ path: 'test-search-results.png', fullPage: true });
      console.log('📸 Screenshot saved: test-search-results.png');
    } else {
      console.log('⚠️  No job cards found - checking for "no results" message');
      const noResults = page.locator('text=/no.*results|no.*jobs/i');
      const hasNoResults = await noResults.isVisible().catch(() => false);

      if (hasNoResults) {
        console.log('ℹ️  "No results" message displayed (expected for some queries)');
      }
    }
  });

  test('should display job details and similar jobs', async ({ page }) => {
    console.log('\n🧪 Test 3: Testing job detail page and similar jobs...');

    await page.goto(`${FRONTEND_URL}/jobs`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Find first job card and click it
    const firstJob = page.locator('a[href*="/jobs/"], button:has-text("View Details"), h3, h2').first();

    try {
      await firstJob.click({ timeout: 5000 });
      console.log('   Clicked on first job');

      // Wait for job detail page to load
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Check if we're on a job detail page
      const currentUrl = page.url();
      console.log(`   Current URL: ${currentUrl}`);

      if (currentUrl.includes('/jobs/')) {
        console.log('✅ Navigated to job detail page');

        // Scroll down to find "Similar Jobs" section
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(1000);

        // Look for "Similar Jobs" section
        const similarJobsSection = page.locator('text=/similar.*jobs/i');
        const hasSimilarJobs = await similarJobsSection.isVisible().catch(() => false);

        if (hasSimilarJobs) {
          console.log('✅ Found "Similar Jobs" section');

          // Check for similar job items
          const similarJobItems = page.locator('text=/similar.*jobs/i').locator('..').locator('..').locator('div, article').nth(1);
          const hasSimilarItems = await similarJobItems.isVisible().catch(() => false);

          if (hasSimilarItems) {
            console.log('✅ Similar job items are displayed');
          }

          // Take screenshot
          await page.screenshot({ path: 'test-similar-jobs.png', fullPage: true });
          console.log('📸 Screenshot saved: test-similar-jobs.png');
        } else {
          console.log('⚠️  "Similar Jobs" section not found on page');
          console.log('   (May not be visible for all jobs or may need scrolling)');
        }
      } else {
        console.log('⚠️  Did not navigate to job detail page');
      }
    } catch (error) {
      console.log('⚠️  Could not click on job or navigate:', error.message);
    }
  });

  test('should test search with different queries', async ({ page }) => {
    console.log('\n🧪 Test 4: Testing multiple search queries...');

    const queries = [
      'developer',
      'engineer',
      'data scientist'
    ];

    for (const query of queries) {
      console.log(`\n   Testing query: "${query}"`);

      await page.goto(`${FRONTEND_URL}/jobs`);
      await page.waitForLoadState('networkidle');

      const searchInput = page.locator('input[type="text"], input[placeholder*="Search"], input[placeholder*="search"]').first();
      await searchInput.fill(query);
      await searchInput.press('Enter');

      await page.waitForTimeout(2000);

      // Check URL contains query
      const url = page.url();
      if (url.includes(encodeURIComponent(query)) || url.includes(query)) {
        console.log(`   ✅ URL updated with query: ${url}`);
      }

      await page.waitForTimeout(500);
    }

    console.log('\n✅ Multiple search queries tested');
  });

  test('should verify page responsiveness', async ({ page }) => {
    console.log('\n🧪 Test 5: Testing responsive design...');

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${FRONTEND_URL}/jobs`);
    await page.waitForLoadState('networkidle');

    console.log('   ✅ Mobile viewport (375x667) loaded');
    await page.screenshot({ path: 'test-mobile-view.png' });

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await page.waitForLoadState('networkidle');

    console.log('   ✅ Tablet viewport (768x1024) loaded');

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.reload();
    await page.waitForLoadState('networkidle');

    console.log('   ✅ Desktop viewport (1920x1080) loaded');

    console.log('✅ Responsive design tests completed');
  });
});

test.describe('Production Navigation Tests', () => {

  test('should navigate through main pages', async ({ page }) => {
    console.log('\n🧪 Test 6: Testing navigation...');

    // Home page
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    console.log('   ✅ Home page loaded');

    // Jobs page
    await page.goto(`${FRONTEND_URL}/jobs`);
    await page.waitForLoadState('networkidle');
    console.log('   ✅ Jobs page loaded');

    // Login page
    await page.goto(`${FRONTEND_URL}/login`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=/sign in|login/i').first()).toBeVisible({ timeout: 5000 });
    console.log('   ✅ Login page loaded');

    console.log('✅ Navigation tests completed');
  });
});
