import { test as base, expect } from '@playwright/test';

/**
 * Test fixtures for GetHiredPOC E2E tests
 *
 * Provides common utilities and authenticated contexts
 */

type TestFixtures = {
  // Add custom fixtures here if needed
};

export const test = base.extend<TestFixtures>({
  // Custom fixtures can be added here
});

export { expect };

/**
 * Generate a random test email
 */
export function generateTestEmail(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `test-${timestamp}-${random}@example.com`;
}

/**
 * Helper function to complete onboarding flow
 * Handles all 8 steps of the onboarding wizard
 */
export async function completeOnboarding(page: any) {
  console.log(`[completeOnboarding] Starting onboarding completion`);
  console.log(`[completeOnboarding] Current URL: ${page.url()}`);

  // Wait for onboarding page to fully load
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);

  const maxSteps = 8; // Known number of steps in onboarding

  for (let stepNum = 1; stepNum <= maxSteps; stepNum++) {
    console.log(`[completeOnboarding] Processing step ${stepNum}/8`);

    // Wait for step content to be visible
    await page.waitForTimeout(500);

    // Check current step via progress indicator
    const progressText = await page.locator('text=/Step \\d+ of 8/').textContent().catch(() => '');
    console.log(`[completeOnboarding] Progress indicator: ${progressText}`);

    // Handle each step based on its type
    switch (stepNum) {
      case 1:
        // Employment Status - click the last option "Employed, open to greener pastures"
        console.log(`[completeOnboarding] Step 1: Selecting employment status`);
        const employmentBtn = page.locator('button').filter({ hasText: 'Employed, open to greener pastures' });
        if (await employmentBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await employmentBtn.click();
          await page.waitForTimeout(300);
        }
        break;

      case 2:
        // Job Titles - click "Add example titles" button
        console.log(`[completeOnboarding] Step 2: Adding example job titles`);
        const exampleBtn = page.locator('button:has-text("+ Add example titles")');
        if (await exampleBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await exampleBtn.click();
          await page.waitForTimeout(300);
        }
        // Otherwise skip - Next button will work without titles
        break;

      case 3:
        // Availability Date - click "ASAP" button
        console.log(`[completeOnboarding] Step 3: Selecting ASAP availability`);
        const asapBtn = page.locator('button:has-text("ASAP")');
        if (await asapBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await asapBtn.click();
          await page.waitForTimeout(300);
        }
        break;

      case 4:
        // Industries - click first 2-3 industries (multi-select)
        console.log(`[completeOnboarding] Step 4: Selecting industries`);
        const industryButtons = page.locator('button').filter({ has: page.locator('text=/Technology|Software|Finance/i') });
        const count = await industryButtons.count().catch(() => 0);
        for (let i = 0; i < Math.min(2, count); i++) {
          await industryButtons.nth(i).click().catch(() => {});
          await page.waitForTimeout(200);
        }
        // Can also skip this step
        break;

      case 5:
        // Work Locations - already has defaults (Remote, On-Site, Hybrid), just continue
        console.log(`[completeOnboarding] Step 5: Work locations (using defaults)`);
        // No action needed, defaults are already selected
        break;

      case 6:
        // Relocation - click "No"
        console.log(`[completeOnboarding] Step 6: Selecting relocation preference`);
        const noBtn = page.locator('button:has-text("No")').first();
        if (await noBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await noBtn.click();
          await page.waitForTimeout(300);
        }
        break;

      case 7:
        // Legal Requirements (optional) - use Skip button
        console.log(`[completeOnboarding] Step 7: Skipping legal requirements`);
        const skipBtn7 = page.locator('button:has-text("Skip")');
        if (await skipBtn7.isVisible({ timeout: 2000 }).catch(() => false)) {
          console.log(`[completeOnboarding] Using Skip button for step 7`);
          await skipBtn7.click();
          await page.waitForTimeout(1500);

          // Check if we moved past onboarding
          const url = page.url();
          if (!url.includes('onboarding') && !url.includes('preferences')) {
            console.log(`[completeOnboarding] Completed after step 7`);
            return;
          }
          continue; // Skip the Next button click below
        }
        break;

      case 8:
        // Demographics (optional) - use Skip button or Next button
        console.log(`[completeOnboarding] Step 8: Final step (demographics)`);

        // Try Skip button first (if this step is optional)
        const skipBtn8 = page.locator('button:has-text("Skip")');
        if (await skipBtn8.isVisible({ timeout: 2000 }).catch(() => false)) {
          console.log(`[completeOnboarding] Clicking Skip button for final step`);
          await skipBtn8.click();

          // Wait for either URL change or enough time for UI update
          await Promise.race([
            page.waitForURL(url => !url.includes('onboarding'), { timeout: 8000 }),
            page.waitForTimeout(8000)
          ]).catch(() => console.log(`[completeOnboarding] Timeout waiting for navigation after skip`));

          const url = page.url();
          console.log(`[completeOnboarding] After skip, URL: ${url}`);
          if (!url.includes('onboarding') && !url.includes('preferences')) {
            console.log(`[completeOnboarding] Onboarding complete after skip!`);
            return;
          }
          console.log(`[completeOnboarding] Still on onboarding after skip, will try Next/Complete button`);
        }

        // If Skip didn't work or wasn't available, try Complete button
        const completeBtn = page.locator('button').filter({ hasText: /^Complete$/ });
        if (await completeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          console.log(`[completeOnboarding] Clicking Complete button`);
          // Wait for button to be stable (not being re-rendered)
          await page.waitForTimeout(500);
          await completeBtn.click({ timeout: 5000 });

          // Wait for either URL change or enough time for UI update
          await Promise.race([
            page.waitForURL(url => !url.includes('onboarding'), { timeout: 8000 }),
            page.waitForTimeout(8000)
          ]).catch(() => console.log(`[completeOnboarding] Timeout waiting for navigation after complete`));

          const url = page.url();
          console.log(`[completeOnboarding] After complete, URL: ${url}`);
          if (!url.includes('onboarding') && !url.includes('preferences')) {
            console.log(`[completeOnboarding] Onboarding complete after Complete button!`);
            return;
          }
        }

        // If still on onboarding, don't break - let Next button handler try
        console.log(`[completeOnboarding] Step 8: Will try Next button as fallback`);
        break;
    }

    // Click Next button (for steps 1-6, and as fallback for 7-8)
    const nextBtn = page.locator('button').filter({ hasText: /^Next →$/ }).or(
      page.locator('button').filter({ hasText: /^Complete$/ })
    );

    if (await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      const btnText = await nextBtn.textContent();
      console.log(`[completeOnboarding] Clicking "${btnText}" button`);
      await nextBtn.click();
      await page.waitForTimeout(1500);

      // Check if we've completed onboarding
      const newUrl = page.url();
      if (!newUrl.includes('onboarding') && !newUrl.includes('preferences')) {
        console.log(`[completeOnboarding] Onboarding complete, navigated to: ${newUrl}`);
        return;
      }
    } else {
      console.log(`[completeOnboarding] No Next/Complete button found on step ${stepNum}`);
    }
  }

  console.log(`[completeOnboarding] Finished processing all ${maxSteps} steps`);
}

