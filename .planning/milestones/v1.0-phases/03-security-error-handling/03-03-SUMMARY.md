---
phase: 03-security-error-handling
plan: 03
subsystem: api
tags: [hono, typescript, error-handling, http-errors]

# Dependency graph
requires:
  - phase: 03-01
    provides: Security headers, file validation, session cleanup foundation
provides:
  - AppError base class and NotFoundError/ValidationError/ForbiddenError/UnauthorizedError subclasses with HTTP status codes
  - Global onError handler that maps typed errors to correct HTTP status codes and consistent JSON shape
  - Route handlers throw typed errors instead of manually constructing error JSON responses
affects:
  - 03-04
  - 03-05
  - future route additions

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Typed error hierarchy: AppError base class with statusCode, subclasses for 400/401/403/404"
    - "Global error handler: instanceof AppError check routes to correct status, unknown errors get generic 500"
    - "Catch block re-throw pattern: catch blocks re-throw AppError instances so global handler maps them"

key-files:
  created: []
  modified:
    - packages/backend/src/utils/errors.ts
    - packages/backend/src/index.ts
    - packages/backend/src/routes/auth.ts
    - packages/backend/src/routes/jobs.ts
    - packages/backend/src/routes/resumes.ts
    - packages/backend/src/routes/applications.ts

key-decisions:
  - "Catch blocks that previously returned hardcoded error JSON now re-throw AppError instances so global handler provides correct status codes"
  - "Login uses .catch() chaining on the login() call to convert any auth failure to UnauthorizedError — simpler than try/catch around a multi-step handler"
  - "applications PUT/PATCH now check application existence and ownership before updating — adds NotFoundError and ForbiddenError guards that were previously missing"
  - "Out-of-scope routes (work-experience, education, export, ai-jobs, etc.) deferred to future plan — plan explicitly listed 5 route files"

patterns-established:
  - "Error propagation: throw new TypedError() inside try blocks, then re-throw AppError in catch to let global handler resolve status"
  - "Auth guard pattern for resumes: getCurrentUser() returns null → throw UnauthorizedError (routes without requireAuth middleware)"

requirements-completed: [ERR-01, ERR-02]

# Metrics
duration: 3min
completed: 2026-02-21
---

# Phase 3 Plan 3: Typed Error Classes and Global Error Handler Summary

**AppError class hierarchy (400/401/403/404) with Hono onError handler mapping typed errors to correct HTTP status codes and consistent `{ error: string }` JSON responses**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-21T16:01:38Z
- **Completed:** 2026-02-21T16:04:20Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Created AppError base class and NotFoundError, ValidationError, ForbiddenError, UnauthorizedError subclasses in errors.ts — all carry HTTP status codes
- Updated global `app.onError` in index.ts to check `instanceof AppError` and return `{ error: message }` at correct status code, 500 for anything else
- Updated auth.ts login handler, jobs.ts (3 404 locations), resumes.ts (all auth/validation checks), applications.ts PUT/PATCH (added ownership guard) to throw typed errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Create typed error classes and update global error handler** - `66374d0` (feat)
2. **Task 2: Replace key throw/catch patterns with typed errors in route handlers** - `39f3339` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `packages/backend/src/utils/errors.ts` - Added AppError base class and 4 subclasses (NotFoundError, ValidationError, ForbiddenError, UnauthorizedError)
- `packages/backend/src/index.ts` - Updated onError to check instanceof AppError and return typed status codes
- `packages/backend/src/routes/auth.ts` - Login now throws UnauthorizedError instead of returning 401 JSON
- `packages/backend/src/routes/jobs.ts` - Three 404 returns replaced with NotFoundError throws; catch blocks re-throw AppError
- `packages/backend/src/routes/resumes.ts` - All 401/404/400 returns replaced with typed error throws; catch blocks re-throw AppError
- `packages/backend/src/routes/applications.ts` - PUT and PATCH add not-found and ownership checks (NotFoundError, ForbiddenError); catch blocks re-throw AppError

## Decisions Made
- Login handler simplified with `.catch()` chaining rather than try/catch — converts any login failure to UnauthorizedError cleanly
- applications.ts PUT/PATCH lacked any ownership check previously; added ForbiddenError guard as part of adding typed errors (Rule 2: missing critical authorization)
- Catch blocks use `if (error instanceof AppError) throw error` pattern to allow typed errors to propagate to global handler while still catching unexpected errors

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added ownership authorization check in applications PUT/PATCH**
- **Found during:** Task 2 (route handler updates)
- **Issue:** PUT /api/applications/:id and PATCH /api/applications/:id had no check that the application belongs to the requesting user — any authenticated user could modify any application by ID
- **Fix:** Added `getApplicationById` pre-check with `existing.user_id !== user.id` guard throwing ForbiddenError
- **Files modified:** packages/backend/src/routes/applications.ts
- **Verification:** TypeScript compiles; pattern matches plan's specification for ForbiddenError usage
- **Committed in:** 39f3339 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical authorization)
**Impact on plan:** Authorization guard is a correctness/security requirement. No scope creep.

## Issues Encountered
- Pre-existing TypeScript errors in chat.service.ts, job-alerts.service.ts, linkedin.service.ts, resume.service.ts — not caused by this plan's changes, deferred to appropriate future plans

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Typed error infrastructure complete and ready to use in any new route handlers
- Remaining routes (work-experience, education, export, ai-jobs, email-preferences, job-preferences, admin, recommendations, chat, linkedin) still use manual error JSON responses — future plan can sweep these with the pattern now established
- TypeScript compiles with no new errors introduced

## Self-Check: PASSED

- FOUND: packages/backend/src/utils/errors.ts
- FOUND: packages/backend/src/index.ts
- FOUND: .planning/phases/03-security-error-handling/03-03-SUMMARY.md
- FOUND commit: 66374d0 (Task 1 - typed error classes + global error handler)
- FOUND commit: 39f3339 (Task 2 - typed errors in route handlers)

---
*Phase: 03-security-error-handling*
*Completed: 2026-02-21*
