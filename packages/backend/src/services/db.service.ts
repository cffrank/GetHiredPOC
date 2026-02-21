import type { Job, Application, ApplicationWithJob, ApplicationStatus } from '@gethiredpoc/shared';
import type { Ai } from '@cloudflare/workers-types';

// Internal row type for joined application + job queries
interface ApplicationJobRow {
  id: string;
  user_id: string;
  job_id: string;
  status: string;
  notes: string | null;
  ai_match_score: number | null;
  ai_analysis: string | null;
  applied_date: number | null;
  created_at: number;
  updated_at: number;
  job_title: string;
  job_company: string;
  job_location: string | null;
  job_remote: number;
  job_description: string | null;
  job_requirements: string | null;
  job_salary_min: number | null;
  job_salary_max: number | null;
  job_posted_date: number;
  job_created_at: number;
  // Additional Job fields (may be null for older records)
  job_contract_time: string | null;
  job_contract_type: string | null;
  job_category_tag: string | null;
  job_category_label: string | null;
  job_salary_is_predicted: number;
  job_latitude: number | null;
  job_longitude: number | null;
  job_source: string | null;
  job_external_url: string | null;
}

export interface Env {
  DB: D1Database;
  STORAGE: R2Bucket;
  KV_CACHE: KVNamespace;
  KV_SESSIONS: KVNamespace;
  AI: Ai;
  FRONTEND_URL?: string;
  BACKEND_URL?: string;
  ADZUNA_APP_ID?: string;
  ADZUNA_APP_KEY?: string;
  RESEND_API_KEY?: string;
  LINKEDIN_CLIENT_ID?: string;
  LINKEDIN_CLIENT_SECRET?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  AI_GATEWAY_TOKEN?: string;
  OPENAI_API_KEY?: string;
  CLOUDFLARE_API_TOKEN?: string;
  ADMIN_EMAILS?: string;
}

// Cursor encoding/decoding utilities for keyset pagination
function encodeCursor(job: { posted_date: number; id: string }): string {
  return btoa(JSON.stringify({ posted_date: job.posted_date, id: job.id }));
}

function decodeCursor(cursor: string): { posted_date: number; id: string } | null {
  try {
    return JSON.parse(atob(cursor));
  } catch {
    return null;
  }
}

export interface PaginatedJobs {
  jobs: Job[];
  nextCursor: string | null;
  hasMore: boolean;
}

// Jobs
export async function getJobs(
  env: Env,
  filters?: {
    title?: string;
    remote?: boolean;
    location?: string;
    userId?: string;
    cursor?: string;
    limit?: number;
  }
): Promise<PaginatedJobs> {
  const limit = Math.min(filters?.limit ?? 20, 100);
  let query = "SELECT * FROM jobs WHERE 1=1";
  const params: (string | number)[] = [];

  if (filters?.title) {
    query += " AND title LIKE ?";
    params.push(`%${filters.title}%`);
  }

  if (filters?.remote !== undefined) {
    query += " AND remote = ?";
    params.push(filters.remote ? 1 : 0);
  }

  if (filters?.location) {
    query += " AND location LIKE ?";
    params.push(`%${filters.location}%`);
  }

  // Exclude hidden jobs if user is logged in
  if (filters?.userId) {
    query += " AND id NOT IN (SELECT job_id FROM hidden_jobs WHERE user_id = ?)";
    params.push(filters.userId);
  }

  // Apply cursor-based keyset condition
  if (filters?.cursor) {
    const decoded = decodeCursor(filters.cursor);
    if (decoded) {
      query += " AND (posted_date < ? OR (posted_date = ? AND id < ?))";
      params.push(decoded.posted_date, decoded.posted_date, decoded.id);
    }
  }

  query += " ORDER BY posted_date DESC, id DESC LIMIT ?";
  params.push(limit);

  const stmt = env.DB.prepare(query);
  const result = await stmt.bind(...params).all<Job>();
  const jobs = result.results || [];

  return {
    jobs,
    nextCursor: jobs.length === limit ? encodeCursor(jobs[jobs.length - 1]) : null,
    hasMore: jobs.length === limit,
  };
}

