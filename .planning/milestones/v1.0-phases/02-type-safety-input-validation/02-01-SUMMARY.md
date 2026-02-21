---
phase: 02-type-safety-input-validation
plan: 01
subsystem: shared-types, backend-error-handling
tags: [type-safety, shared-types, error-handling, zod, typescript]
dependency_graph:
  requires: []
  provides: [ParsedResume, JobMatch, ApplicationUpdate types in shared package, toMessage utility, zod@3 installed]
  affects: [packages/shared, packages/backend/src/routes, packages/backend/src/services]
tech_stack:
  added: [zod@^3.25.76, @hono/zod-validator@^0.7.6]
  patterns: [catch (error: unknown) with toMessage() helper, instanceof narrowing for error properties]
key_files:
  created:
    - packages/shared/src/types/resume.ts
    - packages/shared/src/types/job-match.ts
    - packages/backend/src/utils/errors.ts
  modified:
    - packages/shared/src/types/api.ts
    - packages/shared/src/index.ts
    - packages/backend/package.json
    - packages/backend/src/index.ts
    - packages/backend/src/routes/auth.ts
    - packages/backend/src/routes/applications.ts
    - packages/backend/src/routes/profile.ts
    - packages/backend/src/routes/jobs.ts
    - packages/backend/src/routes/chat.ts
    - packages/backend/src/routes/resumes.ts
    - packages/backend/src/routes/recommendations.ts
    - packages/backend/src/routes/linkedin.ts
    - packages/backend/src/routes/export.ts
    - packages/backend/src/routes/ai-jobs.ts
    - packages/backend/src/routes/admin.ts
    - packages/backend/src/routes/education.ts
    - packages/backend/src/routes/work-experience.ts
    - packages/backend/src/routes/job-preferences.ts
    - packages/backend/src/routes/email-preferences.ts
    - packages/backend/src/services/adzuna.service.ts
    - packages/backend/src/services/ai-resume.service.ts
    - packages/backend/src/services/ai-cover-letter.service.ts
    - packages/backend/src/services/ai-prompt.service.ts
    - packages/backend/src/services/chat.service.ts
    - packages/backend/src/services/email.service.ts
    - packages/backend/src/services/job-alerts.service.ts
    - packages/backend/src/services/job-matching.service.ts
decisions:
  - "ApplicationUpdate added as type alias for UpdateApplicationRequest (identical fields) rather than duplicate interface"
  - "Service files use inline instanceof narrowing rather than toMessage() import — appropriate since they construct new Error() messages"
  - "Route files use local msg variable from toMessage() to enable string comparisons for 'Unauthorized'/'Session expired' detection"
  - "index.ts (worker entry) uses inline narrowing since it has no toMessage import and the single catch block is simple"
metrics:
  duration: ~10 min
  completed: 2026-02-21
  tasks_completed: 2
  files_changed: 27
---

# Phase 02 Plan 01: Shared Types and Typed Error Handling Summary

Shared types ParsedResume, JobMatch, and ApplicationUpdate added to @gethiredpoc/shared; zod@3 and @hono/zod-validator installed; all 77 backend catch(error: any) blocks migrated to catch(error: unknown) with toMessage() helper.

## What Was Built

### Task 1: Shared Types and Zod Dependencies

Created three shared type files:
- `/packages/shared/src/types/resume.ts` — `ParsedResume` interface (copied from resume.service.ts local definition)
- `/packages/shared/src/types/job-match.ts` — `JobMatch` interface (copied from job-matching.service.ts local definition)
- Added `ApplicationUpdate` as type alias for existing `UpdateApplicationRequest` in `api.ts`

Updated `/packages/shared/src/index.ts` to re-export all three types.

Installed `zod@^3.25.76` and `@hono/zod-validator@^0.7.6` in the backend workspace. Kept zod v3 (not v4) as required for @hono/zod-validator 0.7.6 compatibility.

### Task 2: Typed Error Handling Migration

Created `packages/backend/src/utils/errors.ts` with:
```typescript
export function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unexpected error occurred';
}
```

Migrated 77 catch blocks across:
- **15 route files:** auth, applications, profile, jobs, chat, resumes, recommendations, linkedin, export, ai-jobs, admin, education, work-experience, job-preferences, email-preferences
- **8 service files:** adzuna, ai-resume, ai-cover-letter, ai-prompt, chat, email, job-alerts, job-matching
- **1 entry file:** index.ts

Pattern used in routes:
```typescript
} catch (error: unknown) {
  const msg = toMessage(error);
  if (msg === 'Unauthorized' || msg === 'Session expired') {
    return c.json({ error: msg }, 401);
  }
  return c.json({ error: msg }, 500);
}
```

Pattern used in services (that throw re-wrapped errors):
```typescript
} catch (error: unknown) {
  throw new Error('Prefix: ' + (error instanceof Error ? error.message : String(error)));
}
```

## Verification Results

- `grep -rn "catch (error: any)" packages/backend/src/` — 0 results
- `grep -rn "catch (error: unknown)" packages/backend/src/` — 77 results
- `cd packages/shared && npx tsc --noEmit` — no errors
- `cd packages/backend && npx tsc --noEmit` — 27 pre-existing errors (unchanged, 0 regressions)
- `npm test --workspace=packages/backend` — 1 test passed
- `grep "zod" packages/backend/package.json` — both packages present

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing coverage] index.ts had one catch(error: any) not in plan**
- **Found during:** Task 2 — running grep after completing all planned files
- **Issue:** `packages/backend/src/index.ts` had one `catch (error: any)` for the file-serving route, not listed in plan's file scope
- **Fix:** Migrated inline using `error instanceof Error ? error.message : 'An unexpected error occurred'` (no toMessage import needed for this single case)
- **Files modified:** packages/backend/src/index.ts
- **Commit:** 08fa133

**2. [Rule 2 - Missing coverage] Additional service files had catch(error: any) not in plan**
- **Found during:** Task 2 grep scan
- **Issue:** adzuna.service.ts, email.service.ts, job-alerts.service.ts, ai-prompt.service.ts had catch blocks but were not in the plan's explicit file list
- **Fix:** Migrated all to catch(error: unknown) with instanceof narrowing (plan scope: "any others with catch blocks")
- **Files modified:** all four services
- **Commit:** 08fa133

## Self-Check: PASSED

All key files exist:
- FOUND: packages/shared/src/types/resume.ts
- FOUND: packages/shared/src/types/job-match.ts
- FOUND: packages/backend/src/utils/errors.ts

All commits exist:
- FOUND: 57117e9 (Task 1 — shared types + zod)
- FOUND: 08fa133 (Task 2 — typed error handling)
