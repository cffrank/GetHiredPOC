import type { Env } from './db.service';

/**
 * Apify API Response Types
 */
interface ApifyRunResponse {
  data: {
    id: string;
    actId: string;
    status: 'READY' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'TIMED-OUT' | 'ABORTED';
    defaultDatasetId: string;
  };
}

interface ApifyDatasetItem {
  [key: string]: any;
}

/**
 * Internal Job Schema
 */
interface JobData {
  title: string;
  company: string;
  location: string;
  state: string | null;
  remote: number; // 0 = on-site, 1 = remote, 2 = hybrid
  description: string;
  requirements: string; // JSON string array
  salary_min: number | null;
  salary_max: number | null;
  posted_date: number; // Unix timestamp (seconds)
  source: string;
  external_url: string;
}

/**
 * Raw job data from scrapers (varies by source)
 */
interface LinkedInRawJob {
  title?: string;
  company?: string;
  location?: string;
  description?: string;
  url?: string;
  salary?: string | { min?: number; max?: number; currency?: string };
  postedAt?: string;
  employmentType?: string;
  workMode?: string;
  skills?: string[];
}

interface IndeedRawJob {
  jobTitle?: string;
  company?: string;
  location?: string;
  description?: string;
  url?: string;
  salary?: string | { min?: number; max?: number };
  datePosted?: string;
  jobType?: string;
  remote?: boolean;
  skills?: string[];
}

interface DiceRawJob {
  title?: string;
  companyName?: string;
  location?: string;
  description?: string;
  detailsPageUrl?: string;
  salary?: string | { min?: number; max?: number };
  postedDate?: string;
  employmentType?: string;
  isRemote?: boolean;
  skillsList?: string[];
}

/**
 * Extract state abbreviation from location string
 * Reused from adzuna.service.ts with modifications for string input
 */
function extractState(locationStr: string): string | null {
  // State abbreviations mapping
  const stateMap: Record<string, string> = {
    'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
    'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
    'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
    'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
    'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
    'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH',
    'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC',
    'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA',
    'rhode island': 'RI', 'south carolina': 'SC', 'south dakota': 'SD', 'tennessee': 'TN',
    'texas': 'TX', 'utah': 'UT', 'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA',
    'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY'
  };

  // Try to extract from location string (e.g., "Madison, WI" or "Madison, Wisconsin")
  const parts = locationStr.split(',').map(s => s.trim());

  // Check if last part is a 2-letter state code
  if (parts.length >= 2) {
    const lastPart = parts[parts.length - 1].toUpperCase();
    if (lastPart.length === 2 && Object.values(stateMap).includes(lastPart)) {
      return lastPart;
    }

    // Check if last part is a full state name
    const stateName = parts[parts.length - 1].toLowerCase();
    if (stateMap[stateName]) {
      return stateMap[stateName];
    }
  }

  // Try to find state in the entire string
  const locationLower = locationStr.toLowerCase();
  for (const [stateName, stateCode] of Object.entries(stateMap)) {
    if (locationLower.includes(stateName)) {
      return stateCode;
    }
    if (locationLower.includes(stateCode.toLowerCase())) {
      return stateCode;
    }
  }

  return null;
}

/**
 * Parse posted date from various formats
 * Handles ISO dates and relative dates ("2 days ago", "Posted 3 hours ago")
 */
function parsePostedDate(dateStr: string | undefined | null): number {
  if (!dateStr) {
    return Math.floor(Date.now() / 1000); // Default to now
  }

  // Try ISO date first
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) {
    return Math.floor(isoDate.getTime() / 1000);
  }

  // Parse relative dates
  const now = Date.now();
  const relativeMatch = dateStr.match(/(\d+)\s*(hour|day|week|month)s?\s*ago/i);

  if (relativeMatch) {
    const value = parseInt(relativeMatch[1]);
    const unit = relativeMatch[2].toLowerCase();

    let milliseconds = 0;
    switch (unit) {
      case 'hour':
        milliseconds = value * 60 * 60 * 1000;
        break;
      case 'day':
        milliseconds = value * 24 * 60 * 60 * 1000;
        break;
      case 'week':
        milliseconds = value * 7 * 24 * 60 * 60 * 1000;
        break;
      case 'month':
        milliseconds = value * 30 * 24 * 60 * 60 * 1000;
        break;
    }

    return Math.floor((now - milliseconds) / 1000);
  }

  // Default to now if parsing fails
  return Math.floor(now / 1000);
}