export async function getJobById(env: Env, jobId: string): Promise<Job | null> {
  const result = await env.DB.prepare("SELECT * FROM jobs WHERE id = ?")
    .bind(jobId)
    .first<Job>();
  return result;
}

export async function getSavedJobs(env: Env, userId: string): Promise<Job[]> {
  const result = await env.DB.prepare(`
    SELECT j.*
    FROM jobs j
    INNER JOIN saved_jobs sj ON j.id = sj.job_id
    WHERE sj.user_id = ?
    ORDER BY sj.created_at DESC
  `)
    .bind(userId)
    .all<Job>();
  return result.results || [];
}

export async function isSaved(
  env: Env,
  userId: string,
  jobId: string
): Promise<boolean> {
  const result = await env.DB.prepare(
    "SELECT id FROM saved_jobs WHERE user_id = ? AND job_id = ?"
  )
    .bind(userId, jobId)
    .first();
  return !!result;
}

export async function saveJob(
  env: Env,
  userId: string,
  jobId: string
): Promise<void> {
  await env.DB.prepare(
    "INSERT INTO saved_jobs (user_id, job_id) VALUES (?, ?) ON CONFLICT DO NOTHING"
  )
    .bind(userId, jobId)
    .run();
}

export async function unsaveJob(
  env: Env,
  userId: string,
  jobId: string
): Promise<void> {
  await env.DB.prepare("DELETE FROM saved_jobs WHERE user_id = ? AND job_id = ?")
    .bind(userId, jobId)
    .run();
}

// Applications
export async function getApplications(
  env: Env,
  userId: string
): Promise<ApplicationWithJob[]> {
  const result = await env.DB.prepare(`
    SELECT
      a.*,
      j.id as job_id,
      j.title as job_title,
      j.company as job_company,
      j.location as job_location,
      j.remote as job_remote,
      j.description as job_description,
      j.requirements as job_requirements,
      j.salary_min as job_salary_min,
      j.salary_max as job_salary_max,
      j.posted_date as job_posted_date,
      j.created_at as job_created_at,
      j.contract_time as job_contract_time,
      j.contract_type as job_contract_type,
      j.category_tag as job_category_tag,
      j.category_label as job_category_label,
      j.salary_is_predicted as job_salary_is_predicted,
      j.latitude as job_latitude,
      j.longitude as job_longitude,
      j.source as job_source,
      j.external_url as job_external_url
    FROM applications a
    INNER JOIN jobs j ON a.job_id = j.id
    WHERE a.user_id = ?
    ORDER BY a.created_at DESC
  `)
    .bind(userId)
    .all<ApplicationJobRow>();

  const applications = (result.results || []).map((row: ApplicationJobRow) => ({
    id: row.id,
    user_id: row.user_id,
    job_id: row.job_id,
    status: row.status as ApplicationStatus,
    notes: row.notes,
    ai_match_score: row.ai_match_score,
    ai_analysis: row.ai_analysis,
    applied_date: row.applied_date,
    created_at: row.created_at,
    updated_at: row.updated_at,
    job: {
      id: row.job_id,
      title: row.job_title,
      company: row.job_company,
      location: row.job_location,
      remote: row.job_remote,
      description: row.job_description,
      requirements: row.job_requirements,
      salary_min: row.job_salary_min,
      salary_max: row.job_salary_max,
      posted_date: row.job_posted_date,
      created_at: row.job_created_at,
      contract_time: row.job_contract_time,
      contract_type: row.job_contract_type,
      category_tag: row.job_category_tag,
      category_label: row.job_category_label,
      salary_is_predicted: row.job_salary_is_predicted,
      latitude: row.job_latitude,
      longitude: row.job_longitude,
      source: row.job_source,
      external_url: row.job_external_url,
    },
  }));

  return applications;
}

