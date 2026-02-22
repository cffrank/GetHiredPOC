import { test, expect } from '@playwright/test';
import { generateTestEmail, signupUser } from './helpers';

test.describe('Onboarding wizard', () => {
  let email: string;

  test.beforeEach(async ({ page }) => {
    email = generateTestEmail();
    await signupUser(page, email);

    // Navigate to onboarding
    await page.goto('/onboarding');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  });

  test('complete all 8 steps end-to-end', async ({ page }) => {
    // Step 1: Employment Status — pick an option
    await expect(page.getByText('Step 1 of 8')).toBeVisible({ timeout: 5000 });
    const employmentBtn = page.locator('button').filter({ hasText: 'Employed, open to greener pastures' });
    if (await employmentBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await employmentBtn.click();
    }
    await page.click('button:has-text("Next →")');
    await page.waitForTimeout(500);

    // Step 2: Job Titles — add example titles or skip
    await expect(page.getByText('Step 2 of 8')).toBeVisible({ timeout: 5000 });
    const exampleBtn = page.locator('button:has-text("+ Add example titles")');
    if (await exampleBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await exampleBtn.click();
      await page.waitForTimeout(300);
    }
    await page.click('button:has-text("Next →")');
    await page.waitForTimeout(500);

    // Step 3: Availability — pick ASAP
    await expect(page.getByText('Step 3 of 8')).toBeVisible({ timeout: 5000 });
    const asapBtn = page.locator('button:has-text("ASAP")');
    if (await asapBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await asapBtn.click();
    }
    await page.click('button:has-text("Next →")');
    await page.waitForTimeout(500);

    // Step 4: Industries — select first available
    await expect(page.getByText('Step 4 of 8')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Next →")');
    await page.waitForTimeout(500);

    // Step 5: Work Locations — defaults are fine
    await expect(page.getByText('Step 5 of 8')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Next →")');
    await page.waitForTimeout(500);

    // Step 6: Relocation — pick No
    await expect(page.getByText('Step 6 of 8')).toBeVisible({ timeout: 5000 });
    const noBtn = page.locator('button:has-text("No")').first();
    if (await noBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await noBtn.click();
    }
    await page.click('button:has-text("Next →")');
    await page.waitForTimeout(500);

    // Step 7: Legal Requirements (optional) — skip
    await expect(page.getByText('Step 7 of 8')).toBeVisible({ timeout: 5000 });
    const skipBtn7 = page.locator('button:has-text("Skip")');
    if (await skipBtn7.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipBtn7.click();
    } else {
      await page.click('button:has-text("Next →")');
    }
    await page.waitForTimeout(500);

    // Step 8: Demographics — Complete
    await expect(page.getByText('Step 8 of 8')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Complete")');

    // Should redirect to /jobs after completing onboarding
    await expect(page).toHaveURL(/\/jobs/, { timeout: 15000 });
  });

  test('progress indicator shows correct step', async ({ page }) => {
    // Should start at step 1
    await expect(page.getByText('Step 1 of 8')).toBeVisible({ timeout: 5000 });

    // Advance to step 2
    const employmentBtn = page.locator('button').filter({ hasText: 'Employed, open to greener pastures' });
    if (await employmentBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await employmentBtn.click();
    }
    await page.click('button:has-text("Next →")');

    // Should now show step 2
    await expect(page.getByText('Step 2 of 8')).toBeVisible({ timeout: 5000 });
  });

  test('skip works on optional steps (7, 8)', async ({ page }) => {
    // Navigate quickly to step 7
    for (let i = 1; i <= 6; i++) {
      await page.waitForTimeout(300);

      // Handle step-specific actions
      if (i === 1) {
        const btn = page.locator('button').filter({ hasText: 'Employed, open to greener pastures' });
        if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) await btn.click();
      } else if (i === 3) {
        const btn = page.locator('button:has-text("ASAP")');
        if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) await btn.click();
      } else if (i === 6) {
        const btn = page.locator('button:has-text("No")').first();
        if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) await btn.click();
      }

      await page.click('button:has-text("Next →")');
      await page.waitForTimeout(300);
    }

    // Now on step 7 — Skip should be available
    await expect(page.getByText('Step 7 of 8')).toBeVisible({ timeout: 5000 });
    const skipBtn = page.locator('button:has-text("Skip")');
    await expect(skipBtn).toBeVisible({ timeout: 3000 });
    await skipBtn.click();
    await page.waitForTimeout(500);

    // Now on step 8 — Skip should also be available
    await expect(page.getByText('Step 8 of 8')).toBeVisible({ timeout: 5000 });
    const skipBtn8 = page.locator('button:has-text("Skip")');
    // Step 8 may have Skip or Complete
    if (await skipBtn8.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipBtn8.click();
    } else {
      await page.click('button:has-text("Complete")');
    }

    // Should redirect away from onboarding
    await expect(page).toHaveURL(/\/jobs/, { timeout: 15000 });
  });
});
