import { test, expect } from '@playwright/test';

/**
 * E2E test: signup -> profile setup -> job search -> apply
 *
 * Prerequisites:
 *   - Frontend dev server running on http://localhost:5173 (or started by Playwright webServer)
 *   - Backend dev server running on http://localhost:8787 (or started by Playwright webServer)
 *   - D1 database seeded with at least one job (see packages/backend/migrations)
 *
 * Note: This test requires at least one job in the database to complete the apply step.
 * If running against a fresh local D1 with no seed data, steps 1-3 will pass but
 * the apply step will be skipped with a comment.
 */
test('signup -> profile setup -> job search -> apply', async ({ page }) => {
  const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 9999)}@example.com`;
  const password = 'TestPassword123!';

  // ---- Step 1: Signup ----
  await page.goto('/signup');
  await expect(page).toHaveURL('/signup');

  // Fill email and password
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);

  // Submit the form
  await page.getByRole('button', { name: 'Sign Up' }).click();

  // Should redirect to /profile after successful signup
  await expect(page).toHaveURL('/profile', { timeout: 10000 });

  // ---- Step 2: Profile setup ----
  // Click the Edit button to enter edit mode
  await page.getByRole('button', { name: 'Edit' }).click();

  // Fill in full name
  await page.getByLabel('Full Name').fill('E2E Test User');

  // Submit profile save
  await page.getByRole('button', { name: 'Save Changes' }).click();

  // After save, should exit edit mode — verify name appears in read-only view
  await expect(page.getByText('E2E Test User')).toBeVisible({ timeout: 10000 });

  // ---- Step 3: Job search ----
  await page.goto('/jobs');
  await expect(page).toHaveURL('/jobs');

  // Wait for job listings to load (either jobs appear or empty state message)
  await page.waitForLoadState('networkidle', { timeout: 15000 });

  // Check whether there are jobs or empty state
  const jobsExist = await page.getByRole('button', { name: 'View Details' }).count() > 0;
  const emptyState = await page.getByText('No jobs found matching your criteria').isVisible().catch(() => false);

  if (!jobsExist && emptyState) {
    // No jobs seeded — document partial completion
    test.info().annotations.push({
      type: 'info',
      description: 'Steps 1-3 passed but apply step skipped: no jobs in dev database. Seed jobs to run full flow.'
    });
    // Test passes for signup+profile+jobs navigation; apply requires seeded data
    return;
  }

  // ---- Step 4: Click a job and apply ----
  // Click the first "View Details" button to navigate to job detail
  await page.getByRole('button', { name: 'View Details' }).first().click();

  // Wait for job detail page (URL pattern /jobs/:id)
  await expect(page).toHaveURL(/\/jobs\/[^/]+$/, { timeout: 10000 });

  // Click "Apply Now" button
  await page.getByRole('button', { name: 'Apply Now' }).click();

  // After applying, should redirect to /applications
  await expect(page).toHaveURL('/applications', { timeout: 10000 });

  // Verify application tracker page is shown
  await expect(page.getByText('Application Tracker')).toBeVisible();
});
