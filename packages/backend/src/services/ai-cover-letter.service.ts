import type { Env } from './db.service';
import { getPrompt, renderPrompt, parseModelConfig } from './ai-prompt.service';

export async function generateCoverLetter(
  env: Env,
  userProfile: any,
  job: any
): Promise<string> {
  const cacheKey = `cover:${userProfile.id}:${job.id}`;

  // Check KV cache (7 days)
  const cached = await env.KV_CACHE.get(cacheKey);
  if (cached) {
    console.log(`[AI Cover Letter] Cache hit for ${cacheKey}`);
    return cached;
  }

  // Parse user skills
  const userSkills = userProfile.skills ? JSON.parse(userProfile.skills) : [];

  // Get prompt template from database
  const promptConfig = await getPrompt(env, 'cover_letter');
  if (!promptConfig) {
    throw new Error('Cover letter prompt not found in database');
  }

  // Render prompt with variables
  const prompt = renderPrompt(promptConfig.prompt_template, {
    user_name: userProfile.full_name || 'Applicant',
    user_location: userProfile.location || 'Available to relocate',
    user_bio: userProfile.bio || 'Passionate professional seeking new opportunities',
    user_skills: userSkills.join(', ') || 'Diverse professional skills',
    job_title: job.title,
    job_company: job.company,
    job_location: job.location,
    job_description: job.description?.substring(0, 600) || 'Exciting opportunity at a leading company'
  });

  // Parse model configuration
  const modelConfig = parseModelConfig(promptConfig.model_config);

  try {
    console.log(`[AI Cover Letter] Generating for job ${job.id}`);

    const response = await env.AI.run(modelConfig.model as any, {
      prompt,
      max_tokens: modelConfig.max_tokens,
      temperature: modelConfig.temperature,
      gateway: modelConfig.gateway ? {
        id: modelConfig.gateway
      } : undefined
    });

    const coverLetter = response.response.trim();

    // Basic validation
    if (coverLetter.length < 100) {
      throw new Error('Generated cover letter is too short');
    }

    // Cache for 7 days
    await env.KV_CACHE.put(cacheKey, coverLetter, {
      expirationTtl: 7 * 24 * 60 * 60
    });

    console.log(`[AI Cover Letter] Generated and cached for ${cacheKey}`);
    return coverLetter;
  } catch (error: any) {
    console.error('[AI Cover Letter] Generation error:', error);
    throw new Error('Failed to generate cover letter: ' + error.message);
  }
}
