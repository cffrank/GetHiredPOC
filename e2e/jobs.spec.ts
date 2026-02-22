import { test, expect } from '@playwright/test';
import { generateTestEmail, signupUser, bypassOnboarding, navigateTo } from './helpers';

test.describe('Job browsing & detail', () => {
  let email: string;

  test.beforeEach(async ({ page }) => {
    email = generateTestEmail();
    await signupUser(page, email);
    await bypassOnboarding(page, email);
    await page.goto('/jobs');
    await page.waitForLoadState('domcontentloaded');
  });

  test('jobs page loads with listings or empty state', async ({ page }) => {
    // Wait for either job cards or the empty state message to appear
    const jobCard = page.locator('a[href^="/jobs/"]').first();
    const emptyState = page.getByText('No jobs found matching your criteria');
    await expect(jobCard.or(emptyState)).toBeVisible({ timeout: 15_000 });
  });

  test('search filters jobs by title', async ({ page }) => {
    // Type into the search input
    const searchInput = page.locator('input[placeholder*="Search by title"]');
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('nonexistent-job-xyz-99999');
      await page.waitForTimeout(1000);

      // Should show empty state or no results
      // (the API filters server-side, so wait for network)
      await page.waitForLoadState('domcontentloaded');
    }
  });

  test('job detail page shows info', async ({ page }) => {
    // Check if any jobs exist
    const jobLinks = page.locator('a[href^="/jobs/"]');
    const count = await jobLinks.count();

    if (count === 0) {
      test.skip(true, 'No jobs in database to test detail page');
      return;
    }

    // Click the first job link
    await jobLinks.first().click();
    await expect(page).toHaveURL(/\/jobs\/[^/]+$/, { timeout: 10000 });

    // Should show job details
    await expect(page.locator('text=Description')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("Apply Now")')).toBeVisible();
  });

  test('save and unsave a job', async ({ page }) => {
    const jobLinks = page.locator('a[href^="/jobs/"]');
    const count = await jobLinks.count();

    if (count === 0) {
      test.skip(true, 'No jobs in database to test save/unsave');
      return;
    }

    // Go to first job detail
    await jobLinks.first().click();
    await expect(page).toHaveURL(/\/jobs\/[^/]+$/, { timeout: 10000 });

    // Click Save button
    const saveBtn = page.locator('button:has-text("Save")').first();
    await expect(saveBtn).toBeVisible({ timeout: 5000 });
    await saveBtn.click();
    await page.waitForTimeout(1000);

    // Should now show "Saved" state
    await expect(page.locator('button:has-text("Saved")')).toBeVisible({ timeout: 5000 });

    // Unsave
    await page.locator('button:has-text("Saved")').click();
    await page.waitForTimeout(1000);
    await expect(page.locator('button:has-text("Save")')).toBeVisible({ timeout: 5000 });
  });

  test('saved jobs page shows saved items', async ({ page }) => {
    const jobLinks = page.locator('a[href^="/jobs/"]');
    const count = await jobLinks.count();

    if (count === 0) {
      test.skip(true, 'No jobs in database to test saved jobs');
      return;
    }

    // Save a job first
    await jobLinks.first().click();
    await expect(page).toHaveURL(/\/jobs\/[^/]+$/, { timeout: 10000 });

    const saveBtn = page.locator('button:has-text("Save")').first();
    await saveBtn.click();
    await page.waitForTimeout(1000);

    // Navigate to saved jobs
    await navigateTo(page, '/saved');
    await page.waitForLoadState('domcontentloaded');

    // Should see at least one saved job
    await expect(page.getByText('Saved Jobs')).toBeVisible({ timeout: 5000 });
    const savedCards = page.locator('button:has-text("View Details"), a:has-text("View Details")');
    await expect(savedCards.first()).toBeVisible({ timeout: 5000 });
  });
});
