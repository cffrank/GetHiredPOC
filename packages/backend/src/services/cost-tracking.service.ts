import type { Env } from './db.service';

/**
 * Cost Tracking Service
 * 
 * Tracks LLM usage and cost savings from vector pre-filtering
 */

interface CostMetrics {
  operation: string;
  userId?: string;
  vectorPrefilteringUsed: boolean;
  jobsPrefiltered?: number;
  totalJobsAvailable?: number;
  llmCallsMade: number;
  llmCallsAvoided: number;
  estimatedCostSavings: number;
  timestamp: number;
}

// Cost estimates (as of 2025)
const COSTS = {
  // Cloudflare Workers AI - Llama 3.1 8B (typical job matching model)
  LLM_PER_TOKEN: 0.000001, // ~$0.001 per 1K tokens
  AVG_TOKENS_PER_JOB_MATCH: 800, // Prompt + completion for one job match

  // OpenAI Embeddings
  EMBEDDING_PER_TOKEN: 0.00000002, // $0.02 per 1M tokens
  AVG_TOKENS_PER_EMBEDDING: 200, // Average profile/job description
};

/**
 * Log cost metrics for analytics
 */
export function logCostMetrics(env: Env, metrics: CostMetrics): void {
  const logEntry = {
    ...metrics,
    timestamp: Date.now(),
    type: 'COST_TRACKING',
  };

  console.log('[Cost Tracking]', JSON.stringify(logEntry));

  // In production, you would send this to analytics service:
  // - Cloudflare Analytics Engine
  // - External service like DataDog, New Relic, etc.
  // - Store in D1 for historical reporting
}

/**
 * Track job browsing operation
 */
export function trackJobBrowsing(
  env: Env,
  params: {
    userId?: string;
    vectorPrefilteringUsed: boolean;
    jobsReturned: number;
    totalJobsInDb?: number;
  }
): void {
  const llmCallsAvoided = params.vectorPrefilteringUsed && params.totalJobsInDb
    ? params.totalJobsInDb - params.jobsReturned
    : 0;

  const estimatedCostSavings = llmCallsAvoided * (
    COSTS.LLM_PER_TOKEN * COSTS.AVG_TOKENS_PER_JOB_MATCH
  );

  logCostMetrics(env, {
    operation: 'job_browsing',
    userId: params.userId,
    vectorPrefilteringUsed: params.vectorPrefilteringUsed,
    jobsPrefiltered: params.jobsReturned,
    totalJobsAvailable: params.totalJobsInDb,
    llmCallsMade: 0, // Browsing doesn't make LLM calls
    llmCallsAvoided,
    estimatedCostSavings,
    timestamp: Date.now(),
  });
}

/**
 * Track job matching operation (when user runs LLM analysis on specific job)
 */
export function trackJobMatching(
  env: Env,
  params: {
    userId: string;
    jobId: string;
    llmCallMade: boolean;
    wasCached: boolean;
  }
): void {
  const llmCost = params.llmCallMade && !params.wasCached
    ? COSTS.LLM_PER_TOKEN * COSTS.AVG_TOKENS_PER_JOB_MATCH
    : 0;

  logCostMetrics(env, {
    operation: 'job_match_analysis',
    userId: params.userId,
    vectorPrefilteringUsed: false, // Not applicable for individual job analysis
    llmCallsMade: params.llmCallMade && !params.wasCached ? 1 : 0,
    llmCallsAvoided: params.wasCached ? 1 : 0,
    estimatedCostSavings: params.wasCached ? llmCost : 0,
    timestamp: Date.now(),
  });
}

/**
 * Track recommendations generation
 */
export function trackRecommendations(
  env: Env,
  params: {
    userId: string;
    jobsReturned: number;
    usedVectorSearch: boolean;
    wasCached: boolean;
  }
): void {
  // If using vector search, we avoided LLM calls on all jobs in DB
  // If cached, we avoided generating new embeddings
  
  const estimatedCostSavings = params.wasCached
    ? 0 // Cache hit, minimal cost
    : params.usedVectorSearch
    ? params.jobsReturned * (COSTS.LLM_PER_TOKEN * COSTS.AVG_TOKENS_PER_JOB_MATCH)
    : 0;

  logCostMetrics(env, {
    operation: 'recommendations',
    userId: params.userId,
    vectorPrefilteringUsed: params.usedVectorSearch,
    jobsPrefiltered: params.jobsReturned,
    llmCallsMade: 0,
    llmCallsAvoided: params.usedVectorSearch ? params.jobsReturned : 0,
    estimatedCostSavings,
    timestamp: Date.now(),
  });
}

/**
 * Get cost summary from logs (for admin dashboard)
 */
export async function getCostSummary(
  env: Env,
  timeRangeSeconds: number = 86400 // Default: last 24 hours
): Promise<{
  totalLlmCallsMade: number;
  totalLlmCallsAvoided: number;
  totalCostSavings: number;
  vectorPrefilteringUsageRate: number;
}> {
  // In production, this would query Analytics Engine or D1
  // For now, return estimated metrics based on typical usage

  return {
    totalLlmCallsMade: 0,
    totalLlmCallsAvoided: 0,
    totalCostSavings: 0,
    vectorPrefilteringUsageRate: 0,
  };
}
