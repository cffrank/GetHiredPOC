// Enhanced AI Job Matching v2
// Uses rich profile data (work experience, education, certifications, etc.)
// for more accurate job compatibility analysis

export interface JobMatch {
  jobId: string;
  score: number; // 0-100
  strengths: string[];
  concerns: string[];
  recommendation: 'strong' | 'good' | 'fair' | 'weak';
  skillsMatch: {
    matched: string[];
    missing: string[];
  };
  experienceYears: number;
  educationMatch: boolean;
  locationMatch: boolean;
}

/**
 * Analyze job compatibility using complete user profile
 */
export async function analyzeJobMatchV2(
  ai: any,
  db: D1Database,
  userId: string,
  jobId: string
): Promise<JobMatch> {
  // Fetch complete user profile
  const userResult = await db.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
  if (!userResult) {
    throw new Error('User not found');
  }

  // Fetch job details
  const jobResult = await db.prepare('SELECT * FROM jobs WHERE id = ?').bind(jobId).first();
  if (!jobResult) {
    throw new Error('Job not found');
  }

  // Fetch work experience
  const workExperienceResult = await db.prepare(
    'SELECT * FROM work_experience WHERE user_id = ? ORDER BY start_date DESC'
  ).bind(userId).all();

  // Fetch education
  const educationResult = await db.prepare(
    'SELECT * FROM education WHERE user_id = ? ORDER BY end_date DESC'
  ).bind(userId).all();

  // Fetch certifications
  const certificationsResult = await db.prepare(
    'SELECT * FROM certifications WHERE user_id = ?'
  ).bind(userId).all();

  // Fetch languages
  const languagesResult = await db.prepare(
    'SELECT * FROM languages WHERE user_id = ?'
  ).bind(userId).all();

  // Fetch projects
  const projectsResult = await db.prepare(
    'SELECT * FROM projects WHERE user_id = ? ORDER BY end_date DESC LIMIT 5'
  ).bind(userId).all();

  const user = userResult as any;
  const job = jobResult as any;
  const workExperience = workExperienceResult.results || [];
  const education = educationResult.results || [];
  const certifications = certificationsResult.results || [];
  const languages = languagesResult.results || [];
  const projects = projectsResult.results || [];

  // Build comprehensive prompt
  const prompt = `You are an expert job matching analyst. Analyze this candidate's compatibility with the job posting.

CANDIDATE PROFILE:

Basic Info:
- Name: ${user.full_name || 'Not specified'}
- Location: ${user.location || 'Not specified'}
- Headline: ${user.headline || 'Not specified'}
- Summary: ${user.bio || 'No summary provided'}

Work Experience (${workExperience.length} positions):
${workExperience.map((w: any, i: number) => `
${i + 1}. ${w.title} at ${w.company} (${w.start_date} to ${w.end_date || 'Present'})
   Location: ${w.location || 'Not specified'}
   Description: ${w.description || 'No description'}
`).join('\n')}

Education (${education.length} degrees):
${education.map((e: any, i: number) => `
${i + 1}. ${e.degree || 'Degree'} in ${e.field_of_study || 'Field'}
   School: ${e.school}
   Dates: ${e.start_date} - ${e.end_date || 'Present'}
`).join('\n')}

Certifications (${certifications.length}):
${certifications.map((c: any) => `- ${c.name} by ${c.authority}`).join('\n') || 'None'}

Languages (${languages.length}):
${languages.map((l: any) => `- ${l.name} (${l.proficiency || 'Professional'})`).join('\n') || 'None'}

Projects (${projects.length}):
${projects.map((p: any, i: number) => `
${i + 1}. ${p.title}
   Description: ${p.description || 'No description'}
   Technologies: ${p.technologies || 'Not specified'}
`).join('\n')}

Skills: ${user.skills ? JSON.parse(user.skills).join(', ') : 'None listed'}

JOB POSTING:

- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location || 'Not specified'}
- Remote: ${job.remote ? 'Yes' : 'No'}
- Salary Range: ${job.salary_min ? `$${job.salary_min}` : 'Not specified'} - ${job.salary_max ? `$${job.salary_max}` : 'Not specified'}
- Requirements: ${job.requirements ? JSON.parse(job.requirements).join(', ') : 'Not specified'}
- Description: ${job.description || 'No description'}

ANALYSIS INSTRUCTIONS:

Provide a detailed compatibility analysis considering:

1. **Technical Skills Match** (30% weight)
   - How many required skills does candidate have?
   - Any advanced/bonus skills?
   - Missing critical skills?

2. **Experience Level** (25% weight)
   - Years of relevant experience
   - Seniority level match
   - Industry experience

3. **Education & Certifications** (15% weight)
   - Degree requirements met?
   - Relevant certifications?
   - Continuous learning demonstrated?

4. **Location & Remote** (10% weight)
   - Location compatibility
   - Remote preference alignment

5. **Career Trajectory** (10% weight)
   - Job aligns with career path?
   - Growth opportunity?

6. **Cultural Fit Indicators** (10% weight)
   - Project work shows similar values?
   - Company size/stage match?

Return ONLY valid JSON:
{
  "score": 85,
  "strengths": [
    "5+ years React experience matches senior requirement",
    "AWS Certified Solutions Architect shows cloud expertise",
    "Led similar team of 4 engineers in previous role",
    "Remote work experience aligns with remote position"
  ],
  "concerns": [
    "Limited Python experience (listed as preferred skill)",
    "No direct fintech industry experience"
  ],
  "recommendation": "strong",
  "skillsMatch": {
    "matched": ["React", "TypeScript", "AWS", "GraphQL"],
    "missing": ["Python", "Kubernetes"]
  },
  "experienceYears": 6,
  "educationMatch": true,
  "locationMatch": true
}

Recommendation levels: "strong" (80-100%), "good" (60-79%), "fair" (40-59%), "weak" (0-39%)`;

  try {
    const response = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt,
      max_tokens: 1000,
      temperature: 0.7
    });

    const result = parseMatchJSON(response.response);

    return {
      jobId,
      ...result
    };
  } catch (error) {
    console.error('Job matching error:', error);
    throw new Error('Failed to analyze job match');
  }
}

/**
 * Parse JSON from AI response
 */
function parseMatchJSON(text: string): Omit<JobMatch, 'jobId'> {
  try {
    // Try to extract JSON from markdown code blocks or direct JSON
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) ||
                      text.match(/```\n([\s\S]*?)\n```/) ||
                      text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const jsonText = jsonMatch[1] || jsonMatch[0];
    const parsed = JSON.parse(jsonText);

    // Validate and return
    return {
      score: parsed.score || 0,
      strengths: parsed.strengths || [],
      concerns: parsed.concerns || [],
      recommendation: parsed.recommendation || 'weak',
      skillsMatch: parsed.skillsMatch || { matched: [], missing: [] },
      experienceYears: parsed.experienceYears || 0,
      educationMatch: parsed.educationMatch !== false,
      locationMatch: parsed.locationMatch !== false
    };
  } catch (error) {
    console.error('JSON parsing error:', error);
    throw new Error(`Failed to parse match JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