/**
 * Helper function to sign up a new user
 */
export async function signupUser(
  page: any,
  email: string,
  password: string,
  skipOnboardingBypass: boolean = false
) {
  console.log(`[signupUser] Starting signup for ${email}`);
  await page.goto('/signup');

  // Fill in all required signup fields
  await page.fill('input[id="email"]', email);
  await page.fill('input[id="password"]', password);
  await page.fill('input[id="firstName"]', 'Test');
  await page.fill('input[id="lastName"]', 'User');
  await page.fill('input[id="phone"]', '5551234567');
  await page.fill('input[id="streetAddress"]', '123 Test St');
  await page.fill('input[id="city"]', 'Test City');
  await page.selectOption('select[id="state"]', 'CA');
  await page.fill('input[id="zipCode"]', '94102');

  // Accept ToS and Privacy Policy
  await page.check('input[id="accept-tos"]');
  await page.check('input[id="accept-privacy"]');

  console.log(`[signupUser] Submitting signup form`);
  // Submit form - use text selector instead of type="submit"
  await page.click('button:has-text("Start Free Trial")');

  console.log(`[signupUser] Waiting for navigation after signup`);
  // Wait for navigation to complete - could go to multiple pages
  await page.waitForURL(/.*(profile|dashboard|jobs|onboarding|preferences)/, { timeout: 20000 });

  console.log(`[signupUser] Navigation complete, current URL: ${page.url()}`);

  // CRITICAL: Wait for authenticated state to be established
  // Look for Profile link/button in navigation which only appears when authenticated
  // This ensures localStorage/cookies have been set before continuing
  console.log(`[signupUser] Waiting for authenticated navigation to appear`);
  try {
    await page.waitForSelector('text=Profile', { timeout: 10000 });
    console.log(`[signupUser] Authenticated navigation confirmed`);
  } catch (error) {
    console.error(`[signupUser] Failed to find authenticated navigation. Current URL: ${page.url()}`);
    // Try to find any auth indicator
    const hasLogout = await page.locator('text=Logout').isVisible().catch(() => false);
    const hasLogin = await page.locator('text=Login').first().isVisible().catch(() => false);
    console.log(`[signupUser] Has Logout button: ${hasLogout}, Has Login button: ${hasLogin}`);
    throw error;
  }

  // Additional wait to ensure localStorage is fully written
  await page.waitForTimeout(1000);

  // Verify localStorage has sessionToken
  const sessionToken = await page.evaluate(() => localStorage.getItem('sessionToken'));
  console.log(`[signupUser] SessionToken in localStorage: ${sessionToken ? 'YES' : 'NO'}`);

  if (!sessionToken) {
    throw new Error('Session token not found in localStorage after signup');
  }

  console.log(`[signupUser] Signup complete and authenticated`);
}

