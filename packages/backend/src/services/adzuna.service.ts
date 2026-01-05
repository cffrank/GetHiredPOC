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
  contract_type?: string;
  category?: { label: string };
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
          // Detect remote jobs by checking both location and title for "remote" keyword
          const locationText = job.location.display_name.toLowerCase();
          const titleText = job.title.toLowerCase();
          const isRemote = locationText.includes('remote') || titleText.includes('remote') ? 1 : 0;

          const result = await saveOrUpdateJob(env.DB, {
            title: job.title,
            company: job.company.display_name,
            location: job.location.display_name,
            remote: isRemote,
            description: job.description,
            requirements: JSON.stringify([]), // Adzuna doesn't provide structured requirements
            salary_min: job.salary_min || null,
            salary_max: job.salary_max || null,
            posted_date: Math.floor(new Date(job.created).getTime() / 1000),
            source: 'adzuna',
            external_url: job.redirect_url
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
        posted_date = ?
      WHERE id = ?
    `).bind(
      jobData.title, jobData.company, jobData.location, jobData.remote,
      jobData.description, jobData.requirements, jobData.salary_min, jobData.salary_max,
      jobData.posted_date, existing.id
    ).run();

    return 'updated';
  } else {
    // Insert new job
    await db.prepare(`
      INSERT INTO jobs (title, company, location, remote, description, requirements, salary_min, salary_max, posted_date, source, external_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      jobData.title, jobData.company, jobData.location, jobData.remote,
      jobData.description, jobData.requirements, jobData.salary_min, jobData.salary_max,
      jobData.posted_date, jobData.source, jobData.external_url
    ).run();

    return 'inserted';
  }
}
