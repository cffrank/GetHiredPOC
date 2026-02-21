import type { Env } from './db.service';

/**
 * AI Prompt Configuration Interface
 * Represents a configurable AI prompt template with model settings
 */
export interface AIPromptConfig {
  id: string;
  prompt_key: string;
  prompt_name: string;
  prompt_template: string;
  description: string | null;
  model_config: string; // JSON string
  version: number;
  is_active: number;
  created_at: number;
  updated_at: number;
}

/**
 * Parsed Model Configuration
 */
export interface ModelConfig {
  model: string;
  temperature: number;
  max_tokens: number;
  gateway?: string;
}

/**
 * Get an AI prompt by key with KV caching (24hr TTL)
 *
 * @param env - Cloudflare environment bindings
 * @param promptKey - Unique prompt identifier (e.g., 'cover_letter', 'job_match')
 * @returns Promise<AIPromptConfig | null> - Prompt configuration or null if not found
 */
export async function getPrompt(
  env: Env,
  promptKey: string
): Promise<AIPromptConfig | null> {
  const cacheKey = `prompt:${promptKey}`;

  try {
    // Try KV cache first (24-hour TTL)
    const cached = await env.KV_CACHE.get(cacheKey, 'json');
    if (cached) {
      console.log(`[AI Prompt] Cache hit for ${promptKey}`);
      return cached as AIPromptConfig;
    }

    console.log(`[AI Prompt] Cache miss for ${promptKey}, fetching from DB`);

    // Fetch from database
    const prompt = await env.DB.prepare(`
      SELECT *
      FROM ai_prompts
      WHERE prompt_key = ? AND is_active = 1
      ORDER BY version DESC
      LIMIT 1
    `).bind(promptKey).first<AIPromptConfig>();

    if (!prompt) {
      console.warn(`[AI Prompt] Prompt not found: ${promptKey}`);
      return null;
    }

    // Cache for 24 hours
    await env.KV_CACHE.put(cacheKey, JSON.stringify(prompt), {
      expirationTtl: 86400 // 24 hours
    });

    console.log(`[AI Prompt] Loaded and cached prompt: ${promptKey}`);
    return prompt;
  } catch (error: unknown) {
    console.error(`[AI Prompt] Error fetching prompt ${promptKey}:`, error);
    throw new Error(`Failed to fetch prompt: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Render a prompt template by replacing {{variable}} placeholders with actual values
 *
 * @param template - Prompt template string with {{variable}} placeholders
 * @param variables - Object mapping variable names to values
 * @returns string - Rendered prompt with all variables replaced
 */
export function renderPrompt(
  template: string,
  variables: Record<string, any>
): string {
  let rendered = template;

  // Replace all {{variable}} placeholders
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    const replacement = value !== null && value !== undefined ? String(value) : '';
    rendered = rendered.split(placeholder).join(replacement);
  }

  // Check for unreplaced variables (debugging)
  const unreplacedMatches = rendered.match(/\{\{[\w_]+\}\}/g);
  if (unreplacedMatches) {
    console.warn('[AI Prompt] Unreplaced variables found:', unreplacedMatches);
  }

  return rendered;
}

/**
 * Parse model configuration JSON
 *
 * @param modelConfigJson - JSON string of model configuration
 * @returns ModelConfig - Parsed model configuration object
 */
export function parseModelConfig(modelConfigJson: string): ModelConfig {
  try {
    const config = JSON.parse(modelConfigJson);
    return {
      model: config.model || '@cf/meta/llama-3.1-8b-instruct',
      temperature: config.temperature ?? 0.7,
      max_tokens: config.max_tokens || 1000,
      gateway: config.gateway
    };
  } catch (error: unknown) {
    console.error('[AI Prompt] Failed to parse model config:', error);
    // Return safe defaults
    return {
      model: '@cf/meta/llama-3.1-8b-instruct',
      temperature: 0.7,
      max_tokens: 1000
    };
  }
}

/**
 * List all AI prompts (optionally filter by active status)
 *
 * @param env - Cloudflare environment bindings
 * @param activeOnly - If true, only return active prompts (default: true)
 * @returns Promise<AIPromptConfig[]> - Array of prompt configurations
 */
export async function listPrompts(
  env: Env,
  activeOnly: boolean = true
): Promise<AIPromptConfig[]> {
  try {
    const query = activeOnly
      ? 'SELECT * FROM ai_prompts WHERE is_active = 1 ORDER BY prompt_name'
      : 'SELECT * FROM ai_prompts ORDER BY prompt_name';

    const result = await env.DB.prepare(query).all<AIPromptConfig>();

    console.log(`[AI Prompt] Listed ${result.results.length} prompts (activeOnly: ${activeOnly})`);
    return result.results;
  } catch (error: unknown) {
    console.error('[AI Prompt] Error listing prompts:', error);
    throw new Error(`Failed to list prompts: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Create or update an AI prompt
 *
 * @param env - Cloudflare environment bindings
 * @param promptData - Prompt data to upsert
 * @returns Promise<AIPromptConfig> - The created/updated prompt
 */
export async function upsertPrompt(
  env: Env,
  promptData: {
    prompt_key: string;
    prompt_name: string;
    prompt_template: string;
    description?: string;
    model_config?: string;
    version?: number;
  }
): Promise<AIPromptConfig> {
  try {
    // Check if prompt exists
    const existing = await env.DB.prepare(`
      SELECT id, version FROM ai_prompts WHERE prompt_key = ?
    `).bind(promptData.prompt_key).first();

    let result;

    if (existing) {
      // Update existing prompt
      const newVersion = promptData.version || (existing.version as number) + 1;

      await env.DB.prepare(`
        UPDATE ai_prompts
        SET prompt_name = ?,
            prompt_template = ?,
            description = ?,
            model_config = ?,
            version = ?,
            updated_at = unixepoch()
        WHERE prompt_key = ?
      `).bind(
        promptData.prompt_name,
        promptData.prompt_template,
        promptData.description || null,
        promptData.model_config || null,
        newVersion,
        promptData.prompt_key
      ).run();

      console.log(`[AI Prompt] Updated prompt: ${promptData.prompt_key} (v${newVersion})`);
    } else {
      // Insert new prompt
      await env.DB.prepare(`
        INSERT INTO ai_prompts (prompt_key, prompt_name, prompt_template, description, model_config, version)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        promptData.prompt_key,
        promptData.prompt_name,
        promptData.prompt_template,
        promptData.description || null,
        promptData.model_config || null,
        promptData.version || 1
      ).run();

      console.log(`[AI Prompt] Created new prompt: ${promptData.prompt_key}`);
    }

    // Invalidate cache
    const cacheKey = `prompt:${promptData.prompt_key}`;
    await env.KV_CACHE.delete(cacheKey);
    console.log(`[AI Prompt] Invalidated cache for ${promptData.prompt_key}`);

    // Fetch and return the updated prompt
    const updatedPrompt = await getPrompt(env, promptData.prompt_key);
    if (!updatedPrompt) {
      throw new Error('Failed to fetch updated prompt');
    }

    return updatedPrompt;
  } catch (error: unknown) {
    console.error('[AI Prompt] Error upserting prompt:', error);
    throw new Error(`Failed to upsert prompt: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Soft delete an AI prompt (set is_active = 0)
 *
 * @param env - Cloudflare environment bindings
 * @param promptKey - Prompt key to delete
 * @returns Promise<boolean> - True if deleted successfully
 */
export async function deletePrompt(
  env: Env,
  promptKey: string
): Promise<boolean> {
  try {
    await env.DB.prepare(`
      UPDATE ai_prompts
      SET is_active = 0, updated_at = unixepoch()
      WHERE prompt_key = ?
    `).bind(promptKey).run();

    // Invalidate cache
    const cacheKey = `prompt:${promptKey}`;
    await env.KV_CACHE.delete(cacheKey);

    console.log(`[AI Prompt] Soft deleted prompt: ${promptKey}`);
    return true;
  } catch (error: unknown) {
    console.error('[AI Prompt] Error deleting prompt:', error);
    throw new Error(`Failed to delete prompt: ${error instanceof Error ? error.message : String(error)}`);
  }
}
