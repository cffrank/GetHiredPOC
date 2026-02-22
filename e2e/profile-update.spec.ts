import { test, expect } from '@playwright/test';
import { generateTestEmail, signupUser, bypassOnboarding, navigateTo } from './helpers';

/**
 * Profile Update Persistence E2E Test
 *
 * Verifies that profile edits (phone, bio, address, city, state) are
 * persisted to the database and survive navigation away and back.
 */
test('profile updates persist after navigating away and back', async ({ page }) => {
  test.setTimeout(60_000);

  const email = generateTestEmail();

  // ── Setup: Create account & bypass onboarding ────────────────────────
  await signupUser(page, email);
  await bypassOnboarding(page, email);

  // ── Navigate to profile ──────────────────────────────────────────────
  await navigateTo(page, '/profile');
  await page.waitForLoadState('networkidle', { timeout: 15_000 });
  await expect(page.getByRole('heading', { name: /Your Profile/ })).toBeVisible({ timeout: 5_000 });

  // ── Enter edit mode ──────────────────────────────────────────────────
  const editBtn = page.locator('button:has-text("Edit")').first();
  await expect(editBtn).toBeVisible({ timeout: 5_000 });
  await editBtn.click();

  // ── Update fields ────────────────────────────────────────────────────
  const updatedPhone = '5559876543';
  const updatedBio = 'Senior engineer specializing in distributed systems and cloud-native architecture. Passionate about mentoring and open-source.';
  const updatedStreet = '456 Oak Avenue';
  const updatedCity = 'Austin';
  const updatedState = 'TX';
  const updatedZip = '73301';

  await page.fill('#phone', updatedPhone);
  await page.fill('#bio', updatedBio);
  await page.fill('#streetAddress', updatedStreet);
  await page.fill('#city', updatedCity);
  await page.selectOption('#state', updatedState);
  await page.fill('#zipCode', updatedZip);

  // ── Save ─────────────────────────────────────────────────────────────
  await page.click('button:has-text("Save Changes")');
  await page.waitForTimeout(2_000);

  // ── Verify read-only view shows updated values ───────────────────────
  await expect(page.getByText(updatedPhone)).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText(updatedBio)).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText(`${updatedStreet}, ${updatedCity}, ${updatedState} ${updatedZip}`)).toBeVisible({ timeout: 5_000 });

  // ── Navigate away ────────────────────────────────────────────────────
  await navigateTo(page, '/jobs');
  await page.waitForLoadState('networkidle', { timeout: 10_000 });
  await expect(page.url()).toContain('/jobs');

  // ── Navigate back to profile ─────────────────────────────────────────
  await navigateTo(page, '/profile');
  await page.waitForLoadState('networkidle', { timeout: 15_000 });
  await expect(page.getByRole('heading', { name: /Your Profile/ })).toBeVisible({ timeout: 5_000 });

  // ── Verify data persisted ────────────────────────────────────────────
  await expect(page.getByText(updatedPhone)).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText(updatedBio)).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText(`${updatedStreet}, ${updatedCity}, ${updatedState} ${updatedZip}`)).toBeVisible({ timeout: 5_000 });
});
