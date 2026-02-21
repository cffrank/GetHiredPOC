import OpenAI from 'openai';
import type { Env } from './db.service';

// OpenAI text-embedding-3-small produces 1536-dimensional vectors
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;
const MAX_BATCH_SIZE = 100; // OpenAI allows up to 100 inputs per batch

/**
 * Generate embedding for a single text string
 */
export async function generateEmbedding(
  env: Env,
  text: string
): Promise<number[]> {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  // Initialize OpenAI client with AI Gateway
  const openai = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    baseURL: `https://gateway.ai.cloudflare.com/v1/${env.CLOUDFLARE_ACCOUNT_ID}/jobmatch-ai-gateway-dev/openai`,
    defaultHeaders: {
      'cf-aig-authorization': `Bearer ${env.AI_GATEWAY_TOKEN}`,
    },
  });

  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.substring(0, 8000), // Truncate to ~8K chars to stay under token limit
      dimensions: EMBEDDING_DIMENSIONS,
    });

    return response.data[0].embedding;
  } catch (error: any) {
    console.error('[Embedding] Error generating embedding:', error);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

/**
 * Generate embeddings for multiple texts in batch (up to 100)
 */
export async function generateBatchEmbeddings(
  env: Env,
  texts: string[]
): Promise<number[][]> {
  if (texts.length === 0) return [];
  if (texts.length > MAX_BATCH_SIZE) {
    throw new Error(`Batch size ${texts.length} exceeds maximum ${MAX_BATCH_SIZE}`);
  }

  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const openai = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    baseURL: `https://gateway.ai.cloudflare.com/v1/${env.CLOUDFLARE_ACCOUNT_ID}/jobmatch-ai-gateway-dev/openai`,
    defaultHeaders: {
      'cf-aig-authorization': `Bearer ${env.AI_GATEWAY_TOKEN}`,
    },
  });

  try {
    const truncatedTexts = texts.map(t => t.substring(0, 8000));

    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: truncatedTexts,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    return response.data.map(item => item.embedding);
  } catch (error: any) {
    console.error('[Embedding] Error generating batch embeddings:', error);
    throw new Error(`Failed to generate batch embeddings: ${error.message}`);
  }
}

/**
 * Generate embedding text for a job (title + description + metadata)
 */
export function buildJobEmbeddingText(job: {
  title: string;
  company: string;
  description: string;
  location: string;
  remote?: boolean;
  hybrid?: boolean;
  category?: string;
}): string {
  return `
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Type: ${job.remote ? 'Remote' : job.hybrid ? 'Hybrid' : 'On-site'}
Category: ${job.category || 'General'}
Description: ${job.description.substring(0, 2000)}
`.trim();
}

/**
 * Generate embedding text for a user profile
 * Includes bio, skills, location, work experience, education, and job preferences
 */
export function buildUserEmbeddingText(user: {
  bio?: string;
  skills?: string;
  location?: string;
  workExperience?: Array<{
    title: string;
    company: string;
    description?: string;
  }>;
  education?: Array<{
    degree?: string;
    field_of_study?: string;
    school: string;
  }>;
  jobPreferences?: {
    desired_job_titles?: string;
    work_locations?: string;
    skills?: string;
  };
}): string {
  // Parse skills from JSON
  const skills = user.skills ? JSON.parse(user.skills) : [];

  // Build base profile text
  let profileText = `
Bio: ${user.bio || 'No bio provided'}
Skills: ${Array.isArray(skills) ? skills.join(', ') : 'No skills listed'}
Location: ${user.location || 'Not specified'}
`.trim();

  // Add work experience (last 3 jobs)
  if (user.workExperience && user.workExperience.length > 0) {
    const recentJobs = user.workExperience.slice(0, 3);
    const workText = recentJobs
      .map(w => `${w.title} at ${w.company}${w.description ? ': ' + w.description : ''}`)
      .join('\n');
    profileText += `\n\nWork Experience:\n${workText}`;
  }

  // Add education (last 2 degrees)
  if (user.education && user.education.length > 0) {
    const recentEducation = user.education.slice(0, 2);
    const eduText = recentEducation
      .map(e => {
        const parts = [];
        if (e.degree) parts.push(e.degree);
        if (e.field_of_study) parts.push(`in ${e.field_of_study}`);
        parts.push(`from ${e.school}`);
        return parts.join(' ');
      })
      .join('\n');
    profileText += `\n\nEducation:\n${eduText}`;
  }

  // Add job preferences
  if (user.jobPreferences) {
    const prefs = user.jobPreferences;
    const prefParts = [];

    // Desired job titles
    if (prefs.desired_job_titles) {
      try {
        const titles = JSON.parse(prefs.desired_job_titles);
        if (Array.isArray(titles) && titles.length > 0) {
          prefParts.push(`Desired Roles: ${titles.join(', ')}`);
        }
      } catch (e) {
        // Ignore parse errors
      }
    }

    // Work locations
    if (prefs.work_locations) {
      try {
        const locations = JSON.parse(prefs.work_locations);
        if (Array.isArray(locations) && locations.length > 0) {
          prefParts.push(`Preferred Locations: ${locations.join(', ')}`);
        }
      } catch (e) {
        // Ignore parse errors
      }
    }

    // Additional skills from preferences
    if (prefs.skills) {
      try {
        const prefSkills = JSON.parse(prefs.skills);
        if (Array.isArray(prefSkills) && prefSkills.length > 0) {
          prefParts.push(`Target Skills: ${prefSkills.join(', ')}`);
        }
      } catch (e) {
        // Ignore parse errors
      }
    }

    if (prefParts.length > 0) {
      profileText += `\n\nJob Preferences:\n${prefParts.join('\n')}`;
    }
  }

  return profileText;
}
