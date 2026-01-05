import type { Env } from './db.service';

export interface JobMatch {
  jobId: string;
  score: number; // 0-100
  strengths: string[];
  concerns: string[];
  recommendation: 'strong' | 'good' | 'fair' | 'weak';
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

  const prompt = `You are a job matching expert. Analyze how well this candidate matches this job opening.

CANDIDATE PROFILE:
- Skills: ${userSkills.join(', ') || 'No skills listed'}
- Location: ${userProfile.location || 'Not specified'}
- Bio: ${userProfile.bio || 'No bio provided'}

Recent Work Experience:
${workHistory.results.map((w: any) => `- ${w.title} at ${w.company}: ${w.description?.substring(0, 150) || 'N/A'}`).join('\n') || 'No work experience'}

Education:
${education.results.map((e: any) => `- ${e.degree} in ${e.field_of_study} from ${e.school}`).join('\n') || 'No education listed'}

JOB OPENING:
- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location}
- Remote: ${job.remote ? 'Yes' : 'No'}
- Description: ${job.description?.substring(0, 600) || 'See job listing'}

Analyze the match and provide:
1. Overall match score (0-100) - be realistic and honest
2. 3-5 key strengths (specific reasons why candidate is a good fit)
3. 1-3 concerns or gaps (areas where candidate may not fully meet requirements)
4. Recommendation level: "strong" (80-100%), "good" (60-79%), "fair" (40-59%), or "weak" (0-39%)

Consider:
- Skills alignment with job requirements
- Experience relevance to the role
- Location compatibility (remote vs on-site)
- Education requirements vs candidate's education
- Career progression and growth potential

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "score": 75,
  "strengths": ["Specific strength 1", "Specific strength 2", "Specific strength 3"],
  "concerns": ["Specific concern 1", "Specific concern 2"],
  "recommendation": "good"
}`;

  try {
    console.log(`[Job Match] Analyzing match for job ${job.id}`);

    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt,
      max_tokens: 600,
      temperature: 0.7,
      gateway: {
        id: 'jobmatch-ai-gateway-dev'
      }
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

    // Validate structure
    if (typeof parsed.score !== 'number' || !parsed.strengths || !parsed.concerns || !parsed.recommendation) {
      throw new Error('Missing required fields in AI response');
    }

    return parsed;
  } catch (error: any) {
    console.error('[Job Match] Parse error:', error, 'Text:', text);
    throw new Error('Failed to parse match analysis');
  }
}
