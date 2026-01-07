import type { Env } from './db.service';
import { getPrompt, renderPrompt, parseModelConfig } from './ai-prompt.service';

export interface JobMatch {
  jobId: string;
  score: number; // 0-100
  strengths: string[];
  gaps: string[];
  recommendation: 'strong' | 'good' | 'fair' | 'weak';
  tip?: string;
}

export async function analyzeJobMatch(
  env: Env,
  userProfile: any,
  job: any
): Promise<JobMatch> {
  const cacheKey = `match:${userProfile.id}:${job.id}`;

  // Check KV cache (7 days)
  const cached = await env.KV_CACHE.get(cacheKey);
  if (cached) {
    console.log(`[Job Match] Cache hit for ${cacheKey}`);
    return JSON.parse(cached);
  }

  // Get work experience and education
  const workHistory = await env.DB.prepare(`
    SELECT company, title, description
    FROM work_experience
    WHERE user_id = ?
    ORDER BY start_date DESC
    LIMIT 3
  `).bind(userProfile.id).all();

  const education = await env.DB.prepare(`
    SELECT school, degree, field_of_study
    FROM education
    WHERE user_id = ?
    ORDER BY start_date DESC
    LIMIT 2
  `).bind(userProfile.id).all();

  // Parse user skills
  const userSkills = userProfile.skills ? JSON.parse(userProfile.skills) : [];

  // Get prompt template from database
  const promptConfig = await getPrompt(env, 'job_match');
  if (!promptConfig) {
    throw new Error('Job match prompt not found in database');
  }

  // Format work experience and education for prompt
  const workExperienceText = workHistory.results.length > 0
    ? workHistory.results.map((w: any) => `- ${w.title} at ${w.company}: ${w.description?.substring(0, 150) || 'N/A'}`).join('\n')
    : 'No work experience';

  const educationText = education.results.length > 0
    ? education.results.map((e: any) => `- ${e.degree} in ${e.field_of_study} from ${e.school}`).join('\n')
    : 'No education listed';

  // Render prompt with variables
  const prompt = renderPrompt(promptConfig.prompt_template, {
    user_skills: userSkills.join(', ') || 'No skills listed',
    user_location: userProfile.location || 'Not specified',
    user_bio: userProfile.bio || 'No bio provided',
    work_experience: workExperienceText,
    education: educationText,
    job_title: job.title,
    job_company: job.company,
    job_location: job.location,
    job_remote: job.remote ? 'Yes' : 'No',
    job_description: job.description?.substring(0, 600) || 'See job listing'
  });

  // Parse model configuration
  const modelConfig = parseModelConfig(promptConfig.model_config);

  try {
    console.log(`[Job Match] Analyzing match for job ${job.id}`);

    const response = await env.AI.run(modelConfig.model as any, {
      prompt,
      max_tokens: modelConfig.max_tokens,
      temperature: modelConfig.temperature,
      gateway: modelConfig.gateway ? {
        id: modelConfig.gateway
      } : undefined
    });

    const result = parseMatchJSON(response.response);

    // Ensure score is within 0-100
    result.score = Math.max(0, Math.min(100, result.score));

    // Validate recommendation matches score
    if (result.score >= 80) result.recommendation = 'strong';
    else if (result.score >= 60) result.recommendation = 'good';
    else if (result.score >= 40) result.recommendation = 'fair';
    else result.recommendation = 'weak';

    const match: JobMatch = {
      jobId: job.id,
      ...result
    };

    // Cache for 7 days
    await env.KV_CACHE.put(cacheKey, JSON.stringify(match), {
      expirationTtl: 7 * 24 * 60 * 60
    });

    console.log(`[Job Match] Generated match score ${match.score}% for ${cacheKey}`);
    return match;
  } catch (error: any) {
    console.error('[Job Match] Analysis error:', error);
    throw new Error('Failed to analyze job match: ' + error.message);
  }
}

function parseMatchJSON(text: string): any {
  try {
    let jsonText = text.trim();

    // Remove markdown code blocks
    const codeBlockMatch = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1].trim();
    }

    // Find JSON object
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    const parsed = JSON.parse(jsonText);

    // Validate structure (support both "gaps" and "concerns" for backward compatibility)
    if (typeof parsed.score !== 'number' || !parsed.strengths || !parsed.recommendation) {
      throw new Error('Missing required fields in AI response');
    }

    // Support both "gaps" (new) and "concerns" (old) field names
    if (!parsed.gaps && !parsed.concerns) {
      throw new Error('Missing gaps/concerns field in AI response');
    }

    // Normalize to "gaps"
    if (parsed.concerns && !parsed.gaps) {
      parsed.gaps = parsed.concerns;
      delete parsed.concerns;
    }

    return parsed;
  } catch (error: any) {
    console.error('[Job Match] Parse error:', error, 'Text:', text);
    throw new Error('Failed to parse match analysis');
  }
}
