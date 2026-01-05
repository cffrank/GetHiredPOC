import type { Env } from './db.service';

interface ParsedLinkedInProfile {
  fullName?: string;
  headline?: string;
  location?: string;
  summary?: string;
  workExperience: Array<{
    company: string;
    title: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }>;
  education: Array<{
    school: string;
    degree?: string;
    fieldOfStudy?: string;
    startDate?: string;
    endDate?: string;
  }>;
  skills: string[];
}

/**
 * Parse pasted LinkedIn profile text using AI
 * Extracts structured data from free-form LinkedIn profile text
 */
export async function parseLinkedInProfileText(
  env: Env,
  profileText: string
): Promise<ParsedLinkedInProfile> {
  const prompt = `Extract structured data from this LinkedIn profile text. Return a JSON object with this exact structure:
{
  "fullName": "string",
  "headline": "string",
  "location": "string",
  "summary": "string",
  "workExperience": [
    {
      "company": "string",
      "title": "string",
      "location": "string",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM or null if current",
      "description": "string"
    }
  ],
  "education": [
    {
      "school": "string",
      "degree": "string",
      "fieldOfStudy": "string",
      "startDate": "YYYY",
      "endDate": "YYYY or null if current"
    }
  ],
  "skills": ["skill1", "skill2", "skill3"]
}

Important:
- Extract ALL work experience entries
- Extract ALL education entries
- Extract ALL skills mentioned
- Use null for missing endDate if currently employed/studying
- Return ONLY valid JSON, no markdown or explanations

LinkedIn Profile Text:
${profileText}`;

  try {
    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        {
          role: 'system',
          content: 'You are a data extraction assistant. Extract structured information from LinkedIn profiles and return ONLY valid JSON with no additional text or markdown.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2048
    });

    // Parse AI response
    let jsonText = (response as any).response || '';

    console.log('[LinkedIn Parser] AI raw response:', jsonText.substring(0, 500));

    // Clean up markdown code blocks if present
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const parsed = JSON.parse(jsonText) as ParsedLinkedInProfile;

    console.log('[LinkedIn Parser] Parsed work experience count:', parsed.workExperience?.length || 0);
    console.log('[LinkedIn Parser] Parsed education count:', parsed.education?.length || 0);

    // Ensure required arrays exist
    return {
      fullName: parsed.fullName || '',
      headline: parsed.headline || '',
      location: parsed.location || '',
      summary: parsed.summary || '',
      workExperience: parsed.workExperience || [],
      education: parsed.education || [],
      skills: parsed.skills || []
    };
  } catch (error) {
    console.error('LinkedIn profile parsing error:', error);

    // Return empty structure if parsing fails
    return {
      fullName: '',
      headline: '',
      location: '',
      summary: '',
      workExperience: [],
      education: [],
      skills: []
    };
  }
}

/**
 * Save parsed LinkedIn profile data to database
 */
export async function saveLinkedInProfileData(
  db: D1Database,
  userId: string,
  profileData: ParsedLinkedInProfile
): Promise<void> {
  // Update user basic info
  const skillsJson = profileData.skills.length > 0 ? JSON.stringify(profileData.skills) : null;

  await db.prepare(`
    UPDATE users
    SET
      full_name = COALESCE(?, full_name),
      bio = COALESCE(?, bio),
      location = COALESCE(?, location),
      skills = COALESCE(?, skills)
    WHERE id = ?
  `).bind(
    profileData.fullName || null,
    profileData.summary || null,
    profileData.location || null,
    skillsJson,
    userId
  ).run();

  // Save work experience
  for (const exp of profileData.workExperience) {
    if (!exp.company || !exp.title) {
      console.warn('[LinkedIn Parser] Skipping work experience - missing required fields:', JSON.stringify(exp));
      continue; // Skip incomplete entries
    }

    console.log('[LinkedIn Parser] Saving work experience:', { company: exp.company, title: exp.title });

    await db.prepare(`
      INSERT INTO work_experience (user_id, company, title, location, start_date, end_date, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      exp.company,
      exp.title,
      exp.location || null,
      exp.startDate || null,
      exp.endDate || null,
      exp.description || null
    ).run();
  }

  // Save education
  for (const edu of profileData.education) {
    if (!edu.school) continue; // Skip incomplete entries

    await db.prepare(`
      INSERT INTO education (user_id, school, degree, field_of_study, start_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      edu.school,
      edu.degree || null,
      edu.fieldOfStudy || null,
      edu.startDate || null,
      edu.endDate || null
    ).run();
  }
}
