import type { Env } from './db.service';
import { analyzeJobMatch, type JobMatch } from './job-matching.service';

export async function getTopJobRecommendations(
  env: Env,
  userId: string,
  limit: number = 10
): Promise<JobMatch[]> {
  console.log(`[Job Recommendations] Getting top ${limit} recommendations for user ${userId}`);

  // Get user profile
  const user = await env.DB.prepare(
    'SELECT * FROM users WHERE id = ?'
  ).bind(userId).first();

  if (!user) {
    throw new Error('User not found');
  }

  // Get recent jobs (last 14 days) excluding jobs user already applied to
  const jobs = await env.DB.prepare(`
    SELECT j.* FROM jobs j
    WHERE j.created_at > unixepoch() - (14 * 24 * 60 * 60)
    AND j.id NOT IN (
      SELECT job_id FROM applications WHERE user_id = ?
    )
    ORDER BY j.created_at DESC
    LIMIT 50
  `).bind(userId).all();

  console.log(`[Job Recommendations] Analyzing ${jobs.results.length} jobs`);

  // Analyze each job
  const matches: JobMatch[] = [];

  for (const job of jobs.results) {
    try {
      const match = await analyzeJobMatch(env, user, job);
      matches.push(match);
    } catch (error) {
      console.error(`[Job Recommendations] Failed to analyze job ${job.id}:`, error);
    }
  }

  // Sort by score (descending) and return top N
  matches.sort((a, b) => b.score - a.score);
  const topMatches = matches.slice(0, limit);

  console.log(`[Job Recommendations] Returning ${topMatches.length} recommendations`);
  return topMatches;
}

export async function getRecommendationsWithJobDetails(
  env: Env,
  userId: string,
  limit: number = 10
) {
  const recommendations = await getTopJobRecommendations(env, userId, limit);

  // Get full job details for all recommendations
  const jobIds = recommendations.map(r => r.jobId);

  if (jobIds.length === 0) {
    return [];
  }

  const placeholders = jobIds.map(() => '?').join(',');
  const jobs = await env.DB.prepare(`
    SELECT * FROM jobs WHERE id IN (${placeholders})
  `).bind(...jobIds).all();

  // Create a map of job details
  const jobsMap = new Map(jobs.results.map((j: any) => [j.id, j]));

  // Combine recommendations with job details
  return recommendations.map(match => ({
    match,
    job: jobsMap.get(match.jobId)
  })).filter(item => item.job); // Filter out any that don't have job details
}