/**
 * Helper function to navigate to a page while preserving authentication
 * Uses navigation links instead of direct page.goto() to preserve session
 */
export async function navigateTo(page: any, path: string) {
  console.log(`[navigateTo] Navigating to ${path}`);

  // If we're already on the target path, do nothing
  const currentUrl = page.url();
  if (currentUrl.includes(path)) {
    console.log(`[navigateTo] Already on ${path}`);
    return;
  }

  // For specific routes, click navigation links instead of direct goto
  const navMap: Record<string, string> = {
    '/jobs': 'Jobs',
    '/saved': 'Saved',
    '/applications': 'Applications',
    '/profile': 'Profile',
  };

  const linkText = navMap[path];
  if (linkText) {
    console.log(`[navigateTo] Clicking nav link: ${linkText}`);
    await page.click(`nav >> text=${linkText}`).catch(async () => {
      // If clicking nav fails, fall back to page.goto
      console.log(`[navigateTo] Nav click failed, using page.goto`);
      await page.goto(path);
    });
    await page.waitForLoadState('domcontentloaded');
  } else {
    // For other paths, use page.goto
    await page.goto(path);
    await page.waitForLoadState('domcontentloaded');
  }

  // Wait for client-side React Router redirects to complete
  await page.waitForTimeout(500);

  const finalUrl = page.url();
  console.log(`[navigateTo] Navigation complete, current URL: ${finalUrl}`);

  // Check if we got redirected to onboarding
  if ((finalUrl.includes('/onboarding') || finalUrl.includes('/preferences')) && !path.includes('/onboarding')) {
    console.log(`[navigateTo] Detected onboarding redirect, completing onboarding flow`);
    await completeOnboarding(page);

    // After completing onboarding, navigate to original destination
    console.log(`[navigateTo] Onboarding complete, navigating to original destination: ${path}`);
    if (linkText) {
      await page.click(`nav >> text=${linkText}`);
    } else {
      await page.goto(path);
    }
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    console.log(`[navigateTo] Final URL: ${page.url()}`);
  }
}

/**
 * Helper function to log in an existing user
 */
export async function loginUser(
  page: any,
  email: string,
  password: string
) {
  console.log(`[loginUser] Navigating to /login`);
  await page.goto('/login');

  // Wait for login page to load
  await page.waitForLoadState('domcontentloaded');
  console.log(`[loginUser] Login page loaded, filling form with email: ${email}`);

  // Fill in login form
  await page.fill('input[id="email"]', email);
  await page.fill('input[id="password"]', password);

  console.log(`[loginUser] Form filled, clicking Sign In button`);
  // Submit form
  await page.click('button:has-text("Sign In")');

  console.log(`[loginUser] Button clicked, waiting for navigation`);
  // Wait for navigation to complete - goes to /jobs after successful login
  try {
    await page.waitForURL(/.*(profile|dashboard|jobs|onboarding|preferences)/, { timeout: 20000 });
    console.log(`[loginUser] Successfully navigated to: ${page.url()}`);
  } catch (error) {
    console.error(`[loginUser] Navigation failed. Current URL: ${page.url()}`);
    // Check for error message on login page
    const errorMsg = await page.locator('.text-red-600').textContent().catch(() => null);
    if (errorMsg) {
      console.error(`[loginUser] Login error message: ${errorMsg}`);
    }
    throw error;
  }
}

/**
 * Helper function to log out
 */
export async function logoutUser(page: any) {
  await page.click('button:has-text("Logout")');
  await page.waitForURL('/');
}
