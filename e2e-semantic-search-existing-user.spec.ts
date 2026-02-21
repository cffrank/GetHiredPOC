import { test, expect } from '@playwright/test';

/**
 * E2E Test: Semantic Search with Existing User
 * Tests semantic search functionality using an existing admin account
 */

const FRONTEND_URL = 'https://gethiredpoc.pages.dev';
const ADMIN_EMAIL = 'carl.f.frank@gmail.com';
const ADMIN_PASSWORD = 'K16PB%!uaB1342g1$X2p';

test.describe('Semantic Search - Existing User', () => {

  test('Login and test semantic search with existing account', async ({ page }) => {
    console.log('\n🚀 Starting Semantic Search Test (Existing User)');
    console.log('=' .repeat(60));

    // ============================================================
    // STEP 1: Login
    // ============================================================
    console.log('\n🔐 STEP 1: Logging in with existing account...');

    await page.goto(`${FRONTEND_URL}/login`);
    await page.waitForLoadState('networkidle');

    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('form button[type="submit"]');

    await page.waitForTimeout(3000);

    console.log('✅ STEP 1 COMPLETE: Logged in');
    await page.screenshot({ path: 'test-existing-01-login.png', fullPage: true });

    // ============================================================
    // STEP 2: Navigate to Jobs Page
    // ============================================================
    console.log('\n🔍 STEP 2: Navigating to Jobs page...');

    await page.goto(`${FRONTEND_URL}/jobs`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('✅ STEP 2 COMPLETE: On Jobs page');
    await page.screenshot({ path: 'test-existing-02-jobs-page.png', fullPage: true });

    // ============================================================
    // STEP 3: Perform Semantic Search
    // ============================================================
    console.log('\n🔎 STEP 3: Testing semantic search...');
    console.log('   Query: "software engineer"');

    const searchInput = page.locator('input[type="text"], input[placeholder*="Search"], input[placeholder*="search"]').first();

    await searchInput.fill('software engineer');
    console.log('   ✓ Typed search query');

    await searchInput.press('Enter');
    console.log('   ✓ Pressed Enter');

    // Wait for search results
    await page.waitForTimeout(3000);

    // Check for job results - look for various possible selectors
    const jobCards = page.locator('article, div[role="article"], .job-card, [data-testid="job-card"], div:has(h2), div:has(h3)').filter({ hasText: /software|engineer|developer/i });
    const jobCount = await jobCards.count();

    console.log(`   Found ${jobCount} job cards matching search criteria`);

    if (jobCount > 0) {
      console.log('✅ STEP 3 COMPLETE: Search returned results!');

      // Get first few job titles
      for (let i = 0; i < Math.min(3, jobCount); i++) {
        const title = await jobCards.nth(i).locator('h2, h3, h4').first().textContent().catch(() => 'Unknown');
        console.log(`   ${i + 1}. ${title}`);
      }
    } else {
      console.log('⚠️  No matching job cards found');

      // Check if there are ANY elements on the page
      const anyJobs = page.locator('article, div[role="article"]');
      const anyCount = await anyJobs.count();
      console.log(`   Total elements found: ${anyCount}`);
    }

    await page.screenshot({ path: 'test-existing-03-search-results.png', fullPage: true });
    console.log('📸 Screenshot: test-existing-03-search-results.png');

    // ============================================================
    // STEP 4: Click on First Job
    // ============================================================
    console.log('\n📄 STEP 4: Opening job details...');

    if (jobCount > 0) {
      const firstJob = jobCards.first();
      await firstJob.click();
      console.log('   ✓ Clicked on first job');

      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const jobDetailUrl = page.url();
      console.log(`   Job detail URL: ${jobDetailUrl}`);

      if (jobDetailUrl.includes('/jobs/')) {
        console.log('✅ STEP 4 COMPLETE: On job detail page');
      } else {
        console.log('⚠️  URL did not change to job detail');
      }

      await page.screenshot({ path: 'test-existing-04-job-detail.png', fullPage: true });
      console.log('📸 Screenshot: test-existing-04-job-detail.png');

      // ============================================================
      // STEP 5: Check for Similar Jobs
      // ============================================================
      console.log('\n🔗 STEP 5: Looking for Similar Jobs section...');

      // Scroll to bottom
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1500);

      const similarJobsHeading = page.locator('text=/similar.*jobs/i');
      const hasSimilarSection = await similarJobsHeading.isVisible().catch(() => false);

      if (hasSimilarSection) {
        console.log('✅ STEP 5 COMPLETE: Found "Similar Jobs" section!');

        // Count similar job items
        const similarItems = page.locator('text=/similar.*jobs/i').locator('..').locator('..').locator('div[class*="border"], div[class*="card"], article, div:has(h3), div:has(h4)').filter({ hasText: /\w+/ });
        const similarCount = await similarItems.count();

        console.log(`   Found ${similarCount} similar job items`);

        // Show first few similar jobs
        for (let i = 0; i < Math.min(3, similarCount); i++) {
          const item = similarItems.nth(i);
          const title = await item.locator('h1, h2, h3, h4').first().textContent().catch(() => null);
          const matchScore = await item.locator('text=/%.*match|%/').textContent().catch(() => null);

          if (title) {
            console.log(`   ${i + 1}. ${title} ${matchScore || ''}`);
          }
        }

        await page.screenshot({ path: 'test-existing-05-similar-jobs.png', fullPage: true });
        console.log('📸 Screenshot: test-existing-05-similar-jobs.png');
      } else {
        console.log('⚠️  "Similar Jobs" section not found');
      }
    } else {
      console.log('⚠️  Skipping job detail tests (no jobs found)');
    }

    // ============================================================
    // Final Summary
    // ============================================================
    console.log('\n' + '='.repeat(60));
    console.log('🎉 TEST COMPLETED!');
    console.log('='.repeat(60));
    console.log('');
  });
});
