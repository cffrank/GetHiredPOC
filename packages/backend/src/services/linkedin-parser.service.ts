import type { Env } from './db.service';
import { getPrompt, renderPrompt, parseModelConfig } from './ai-prompt.service';
import { createLogger } from '../utils/logger';

const logger = createLogger('linkedin-parser');

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
  // Get prompt template from database
  const promptConfig = await getPrompt(env, 'linkedin_parse');
  if (!promptConfig) {
    throw new Error('LinkedIn parse prompt not found in database');
  }

  // Render prompt with profile text variable
  const prompt = renderPrompt(promptConfig.prompt_template, {
    profile_text: profileText
  });

  // Parse model configuration
  const modelConfig = parseModelConfig(promptConfig.model_config);

  try {
    const response = await env.AI.run(modelConfig.model as any, {
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
      max_tokens: modelConfig.max_tokens
    });

    // Parse AI response
    let jsonText = (response as any).response || '';

    logger.debug('AI raw response', { responseSample: jsonText.substring(0, 500) });

    // Clean up markdown code blocks if present
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const parsed = JSON.parse(jsonText) as ParsedLinkedInProfile;

    logger.info('Parsed profile', {
      workExperienceCount: parsed.workExperience?.length || 0,
      educationCount: parsed.education?.length || 0
    });

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
    logger.error('LinkedIn profile parsing error', { error: String(error) });

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
      logger.warn('Skipping work experience - missing required fields', { exp: JSON.stringify(exp) });
      continue; // Skip incomplete entries
    }

    logger.debug('Saving work experience', { company: exp.company, title: exp.title });

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
