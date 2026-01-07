import type { Env } from './db.service';

export interface JobData {
  title: string;
  company: string;
  location: string;
  state: string | null;
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

export interface ScraperResult {
  imported: number;
  updated: number;
  errors: number;
}

/**
 * Source priority mapping (lower number = higher priority)
 */
const SOURCE_PRIORITY: Record<string, number> = {
  'linkedin': 1,
  'indeed': 2,
  'dice': 3,
  'adzuna': 4
};

/**
 * Generate normalized hash for duplicate detection
 * Combines lowercase title+company+location with whitespace removed
 */
function generateNormalizedHash(title: string, company: string, location: string): string {
  return `${title}${company}${location}`.toLowerCase().replace(/\s+/g, '');
}

/**
 * Save or update a job in the database with multi-source deduplication
 *
 * Deduplication strategy:
 * 1. Check by external_url (exact match)
 * 2. Check by normalized hash (title+company+location)
 * 3. Apply priority-based updates: higher priority sources can update lower priority sources
 *
 * Returns { result: 'inserted' | 'updated' | 'skipped', jobId: string, job: any }
 */
export async function saveOrUpdateJob(
  db: D1Database,
  jobData: JobData
): Promise<{ result: 'inserted' | 'updated' | 'skipped'; jobId: string; job: any }> {
  const normalizedHash = generateNormalizedHash(jobData.title, jobData.company, jobData.location);
  const newSourcePriority = SOURCE_PRIORITY[jobData.source] || 999;

  // Check if job exists by external_url (exact match)
  const existingByUrl = await db.prepare(
    'SELECT id, source FROM jobs WHERE external_url = ?'
  ).bind(jobData.external_url).first<{ id: string; source: string }>();

  if (existingByUrl) {
    const existingPriority = SOURCE_PRIORITY[existingByUrl.source] || 999;

    // Only update if new source has higher or equal priority
    if (newSourcePriority <= existingPriority) {
      await db.prepare(`
        UPDATE jobs SET
          title = ?, company = ?, location = ?, state = ?, remote = ?,
          description = ?, requirements = ?, salary_min = ?, salary_max = ?,
          posted_date = ?, source = ?, contract_time = ?, contract_type = ?,
          category_tag = ?, category_label = ?, salary_is_predicted = ?,
          latitude = ?, longitude = ?, adref = ?
        WHERE id = ?
      `).bind(
        jobData.title, jobData.company, jobData.location, jobData.state, jobData.remote,
        jobData.description, jobData.requirements, jobData.salary_min, jobData.salary_max,
        jobData.posted_date, jobData.source, jobData.contract_time, jobData.contract_type,
        jobData.category_tag, jobData.category_label, jobData.salary_is_predicted,
        jobData.latitude, jobData.longitude, jobData.adref,
        existingByUrl.id
      ).run();

      const job = await db.prepare('SELECT * FROM jobs WHERE id = ?')
        .bind(existingByUrl.id)
        .first();

      return { result: 'updated', jobId: existingByUrl.id, job };
    } else {
      // Lower priority source - skip update
      const job = await db.prepare('SELECT * FROM jobs WHERE id = ?')
        .bind(existingByUrl.id)
        .first();

      return { result: 'skipped', jobId: existingByUrl.id, job };
    }
  }

  // Check by normalized hash for duplicates with different URLs
  const existingByHash = await db.prepare(`
    SELECT id, source, external_url FROM jobs
    WHERE LOWER(REPLACE(title || company || location, ' ', '')) = ?
  `).bind(normalizedHash).first<{ id: string; source: string; external_url: string }>();

  if (existingByHash) {
    const existingPriority = SOURCE_PRIORITY[existingByHash.source] || 999;

    // Only update if new source has higher priority
    if (newSourcePriority < existingPriority) {
      await db.prepare(`
        UPDATE jobs SET
          title = ?, company = ?, location = ?, state = ?, remote = ?,
          description = ?, requirements = ?, salary_min = ?, salary_max = ?,
          posted_date = ?, source = ?, external_url = ?, contract_time = ?, contract_type = ?,
          category_tag = ?, category_label = ?, salary_is_predicted = ?,
          latitude = ?, longitude = ?, adref = ?
        WHERE id = ?
      `).bind(
        jobData.title, jobData.company, jobData.location, jobData.state, jobData.remote,
        jobData.description, jobData.requirements, jobData.salary_min, jobData.salary_max,
        jobData.posted_date, jobData.source, jobData.external_url, jobData.contract_time, jobData.contract_type,
        jobData.category_tag, jobData.category_label, jobData.salary_is_predicted,
        jobData.latitude, jobData.longitude, jobData.adref,
        existingByHash.id
      ).run();

      const job = await db.prepare('SELECT * FROM jobs WHERE id = ?')
        .bind(existingByHash.id)
        .first();

      console.log(`[Job Import] Updated job ${existingByHash.id} with higher priority source: ${jobData.source} > ${existingByHash.source}`);
      return { result: 'updated', jobId: existingByHash.id, job };
    } else {
      // Lower or equal priority source - skip
      const job = await db.prepare('SELECT * FROM jobs WHERE id = ?')
        .bind(existingByHash.id)
        .first();

      console.log(`[Job Import] Skipped duplicate job (lower priority): ${jobData.source} <= ${existingByHash.source}`);
      return { result: 'skipped', jobId: existingByHash.id, job };
    }
  }

  // Insert new job
  const result = await db.prepare(`
    INSERT INTO jobs (
      title, company, location, state, remote, description, requirements,
      salary_min, salary_max, posted_date, source, external_url,
      contract_time, contract_type, category_tag, category_label,
      salary_is_predicted, latitude, longitude, adref
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    jobData.title, jobData.company, jobData.location, jobData.state, jobData.remote,
    jobData.description, jobData.requirements, jobData.salary_min, jobData.salary_max,
    jobData.posted_date, jobData.source, jobData.external_url,
    jobData.contract_time, jobData.contract_type, jobData.category_tag, jobData.category_label,
    jobData.salary_is_predicted, jobData.latitude, jobData.longitude, jobData.adref
  ).run();

  // Fetch the newly inserted job
  const job = await db.prepare('SELECT * FROM jobs WHERE external_url = ?')
    .bind(jobData.external_url)
    .first<any>();

  console.log(`[Job Import] Inserted new job from ${jobData.source}: ${jobData.title} at ${jobData.company}`);
  return { result: 'inserted', jobId: job?.id || '', job };
}

/**
 * Main orchestration function for importing jobs from multiple scrapers
 *
 * Runs scrapers sequentially in the order provided, with error isolation.
 * Each scraper runs for all queries before moving to the next scraper.
 *
 * @param env - Environment with DB and API credentials
 * @param scraperTypes - Array of scraper names: 'linkedin', 'indeed', 'dice'
 * @param queries - Search queries to run (e.g., "software engineer remote")
 * @param mode - 'cron' applies cost limits, 'on-demand' uses all queries
 * @returns Summary of imported, updated, and error counts by scraper
 */
export async function importJobsFromScrapers(
  env: Env,
  scraperTypes: string[],
  queries: string[],
  mode: 'cron' | 'on-demand' = 'on-demand'
): Promise<{ imported: number; updated: number; errors: number; byScraper: Record<string, ScraperResult> }> {
  const { embedNewJob } = await import('./job-embedding.service');

  let totalImported = 0;
  let totalUpdated = 0;
  let totalErrors = 0;
  const byScraper: Record<string, ScraperResult> = {};

  // Apply cost limits based on mode
  let limitedQueries = queries;
  if (mode === 'cron') {
    // Limit queries to reduce API costs
    limitedQueries = queries.slice(0, 10);
    console.log(`[Job Import] CRON mode: limiting to ${limitedQueries.length} queries (from ${queries.length})`);
  }

  // Run scrapers sequentially
  for (const scraperType of scraperTypes) {
    console.log(`[Job Import] Starting scraper: ${scraperType}`);

    const scraperResult: ScraperResult = {
      imported: 0,
      updated: 0,
      errors: 0
    };

    try {
      // Dynamic import of scraper functions
      // NOTE: These will be implemented in apify.service.ts
      let searchFunction: any;
      let mapperFunction: any;

      if (scraperType === 'linkedin') {
        const { searchLinkedInJobs, mapLinkedInJobToJobData } = await import('./apify.service');
        searchFunction = searchLinkedInJobs;
        mapperFunction = mapLinkedInJobToJobData;
      } else if (scraperType === 'indeed') {
        const { searchIndeedJobs, mapIndeedJobToJobData } = await import('./apify.service');
        searchFunction = searchIndeedJobs;
        mapperFunction = mapIndeedJobToJobData;
      } else if (scraperType === 'dice') {
        const { searchDiceJobs, mapDiceJobToJobData } = await import('./apify.service');
        searchFunction = searchDiceJobs;
        mapperFunction = mapDiceJobToJobData;
      } else {
        console.warn(`[Job Import] Unknown scraper type: ${scraperType}`);
        continue;
      }

      // Apply per-scraper query limits in cron mode
      let scraperQueries = limitedQueries;
      if (mode === 'cron') {
        const limits: Record<string, number> = {
          'linkedin': 10,
          'indeed': 10,
          'dice': 5
        };
        scraperQueries = limitedQueries.slice(0, limits[scraperType] || 10);
      }

      // Run each query for this scraper
      for (const query of scraperQueries) {
        try {
          console.log(`[Job Import] ${scraperType}: searching for "${query}"`);

          // Search for jobs using the scraper
          const jobs = await searchFunction(env, query);

          console.log(`[Job Import] ${scraperType}: found ${jobs.length} jobs for "${query}"`);

          // Process each job
          for (const rawJob of jobs) {
            try {
              // Map to JobData format
              const jobData: JobData = mapperFunction(rawJob);

              // Save or update job
              const saveResult = await saveOrUpdateJob(env.DB, jobData);

              if (saveResult.result === 'inserted') {
                scraperResult.imported++;
              } else if (saveResult.result === 'updated') {
                scraperResult.updated++;
              }

              // Generate embedding asynchronously (don't block import)
              embedNewJob(env, saveResult.job).catch(err => {
                console.error(`[Job Import] Failed to embed job ${saveResult.jobId}:`, err);
              });
            } catch (error: any) {
              console.error(`[Job Import] Error saving job from ${scraperType}:`, error.message);
              scraperResult.errors++;
            }
          }
        } catch (error: any) {
          console.error(`[Job Import] Error searching ${scraperType} for "${query}":`, error.message);
          scraperResult.errors++;
        }
      }
    } catch (error: any) {
      console.error(`[Job Import] Fatal error with scraper ${scraperType}:`, error.message);
      scraperResult.errors++;
    }

    // Update totals
    totalImported += scraperResult.imported;
    totalUpdated += scraperResult.updated;
    totalErrors += scraperResult.errors;
    byScraper[scraperType] = scraperResult;

    console.log(`[Job Import] Completed ${scraperType}: ${scraperResult.imported} imported, ${scraperResult.updated} updated, ${scraperResult.errors} errors`);
  }

  console.log(`[Job Import] All scrapers completed: ${totalImported} imported, ${totalUpdated} updated, ${totalErrors} errors`);

  return {
    imported: totalImported,
    updated: totalUpdated,
    errors: totalErrors,
    byScraper
  };
}

/**
 * Import jobs for a specific user based on their preferences
 *
 * @param env - Environment with DB and API credentials
 * @param userId - User ID to import jobs for
 * @param scraperTypes - Optional array of scrapers to use (defaults to all)
 * @returns Summary of imported, updated, and error counts
 */
export async function importJobsForUser(
  env: Env,
  userId: string,
  scraperTypes: string[] = ['linkedin', 'indeed', 'dice']
): Promise<{ imported: number; updated: number; errors: number; byScraper: Record<string, ScraperResult> }> {
  const { getJobSearchPreferences, buildSearchQueriesFromPreferences } =
    await import('./job-preferences.service');

  console.log(`[Job Import] Starting import for user ${userId}`);

  // Get user preferences and build queries
  const preferences = await getJobSearchPreferences(env.DB, userId);
  const queries = buildSearchQueriesFromPreferences(preferences);

  console.log(`[Job Import] User ${userId}: ${queries.length} queries from preferences`);

  // Import jobs using on-demand mode (no limits)
  return await importJobsFromScrapers(env, scraperTypes, queries, 'on-demand');
}

/**
 * Import jobs for all users with completed onboarding
 * Uses deduplicated queries across all users to minimize API costs
 *
 * @param env - Environment with DB and API credentials
 * @param mode - 'cron' for scheduled runs (with limits), 'on-demand' for manual runs
 * @returns Summary with query count
 */
export async function importJobsForAllUsers(
  env: Env,
  mode: 'cron' | 'on-demand' = 'cron'
): Promise<{ imported: number; updated: number; errors: number; queries: number; byScraper: Record<string, ScraperResult> }> {
  const { buildDeduplicatedQueriesForAllUsers } = await import('./job-preferences.service');

  console.log('[Job Import] Starting job import for all users');

  // Get deduplicated queries from all users
  const queries = await buildDeduplicatedQueriesForAllUsers(env.DB);

  console.log(`[Job Import] Generated ${queries.length} deduplicated queries from all users`);

  // Run all scrapers in priority order
  const result = await importJobsFromScrapers(
    env,
    ['linkedin', 'indeed', 'dice'],
    queries,
    mode
  );

  console.log(`[Job Import] Completed for all users: ${result.imported} imported, ${result.updated} updated, ${result.errors} errors`);

  return {
    ...result,
    queries: queries.length
  };
}
