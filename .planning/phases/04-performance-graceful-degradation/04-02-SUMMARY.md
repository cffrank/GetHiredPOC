---
phase: 04-performance-graceful-degradation
plan: 02
subsystem: graceful-degradation
tags: [linkedin, oauth, graceful-degradation, ai-parsing, fallback, user-feedback]
dependency_graph:
  requires: []
  provides: [linkedin-limited-data-warning, ai-parse-fallback]
  affects: [job-recommendations, profile-import]
tech_stack:
  added: []
  patterns: [graceful-degradation, fallback-template, url-param-notification]
key_files:
  created: []
  modified:
    - packages/backend/src/services/linkedin.service.ts
    - packages/backend/src/routes/linkedin.ts
    - packages/frontend/src/pages/Profile.tsx
    - src/app/lib/linkedin-oauth.ts
    - src/app/api/linkedin.ts
    - src/app/pages/Profile.tsx
    - packages/backend/src/services/job-matching.service.ts
decisions:
  - "hasLinkedInData() exported from both linkedin.service.ts files — checks positions/educations/skills arrays; all empty means only basic name/email from OpenID Connect API"
  - "Both codebase paths updated (packages/backend + src/app) — LinkedIn OAuth exists in both the Hono backend and rwsdk app independently"
  - "PARSE_FALLBACK constant used instead of inline object — allows reuse across analyzeJobMatch outer catch and parseMatchJSON inner catch"
  - "analyzeJobMatch outer catch returns fallback JobMatch instead of re-throwing — jobs with AI errors now appear in recommendations with score:50"
  - "packages/frontend Profile uses existing linkedInMessage state (type:success for warning) — reuses existing notification UI with longer 8s timeout for more text"
  - "src/app Profile uses toast.warning() from sonner — consistent with existing toast.error/toast.success pattern in same file"
metrics:
  duration: ~4 min
  completed: 2026-02-21
  tasks_completed: 2
  files_modified: 7
---

# Phase 4 Plan 2: Graceful Degradation for LinkedIn and AI Parsing Summary

LinkedIn callback detects empty API data and redirects with warning param; Profile pages show explanatory toast; AI parse failures return neutral fallback (score: 50) instead of dropping jobs.

## Tasks Completed

| Task | Description | Commit | Status |
|------|-------------|--------|--------|
| 1 | LinkedIn empty data detection with user notification | 5eb2304 | Complete |
| 2 | AI response fallback template for malformed JSON | 7601bb1 (04-01) | Complete |

## What Was Built

### Task 1: LinkedIn Empty Data Detection

**Backend (both codebases):**

Added `hasLinkedInData(profile: LinkedInProfile): boolean` helper to both:
- `packages/backend/src/services/linkedin.service.ts` — exported, checks `positions.length > 0 || educations.length > 0 || skills.length > 0`
- `src/app/lib/linkedin-oauth.ts` — same logic for the rwsdk app's LinkedIn flow

Both LinkedIn callback handlers updated:
- `packages/backend/src/routes/linkedin.ts` — imports `hasLinkedInData`, redirects to `?warning=linkedin_limited_data` when false
- `src/app/api/linkedin.ts` — same detection logic with relative `/profile?warning=linkedin_limited_data` redirect

**Frontend (both codebases):**

- `packages/frontend/src/pages/Profile.tsx` — added `warning` branch in existing `useSearchParams` effect; uses existing `linkedInMessage` state with explanatory text and 8s display timeout
- `src/app/pages/Profile.tsx` — added URL param check in mount `useEffect`; calls `toast.warning()` from sonner with 8s duration; cleans URL via `window.history.replaceState`

### Task 2: AI Response Fallback Template

Already implemented in `packages/backend/src/services/job-matching.service.ts` by the 04-01 plan executor (structured logging migration commit 7601bb1 included the graceful degradation work):

- `MatchResult` interface with typed fields
- `PARSE_FALLBACK` constant: `{ score: 50, strengths: ['Unable to analyze at this time'], concerns: ['Analysis temporarily unavailable'], recommendation: 'fair', summary: '...' }`
- `parseMatchJSON` returns `{ ...PARSE_FALLBACK }` on parse failure instead of throwing
- `analyzeJobMatch` outer catch returns `{ jobId: job.id, ...PARSE_FALLBACK }` instead of re-throwing — jobs with failed AI analysis still appear in recommendations

## Verification

- `grep "linkedin_limited_data" packages/backend/src/routes/linkedin.ts` — match found
- `grep "hasLinkedInData" packages/backend/src/services/linkedin.service.ts` — match found
- `grep "linkedin_limited_data" packages/frontend/src/pages/Profile.tsx` — match found
- Both catch blocks in job-matching.service.ts return fallback template (verified via grep)
- `cd packages/frontend && npx tsc --noEmit` — clean, no errors
- `cd packages/backend && npx tsc --noEmit` — no new errors introduced (pre-existing errors in chat.service.ts, job-alerts.service.ts unrelated)

## Deviations from Plan

### Note: Task 2 Pre-implemented by 04-01

The 04-01 plan (structured logging migration) was executing in parallel and its second commit (7601bb1) included not just `console.*` → `logger.*` replacements but also the `MatchResult` interface, `PARSE_FALLBACK` constant, and fallback returns in both catch blocks. This satisfied all Task 2 requirements before this plan ran those changes.

**Result:** Task 2 requirements fully met; no duplicate work needed.

### Additional Scope: rwsdk App LinkedIn Path

**Found during:** Task 1 review

**Issue:** The plan only mentioned `packages/backend` and `packages/frontend`, but the rwsdk app has its own independent LinkedIn implementation (`src/app/api/linkedin.ts` + `src/app/lib/linkedin-oauth.ts` + `src/app/pages/Profile.tsx`) that handles the same OAuth flow.

**Fix:** Applied identical `hasLinkedInData` helper and callback detection to both codebases.

**Rule:** Rule 2 (missing critical functionality — user-visible feedback was only half-implemented without updating the rwsdk path).

**Files modified:** `src/app/lib/linkedin-oauth.ts`, `src/app/api/linkedin.ts`, `src/app/pages/Profile.tsx`

## Self-Check: PASSED

Files exist:
- FOUND: packages/backend/src/services/linkedin.service.ts
- FOUND: packages/backend/src/routes/linkedin.ts
- FOUND: packages/frontend/src/pages/Profile.tsx
- FOUND: src/app/lib/linkedin-oauth.ts
- FOUND: src/app/api/linkedin.ts
- FOUND: src/app/pages/Profile.tsx
- FOUND: packages/backend/src/services/job-matching.service.ts

Commits exist:
- FOUND: 5eb2304 feat(04-02): LinkedIn empty data detection with user notification
