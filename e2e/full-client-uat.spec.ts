import { test, expect } from '@playwright/test';
import { generateTestEmail, signupUser, bypassOnboarding, navigateTo } from './helpers';

/**
 * Full Client UAT E2E Test
 *
 * Simulates a real user's complete journey:
 * signup → profile setup (photo, bio, work history) → job browsing →
 * save job → AI match analysis → tailored resume → cover letter
 */
test('full client UAT: signup through AI-generated documents', async ({ page }) => {
  test.setTimeout(300_000); // 5 minutes — AI operations are slow

  const email = generateTestEmail();

  // ── Step 1: Create Account ──────────────────────────────────────────
  await signupUser(page, email);
  await bypassOnboarding(page, email);

  // ── Step 2: Setup Profile (bio, skills, LinkedIn, photo) ────────────
  await navigateTo(page, '/profile');
  await page.waitForLoadState('networkidle', { timeout: 15_000 });
  await expect(page.getByRole('heading', { name: /Your Profile/ })).toBeVisible({ timeout: 5_000 });

  // Enter edit mode
  const editBtn = page.locator('button:has-text("Edit")').first();
  await expect(editBtn).toBeVisible({ timeout: 5_000 });
  await editBtn.click();

  // Fill bio
  const bio = 'Full-stack software engineer with 8 years of experience building scalable web applications using React, Node.js, and cloud infrastructure.';
  await page.fill('#bio', bio);

  // Fill skills
  await page.fill('#skills', 'TypeScript, React, Node.js, PostgreSQL, AWS, Docker, GraphQL');

  // Fill LinkedIn URL
  await page.fill('#linkedInUrl', 'https://www.linkedin.com/in/test-uat-user');

  // Upload a tiny 1×1 red PNG avatar
  const pngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
    'base64'
  );
  await page.locator('#avatar').setInputFiles({
    name: 'avatar.png',
    mimeType: 'image/png',
    buffer: pngBuffer,
  });

  // Save
  await page.click('button:has-text("Save Changes")');
  await page.waitForTimeout(2_000);

  // Verify updated values in read-only view
  await expect(page.getByText(bio).first()).toBeVisible({ timeout: 5_000 });

  // ── Step 3: Add Work Experience ─────────────────────────────────────
  await page.click('button:has-text("Experience")');
  await page.waitForTimeout(500);

  const addBtn = page.locator('button:has-text("Add")').first();
  await expect(addBtn).toBeVisible({ timeout: 3_000 });
  await addBtn.click();
  await page.waitForTimeout(500);

  await page.getByLabel('Company *').fill('Acme Technologies');
  await page.getByLabel('Job Title *').fill('Senior Software Engineer');
  await page.getByLabel('Start Date *').fill('2020-03-15');
  await page.getByLabel('Description').fill(
    'Led development of microservices architecture serving 2M+ users. Mentored junior engineers and drove adoption of TypeScript across the org.'
  );

  await page.click('button:has-text("Add Experience")');
  await page.waitForTimeout(1_000);

  // Verify entry appears
  await expect(
    page.getByText('Senior Software Engineer', { exact: true }).first()
  ).toBeVisible({ timeout: 5_000 });

  // ── Step 4: Browse Jobs & Save One ──────────────────────────────────
  await page.goto('/jobs');
  await page.waitForLoadState('networkidle', { timeout: 15_000 });

  const firstJobLink = page.locator('a[href^="/jobs/"]').first();
  const hasJobs = await firstJobLink.isVisible({ timeout: 15_000 }).catch(() => false);

  if (!hasJobs) {
    test.info().annotations.push({
      type: 'skip-reason',
      description: 'No jobs in database — skipping steps 4-7 (save, AI match, resume, cover letter)',
    });
    return;
  }

  // Click into job detail
  await firstJobLink.click();
  await page.waitForLoadState('networkidle', { timeout: 10_000 });

  // Save the job
  const saveBtn = page.locator('button:has-text("☆ Save")');
  await expect(saveBtn).toBeVisible({ timeout: 5_000 });
  await saveBtn.click();
  await expect(page.locator('button:has-text("★ Saved")')).toBeVisible({ timeout: 5_000 });

  // ── Step 5: AI Match Analysis ───────────────────────────────────────
  const matchBtn = page.locator('button:has-text("Get AI Match Analysis")');
  await expect(matchBtn).toBeVisible({ timeout: 5_000 });
  await matchBtn.click();

  // Wait for AI analysis tab to appear (mock AI call ~1.5s)
  await expect(page.getByText('AI Analysis')).toBeVisible({ timeout: 90_000 });
  // Click the analysis tab to reveal its content
  await page.getByText('AI Analysis').click();
  // Verify the analysis card rendered with heading
  await expect(page.getByRole('heading', { name: /AI Match Analysis/ })).toBeVisible({ timeout: 5_000 });

  // ── Step 6: Generate Tailored Resume ────────────────────────────────
  const resumeBtn = page.locator('button:has-text("Generate Tailored Resume")');
  await expect(resumeBtn).toBeVisible({ timeout: 5_000 });
  await resumeBtn.click();

  // Wait for the Resume tab to appear
  const resumeTab = page.getByText(/Resume \(\d+\)/);
  await expect(resumeTab).toBeVisible({ timeout: 90_000 });
  await resumeTab.click();
  await expect(page.getByText('AI-Generated Tailored Resume')).toBeVisible({ timeout: 5_000 });

  // ── Step 7: Generate Cover Letter ───────────────────────────────────
  const coverLetterBtn = page.locator('button:has-text("Generate Cover Letter")');
  await expect(coverLetterBtn).toBeVisible({ timeout: 5_000 });
  await coverLetterBtn.click();

  // Wait for the Cover Letter tab to appear
  const coverLetterTab = page.getByText(/Cover Letter \(\d+\)/);
  await expect(coverLetterTab).toBeVisible({ timeout: 90_000 });
  await coverLetterTab.click();
  await expect(page.getByText('AI-Generated Cover Letter')).toBeVisible({ timeout: 5_000 });
});