/**
 * Parse salary from various formats
 * Handles objects, strings like "$80K-$120K", "$50,000 - $70,000", etc.
 */
function parseSalary(salary: any): { min: number | null; max: number | null } {
  if (!salary) {
    return { min: null, max: null };
  }

  // Handle object format
  if (typeof salary === 'object' && !Array.isArray(salary)) {
    return {
      min: salary.min || null,
      max: salary.max || null
    };
  }

  // Handle string format
  if (typeof salary === 'string') {
    // Remove currency symbols and spaces
    const cleaned = salary.replace(/[$,\s]/g, '');

    // Try to match range patterns: "80K-120K", "80000-120000"
    const rangeMatch = cleaned.match(/(\d+(?:\.\d+)?)(k|K)?-(\d+(?:\.\d+)?)(k|K)?/i);
    if (rangeMatch) {
      let min = parseFloat(rangeMatch[1]);
      let max = parseFloat(rangeMatch[3]);

      // Handle K suffix (thousands)
      if (rangeMatch[2]?.toLowerCase() === 'k') {
        min *= 1000;
      }
      if (rangeMatch[4]?.toLowerCase() === 'k') {
        max *= 1000;
      }

      return { min, max };
    }

    // Try to match single value
    const singleMatch = cleaned.match(/(\d+(?:\.\d+)?)(k|K)?/i);
    if (singleMatch) {
      let value = parseFloat(singleMatch[1]);
      if (singleMatch[2]?.toLowerCase() === 'k') {
        value *= 1000;
      }
      return { min: value, max: value };
    }
  }

  return { min: null, max: null };
}

/**
 * Extract skills/requirements from job description
 * Returns an array of detected skills
 */
function extractRequirements(description: string | undefined, skills?: string[]): string[] {
  if (skills && skills.length > 0) {
    return skills;
  }

  if (!description) {
    return [];
  }

  const requirements: Set<string> = new Set();
  const descLower = description.toLowerCase();

  // Common tech skills to detect
  const commonSkills = [
    'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'ruby', 'go', 'rust', 'php',
    'react', 'vue', 'angular', 'node.js', 'express', 'django', 'flask', 'spring', 'rails',
    'sql', 'nosql', 'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'git', 'ci/cd',
    'html', 'css', 'sass', 'webpack', 'rest api', 'graphql', 'microservices',
    'agile', 'scrum', 'jira', 'machine learning', 'ai', 'data science'
  ];

  for (const skill of commonSkills) {
    // Use word boundaries to avoid partial matches
    const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(descLower)) {
      requirements.add(skill);
    }
  }

  return Array.from(requirements);
}

/**
 * Detect work mode from job data
 * Returns: 0 = on-site, 1 = remote, 2 = hybrid
 * Priority: hybrid > remote > on-site
 */
function detectWorkMode(job: {
  title?: string;
  location?: string;
  description?: string;
  workMode?: string;
  remote?: boolean;
  isRemote?: boolean;
}): number {
  const title = (job.title || '').toLowerCase();
  const location = (job.location || '').toLowerCase();
  const description = (job.description || '').toLowerCase();
  const workMode = (job.workMode || '').toLowerCase();

  // Check explicit flags first
  if (job.remote === true || job.isRemote === true) {
    return 1;
  }

  // Check for hybrid (takes priority)
  if (
    title.includes('hybrid') ||
    location.includes('hybrid') ||
    description.includes('hybrid') ||
    workMode.includes('hybrid')
  ) {
    return 2;
  }

  // Check for remote
  if (
    title.includes('remote') ||
    location.includes('remote') ||
    description.includes('remote') ||
    workMode.includes('remote')
  ) {
    return 1;
  }

  // Default to on-site
  return 0;
}

/**
 * Start an Apify actor run
 */
