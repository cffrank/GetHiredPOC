// AI-powered Resume Parser
// Uses Cloudflare Workers AI (Llama) to extract structured data from resume text

export interface ParsedResume {
  name: string;
  email: string;
  phone: string;
  location: string;
  headline: string;
  summary: string;
  workExperience: Array<{
    company: string;
    title: string;
    location: string;
    startDate: string;
    endDate: string;
    description: string;
    achievements: string[];
  }>;
  education: Array<{
    school: string;
    degree: string;
    fieldOfStudy: string;
    startYear: number;
    endYear: number;
  }>;
  skills: string[];
  certifications: Array<{
    name: string;
    authority: string;
    date: string;
  }>;
  languages: string[];
}

/**
 * Parse resume text using AI
 */
export async function parseResumeWithAI(
  ai: any,
  resumeText: string
): Promise<ParsedResume> {
  const prompt = `You are an expert resume parser. Extract structured data from this resume.

RESUME TEXT:
${resumeText}

Extract and return ONLY valid JSON in this exact format:
{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "123-456-7890",
  "location": "City, State",
  "headline": "Professional Title/Headline",
  "summary": "Professional summary or objective",
  "workExperience": [
    {
      "company": "Company Name",
      "title": "Job Title",
      "location": "City, State",
      "startDate": "2020-01",
      "endDate": "2023-06",
      "description": "Brief job description",
      "achievements": ["Achievement 1", "Achievement 2"]
    }
  ],
  "education": [
    {
      "school": "University Name",
      "degree": "Bachelor of Science",
      "fieldOfStudy": "Computer Science",
      "startYear": 2016,
      "endYear": 2020
    }
  ],
  "skills": ["Skill 1", "Skill 2", "Skill 3"],
  "certifications": [
    {
      "name": "Certification Name",
      "authority": "Issuing Organization",
      "date": "2021-06"
    }
  ],
  "languages": ["English", "Spanish"]
}

IMPORTANT:
- Extract ALL work experience entries
- Parse dates to YYYY-MM format
- Separate achievements as individual array items
- If a field is missing, use empty string or empty array
- Return ONLY the JSON, no explanations`;

  try {
    const response = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt,
      max_tokens: 2000,
      temperature: 0.3 // Lower temperature for more consistent parsing
    });

    const parsed = parseResumeJSON(response.response);
    return parsed;
  } catch (error) {
    console.error('Resume parsing error:', error);
    throw new Error('Failed to parse resume');
  }
}

/**
 * Parse JSON from AI response
 */
function parseResumeJSON(text: string): ParsedResume {
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

    // Validate required fields
    if (!parsed.name) {
      throw new Error('Missing required field: name');
    }

    // Ensure all arrays exist
    return {
      name: parsed.name || '',
      email: parsed.email || '',
      phone: parsed.phone || '',
      location: parsed.location || '',
      headline: parsed.headline || '',
      summary: parsed.summary || '',
      workExperience: parsed.workExperience || [],
      education: parsed.education || [],
      skills: parsed.skills || [],
      certifications: parsed.certifications || [],
      languages: parsed.languages || []
    };
  } catch (error) {
    console.error('JSON parsing error:', error);
    throw new Error(`Failed to parse resume JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Save parsed resume data to database
 */
export async function saveParsedResumeToProfile(
  db: D1Database,
  userId: string,
  parsedResume: ParsedResume
): Promise<void> {
  // Update user basic info
  await db.prepare(`
    UPDATE users
    SET
      full_name = ?,
      headline = ?,
      bio = ?,
      location = ?
    WHERE id = ?
  `).bind(
    parsedResume.name,
    parsedResume.headline,
    parsedResume.summary,
    parsedResume.location,
    userId
  ).run();

  // Save work experience
  for (const work of parsedResume.workExperience) {
    await db.prepare(`
      INSERT INTO work_experience (
        user_id, company, title, description, location, start_date, end_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      work.company,
      work.title,
      work.description,
      work.location,
      work.startDate,
      work.endDate || null
    ).run();
  }

  // Save education
  for (const edu of parsedResume.education) {
    await db.prepare(`
      INSERT INTO education (
        user_id, school, degree, field_of_study, start_date, end_date
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      edu.school,
      edu.degree,
      edu.fieldOfStudy,
      `${edu.startYear}-01-01`,
      `${edu.endYear}-12-31`
    ).run();
  }

  // Update skills
  if (parsedResume.skills.length > 0) {
    await db.prepare(`
      UPDATE users SET skills = ? WHERE id = ?
    `).bind(JSON.stringify(parsedResume.skills), userId).run();
  }

  // Save certifications
  for (const cert of parsedResume.certifications) {
    await db.prepare(`
      INSERT INTO certifications (
        user_id, name, authority, issue_date
      ) VALUES (?, ?, ?, ?)
    `).bind(
      userId,
      cert.name,
      cert.authority,
      cert.date
    ).run();
  }

  // Save languages
  for (const lang of parsedResume.languages) {
    await db.prepare(`
      INSERT INTO languages (user_id, name, proficiency)
      VALUES (?, ?, ?)
    `).bind(
      userId,
      lang,
      'Professional' // Default proficiency
    ).run();
  }
}
