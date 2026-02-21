import type { Env } from './db.service';

/**
 * User Profile Data Interface
 * Complete user profile data for embedding generation
 */
interface UserProfileData {
  user: {
    id: string;
    full_name?: string;
    bio?: string;
    skills?: string; // JSON array
    location?: string;
  };
  workExperience: Array<{
    id: string;
    company: string;
    title: string;
    location?: string;
    start_date?: string;
    end_date?: string;
    description?: string;
  }>;
  education: Array<{
    id: string;
    school: string;
    degree?: string;
    field_of_study?: string;
    start_date?: string;
    end_date?: string;
  }>;
  preferences?: {
    desired_job_titles?: string; // JSON array
    work_locations?: string; // JSON array
    work_mode?: string;
    industries?: string; // JSON array
    employment_status?: string;
    willing_to_relocate?: number;
  };
}

/**
 * Fetch complete user profile data including work experience, education, and preferences
 */
export async function getUserProfileData(
  env: Env,
  userId: string
): Promise<UserProfileData | null> {
  try {
    // Fetch user basic info
    const user = await env.DB.prepare(
      'SELECT id, full_name, bio, skills, location FROM users WHERE id = ?'
    )
      .bind(userId)
      .first<any>();

    if (!user) {
      console.log(`[User Embedding] User ${userId} not found`);
      return null;
    }

    // Fetch last 3 work experiences (most recent first)
    const workExperience = await env.DB.prepare(`
      SELECT id, company, title, location, start_date, end_date, description
      FROM work_experience
      WHERE user_id = ?
      ORDER BY
        CASE
          WHEN end_date IS NULL OR end_date = '' THEN 1
          ELSE 0
        END DESC,
        COALESCE(end_date, start_date) DESC
      LIMIT 3
    `)
      .bind(userId)
      .all<any>();

    // Fetch last 2 education records (most recent first)
    const education = await env.DB.prepare(`
      SELECT id, school, degree, field_of_study, start_date, end_date
      FROM education
      WHERE user_id = ?
      ORDER BY
        CASE
          WHEN end_date IS NULL OR end_date = '' THEN 1
          ELSE 0
        END DESC,
        COALESCE(end_date, start_date) DESC
      LIMIT 2
    `)
      .bind(userId)
      .all<any>();

    // Fetch job search preferences (optional)
    const preferences = await env.DB.prepare(
      `SELECT
        desired_job_titles,
        work_locations,
        work_mode,
        industries,
        employment_status,
        willing_to_relocate
      FROM job_search_preferences
      WHERE user_id = ?`
    )
      .bind(userId)
      .first<any>();

    return {
      user,
      workExperience: workExperience.results || [],
      education: education.results || [],
      preferences: preferences || undefined,
    };
  } catch (error: any) {
    console.error(`[User Embedding] Error fetching profile data for user ${userId}:`, error);
    throw new Error(`Failed to fetch user profile data: ${error.message}`);
  }
}

/**
 * Build embedding text from complete user profile data
 * Extends the basic buildUserEmbeddingText with work experience, education, and preferences
 */
function buildComprehensiveUserEmbeddingText(profileData: UserProfileData): string {
  const { user, workExperience, education, preferences } = profileData;

  // Parse skills if available
  let skillsList: string[] = [];
  try {
    skillsList = user.skills ? JSON.parse(user.skills) : [];
  } catch (e) {
    skillsList = [];
  }

  // Parse job preferences
  let desiredTitles: string[] = [];
  let desiredLocations: string[] = [];
  let desiredIndustries: string[] = [];

  if (preferences) {
    try {
      desiredTitles = preferences.desired_job_titles ? JSON.parse(preferences.desired_job_titles) : [];
      desiredLocations = preferences.work_locations ? JSON.parse(preferences.work_locations) : [];
      desiredIndustries = preferences.industries ? JSON.parse(preferences.industries) : [];
    } catch (e) {
      // Ignore parse errors
    }
  }

  // Build comprehensive embedding text
  const sections: string[] = [];

  // Basic info
  if (user.full_name) {
    sections.push(`Name: ${user.full_name}`);
  }

  if (user.bio) {
    sections.push(`Bio: ${user.bio}`);
  }

  if (skillsList.length > 0) {
    sections.push(`Skills: ${skillsList.join(', ')}`);
  }

  if (user.location) {
    sections.push(`Location: ${user.location}`);
  }

  // Work experience
  if (workExperience.length > 0) {
    const workSections = workExperience.map(exp => {
      const parts = [
        `${exp.title} at ${exp.company}`,
        exp.location ? `Location: ${exp.location}` : '',
        exp.start_date && exp.end_date ? `Period: ${exp.start_date} to ${exp.end_date}` :
          exp.start_date ? `Started: ${exp.start_date}` : '',
        exp.description ? exp.description.substring(0, 300) : '',
      ].filter(Boolean);

      return parts.join('. ');
    });

    sections.push(`Work Experience:\n${workSections.join('\n')}`);
  }

  // Education
  if (education.length > 0) {
    const eduSections = education.map(edu => {
      const parts = [
        edu.degree || 'Degree',
        edu.field_of_study ? `in ${edu.field_of_study}` : '',
        `from ${edu.school}`,
        edu.end_date ? `(${edu.end_date})` : '',
      ].filter(Boolean);

      return parts.join(' ');
    });

    sections.push(`Education:\n${eduSections.join('\n')}`);
  }

  // Job preferences
  if (preferences) {
    const prefSections: string[] = [];

    if (desiredTitles.length > 0) {
      prefSections.push(`Desired Roles: ${desiredTitles.join(', ')}`);
    }

    if (desiredLocations.length > 0) {
      prefSections.push(`Preferred Locations: ${desiredLocations.join(', ')}`);
    }

    if (preferences.work_mode && preferences.work_mode !== 'any') {
      prefSections.push(`Work Mode: ${preferences.work_mode}`);
    }

    if (desiredIndustries.length > 0) {
      prefSections.push(`Industries: ${desiredIndustries.join(', ')}`);
    }

    if (preferences.willing_to_relocate === 1) {
      prefSections.push('Willing to relocate');
    }

    if (prefSections.length > 0) {
      sections.push(`Job Preferences:\n${prefSections.join('\n')}`);
    }
  }

  return sections.join('\n\n').trim();
}