async function startActorRun(
  env: Env,
  actorId: string,
  input: Record<string, any>
): Promise<string> {
  const url = `https://api.apify.com/v2/acts/${actorId}/runs`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.APIFY_API_TOKEN}`
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to start Apify actor ${actorId}: ${response.status} ${errorText}`);
  }

  const data = await response.json() as ApifyRunResponse;
  console.log(`[Apify] Started actor run: ${data.data.id} (status: ${data.data.status})`);

  return data.data.id;
}

/**
 * Poll Apify run status until completion
 * Uses exponential backoff: 5s, 10s, 20s, 30s, 30s...
 * Timeout after 5 minutes (300 seconds)
 */
async function pollRunStatus(
  env: Env,
  runId: string,
  timeout: number = 300000
): Promise<{ status: string; datasetId: string }> {
  const startTime = Date.now();
  const delays = [5000, 10000, 20000, 30000]; // Exponential backoff
  let delayIndex = 0;

  while (true) {
    // Check timeout
    if (Date.now() - startTime > timeout) {
      throw new Error(`Apify run ${runId} timed out after ${timeout / 1000} seconds`);
    }

    const url = `https://api.apify.com/v2/actor-runs/${runId}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${env.APIFY_API_TOKEN}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get run status: ${response.status} ${errorText}`);
    }

    const data = await response.json() as ApifyRunResponse;
    const status = data.data.status;

    console.log(`[Apify] Run ${runId} status: ${status}`);

    if (status === 'SUCCEEDED') {
      return {
        status,
        datasetId: data.data.defaultDatasetId
      };
    }

    if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
      throw new Error(`Apify run ${runId} ${status.toLowerCase()}`);
    }

    // Wait before next poll (exponential backoff)
    const delay = delays[Math.min(delayIndex, delays.length - 1)];
    await new Promise(resolve => setTimeout(resolve, delay));
    delayIndex++;
  }
}

/**
 * Fetch items from Apify dataset
 */
async function fetchDatasetItems(
  env: Env,
  datasetId: string
): Promise<ApifyDatasetItem[]> {
  const url = `https://api.apify.com/v2/datasets/${datasetId}/items`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${env.APIFY_API_TOKEN}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch dataset items: ${response.status} ${errorText}`);
  }

  const items = await response.json() as ApifyDatasetItem[];
  console.log(`[Apify] Fetched ${items.length} items from dataset ${datasetId}`);

  return items;
}

/**
 * Search LinkedIn jobs via Apify (using curious_coder/linkedin-jobs-search-scraper)
 */
export async function searchLinkedInJobs(
  env: Env,
  query: string,
  location: string = 'United States',
  maxResults: number = 50
): Promise<JobData[]> {
  if (!env.APIFY_API_TOKEN || !env.APIFY_LINKEDIN_ACTOR_ID) {
    throw new Error('Apify LinkedIn credentials not configured');
  }

  console.log(`[LinkedIn] Searching for "${query}" in "${location}"`);

  // Retrieve LinkedIn cookie from KV storage (required for curious_coder scraper)
  const linkedinCookieStr = await env.KV_CACHE.get('linkedin_scraper_cookie');

  if (!linkedinCookieStr) {
    console.warn('[LinkedIn] No cookie configured - curious_coder scraper requires cookies');
    throw new Error('LinkedIn cookie not configured. Please configure cookie in Admin Dashboard.');
  }

  console.log('[LinkedIn] Using configured cookie for authentication');

  // Parse cookie JSON (should be array format from Cookie-Editor)
  let cookies;
  try {
    cookies = JSON.parse(linkedinCookieStr);
  } catch (error) {
    console.error('[LinkedIn] Failed to parse cookie JSON:', error);
    throw new Error('Invalid LinkedIn cookie format. Please re-export from Cookie-Editor.');
  }

  // Build LinkedIn search URL (curious_coder requires full URL)
  // Format: https://www.linkedin.com/jobs/search/?keywords=query&location=location
  const encodedQuery = encodeURIComponent(query);
  const encodedLocation = encodeURIComponent(location);
  const jobsSearchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodedQuery}&location=${encodedLocation}`;

  // Build input for curious_coder LinkedIn scraper
  const scraperInput: Record<string, any> = {
    cookies: cookies, // JSON array format
    jobsSearchUrl: jobsSearchUrl,
    totalNumberOfRecords: maxResults,
    scrapeJobDetails: true,
    scrapeSkillsRequirements: true,
    scrapeCompanyDetails: false,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
  };

  console.log(`[LinkedIn] Using search URL: ${jobsSearchUrl}`);

  // Start LinkedIn scraper
  const runId = await startActorRun(env, env.APIFY_LINKEDIN_ACTOR_ID, scraperInput);

  // Poll until completion
  const { datasetId } = await pollRunStatus(env, runId);

  // Fetch results
  const items = await fetchDatasetItems(env, datasetId);

  // Map to internal format
  return items.map(item => mapLinkedInJob(item as LinkedInRawJob)).filter(job => job !== null) as JobData[];
}

