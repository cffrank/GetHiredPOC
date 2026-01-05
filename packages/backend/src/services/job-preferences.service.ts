import type { JobSearchPreferences } from '@gethiredpoc/shared';

/**
 * Get job search preferences for a user
 * Returns defaults if no preferences exist
 */
export async function getJobSearchPreferences(
  db: D1Database,
  userId: string
): Promise<JobSearchPreferences> {
  const result = await db.prepare(`
    SELECT * FROM job_search_preferences WHERE user_id = ?
  `).bind(userId).first();

  if (!result) {
    // Return defaults for users who haven't set preferences
    return {
      userId,
      desiredJobTitles: [],
      workLocations: [],
      workMode: 'any',
      industries: [],
      employmentStatus: 'employed-open',
      availabilityDate: null,
      willingToRelocate: false,
      requiresVisaSponsorship: 'prefer-not-to-say',
      hasDriversLicense: 'prefer-not-to-say',
      hasSecurityClearance: 'prefer-not-to-say',
      genderIdentity: 'prefer-not-to-say',
      hasDisability: 'prefer-not-to-say',
      onboardingCompleted: false,
      createdAt: Math.floor(Date.now() / 1000),
      updatedAt: Math.floor(Date.now() / 1000)
    };
  }

  // Parse JSON fields and convert database format to TypeScript interface
  return {
    userId: result.user_id as string,
    desiredJobTitles: result.desired_job_titles ? JSON.parse(result.desired_job_titles as string) : [],
    workLocations: result.work_locations ? JSON.parse(result.work_locations as string) : [],
    workMode: (result.work_mode as JobSearchPreferences['workMode']) || 'any',
    industries: result.industries ? JSON.parse(result.industries as string) : [],
    employmentStatus: (result.employment_status as JobSearchPreferences['employmentStatus']) || 'employed-open',
    availabilityDate: result.availability_date as string | null,
    willingToRelocate: Boolean(result.willing_to_relocate),
    requiresVisaSponsorship: (result.requires_visa_sponsorship as JobSearchPreferences['requiresVisaSponsorship']) || 'prefer-not-to-say',
    hasDriversLicense: (result.has_drivers_license as JobSearchPreferences['hasDriversLicense']) || 'prefer-not-to-say',
    hasSecurityClearance: (result.has_security_clearance as JobSearchPreferences['hasSecurityClearance']) || 'prefer-not-to-say',
    genderIdentity: (result.gender_identity as JobSearchPreferences['genderIdentity']) || 'prefer-not-to-say',
    genderSelfDescribe: result.gender_self_describe as string | undefined,
    hasDisability: (result.has_disability as JobSearchPreferences['hasDisability']) || 'prefer-not-to-say',
    onboardingCompleted: Boolean(result.onboarding_completed),
    createdAt: result.created_at as number,
    updatedAt: result.updated_at as number
  };
}

/**
 * Update or create job search preferences
 */
