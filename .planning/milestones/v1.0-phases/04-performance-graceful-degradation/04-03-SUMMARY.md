---
phase: 04-performance-graceful-degradation
plan: "03"
subsystem: job-matching
tags: [performance, n+1-queries, cache-invalidation, job-recommendations]
dependency_graph:
  requires: [04-01]
  provides: [PERF-01, PERF-03]
  affects: [job-recommendations.service.ts, job-matching.service.ts, routes/jobs.ts]
tech_stack:
  added: []
  patterns: [pre-loaded context, profile-versioned cache keys, parallel Promise.all loading]
key_files:
  created: []
  modified:
    - packages/backend/src/services/job-recommendations.service.ts
    - packages/backend/src/services/job-matching.service.ts
    - packages/backend/src/routes/jobs.ts
decisions:
  - "buildUserContext loads user+workHistory+education in parallel with Promise.all — single call before loop replaces 3 per-job queries"
  - "analyzeJobMatch accepts optional UserContext parameter — backward-compatible with single-job analyze route"
  - "Cache key uses updated_at as profile version: v${updated_at} suffix — old keys become orphaned and expire via 7-day TTL (no prefix-delete needed)"
metrics:
  duration: "~3 min"
  completed: "2026-02-21"
  tasks_completed: 2
  files_modified: 3
---

# Phase 4 Plan 3: N+1 Query Elimination and Cache Invalidation Summary

**One-liner:** Pre-load user context once before recommendation loop (3 queries instead of 150+ for 50 jobs) and embed profile updated_at in cache keys to prevent stale results after profile updates.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Pre-load user context and eliminate N+1 queries | 2d11cde | job-recommendations.service.ts, job-matching.service.ts |
| 2 | Fix cache invalidation with profile-versioned keys | 2795973 | job-matching.service.ts, routes/jobs.ts |

## What Was Built

### Task 1: N+1 Query Elimination

**Before:** `analyzeJobMatch` fired 2 DB queries per job (work_experience + education). With 50 jobs, that was 100+ queries in the recommendation loop plus the initial user and jobs list queries = 150+ total.

**After:** `buildUserContext(env, userId)` pre-loads user, workHistory, and education in a single `Promise.all` call before the loop. The context is passed to each `analyzeJobMatch` invocation, which skips the per-job DB queries when context is provided.

Query count for a full recommendations call: 3 (buildUserContext) + 1 (jobs list) + 1 (job details fetch) = **5 total** regardless of how many jobs are analyzed.

Key change in `job-recommendations.service.ts`:
```typescript
export async function buildUserContext(env: Env, userId: string): Promise<UserContext> {
  const [user, workHistory, education] = await Promise.all([
    env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first(),
    env.DB.prepare('SELECT company, title, description FROM work_experience WHERE user_id = ? ORDER BY start_date DESC LIMIT 3').bind(userId).all(),
    env.DB.prepare('SELECT school, degree, field_of_study FROM education WHERE user_id = ? ORDER BY start_date DESC LIMIT 2').bind(userId).all(),
  ]);
  return { user, workHistory: workHistory.results, education: education.results };
}
```

`analyzeJobMatch` signature updated to accept optional `userContext?: UserContext`. When provided, skips DB queries. When absent (single-job analyze route), loads inline as before.

### Task 2: Profile-Versioned Cache Keys

**Before:** Cache key `match:{userId}:{jobId}` never invalidated when the user updated their profile. Stale AI analysis results persisted for 7 days.

**After:** Cache key includes profile version:
- `job-matching.service.ts`: `match:${userId}:${jobId}:v${updated_at}`
- `routes/jobs.ts`: `job-analysis:${userId}:${jobId}:v${updated_at}`

When a user updates their profile, `updated_at` changes. The old cache key becomes unreachable. Old entries expire naturally via the existing 7-day KV TTL — no manual deletion needed (Cloudflare KV does not support efficient prefix-based deletion).

## Deviations from Plan

None - plan executed exactly as written.

The pre-existing TypeScript errors in `chat.service.ts`, `job-alerts.service.ts`, `linkedin.service.ts`, and `resume.service.ts` are out of scope (pre-existing, not caused by this plan's changes). Logged to deferred-items.

## Verification

- `buildUserContext` exists in job-recommendations.service.ts: PASSED
- `userContext` parameter accepted in job-matching.service.ts: PASSED
- `updated_at` in cache key in job-matching.service.ts: `match:${userId}:${jobId}:v${profileVersion}`: PASSED
- `updated_at` in cache key in routes/jobs.ts: `job-analysis:${userId}:${jobId}:v${profileVersion}`: PASSED
- No per-job DB queries inside recommendation loop: PASSED
- TypeScript: no errors in modified files: PASSED

## Self-Check: PASSED

All files confirmed present. All commits confirmed in git log.