export async function getApplicationById(
  env: Env,
  applicationId: string
): Promise<ApplicationWithJob | null> {
  const result = await env.DB.prepare(`
    SELECT
      a.*,
      j.id as job_id,
      j.title as job_title,
      j.company as job_company,
      j.location as job_location,
      j.remote as job_remote,
      j.description as job_description,
      j.requirements as job_requirements,
      j.salary_min as job_salary_min,
      j.salary_max as job_salary_max,
      j.posted_date as job_posted_date,
      j.created_at as job_created_at,
      j.contract_time as job_contract_time,
      j.contract_type as job_contract_type,
      j.category_tag as job_category_tag,
      j.category_label as job_category_label,
      j.salary_is_predicted as job_salary_is_predicted,
      j.latitude as job_latitude,
      j.longitude as job_longitude,
      j.source as job_source,
      j.external_url as job_external_url
    FROM applications a
    INNER JOIN jobs j ON a.job_id = j.id
    WHERE a.id = ?
  `)
    .bind(applicationId)
    .first<ApplicationJobRow>();

  if (!result) return null;

  return {
    id: result.id,
    user_id: result.user_id,
    job_id: result.job_id,
    status: result.status as import('@gethiredpoc/shared').ApplicationStatus,
    notes: result.notes,
    ai_match_score: result.ai_match_score,
    ai_analysis: result.ai_analysis,
    applied_date: result.applied_date,
    created_at: result.created_at,
    updated_at: result.updated_at,
    job: {
      id: result.job_id,
      title: result.job_title,
      company: result.job_company,
      location: result.job_location,
      remote: result.job_remote,
      description: result.job_description,
      requirements: result.job_requirements,
      salary_min: result.job_salary_min,
      salary_max: result.job_salary_max,
      posted_date: result.job_posted_date,
      created_at: result.job_created_at,
      contract_time: result.job_contract_time,
      contract_type: result.job_contract_type,
      category_tag: result.job_category_tag,
      category_label: result.job_category_label,
      salary_is_predicted: result.job_salary_is_predicted,
      latitude: result.job_latitude,
      longitude: result.job_longitude,
      source: result.job_source,
      external_url: result.job_external_url,
    },
  };
}

export async function createApplication(
  env: Env,
  userId: string,
  jobId: string,
  status: string = "saved"
): Promise<Application> {
  const result = await env.DB.prepare(
    "INSERT INTO applications (user_id, job_id, status) VALUES (?, ?, ?) RETURNING *"
  )
    .bind(userId, jobId, status)
    .first<Application>();

  if (!result) {
    throw new Error("Failed to create application");
  }

  return result;
}

export async function updateApplication(
  env: Env,
  applicationId: string,
  updates: {
    status?: string;
    notes?: string;
    ai_match_score?: number;
    ai_analysis?: string;
  }
): Promise<void> {
  const fields: string[] = [];
  const params: (string | number)[] = [];

  if (updates.status !== undefined) {
    fields.push("status = ?");
    params.push(updates.status);
  }
  if (updates.notes !== undefined) {
    fields.push("notes = ?");
    params.push(updates.notes);
  }
  if (updates.ai_match_score !== undefined) {
    fields.push("ai_match_score = ?");
    params.push(updates.ai_match_score);
  }
  if (updates.ai_analysis !== undefined) {
    fields.push("ai_analysis = ?");
    params.push(updates.ai_analysis);
  }

  fields.push("updated_at = unixepoch()");

  const query = `UPDATE applications SET ${fields.join(", ")} WHERE id = ?`;
  params.push(applicationId);

  await env.DB.prepare(query).bind(...params).run();
}

export async function deleteApplication(
  env: Env,
  applicationId: string
): Promise<void> {
  await env.DB.prepare("DELETE FROM applications WHERE id = ?")
    .bind(applicationId)
    .run();
}
