/**
 * Test Runner for Phase 2: Configurable AI Prompts
 *
 * Usage:
 *   npx tsx run-phase2-tests.ts
 *
 * This script runs all Phase 2 tests against a local D1 database
 */

import { unstable_dev } from 'wrangler';
import type { UnstableDevWorker } from 'wrangler';
import {
  testDatabaseSchema,
  testAIPromptService,
  testAIServicesIntegration,
  printTestSummary,
  exportTestResults
} from './test-phase2';
import { writeFileSync } from 'fs';

async function main() {
  console.log('========================================');
  console.log('Phase 2: Configurable AI Prompts');
  console.log('Test Suite Runner');
  console.log('========================================\n');

  let worker: UnstableDevWorker | undefined;

  try {
    // Start local dev server
    console.log('Starting local dev server...\n');
    worker = await unstable_dev('src/index.ts', {
      experimental: { disableExperimentalWarning: true },
      local: true
    });

    // Get environment bindings
    const env = await worker.fetch('http://localhost').then(r => r.json());

    // Note: We need to access the bindings directly from the worker
    // This is a mock for demonstration - in production, you'd use the actual bindings
    const mockEnv = {
      DB: (worker as any).env.DB,
      KV_CACHE: (worker as any).env.KV_CACHE,
      AI: (worker as any).env.AI,
      R2_STORAGE: (worker as any).env.R2_STORAGE,
      JWT_SECRET: 'test-secret',
      RESEND_API_KEY: 'test-key',
      FRONTEND_URL: 'http://localhost:3000'
    };

    // Run test categories
    await testDatabaseSchema(mockEnv.DB);
    await testAIPromptService(mockEnv);
    await testAIServicesIntegration(mockEnv);

    // Print summary
    printTestSummary();

    // Export results to JSON
    const resultsJson = exportTestResults();
    writeFileSync('./test-results-phase2.json', resultsJson);
    console.log('\nTest results exported to: test-results-phase2.json\n');

  } catch (error: any) {
    console.error('Test runner error:', error);
    process.exit(1);
  } finally {
    // Clean up
    if (worker) {
      await worker.stop();
      console.log('Dev server stopped.');
    }
  }
}

main();