/**
 * Search Indeed jobs via Apify
 */
export async function searchIndeedJobs(
  env: Env,
  query: string,
  location: string = 'United States',
  maxResults: number = 50
): Promise<JobData[]> {
  if (!env.APIFY_API_TOKEN || !env.APIFY_INDEED_ACTOR_ID) {
    throw new Error('Apify Indeed credentials not configured');
  }

  console.log(`[Indeed] Searching for "${query}" in "${location}"`);

  // Start Indeed scraper
  const runId = await startActorRun(env, env.APIFY_INDEED_ACTOR_ID, {
    position: query,
    location: location,
    maxItems: maxResults
  });

  // Poll until completion
  const { datasetId } = await pollRunStatus(env, runId);

  // Fetch results
  const items = await fetchDatasetItems(env, datasetId);

  // Map to internal format
  return items.map(item => mapIndeedJob(item as IndeedRawJob)).filter(job => job !== null) as JobData[];
}

/**
 * Search Dice jobs via Apify
 */
export async function searchDiceJobs(
  env: Env,
  query: string,
  location: string = 'United States',
  maxResults: number = 50
): Promise<JobData[]> {
  if (!env.APIFY_API_TOKEN || !env.APIFY_DICE_ACTOR_ID) {
    throw new Error('Apify Dice credentials not configured');
  }

  console.log(`[Dice] Searching for "${query}" in "${location}"`);

  // Start Dice scraper
  const runId = await startActorRun(env, env.APIFY_DICE_ACTOR_ID, {
    query: query,
    location: location,
    maxResults: maxResults
  });

  // Poll until completion
  const { datasetId } = await pollRunStatus(env, runId);

  // Fetch results
  const items = await fetchDatasetItems(env, datasetId);

  // Map to internal format
  return items.map(item => mapDiceJob(item as DiceRawJob)).filter(job => job !== null) as JobData[];
}

/**
 * Map LinkedIn job data to internal format
 */
function mapLinkedInJob(rawJob: LinkedInRawJob): JobData | null {
  try {
    if (!rawJob.title || !rawJob.company || !rawJob.url) {
      console.warn('[LinkedIn] Skipping job with missing required fields');
      return null;
    }

    const location = rawJob.location || 'Remote';
    const state = extractState(location);
    const remote = detectWorkMode({
      title: rawJob.title,
      location: rawJob.location,
      description: rawJob.description,
      workMode: rawJob.workMode
    });

    const salary = parseSalary(rawJob.salary);
    const requirements = extractRequirements(rawJob.description, rawJob.skills);
    const postedDate = parsePostedDate(rawJob.postedAt);

    return {
      title: rawJob.title,
      company: rawJob.company,
      location,
      state,
      remote,
      description: rawJob.description || '',
      requirements: JSON.stringify(requirements),
      salary_min: salary.min,
      salary_max: salary.max,
      posted_date: postedDate,
      source: 'linkedin',
      external_url: rawJob.url
    };
  } catch (error: any) {
    console.error('[LinkedIn] Error mapping job:', error.message);
    return null;
  }
}

/**
 * Map Indeed job data to internal format
 */
