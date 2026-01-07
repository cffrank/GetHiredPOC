import type { Env } from './db.service';

// TypeScript interfaces for return types
export interface CanImportResult {
  allowed: boolean;
  lastImportAt?: number;
  nextAllowedAt?: number;
}

export interface ImportRequest {
  id: string;
  user_id: string;
  scraper_type: string;
  status: string;
  jobs_imported: number;
  jobs_updated: number;
  errors: number;
  error_message: string | null;
  requested_at: number;
  completed_at: number | null;
}

export interface ImportStats {
  imported: number;
  updated: number;
  errors: number;
}

// Constants
const RATE_LIMIT_HOURS = 24;
const RATE_LIMIT_SECONDS = RATE_LIMIT_HOURS * 60 * 60; // 86400 seconds

/**
 * Check if a user can import jobs (24 hours elapsed since last completed import)
 * @param db - D1 Database instance
 * @param userId - User ID to check
 * @returns Object with allowed status and timing information
 */
export async function canUserImport(
  db: D1Database,
  userId: string
): Promise<CanImportResult> {
  try {
    // Query for the most recent completed import
    const result = await db
      .prepare(
        `SELECT requested_at
         FROM import_requests
         WHERE user_id = ? AND status = 'completed'
         ORDER BY requested_at DESC
         LIMIT 1`
      )
      .bind(userId)
      .first<{ requested_at: number }>();

    // If no previous import, user can import
    if (!result) {
      return { allowed: true };
    }

    const lastImportAt = result.requested_at;
    const currentTime = Math.floor(Date.now() / 1000); // Current Unix timestamp
    const timeSinceLastImport = currentTime - lastImportAt;

    // Check if 24 hours have elapsed
    if (timeSinceLastImport >= RATE_LIMIT_SECONDS) {
      return {
        allowed: true,
        lastImportAt,
      };
    }

    // Calculate when next import is allowed
    const nextAllowedAt = lastImportAt + RATE_LIMIT_SECONDS;

    return {
      allowed: false,
      lastImportAt,
      nextAllowedAt,
    };
  } catch (error) {
    console.error('Error checking if user can import:', error);
    throw new Error('Failed to check import eligibility');
  }
}

/**
 * Record a new import request
 * @param db - D1 Database instance
 * @param userId - User ID making the request
 * @param scraperType - Type of scraper ('linkedin', 'indeed', 'dice', or 'all')
 * @returns The ID of the newly created request
 */
export async function recordImportRequest(
  db: D1Database,
  userId: string,
  scraperType: string
): Promise<string> {
  try {
    // Validate scraper type
    const validScraperTypes = ['linkedin', 'indeed', 'dice', 'all'];
    if (!validScraperTypes.includes(scraperType)) {
      throw new Error(`Invalid scraper type: ${scraperType}`);
    }

    const result = await db
      .prepare(
        `INSERT INTO import_requests (user_id, scraper_type, status)
         VALUES (?, ?, 'pending')
         RETURNING id`
      )
      .bind(userId, scraperType)
      .first<{ id: string }>();

    if (!result || !result.id) {
      throw new Error('Failed to create import request');
    }

    return result.id;
  } catch (error) {
    console.error('Error recording import request:', error);
    throw new Error('Failed to record import request');
  }
}

/**
 * Update the status of an import request
 * @param db - D1 Database instance
 * @param requestId - ID of the import request to update
 * @param status - New status ('completed' or 'failed')
 * @param stats - Optional statistics (imported, updated, errors)
 */