export async function updateJobSearchPreferences(
  db: D1Database,
  userId: string,
  preferences: Partial<Omit<JobSearchPreferences, 'userId' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const existing = await db.prepare(
    'SELECT user_id FROM job_search_preferences WHERE user_id = ?'
  ).bind(userId).first();

  if (existing) {
    // Update existing preferences
    const updates: string[] = [];
    const values: any[] = [];

    if (preferences.desiredJobTitles !== undefined) {
      updates.push('desired_job_titles = ?');
      values.push(JSON.stringify(preferences.desiredJobTitles));
    }
    if (preferences.workLocations !== undefined) {
      updates.push('work_locations = ?');
      values.push(JSON.stringify(preferences.workLocations));
    }
    if (preferences.workMode !== undefined) {
      updates.push('work_mode = ?');
      values.push(preferences.workMode);
    }
    if (preferences.industries !== undefined) {
      updates.push('industries = ?');
      values.push(JSON.stringify(preferences.industries));
    }
    if (preferences.employmentStatus !== undefined) {
      updates.push('employment_status = ?');
      values.push(preferences.employmentStatus);
    }
    if (preferences.availabilityDate !== undefined) {
      updates.push('availability_date = ?');
      values.push(preferences.availabilityDate);
    }
    if (preferences.willingToRelocate !== undefined) {
      updates.push('willing_to_relocate = ?');
      values.push(preferences.willingToRelocate ? 1 : 0);
    }
    if (preferences.requiresVisaSponsorship !== undefined) {
      updates.push('requires_visa_sponsorship = ?');
      values.push(preferences.requiresVisaSponsorship);
    }
    if (preferences.hasDriversLicense !== undefined) {
      updates.push('has_drivers_license = ?');
      values.push(preferences.hasDriversLicense);
    }
    if (preferences.hasSecurityClearance !== undefined) {
      updates.push('has_security_clearance = ?');
      values.push(preferences.hasSecurityClearance);
    }
    if (preferences.genderIdentity !== undefined) {
      updates.push('gender_identity = ?');
      values.push(preferences.genderIdentity);
    }
    if (preferences.genderSelfDescribe !== undefined) {
      updates.push('gender_self_describe = ?');
      values.push(preferences.genderSelfDescribe);
    }
    if (preferences.hasDisability !== undefined) {
      updates.push('has_disability = ?');
      values.push(preferences.hasDisability);
    }
    if (preferences.onboardingCompleted !== undefined) {
      updates.push('onboarding_completed = ?');
      values.push(preferences.onboardingCompleted ? 1 : 0);
    }

    if (updates.length > 0) {
      updates.push('updated_at = unixepoch()');
      values.push(userId);

      await db.prepare(`
        UPDATE job_search_preferences SET ${updates.join(', ')}
        WHERE user_id = ?
      `).bind(...values).run();
    }
  } else {
    // Insert new preferences
    await db.prepare(`
      INSERT INTO job_search_preferences (
        user_id, desired_job_titles, work_locations, work_mode, industries,
        employment_status, availability_date, willing_to_relocate,
        requires_visa_sponsorship, has_drivers_license, has_security_clearance,
        gender_identity, gender_self_describe, has_disability, onboarding_completed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      JSON.stringify(preferences.desiredJobTitles || []),
      JSON.stringify(preferences.workLocations || []),
      preferences.workMode || 'any',
      JSON.stringify(preferences.industries || []),
      preferences.employmentStatus || 'employed-open',
      preferences.availabilityDate || null,
      preferences.willingToRelocate ? 1 : 0,
      preferences.requiresVisaSponsorship || 'prefer-not-to-say',
      preferences.hasDriversLicense || 'prefer-not-to-say',
      preferences.hasSecurityClearance || 'prefer-not-to-say',
      preferences.genderIdentity || 'prefer-not-to-say',
      preferences.genderSelfDescribe || null,
      preferences.hasDisability || 'prefer-not-to-say',
      preferences.onboardingCompleted ? 1 : 0
    ).run();
  }
}

/**
 * Build Adzuna search queries from user preferences
 * Returns an array of search queries combining job titles with locations
 */
export function buildSearchQueriesFromPreferences(
  preferences: JobSearchPreferences
): string[] {
  const queries: string[] = [];

  // Use desired job titles, or fall back to default
  const titles = preferences.desiredJobTitles.length > 0
    ? preferences.desiredJobTitles
    : ['software engineer']; // Default fallback

  // Use work locations, or fall back to remote
  const locations = preferences.workLocations.length > 0
    ? preferences.workLocations
    : ['remote']; // Default to remote

  // Generate queries: combine each title with location context
  for (const title of titles) {
    if (preferences.workMode === 'remote' || locations.some(l => l.toLowerCase() === 'remote')) {
      // Add remote query
      queries.push(`${title} remote`);
    } else if (preferences.workMode === 'any') {
      // Add both remote and specific locations
      queries.push(`${title} remote`);
      for (const location of locations.filter(l => l.toLowerCase() !== 'remote')) {
        queries.push(`${title} ${location}`);
      }
    } else {
      // onsite or hybrid - use specific locations
      for (const location of locations.filter(l => l.toLowerCase() !== 'remote')) {
        queries.push(`${title} ${location}`);
      }
    }
  }

  // Limit to 10 queries to avoid overwhelming the API
  return queries.slice(0, 10);
}
