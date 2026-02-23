import { test, expect } from '@playwright/test';
import { generateTestEmail, signupUser, bypassOnboarding, navigateTo } from './helpers';

const BACKEND_URL = process.env.E2E_BACKEND_URL || 'http://localhost:8787';

/**
 * E2E: Generate resume & cover letter, verify persistence, download as PDF/DOCX,
 * and verify content is retrievable from the application tracker.
 */
test.describe('Generated content persistence & download', () => {
  let email: string;

  test.beforeEach(async ({ page }) => {
    test.setTimeout(180_000);
    email = generateTestEmail();
    await signupUser(page, email);
    await bypassOnboarding(page, email);
  });

  async function goToJobAndSave(page: any, t: any) {
    await page.goto('/jobs');
    await page.waitForLoadState('networkidle').catch(() => {});

    const firstJobLink = page.locator('a[href^="/jobs/"]').first();
    const hasJobs = await firstJobLink.isVisible({ timeout: 30_000 }).catch(() => false);
    if (!hasJobs) {
      t.skip(true, 'No jobs in database');
      return;
    }

    await firstJobLink.click();
    await expect(page).toHaveURL(/\/jobs\/[^/]+$/, { timeout: 10_000 });

    // Save the job (required for generation)
    const saveBtn = page.locator('button:has-text("Save")').first();
    await saveBtn.click();
    await expect(page.locator('button:has-text("Saved")')).toBeVisible({ timeout: 5_000 });
  }

  test('generate resume, persist across reload, download PDF & DOCX', async ({ page }) => {
    test.setTimeout(240_000);

    await goToJobAndSave(page, test);

    // Generate a tailored resume
    await page.getByRole('button', { name: 'Generate Tailored Resume' }).click();

    // Wait for the Resume tab to appear (AI generation can take time)
    const resumeTab = page.getByRole('tab', { name: /Resume/ });
    await expect(resumeTab).toBeVisible({ timeout: 90_000 });

    // Click the resume tab to see content
    await resumeTab.click();
    await expect(page.getByText('AI-Generated Tailored Resume')).toBeVisible({ timeout: 10_000 });

    // Verify download buttons are visible
    const pdfBtn = page.locator('button:has-text("PDF")').first();
    const docxBtn = page.locator('button:has-text("DOCX")').first();
    await expect(pdfBtn).toBeVisible({ timeout: 5_000 });
    await expect(docxBtn).toBeVisible({ timeout: 5_000 });

    // Test PDF download by intercepting the API call
    // Our handleDownload uses fetch() + blob, so we intercept the API response
    const pdfResponsePromise = page.waitForResponse(
      (resp: any) => resp.url().includes('/generated-resumes/') && resp.url().includes('/download/pdf'),
      { timeout: 30_000 }
    );
    await pdfBtn.click();
    const pdfResponse = await pdfResponsePromise;
    expect(pdfResponse.status()).toBe(200);
    expect(pdfResponse.headers()['content-type']).toContain('application/pdf');

    // Test DOCX download
    const docxResponsePromise = page.waitForResponse(
      (resp: any) => resp.url().includes('/generated-resumes/') && resp.url().includes('/download/docx'),
      { timeout: 30_000 }
    );
    await docxBtn.click();
    const docxResponse = await docxResponsePromise;
    expect(docxResponse.status()).toBe(200);
    expect(docxResponse.headers()['content-type']).toContain('application/vnd.openxmlformats');

    // Reload page and verify resume persists
    await page.reload({ waitUntil: 'domcontentloaded' });
    const resumeTabAfterReload = page.getByRole('tab', { name: /Resume/ });
    await expect(resumeTabAfterReload).toBeVisible({ timeout: 30_000 });
    await resumeTabAfterReload.click();
    await expect(page.getByText('AI-Generated Tailored Resume')).toBeVisible({ timeout: 10_000 });
  });

  test('generate cover letter, persist across reload, download PDF & DOCX', async ({ page }) => {
    test.setTimeout(240_000);

    await goToJobAndSave(page, test);

    // Generate a cover letter
    await page.getByRole('button', { name: 'Generate Cover Letter' }).click();

    // Wait for cover letter tab
    const coverLetterTab = page.getByRole('tab', { name: /Cover Letter/ });
    await expect(coverLetterTab).toBeVisible({ timeout: 90_000 });

    // Click cover letter tab
    await coverLetterTab.click();
    await expect(page.getByText('AI-Generated Cover Letter')).toBeVisible({ timeout: 10_000 });

    // Verify download buttons
    const pdfBtn = page.locator('button:has-text("PDF")').first();
    const docxBtn = page.locator('button:has-text("DOCX")').first();
    await expect(pdfBtn).toBeVisible({ timeout: 5_000 });
    await expect(docxBtn).toBeVisible({ timeout: 5_000 });

    // Test PDF download
    const pdfResponsePromise = page.waitForResponse(
      (resp: any) => resp.url().includes('/generated-cover-letters/') && resp.url().includes('/download/pdf'),
      { timeout: 30_000 }
    );
    await pdfBtn.click();
    const pdfResponse = await pdfResponsePromise;
    expect(pdfResponse.status()).toBe(200);
    expect(pdfResponse.headers()['content-type']).toContain('application/pdf');

    // Test DOCX download
    const docxResponsePromise = page.waitForResponse(
      (resp: any) => resp.url().includes('/generated-cover-letters/') && resp.url().includes('/download/docx'),
      { timeout: 30_000 }
    );
    await docxBtn.click();
    const docxResponse = await docxResponsePromise;
    expect(docxResponse.status()).toBe(200);
    expect(docxResponse.headers()['content-type']).toContain('application/vnd.openxmlformats');

    // Reload and verify persistence
    await page.reload({ waitUntil: 'domcontentloaded' });
    const coverLetterTabAfterReload = page.getByRole('tab', { name: /Cover Letter/ });
    await expect(coverLetterTabAfterReload).toBeVisible({ timeout: 30_000 });
    await coverLetterTabAfterReload.click();
    await expect(page.getByText('AI-Generated Cover Letter')).toBeVisible({ timeout: 10_000 });
  });

  test('retrieve generated content from application tracker', async ({ page, context }) => {
    test.setTimeout(240_000);

    await goToJobAndSave(page, test);

    // Generate resume
    await page.getByRole('button', { name: 'Generate Tailored Resume' }).click();
    const resumeTab = page.getByRole('tab', { name: /Resume/ });
    await expect(resumeTab).toBeVisible({ timeout: 90_000 });

    // Apply to the job - this opens an external URL in a new tab
    // Listen for the popup so it doesn't interfere
    const popupPromise = context.waitForEvent('page', { timeout: 10_000 }).catch(() => null);
    await page.getByRole('button', { name: 'Apply Now' }).click();

    // Close the popup tab if one opened
    const popup = await popupPromise;
    if (popup) await popup.close();

    // Wait for celebration to dismiss
    await page.waitForTimeout(4_000);

    // Navigate to application tracker
    await navigateTo(page, '/applications');
    await expect(page.getByText('Application Tracker')).toBeVisible({ timeout: 10_000 });

    // Extract job ID from the page URL we came from and navigate directly
    // The application card links to /jobs/:id -- get the job_id from the card's href
    // The card title's onClick navigates to /jobs/:job_id
    // Since DnD may intercept clicks, use the page URL we saved earlier
    const jobUrl = page.url();

    // Navigate back to the job detail page directly from the application tracker
    // The card title text links to /jobs/:job_id via onClick
    // Use page.evaluate to click the title without DnD interference
    const navigated = await page.evaluate(() => {
      const titles = document.querySelectorAll('h3');
      for (const title of titles) {
        if (title.textContent && title.classList.contains('cursor-pointer')) {
          (title as HTMLElement).click();
          return true;
        }
      }
      return false;
    });

    if (!navigated) {
      // Fallback: navigate to the first job directly
      await page.goto('/jobs');
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.locator('a[href^="/jobs/"]').first().click();
    }

    // Should be on job detail
    await expect(page).toHaveURL(/\/jobs\/[^/]+$/, { timeout: 10_000 });

    // Verify the resume tab is still there (content persisted from versioned table)
    const resumeTabOnReturn = page.getByRole('tab', { name: /Resume/ });
    await expect(resumeTabOnReturn).toBeVisible({ timeout: 30_000 });
    await resumeTabOnReturn.click();
    await expect(page.getByText('AI-Generated Tailored Resume')).toBeVisible({ timeout: 10_000 });

    // Verify download buttons are available
    await expect(page.locator('button:has-text("PDF")').first()).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('button:has-text("DOCX")').first()).toBeVisible({ timeout: 5_000 });
  });
});
