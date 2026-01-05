import type { Env } from './db.service';

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

  const prompt = `You are an expert resume writer. Create a tailored resume for this job application.

USER PROFILE:
- Name: ${userProfile.full_name || 'Job Seeker'}
- Location: ${userProfile.location || 'Not specified'}
- Bio: ${userProfile.bio || 'Experienced professional seeking new opportunities'}
- Skills: ${userSkills.join(', ') || 'Various professional skills'}

WORK EXPERIENCE:
${workHistory.results.map((w: any) => `
- ${w.title} at ${w.company} (${formatDate(w.start_date)} - ${formatDate(w.end_date || 'Present')})
  Location: ${w.location || 'N/A'}
  ${w.description || 'Professional responsibilities'}
`).join('\n') || 'No work experience provided'}

EDUCATION:
${education.results.map((e: any) => `
- ${e.degree} in ${e.field_of_study} from ${e.school} (${e.end_date ? new Date(e.end_date).getFullYear() : 'In Progress'})
  ${e.gpa ? `GPA: ${e.gpa}` : ''}
`).join('\n') || 'No education provided'}

JOB POSTING:
- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location}
- Description: ${job.description?.substring(0, 600) || 'See job listing for details'}

Generate a tailored resume that:
1. Highlights relevant skills from the user's profile that match job requirements
2. Rewrites work achievements to emphasize experience relevant to this role
3. Creates a compelling professional summary (2-3 sentences)
4. Prioritizes skills that match the job description

Respond ONLY with valid JSON in this exact format (no markdown, no code blocks):
{
  "summary": "Professional summary here...",
  "experience": [
    {
      "company": "Company Name",
      "title": "Job Title",
      "dates": "2020-2023",
      "achievements": ["Achievement 1 tailored to the job", "Achievement 2 tailored to the job", "Achievement 3 tailored to the job"]
    }
  ],
  "skills": ["Most Relevant Skill 1", "Most Relevant Skill 2", "Most Relevant Skill 3", "Skill 4", "Skill 5"],
  "education": [
    {
      "school": "University Name",
      "degree": "Degree Title",
      "year": "2020"
    }
  ]
}`;

  try {
    console.log(`[AI Resume] Generating resume for job ${job.id}`);

    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt,
      max_tokens: 1200,
      temperature: 0.7,
      gateway: {
        id: 'jobmatch-ai-gateway-dev'
      }
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