function mapIndeedJob(rawJob: IndeedRawJob): JobData | null {
  try {
    if (!rawJob.jobTitle || !rawJob.company || !rawJob.url) {
      console.warn('[Indeed] Skipping job with missing required fields');
      return null;
    }

    const location = rawJob.location || 'Remote';
    const state = extractState(location);
    const remote = detectWorkMode({
      title: rawJob.jobTitle,
      location: rawJob.location,
      description: rawJob.description,
      remote: rawJob.remote
    });

    const salary = parseSalary(rawJob.salary);
    const requirements = extractRequirements(rawJob.description, rawJob.skills);
    const postedDate = parsePostedDate(rawJob.datePosted);

    return {
      title: rawJob.jobTitle,
      company: rawJob.company,
      location,
      state,
      remote,
      description: rawJob.description || '',
      requirements: JSON.stringify(requirements),
      salary_min: salary.min,
      salary_max: salary.max,
      posted_date: postedDate,
      source: 'indeed',
      external_url: rawJob.url
    };
  } catch (error: any) {
    console.error('[Indeed] Error mapping job:', error.message);
    return null;
  }
}

/**
 * Map Dice job data to internal format
 */
function mapDiceJob(rawJob: DiceRawJob): JobData | null {
  try {
    if (!rawJob.title || !rawJob.companyName || !rawJob.detailsPageUrl) {
      console.warn('[Dice] Skipping job with missing required fields');
      return null;
    }

    const location = rawJob.location || 'Remote';
    const state = extractState(location);
    const remote = detectWorkMode({
      title: rawJob.title,
      location: rawJob.location,
      description: rawJob.description,
      isRemote: rawJob.isRemote
    });

    const salary = parseSalary(rawJob.salary);
    const requirements = extractRequirements(rawJob.description, rawJob.skillsList);
    const postedDate = parsePostedDate(rawJob.postedDate);

    return {
      title: rawJob.title,
      company: rawJob.companyName,
      location,
      state,
      remote,
      description: rawJob.description || '',
      requirements: JSON.stringify(requirements),
      salary_min: salary.min,
      salary_max: salary.max,
      posted_date: postedDate,
      source: 'dice',
      external_url: rawJob.detailsPageUrl
    };
  } catch (error: any) {
    console.error('[Dice] Error mapping job:', error.message);
    return null;
  }
}

/**
 * Save or update a job in the database (deduplicates by external_url)
 * Returns { result: 'inserted' | 'updated', jobId: string, job: any }
 */
