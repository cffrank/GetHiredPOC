import { test, expect } from '@playwright/test';
import { generateTestEmail, signupUser, bypassOnboarding, navigateTo } from './helpers';

test.describe('Subscription & trial', () => {
  let email: string;

  test.beforeEach(async ({ page }) => {
    email = generateTestEmail();
    await signupUser(page, email);
    await bypassOnboarding(page, email);
  });

  test('new user has PRO trial badge', async ({ page }) => {
    await page.goto('/subscription');
    await page.waitForLoadState('domcontentloaded');

    // Should show PRO TRIAL badge (use exact locator to avoid multiple matches)
    await expect(page.getByText('⚡ PRO TRIAL')).toBeVisible({ timeout: 10000 });
  });

  test('subscription page shows trial status', async ({ page }) => {
    await page.goto('/subscription');
    await page.waitForLoadState('domcontentloaded');

    // Should show Current Plan section with "PRO Trial" (use exact match)
    await expect(page.getByText('Current Plan')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('PRO Trial', { exact: true })).toBeVisible();

    // Should show trial days remaining
    await expect(page.getByText(/Trial ends in/)).toBeVisible();
  });

  test('usage dashboard displays limits', async ({ page }) => {
    await page.goto('/subscription');
    await page.waitForLoadState('domcontentloaded');

    // Should show Usage Dashboard
    await expect(page.getByText('Usage Dashboard')).toBeVisible({ timeout: 5000 });

    // Should show usage bars
    await expect(page.getByText('Job Imports Today')).toBeVisible();
    await expect(page.getByText('Applications This Month')).toBeVisible();
    await expect(page.getByText('Resumes Generated')).toBeVisible();
    await expect(page.getByText('Cover Letters Generated')).toBeVisible();
  });
});
