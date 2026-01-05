import type { Env } from './db.service';

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

  const prompt = `You are an expert cover letter writer. Write a compelling cover letter for this job application.

USER PROFILE:
- Name: ${userProfile.full_name || 'Applicant'}
- Location: ${userProfile.location || 'Available to relocate'}
- Bio: ${userProfile.bio || 'Passionate professional seeking new opportunities'}
- Skills: ${userSkills.join(', ') || 'Diverse professional skills'}

JOB:
- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location}
- Description: ${job.description?.substring(0, 600) || 'Exciting opportunity at a leading company'}

Write a professional cover letter (3-4 paragraphs, approximately 250-350 words) that:
1. Opens with enthusiasm for the specific role at ${job.company}
2. Highlights 2-3 relevant skills/experiences that directly match the job requirements
3. Explains why this candidate is uniquely qualified for this role
4. Closes with a confident call to action

IMPORTANT REQUIREMENTS:
- Write in first person (I, my, me)
- Use a professional but warm and genuine tone
- Do NOT include placeholder text like [Your Name], [Date], [Company Address]
- Do NOT include a salutation like "Dear Hiring Manager" - start directly with the letter body
- Do NOT include a closing signature - end with the last paragraph
- Be specific about the role and company
- Make it feel personal and authentic, not generic
- Reference specific aspects of the job description

Return ONLY the cover letter text. No JSON, no code blocks, no formatting markers.`;

  try {
    console.log(`[AI Cover Letter] Generating for job ${job.id}`);

    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt,
      max_tokens: 900,
      temperature: 0.8,
      gateway: {
        id: 'jobmatch-ai-gateway-dev'
      }
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
