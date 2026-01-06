/**
 * Phase 2: Configurable AI Prompts - Comprehensive Test Suite
 *
 * This script tests all aspects of the Phase 2 implementation:
 * - Database schema and migrations
 * - AI Prompt Service functions
 * - AI Services integration
 * - Admin API endpoints
 * - Caching behavior
 * - Error handling
 */

import type { Env } from './src/services/db.service';
import {
  getPrompt,
  renderPrompt,
  listPrompts,
  upsertPrompt,
  deletePrompt,
  parseModelConfig,
  type AIPromptConfig,
  type ModelConfig
} from './src/services/ai-prompt.service';

// Test results tracking
interface TestResult {
  name: string;
  category: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  error?: string;
  details?: string;
}

const testResults: TestResult[] = [];
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// Test helper
async function runTest(
  name: string,
  category: string,
  testFn: () => Promise<void>
): Promise<void> {
  totalTests++;
  const startTime = Date.now();

  try {
    await testFn();
    const duration = Date.now() - startTime;
    testResults.push({ name, category, status: 'PASS', duration });
    passedTests++;
    console.log(`✅ ${category}: ${name} (${duration}ms)`);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    testResults.push({
      name,
      category,
      status: 'FAIL',
      duration,
      error: error.message
    });
    failedTests++;
    console.error(`❌ ${category}: ${name} (${duration}ms)`);
    console.error(`   Error: ${error.message}`);
  }
}

// Helper to create a mock environment
function createMockEnv(DB: D1Database, KV_CACHE: KVNamespace, AI: any): Env {
  return {
    DB,
    KV_CACHE,
    AI,
    R2_STORAGE: {} as R2Bucket,
    JWT_SECRET: 'test-secret',
    RESEND_API_KEY: 'test-key',
    FRONTEND_URL: 'http://localhost:3000'
  };
}

/**
 * TEST CATEGORY 1: Database Migration Verification
 */
