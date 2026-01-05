import type { Env } from './db.service';

export interface AdzunaJob {
  id: string;
  title: string;
  company: { display_name: string };
  location: { area: string[]; display_name: string };
  description: string;
  redirect_url: string;
  salary_min?: number;
  salary_max?: number;
  created: string; // ISO date
  contract_time?: string; // full_time, part_time, etc.
  contract_type?: string; // permanent, contract, temporary
  category?: { tag: string; label: string };
  salary_is_predicted?: string; // "0" or "1"
  latitude?: number;
  longitude?: number;
  adref?: string;
}

export interface AdzunaSearchResult {
  jobs: AdzunaJob[];
  count: number;
}

/**
 * Search jobs from Adzuna API
 */
export async function searchAdzunaJobs(
  env: Env,
  query: string = 'software engineer',
  location: string = 'remote',
  page: number = 1
): Promise<AdzunaSearchResult> {
  const country = 'us'; // US jobs
  const appId = env.ADZUNA_APP_ID;
  const appKey = env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    throw new Error('Adzuna API credentials not configured');
  }

  // Build Adzuna API URL
  const url = new URL(`https://api.adzuna.com/v1/api/jobs/${country}/search/${page}`);
  url.searchParams.append('app_id', appId);
  url.searchParams.append('app_key', appKey);
  url.searchParams.append('what', query);
  // Only add location filter if it's not "remote" (Adzuna doesn't support "remote" as location)
  if (location && location.toLowerCase() !== 'remote') {
    url.searchParams.append('where', location);
  }
  url.searchParams.append('results_per_page', '50');
  url.searchParams.append('content-type', 'application/json');

  console.log(`Searching Adzuna: "${query}" in "${location}"`);

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Adzuna API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json() as { results: AdzunaJob[]; count: number };

  return {
    jobs: data.results || [],
    count: data.count || 0
  };
}

/**
 * Import jobs from Adzuna into D1 database
 */
export async function importJobsFromAdzuna(
  env: Env,
  searchQueries: string[] = [
    'software engineer remote',
    'web developer remote',
    'frontend engineer remote',
    'backend engineer remote',
    'full stack developer remote'
  ]
): Promise<{ imported: number; updated: number; errors: number }> {
  let imported = 0;
  let updated = 0;
  let errors = 0;

  for (const query of searchQueries) {
    try {
      const { jobs } = await searchAdzunaJobs(env, query, 'remote', 1);

      console.log(`Found ${jobs.length} jobs for "${query}"`);

      for (const job of jobs) {
        try {
          console.log(`[Adzuna Import] Job: ${job.title} at ${job.company.display_name}`);
          console.log(`[Adzuna Import] Description length: ${job.description?.length || 0} chars`);
          console.log(`[Adzuna Import] Contract: ${job.contract_type} / ${job.contract_time}`);
          console.log(`[Adzuna Import] Category: ${job.category?.label || 'N/A'}`);

          // Detect work mode: 0 = on-site, 1 = remote, 2 = hybrid
          const locationText = job.location.display_name.toLowerCase();
          const titleText = job.title.toLowerCase();
          const descriptionText = job.description.toLowerCase();

          let remoteValue = 0; // Default: on-site

          // Check for hybrid first (takes priority)
          if (titleText.includes('hybrid') || locationText.includes('hybrid') || descriptionText.includes('hybrid')) {
            remoteValue = 2;
          }
          // Then check for remote
          else if (titleText.includes('remote') || locationText.includes('remote') || descriptionText.includes('remote')) {
            remoteValue = 1;
          }

          const result = await saveOrUpdateJob(env.DB, {
            title: job.title,
            company: job.company.display_name,
            location: job.location.display_name,
            remote: remoteValue,
            description: job.description,
            requirements: JSON.stringify([]), // Adzuna doesn't provide structured requirements
            salary_min: job.salary_min || null,
            salary_max: job.salary_max || null,
            posted_date: Math.floor(new Date(job.created).getTime() / 1000),
            source: 'adzuna',
            external_url: job.redirect_url,
            contract_time: job.contract_time || null,
            contract_type: job.contract_type || null,
            category_tag: job.category?.tag || null,
            category_label: job.category?.label || null,
            salary_is_predicted: job.salary_is_predicted === '1' ? 1 : 0,
            latitude: job.latitude || null,
            longitude: job.longitude || null,
            adref: job.adref || null
          });

          if (result === 'inserted') {
            imported++;
          } else {
            updated++;
          }
        } catch (error: any) {
          console.error('Error saving job:', error.message);
          errors++;
        }
      }
    } catch (error: any) {
      console.error(`Error searching for "${query}":`, error.message);
      errors++;
    }
  }

  return { imported, updated, errors };
}

