import type { Env } from './db.service';
import { getPrompt, renderPrompt, parseModelConfig } from './ai-prompt.service';

export interface ResumeSection {
  summary: string;
  experience: Array<{
    company: string;
    title: string;
    dates: string;
    achievements: string[];
  }>;
  skills: string[];
  education: Array<{
    school: string;
    degree: string;
    year: string;
  }>;
}

export async function generateTailoredResume(
  env: Env,
  userProfile: any,
  job: any
): Promise<ResumeSection> {
  const cacheKey = `resume:${userProfile.id}:${job.id}`;

  // Check KV cache (7 days)
  const cached = await env.KV_CACHE.get(cacheKey);
  if (cached) {
    console.log(`[AI Resume] Cache hit for ${cacheKey}`);
    return JSON.parse(cached);
  }

  // Get work experience and education from database
  const workHistory = await env.DB.prepare(`
    SELECT company, title, location, start_date, end_date, description
    FROM work_experience
    WHERE user_id = ?
    ORDER BY start_date DESC
  `).bind(userProfile.id).all();

  const education = await env.DB.prepare(`
    SELECT school, degree, field_of_study, start_date, end_date, gpa
    FROM education
    WHERE user_id = ?
    ORDER BY start_date DESC
  `).bind(userProfile.id).all();

  // Parse user skills
  const userSkills = userProfile.skills ? JSON.parse(userProfile.skills) : [];

  // Get prompt template from database
  const promptConfig = await getPrompt(env, 'resume_tailor');
  if (!promptConfig) {
    throw new Error('Resume tailor prompt not found in database');
  }

  // Format work experience and education for prompt
  const workExperienceText = workHistory.results.length > 0
    ? workHistory.results.map((w: any) => `
- ${w.title} at ${w.company} (${formatDate(w.start_date)} - ${formatDate(w.end_date || 'Present')})
  Location: ${w.location || 'N/A'}
  ${w.description || 'Professional responsibilities'}
`).join('\n')
    : 'No work experience provided';

  const educationText = education.results.length > 0
    ? education.results.map((e: any) => `
- ${e.degree} in ${e.field_of_study} from ${e.school} (${e.end_date ? new Date(e.end_date).getFullYear() : 'In Progress'})
  ${e.gpa ? `GPA: ${e.gpa}` : ''}
`).join('\n')
    : 'No education provided';

  // Render prompt with variables
  const prompt = renderPrompt(promptConfig.prompt_template, {
    user_name: userProfile.full_name || 'Job Seeker',
    user_location: userProfile.location || 'Not specified',
    user_bio: userProfile.bio || 'Experienced professional seeking new opportunities',
    user_skills: userSkills.join(', ') || 'Various professional skills',
    work_experience: workExperienceText,
    education: educationText,
    job_title: job.title,
    job_company: job.company,
    job_location: job.location,
    job_description: job.description?.substring(0, 600) || 'See job listing for details'
  });

  // Parse model configuration
  const modelConfig = parseModelConfig(promptConfig.model_config);

  try {
    console.log(`[AI Resume] Generating resume for job ${job.id}`);

    const response = await env.AI.run(modelConfig.model as any, {
      prompt,
      max_tokens: modelConfig.max_tokens,
      temperature: modelConfig.temperature,
      gateway: modelConfig.gateway ? {
        id: modelConfig.gateway
      } : undefined
    });

    const result = parseResumeJSON(response.response);

    // Cache for 7 days
    await env.KV_CACHE.put(cacheKey, JSON.stringify(result), {
      expirationTtl: 7 * 24 * 60 * 60
    });

    console.log(`[AI Resume] Generated and cached resume for ${cacheKey}`);
    return result;
  } catch (error: any) {
    console.error('[AI Resume] Generation error:', error);
    throw new Error('Failed to generate resume: ' + error.message);
  }
}

function parseResumeJSON(text: string): ResumeSection {
  try {
    // Try to extract JSON from various formats
    let jsonText = text.trim();

    // Remove markdown code blocks if present
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

    // Validate structure
    if (!parsed.summary || !parsed.experience || !parsed.skills || !parsed.education) {
      throw new Error('Missing required fields in AI response');
    }

    return parsed;
  } catch (error: any) {
    console.error('[AI Resume] Parse error:', error, 'Text:', text);
    throw new Error('Failed to parse AI response');
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Present';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}
