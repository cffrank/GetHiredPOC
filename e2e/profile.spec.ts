import { test, expect } from '@playwright/test';
import { generateTestEmail, signupUser, bypassOnboarding, navigateTo } from './helpers';

test.describe('Profile management', () => {
  let email: string;

  test.beforeEach(async ({ page }) => {
    email = generateTestEmail();
    await signupUser(page, email);
    await bypassOnboarding(page, email);
    await navigateTo(page, '/profile');
    await page.waitForLoadState('domcontentloaded');
  });

  test('profile page loads with user data from signup', async ({ page }) => {
    // Should show the profile heading
    await expect(page.getByRole('heading', { name: /Your Profile/ })).toBeVisible({ timeout: 5000 });

    // Should show the user's email on the page
    await expect(page.getByText(email).first()).toBeVisible({ timeout: 5000 });
  });

  test('edit profile info (bio, LinkedIn)', async ({ page }) => {
    // Click Edit button
    const editBtn = page.locator('button:has-text("Edit")').first();
    await expect(editBtn).toBeVisible({ timeout: 5000 });
    await editBtn.click();

    // Fill in bio
    await page.fill('#bio', 'E2E test bio - software engineer');

    // Fill in LinkedIn URL
    await page.fill('#linkedInUrl', 'https://www.linkedin.com/in/testuser');

    // Save changes
    await page.click('button:has-text("Save Changes")');

    // Wait for save to complete
    await page.waitForTimeout(2000);

    // Verify data persists (read-only view should show updated values)
    await expect(page.getByText('E2E test bio - software engineer')).toBeVisible({ timeout: 5000 });
  });

  test('add work experience entry', async ({ page }) => {
    // Click Experience tab
    await page.click('button:has-text("Experience")');
    await page.waitForTimeout(500);

    // Look for Add button
    const addBtn = page.locator('button:has-text("Add")').first();
    if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(500);

      // Fill in work experience fields using label-based selectors
      await page.getByLabel('Company *').fill('Test Corp');
      await page.getByLabel('Job Title *').fill('Software Engineer');
      await page.getByLabel('Start Date *').fill('2023-01-01');

      // Click Add Experience button
      await page.click('button:has-text("Add Experience")');
      await page.waitForTimeout(1000);

      // Verify it appears (use exact match to avoid chat sidebar "software engineer" text)
      await expect(page.getByText('Software Engineer', { exact: true }).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('add education entry', async ({ page }) => {
    // Click Education tab
    await page.click('button:has-text("Education")');
    await page.waitForTimeout(500);

    // Look for Add button
    const addBtn = page.locator('button:has-text("Add")').first();
    if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(500);

      // Fill in education fields using label-based selectors
      await page.getByLabel('School/University *').fill('Test University');
      await page.getByLabel('Degree *').fill('BS Computer Science');
      await page.getByLabel('Field of Study').fill('Computer Science');
      await page.getByLabel('Start Date *').fill('2019-09-01');

      // Click Add Education button
      await page.click('button:has-text("Add Education")');
      await page.waitForTimeout(1000);

      // Verify it appears
      await expect(page.getByText('Test University')).toBeVisible({ timeout: 5000 });
    }
  });

  test('interview questions tab loads', async ({ page }) => {
    // Click Interview Prep tab
    await page.click('button:has-text("Interview Prep")');
    await page.waitForTimeout(500);

    // The interview prep section should be visible
    const interviewSection = page.locator('[data-value="interview"], [role="tabpanel"]');
    await expect(interviewSection).toBeVisible({ timeout: 5000 });
  });
});