/**
 * Save or update a job in the database (deduplicates by external_url)
 */
async function saveOrUpdateJob(
  db: D1Database,
  jobData: {
    title: string;
    company: string;
    location: string;
    remote: number;
    description: string;
    requirements: string;
    salary_min: number | null;
    salary_max: number | null;
    posted_date: number;
    source: string;
    external_url: string;
    contract_time: string | null;
    contract_type: string | null;
    category_tag: string | null;
    category_label: string | null;
    salary_is_predicted: number;
    latitude: number | null;
    longitude: number | null;
    adref: string | null;
  }
): Promise<'inserted' | 'updated'> {
  // Check if job exists (by external_url to avoid duplicates)
  const existing = await db.prepare(
    'SELECT id FROM jobs WHERE external_url = ?'
  ).bind(jobData.external_url).first();

  if (existing) {
    // Update existing job
    await db.prepare(`
      UPDATE jobs SET
        title = ?, company = ?, location = ?, remote = ?,
        description = ?, requirements = ?, salary_min = ?, salary_max = ?,
        posted_date = ?, contract_time = ?, contract_type = ?,
        category_tag = ?, category_label = ?, salary_is_predicted = ?,
        latitude = ?, longitude = ?, adref = ?
      WHERE id = ?
    `).bind(
      jobData.title, jobData.company, jobData.location, jobData.remote,
      jobData.description, jobData.requirements, jobData.salary_min, jobData.salary_max,
      jobData.posted_date, jobData.contract_time, jobData.contract_type,
      jobData.category_tag, jobData.category_label, jobData.salary_is_predicted,
      jobData.latitude, jobData.longitude, jobData.adref,
      existing.id
    ).run();

    return 'updated';
  } else {
    // Insert new job
    await db.prepare(`
      INSERT INTO jobs (
        title, company, location, remote, description, requirements,
        salary_min, salary_max, posted_date, source, external_url,
        contract_time, contract_type, category_tag, category_label,
        salary_is_predicted, latitude, longitude, adref
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      jobData.title, jobData.company, jobData.location, jobData.remote,
      jobData.description, jobData.requirements, jobData.salary_min, jobData.salary_max,
      jobData.posted_date, jobData.source, jobData.external_url,
      jobData.contract_time, jobData.contract_type, jobData.category_tag, jobData.category_label,
      jobData.salary_is_predicted, jobData.latitude, jobData.longitude, jobData.adref
    ).run();

    return 'inserted';
  }
}

/**
 * Import jobs for a specific user based on their job search preferences
 */
export async function importJobsForUser(
  env: Env,
  userId: string
): Promise<{ imported: number; updated: number; errors: number }> {
  const { getJobSearchPreferences, buildSearchQueriesFromPreferences } =
    await import('./job-preferences.service');

  const preferences = await getJobSearchPreferences(env.DB, userId);
  const queries = buildSearchQueriesFromPreferences(preferences);

  console.log(`Importing jobs for user ${userId} with ${queries.length} queries:`, queries);

  return await importJobsFromAdzuna(env, queries);
}

/**
 * Import jobs for all users with completed preferences
 * Uses deduplicated queries across all users to avoid redundant API calls
 */
export async function importJobsForAllUsers(
  env: Env
): Promise<{ imported: number; updated: number; errors: number; queries: number }> {
  const { buildDeduplicatedQueriesForAllUsers } = await import('./job-preferences.service');

  console.log('[Job Import] Starting daily job import for all users');

  const queries = await buildDeduplicatedQueriesForAllUsers(env.DB);

  console.log(`[Job Import] Generated ${queries.length} deduplicated queries from all users`);

  const result = await importJobsFromAdzuna(env, queries);

  console.log(`[Job Import] Completed: ${result.imported} imported, ${result.updated} updated, ${result.errors} errors`);

  return {
    ...result,
    queries: queries.length
  };
}