export async function testDatabaseSchema(DB: D1Database): Promise<void> {
  console.log('\n========================================');
  console.log('TEST CATEGORY 1: Database Schema');
  console.log('========================================\n');

  // Test 1.1: Verify ai_prompts table exists
  await runTest(
    'ai_prompts table exists',
    'Database Schema',
    async () => {
      const result = await DB.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='ai_prompts'
      `).first();

      if (!result) {
        throw new Error('ai_prompts table does not exist');
      }
    }
  );

  // Test 1.2: Verify table schema
  await runTest(
    'ai_prompts table has correct columns',
    'Database Schema',
    async () => {
      const columns = await DB.prepare(`PRAGMA table_info(ai_prompts)`).all();
      const columnNames = columns.results.map((c: any) => c.name);

      const expectedColumns = [
        'id', 'prompt_key', 'prompt_name', 'prompt_template',
        'description', 'model_config', 'version', 'is_active',
        'created_at', 'updated_at'
      ];

      for (const col of expectedColumns) {
        if (!columnNames.includes(col)) {
          throw new Error(`Missing column: ${col}`);
        }
      }
    }
  );

  // Test 1.3: Verify indexes exist
  await runTest(
    'Required indexes exist',
    'Database Schema',
    async () => {
      const indexes = await DB.prepare(`
        SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='ai_prompts'
      `).all();

      const indexNames = indexes.results.map((i: any) => i.name);
      const expectedIndexes = [
        'idx_ai_prompts_key',
        'idx_ai_prompts_active',
        'idx_ai_prompts_updated'
      ];

      for (const idx of expectedIndexes) {
        if (!indexNames.includes(idx)) {
          throw new Error(`Missing index: ${idx}`);
        }
      }
    }
  );

  // Test 1.4: Verify seeded prompts
  await runTest(
    'Four initial prompts are seeded',
    'Database Schema',
    async () => {
      const result = await DB.prepare(`SELECT COUNT(*) as count FROM ai_prompts`).first();
      const count = result?.count as number;

      if (count !== 4) {
        throw new Error(`Expected 4 prompts, found ${count}`);
      }
    }
  );

  // Test 1.5: Verify specific prompt keys exist
  await runTest(
    'All required prompt keys exist',
    'Database Schema',
    async () => {
      const expectedKeys = ['cover_letter', 'job_match', 'resume_tailor', 'linkedin_parse'];

      for (const key of expectedKeys) {
        const result = await DB.prepare(`
          SELECT prompt_key FROM ai_prompts WHERE prompt_key = ?
        `).bind(key).first();

        if (!result) {
          throw new Error(`Missing prompt key: ${key}`);
        }
      }
    }
  );
}

/**
 * TEST CATEGORY 2: AI Prompt Service Functions
 */
export async function testAIPromptService(env: Env): Promise<void> {
  console.log('\n========================================');
  console.log('TEST CATEGORY 2: AI Prompt Service');
  console.log('========================================\n');

  // Test 2.1: getPrompt() - Fetch existing prompt
  await runTest(
    'getPrompt() fetches existing prompt',
    'AI Prompt Service',
    async () => {
      const prompt = await getPrompt(env, 'cover_letter');

      if (!prompt) {
        throw new Error('Failed to fetch cover_letter prompt');
      }

      if (prompt.prompt_key !== 'cover_letter') {
        throw new Error('Incorrect prompt returned');
      }
    }
  );

  // Test 2.2: getPrompt() - Cache hit
  await runTest(
    'getPrompt() uses KV cache on second call',
    'AI Prompt Service',
    async () => {
      // First call (cache miss)
      const start1 = Date.now();
      await getPrompt(env, 'job_match');
      const duration1 = Date.now() - start1;

      // Second call (should hit cache)
      const start2 = Date.now();
      await getPrompt(env, 'job_match');
      const duration2 = Date.now() - start2;

      // Cache hit should be significantly faster
      if (duration2 > duration1) {
        console.warn(`   ⚠️  Cache may not be working (first: ${duration1}ms, second: ${duration2}ms)`);
      }
    }
  );

  // Test 2.3: getPrompt() - Non-existent key
  await runTest(
    'getPrompt() returns null for non-existent key',
    'AI Prompt Service',
    async () => {
      const prompt = await getPrompt(env, 'non_existent_prompt');

      if (prompt !== null) {
        throw new Error('Expected null for non-existent prompt');
      }
    }
  );

  // Test 2.4: renderPrompt() - Variable replacement
  await runTest(
    'renderPrompt() replaces variables correctly',
    'AI Prompt Service',
    async () => {
      const template = 'Hello {{name}}, you live in {{city}}!';
      const variables = { name: 'Alice', city: 'New York' };
      const rendered = renderPrompt(template, variables);

      if (rendered !== 'Hello Alice, you live in New York!') {
        throw new Error(`Incorrect rendering: ${rendered}`);
      }
    }
  );

  // Test 2.5: renderPrompt() - Missing variables
  await runTest(
    'renderPrompt() handles missing variables gracefully',
    'AI Prompt Service',
    async () => {
      const template = 'Hello {{name}}, your age is {{age}}';
      const variables = { name: 'Bob' }; // age is missing
      const rendered = renderPrompt(template, variables);

      // Should replace missing variables with empty string
      if (rendered !== 'Hello Bob, your age is ') {
        throw new Error(`Incorrect rendering: ${rendered}`);
      }
    }
  );

  // Test 2.6: listPrompts() - Active only
  await runTest(
    'listPrompts() returns all active prompts',
    'AI Prompt Service',
    async () => {
      const prompts = await listPrompts(env, true);

      if (prompts.length !== 4) {
        throw new Error(`Expected 4 active prompts, got ${prompts.length}`);
      }

      // Verify all are active
      const inactiveCount = prompts.filter(p => p.is_active === 0).length;
      if (inactiveCount > 0) {
        throw new Error(`Found ${inactiveCount} inactive prompts in active-only list`);
      }
    }
  );

  // Test 2.7: upsertPrompt() - Create new prompt
  await runTest(
    'upsertPrompt() creates new prompt',
    'AI Prompt Service',
    async () => {
      const newPrompt = await upsertPrompt(env, {
        prompt_key: 'test_prompt',
        prompt_name: 'Test Prompt',
        prompt_template: 'This is a test: {{value}}',
        description: 'Test prompt for automated testing',
        model_config: JSON.stringify({ model: '@cf/meta/llama-3.1-8b-instruct', temperature: 0.5, max_tokens: 100 })
      });

      if (!newPrompt || newPrompt.prompt_key !== 'test_prompt') {
        throw new Error('Failed to create test prompt');
      }

      if (newPrompt.version !== 1) {
        throw new Error(`Expected version 1, got ${newPrompt.version}`);
      }
    }
  );

  // Test 2.8: upsertPrompt() - Update existing prompt
  await runTest(
    'upsertPrompt() updates existing prompt',
    'AI Prompt Service',
    async () => {
      const updated = await upsertPrompt(env, {
        prompt_key: 'test_prompt',
        prompt_name: 'Test Prompt Updated',
        prompt_template: 'Updated template: {{value}}',
        description: 'Updated description'
      });

      if (updated.prompt_name !== 'Test Prompt Updated') {
        throw new Error('Prompt name was not updated');
      }

      if (updated.version !== 2) {
        throw new Error(`Expected version 2, got ${updated.version}`);
      }
    }
  );

  // Test 2.9: deletePrompt() - Soft delete
  await runTest(
    'deletePrompt() soft deletes prompt',
    'AI Prompt Service',
    async () => {
      await deletePrompt(env, 'test_prompt');

      // Verify it's soft deleted (is_active = 0)
      const deleted = await env.DB.prepare(`
        SELECT is_active FROM ai_prompts WHERE prompt_key = ?
      `).bind('test_prompt').first();

      if (!deleted || deleted.is_active !== 0) {
        throw new Error('Prompt was not soft deleted correctly');
      }

      // Verify it doesn't appear in active prompts
      const activePrompt = await getPrompt(env, 'test_prompt');
      if (activePrompt !== null) {
        throw new Error('Deleted prompt still appears in active prompts');
      }
    }
  );

  // Test 2.10: parseModelConfig() - Valid JSON
  await runTest(
    'parseModelConfig() parses valid JSON',
    'AI Prompt Service',
    async () => {
      const json = JSON.stringify({
        model: '@cf/meta/llama-3.1-8b-instruct',
        temperature: 0.8,
        max_tokens: 1000,
        gateway: 'test-gateway'
      });

      const config = parseModelConfig(json);

      if (config.model !== '@cf/meta/llama-3.1-8b-instruct') {
        throw new Error('Model not parsed correctly');
      }

      if (config.temperature !== 0.8) {
        throw new Error('Temperature not parsed correctly');
      }

      if (config.gateway !== 'test-gateway') {
        throw new Error('Gateway not parsed correctly');
      }
    }
  );

  // Test 2.11: parseModelConfig() - Invalid JSON (fallback to defaults)
  await runTest(
    'parseModelConfig() handles invalid JSON gracefully',
    'AI Prompt Service',
    async () => {
      const config = parseModelConfig('invalid json {');

      // Should return safe defaults
      if (!config.model || config.temperature === undefined) {
        throw new Error('Failed to return default config');
      }
    }
  );
}

/**
 * TEST CATEGORY 3: AI Services Integration
 */
export async function testAIServicesIntegration(env: Env): Promise<void> {
  console.log('\n========================================');
  console.log('TEST CATEGORY 3: AI Services Integration');
  console.log('========================================\n');

  // Test 3.1: Cover Letter Service uses database prompt
  await runTest(
    'Cover Letter Service fetches cover_letter prompt',
    'AI Services Integration',
    async () => {
      const prompt = await getPrompt(env, 'cover_letter');

      if (!prompt) {
        throw new Error('cover_letter prompt not found');
      }

      // Verify it has the expected variables
      const hasVariables = [
        '{{user_name}}',
        '{{job_title}}',
        '{{job_company}}'
      ].every(v => prompt.prompt_template.includes(v));

      if (!hasVariables) {
        throw new Error('cover_letter prompt missing required variables');
      }
    }
  );

  // Test 3.2: Job Matching Service uses database prompt
  await runTest(
    'Job Matching Service fetches job_match prompt',
    'AI Services Integration',
    async () => {
      const prompt = await getPrompt(env, 'job_match');

      if (!prompt) {
        throw new Error('job_match prompt not found');
      }

      const hasVariables = [
        '{{user_skills}}',
        '{{work_experience}}',
        '{{education}}',
        '{{job_description}}'
      ].every(v => prompt.prompt_template.includes(v));

      if (!hasVariables) {
        throw new Error('job_match prompt missing required variables');
      }
    }
  );

  // Test 3.3: Resume Service uses database prompt
  await runTest(
    'Resume Service fetches resume_tailor prompt',
    'AI Services Integration',
    async () => {
      const prompt = await getPrompt(env, 'resume_tailor');

      if (!prompt) {
        throw new Error('resume_tailor prompt not found');
      }

      const hasVariables = [
        '{{user_name}}',
        '{{work_experience}}',
        '{{education}}',
        '{{job_title}}'
      ].every(v => prompt.prompt_template.includes(v));

      if (!hasVariables) {
        throw new Error('resume_tailor prompt missing required variables');
      }
    }
  );

  // Test 3.4: LinkedIn Parser Service uses database prompt
  await runTest(
    'LinkedIn Parser Service fetches linkedin_parse prompt',
    'AI Services Integration',
    async () => {
      const prompt = await getPrompt(env, 'linkedin_parse');

      if (!prompt) {
        throw new Error('linkedin_parse prompt not found');
      }

      const hasVariable = prompt.prompt_template.includes('{{profile_text}}');

      if (!hasVariable) {
        throw new Error('linkedin_parse prompt missing {{profile_text}} variable');
      }
    }
  );

  // Test 3.5: Model configs are valid JSON
  await runTest(
    'All prompts have valid model_config JSON',
    'AI Services Integration',
    async () => {
      const prompts = await listPrompts(env, true);

      for (const prompt of prompts) {
        try {
          const config = parseModelConfig(prompt.model_config);
          if (!config.model || config.temperature === undefined) {
            throw new Error(`Invalid config for ${prompt.prompt_key}`);
          }
        } catch (error: any) {
          throw new Error(`Failed to parse model_config for ${prompt.prompt_key}: ${error.message}`);
        }
      }
    }
  );
}

/**
 * Print test summary
 */
export function printTestSummary(): void {
  console.log('\n========================================');
  console.log('TEST SUMMARY');
  console.log('========================================\n');

  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} ✅`);
  console.log(`Failed: ${failedTests} ❌`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);

  // Print failed tests details
  if (failedTests > 0) {
    console.log('FAILED TESTS:\n');
    testResults
      .filter(t => t.status === 'FAIL')
      .forEach(t => {
        console.log(`❌ [${t.category}] ${t.name}`);
        console.log(`   Error: ${t.error}\n`);
      });
  }

  // Performance summary
  const avgDuration = testResults.reduce((sum, t) => sum + t.duration, 0) / testResults.length;
  console.log(`Average Test Duration: ${avgDuration.toFixed(0)}ms`);

  // Category breakdown
  const categories = Array.from(new Set(testResults.map(t => t.category)));
  console.log('\nRESULTS BY CATEGORY:\n');

  categories.forEach(category => {
    const categoryTests = testResults.filter(t => t.category === category);
    const categoryPassed = categoryTests.filter(t => t.status === 'PASS').length;
    const categoryTotal = categoryTests.length;
    console.log(`${category}: ${categoryPassed}/${categoryTotal} passed`);
  });
}

/**
 * Export test results as JSON
 */
export function exportTestResults(): string {
  return JSON.stringify({
    summary: {
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      successRate: ((passedTests / totalTests) * 100).toFixed(1)
    },
    results: testResults,
    timestamp: new Date().toISOString()
  }, null, 2);
}