export async function updateImportStatus(
  db: D1Database,
  requestId: string,
  status: string,
  stats?: ImportStats
): Promise<void> {
  try {
    // Validate status
    const validStatuses = ['pending', 'running', 'completed', 'failed'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }

    const currentTime = Math.floor(Date.now() / 1000);

    if (stats) {
      // Update with stats
      await db
        .prepare(
          `UPDATE import_requests
           SET status = ?,
               jobs_imported = ?,
               jobs_updated = ?,
               errors = ?,
               completed_at = ?
           WHERE id = ?`
        )
        .bind(
          status,
          stats.imported,
          stats.updated,
          stats.errors,
          currentTime,
          requestId
        )
        .run();
    } else {
      // Update status only
      const query =
        status === 'completed' || status === 'failed'
          ? `UPDATE import_requests
             SET status = ?, completed_at = ?
             WHERE id = ?`
          : `UPDATE import_requests
             SET status = ?
             WHERE id = ?`;

      const params =
        status === 'completed' || status === 'failed'
          ? [status, currentTime, requestId]
          : [status, requestId];

      await db.prepare(query).bind(...params).run();
    }
  } catch (error) {
    console.error('Error updating import status:', error);
    throw new Error('Failed to update import status');
  }
}

/**
 * Get the import history for a user
 * @param db - D1 Database instance
 * @param userId - User ID to get history for
 * @param limit - Maximum number of records to return (default: 10)
 * @returns Array of import requests
 */
export async function getUserImportHistory(
  db: D1Database,
  userId: string,
  limit: number = 10
): Promise<ImportRequest[]> {
  try {
    const result = await db
      .prepare(
        `SELECT * FROM import_requests
         WHERE user_id = ?
         ORDER BY requested_at DESC
         LIMIT ?`
      )
      .bind(userId, limit)
      .all<ImportRequest>();

    return result.results || [];
  } catch (error) {
    console.error('Error getting user import history:', error);
    throw new Error('Failed to get import history');
  }
}

/**
 * Check if the daily scraper can run (based on MAX_DAILY_SCRAPER_RUNS limit)
 * @param db - D1 Database instance
 * @param scraperType - Type of scraper to check
 * @param maxRuns - Maximum allowed runs per day (from env.MAX_DAILY_SCRAPER_RUNS)
 * @returns Boolean indicating if the scraper can run
 */
export async function canRunDailyScraper(
  db: D1Database,
  scraperType: string,
  maxRuns: number = 5
): Promise<boolean> {
  try {
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Query for today's run count
    const result = await db
      .prepare(
        `SELECT run_count
         FROM daily_scraper_runs
         WHERE run_date = ? AND scraper_type = ?`
      )
      .bind(today, scraperType)
      .first<{ run_count: number }>();

    // If no record exists, scraper can run
    if (!result) {
      return true;
    }

    // Check if run count is below the limit
    return result.run_count < maxRuns;
  } catch (error) {
    console.error('Error checking if daily scraper can run:', error);
    throw new Error('Failed to check daily scraper eligibility');
  }
}

/**
 * Record a daily scraper run
 * Uses UPSERT pattern to insert or update the run count for today
 * @param db - D1 Database instance
 * @param scraperType - Type of scraper that ran
 */
export async function recordDailyScraperRun(
  db: D1Database,
  scraperType: string
): Promise<void> {
  try {
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // UPSERT: Insert new record or increment run_count if exists
    // SQLite doesn't have a direct UPSERT, so we use INSERT with ON CONFLICT
    await db
      .prepare(
        `INSERT INTO daily_scraper_runs (run_date, scraper_type, run_count)
         VALUES (?, ?, 1)
         ON CONFLICT(run_date, scraper_type)
         DO UPDATE SET run_count = run_count + 1`
      )
      .bind(today, scraperType)
      .run();
  } catch (error) {
    console.error('Error recording daily scraper run:', error);
    throw new Error('Failed to record daily scraper run');
  }
}

/**
 * Update an import request with an error message
 * @param db - D1 Database instance
 * @param requestId - ID of the import request
 * @param errorMessage - Error message to record
 */
export async function recordImportError(
  db: D1Database,
  requestId: string,
  errorMessage: string
): Promise<void> {
  try {
    const currentTime = Math.floor(Date.now() / 1000);

    await db
      .prepare(
        `UPDATE import_requests
         SET status = 'failed',
             error_message = ?,
             completed_at = ?,
             errors = errors + 1
         WHERE id = ?`
      )
      .bind(errorMessage, currentTime, requestId)
      .run();
  } catch (error) {
    console.error('Error recording import error:', error);
    throw new Error('Failed to record import error');
  }
}