async function saveOrUpdateJob(
  db: D1Database,
  jobData: JobData
): Promise<{ result: 'inserted' | 'updated'; jobId: string; job: any }> {
  // Check if job exists (by external_url to avoid duplicates)
  const existing = await db.prepare(
    'SELECT id FROM jobs WHERE external_url = ?'
  ).bind(jobData.external_url).first<{ id: string }>();

  if (existing) {
    // Update existing job
    await db.prepare(`
      UPDATE jobs SET
        title = ?, company = ?, location = ?, state = ?, remote = ?,
        description = ?, requirements = ?, salary_min = ?, salary_max = ?,
        posted_date = ?, source = ?
      WHERE id = ?
    `).bind(
      jobData.title, jobData.company, jobData.location, jobData.state, jobData.remote,
      jobData.description, jobData.requirements, jobData.salary_min, jobData.salary_max,
      jobData.posted_date, jobData.source,
      existing.id
    ).run();

    // Fetch and return the updated job
    const job = await db.prepare('SELECT * FROM jobs WHERE id = ?')
      .bind(existing.id)
      .first();

    return { result: 'updated', jobId: existing.id, job };
  } else {
    // Insert new job
    await db.prepare(`
      INSERT INTO jobs (
        title, company, location, state, remote, description, requirements,
        salary_min, salary_max, posted_date, source, external_url
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      jobData.title, jobData.company, jobData.location, jobData.state, jobData.remote,
      jobData.description, jobData.requirements, jobData.salary_min, jobData.salary_max,
      jobData.posted_date, jobData.source, jobData.external_url
    ).run();

    // Fetch the newly inserted job
    const job = await db.prepare('SELECT * FROM jobs WHERE external_url = ?')
      .bind(jobData.external_url)
      .first<any>();

    return { result: 'inserted', jobId: job?.id || '', job };
  }
}

/**
 * Import jobs from all Apify scrapers
 * Searches LinkedIn, Indeed, and Dice in parallel
 */
export async function importJobsFromApify(
  env: Env,
  searchQueries: string[] = [
    'software engineer',
    'web developer',
    'frontend engineer',
    'backend engineer',
    'full stack developer'
  ],
  location: string = 'United States',
  maxResultsPerSource: number = 20
): Promise<{ imported: number; updated: number; errors: number; sources: Record<string, number> }> {
  const { embedNewJob } = await import('./job-embedding.service');
  let imported = 0;
  let updated = 0;
  let errors = 0;
  const sources: Record<string, number> = {
    linkedin: 0,
    indeed: 0,
    dice: 0
  };

  for (const query of searchQueries) {
    try {
      console.log(`[Apify] Processing query: "${query}" in "${location}"`);

      // Search all sources in parallel
      const [linkedInJobs, indeedJobs, diceJobs] = await Promise.allSettled([
        searchLinkedInJobs(env, query, location, maxResultsPerSource).catch(err => {
          console.error('[LinkedIn] Search failed:', err.message);
          return [];
        }),
        searchIndeedJobs(env, query, location, maxResultsPerSource).catch(err => {
          console.error('[Indeed] Search failed:', err.message);
          return [];
        }),
        searchDiceJobs(env, query, location, maxResultsPerSource).catch(err => {
          console.error('[Dice] Search failed:', err.message);
          return [];
        })
      ]);

      // Combine all jobs
      const allJobs: JobData[] = [
        ...(linkedInJobs.status === 'fulfilled' ? linkedInJobs.value : []),
        ...(indeedJobs.status === 'fulfilled' ? indeedJobs.value : []),
        ...(diceJobs.status === 'fulfilled' ? diceJobs.value : [])
      ];

      console.log(`[Apify] Found ${allJobs.length} total jobs for "${query}"`);

      // Save each job
      for (const jobData of allJobs) {
        try {
          console.log(`[Apify] Saving: ${jobData.title} at ${jobData.company} (${jobData.source})`);

          const saveResult = await saveOrUpdateJob(env.DB, jobData);

          if (saveResult.result === 'inserted') {
            imported++;
            sources[jobData.source]++;
          } else {
            updated++;
          }

          // Generate embedding for the job (async, don't wait)
          embedNewJob(env, saveResult.job).catch(err => {
            console.error(`[Apify] Failed to embed job ${saveResult.jobId}:`, err);
          });
        } catch (error: any) {
          console.error(`[Apify] Error saving job:`, error.message);
          errors++;
        }
      }
    } catch (error: any) {
      console.error(`[Apify] Error processing query "${query}":`, error.message);
      errors++;
    }
  }

  return { imported, updated, errors, sources };
}

/**
 * Import jobs for a specific user based on their job search preferences
 */
export async function importJobsForUser(
  env: Env,
  userId: string
): Promise<{ imported: number; updated: number; errors: number; sources: Record<string, number> }> {
  const { getJobSearchPreferences, buildSearchQueriesFromPreferences } =
    await import('./job-preferences.service');

  const preferences = await getJobSearchPreferences(env.DB, userId);
  const queries = buildSearchQueriesFromPreferences(preferences);

  console.log(`[Apify] Importing jobs for user ${userId} with ${queries.length} queries:`, queries);

  // Location is embedded in queries via buildSearchQueriesFromPreferences
  // Default to United States for all scrapers
  const location = 'United States';

  return await importJobsFromApify(env, queries, location);
}

/**
 * Import jobs for all users with completed preferences
 * Uses deduplicated queries across all users to avoid redundant API calls
 */
export async function importJobsForAllUsers(
  env: Env
): Promise<{ imported: number; updated: number; errors: number; queries: number; sources: Record<string, number> }> {
  const { buildDeduplicatedQueriesForAllUsers } = await import('./job-preferences.service');

  console.log('[Apify] Starting daily job import for all users');

  const queries = await buildDeduplicatedQueriesForAllUsers(env.DB);

  console.log(`[Apify] Generated ${queries.length} deduplicated queries from all users`);

  const result = await importJobsFromApify(env, queries);

  console.log(`[Apify] Completed: ${result.imported} imported, ${result.updated} updated, ${result.errors} errors`);
  console.log(`[Apify] Sources: LinkedIn=${result.sources.linkedin}, Indeed=${result.sources.indeed}, Dice=${result.sources.dice}`);

  return {
    ...result,
    queries: queries.length
  };
}