/**
 * Generate embedding vector for a user profile
 */
export async function generateUserEmbedding(
  env: Env,
  userId: string
): Promise<number[]> {
  try {
    // Fetch complete profile data
    const profileData = await getUserProfileData(env, userId);

    if (!profileData) {
      throw new Error(`User ${userId} not found`);
    }

    // Build comprehensive embedding text
    const embeddingText = buildComprehensiveUserEmbeddingText(profileData);

    if (!embeddingText || embeddingText.trim().length === 0) {
      throw new Error(`User ${userId} has no profile data to embed`);
    }

    // Generate embedding using the embedding service
    const { generateEmbedding } = await import('./embedding.service');
    const embedding = await generateEmbedding(env, embeddingText);

    console.log(`[User Embedding] Generated embedding for user ${userId} (${profileData.user.full_name || 'Unknown'})`);

    return embedding;
  } catch (error: any) {
    console.error(`[User Embedding] Error generating embedding for user ${userId}:`, error);
    throw new Error(`Failed to generate user embedding: ${error.message}`);
  }
}

/**
 * Update user embedding in database, Vectorize, and KV cache
 */
export async function updateUserEmbedding(
  env: Env,
  userId: string
): Promise<void> {
  try {
    // Generate new embedding
    const embedding = await generateUserEmbedding(env, userId);

    // Update database with embedding and timestamp
    await env.DB.prepare(
      'UPDATE users SET embedding = ?, embedding_updated_at = unixepoch() WHERE id = ?'
    )
      .bind(JSON.stringify(embedding), userId)
      .run();

    console.log(`[User Embedding] Updated database embedding for user ${userId}`);

    // TODO: Upsert to Vectorize (will implement after vector.service is updated)
    // const { upsertUserEmbedding } = await import('./vector.service');
    // await upsertUserEmbedding(env, userId, embedding, metadata);

    // Cache in KV with 24 hour TTL (86400 seconds)
    const cacheKey = `user_embedding:${userId}`;
    await env.KV_CACHE.put(
      cacheKey,
      JSON.stringify(embedding),
      { expirationTtl: 86400 } // 24 hours
    );

    console.log(`[User Embedding] Cached embedding in KV for user ${userId} (24h TTL)`);
  } catch (error: any) {
    console.error(`[User Embedding] Error updating embedding for user ${userId}:`, error);
    // Don't throw - embedding failures shouldn't break user updates
  }
}

/**
 * Get cached user embedding or generate if not cached
 */
export async function getCachedUserEmbedding(
  env: Env,
  userId: string
): Promise<number[] | null> {
  try {
    // Check KV cache first
    const cacheKey = `user_embedding:${userId}`;
    const cached = await env.KV_CACHE.get(cacheKey);

    if (cached) {
      console.log(`[User Embedding] Cache hit for user ${userId}`);
      return JSON.parse(cached);
    }

    console.log(`[User Embedding] Cache miss for user ${userId}, generating new embedding`);

    // Generate and cache new embedding
    const embedding = await generateUserEmbedding(env, userId);

    // Cache for 24 hours
    await env.KV_CACHE.put(
      cacheKey,
      JSON.stringify(embedding),
      { expirationTtl: 86400 }
    );

    return embedding;
  } catch (error: any) {
    console.error(`[User Embedding] Error getting cached embedding for user ${userId}:`, error);
    return null;
  }
}

/**
 * Invalidate user embedding cache
 * Call this when user profile is updated
 */
export async function invalidateUserEmbeddingCache(
  env: Env,
  userId: string
): Promise<void> {
  try {
    const cacheKey = `user_embedding:${userId}`;
    await env.KV_CACHE.delete(cacheKey);
    console.log(`[User Embedding] Invalidated cache for user ${userId}`);
  } catch (error: any) {
    console.error(`[User Embedding] Error invalidating cache for user ${userId}:`, error);
    // Don't throw - cache invalidation failures shouldn't break the application
  }
}
