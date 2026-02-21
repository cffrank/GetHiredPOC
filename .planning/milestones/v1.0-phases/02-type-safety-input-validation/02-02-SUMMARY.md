---
phase: 02-type-safety-input-validation
plan: 02
subsystem: api
tags: [hono, zod, typescript, validation, middleware]

# Dependency graph
requires:
  - phase: 02-01
    provides: shared types (ApplicationUpdate, ParsedResume, JobMatch), typed error handling, zod installed

provides:
  - Zero any annotations in all route handler files and db.service.ts
  - AppVariables typed interface for Hono context — c.get('user') returns User without cast
  - 12 Zod schemas for every JSON-body route group in packages/backend/src/schemas/
  - validationHook returning structured { error, issues: [{ field, message }] } 400 responses
  - zValidator middleware on all 11 applicable route files
  - Profile dual content-type handler (JSON validated via safeParse, FormData passes through)

affects:
  - 03-security-hardening
  - 04-performance-reliability
  - future-phases-api

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "@hono/zod-validator with shared validationHook for consistent 400 error format"
    - "AppVariables interface in auth.middleware.ts — all auth routes use Hono<{ Bindings: Env; Variables: AppVariables }>"
    - "Dual content-type handling: JSON branch uses manual safeParse, FormData branch bypasses schema"
    - "ApplicationJobRow internal interface for typed D1 JOIN query results"

key-files:
  created:
    - packages/backend/src/schemas/validation-hook.ts
    - packages/backend/src/schemas/auth.schema.ts
    - packages/backend/src/schemas/applications.schema.ts
    - packages/backend/src/schemas/profile.schema.ts
    - packages/backend/src/schemas/work-experience.schema.ts
    - packages/backend/src/schemas/education.schema.ts
    - packages/backend/src/schemas/job-preferences.schema.ts
    - packages/backend/src/schemas/email-preferences.schema.ts
    - packages/backend/src/schemas/chat.schema.ts
    - packages/backend/src/schemas/linkedin.schema.ts
    - packages/backend/src/schemas/admin.schema.ts
    - packages/backend/src/schemas/export.schema.ts
  modified:
    - packages/backend/src/services/db.service.ts
    - packages/backend/src/middleware/auth.middleware.ts
    - packages/backend/src/routes/auth.ts
    - packages/backend/src/routes/applications.ts
    - packages/backend/src/routes/profile.ts
    - packages/backend/src/routes/jobs.ts
    - packages/backend/src/routes/chat.ts
    - packages/backend/src/routes/work-experience.ts
    - packages/backend/src/routes/education.ts
    - packages/backend/src/routes/job-preferences.ts
    - packages/backend/src/routes/email-preferences.ts
    - packages/backend/src/routes/linkedin.ts
    - packages/backend/src/routes/admin.ts
    - packages/backend/src/routes/export.ts
    - packages/backend/src/routes/resumes.ts

key-decisions:
  - "AppVariables interface exported from auth.middleware.ts — routes use Hono<{ Bindings: Env; Variables: AppVariables }> to get typed c.get('user')"
  - "Profile dual content-type uses manual safeParse for JSON branch (Option A) — zValidator cannot be used on routes that conditionally parse FormData vs JSON"
  - "admin.ts POST /import-jobs retains c.req.json().catch(() => ({})) — optional body with fallback, internal admin endpoint, no user-facing schema needed"
  - "ApplicationJobRow typed interface in db.service.ts replaces any for D1 JOIN queries — includes all Job fields to satisfy ApplicationWithJob return type"
  - "AI: Ai from @cloudflare/workers-types replaces AI: any in Env — model string casts to as any only where required by AI gateway API"
  - "job.state field removed from jobs.ts location filter — field does not exist in Job type, location string matching used as fallback"
  - "ADMIN_EMAILS added to Env interface — was in wrangler.toml but missing from TypeScript Env type, causing requireAdmin to fail compile"

patterns-established:
  - "Pattern 1: All Hono routers that use requireAuth must declare Variables: AppVariables in generic"
  - "Pattern 2: All JSON body POST/PUT/PATCH routes use zValidator('json', schema, validationHook)"
  - "Pattern 3: Schema files live in packages/backend/src/schemas/ one file per route group"
  - "Pattern 4: validationHook from validation-hook.ts is the single consistent error format for all validation failures"

requirements-completed: [TYPE-01, VALID-01, VALID-02, VALID-03]

# Metrics
duration: 65min
completed: 2026-02-21
---

# Phase 02 Plan 02: Type Safety + Input Validation — Route Handlers Summary

**Zero `any` in all route handler files, 12 Zod schemas covering every JSON-body endpoint, and zValidator middleware on all 11 applicable route files returning structured 400 errors**

## Performance

- **Duration:** ~65 min
- **Started:** 2026-02-21T04:52:00Z
- **Completed:** 2026-02-21T05:57:13Z
- **Tasks:** 2
- **Files modified:** 27

## Accomplishments

- Eliminated all `: any` annotations from route files and `db.service.ts` — zero remain
- Created 12 Zod schema files in `packages/backend/src/schemas/` covering every route group
- Wired `zValidator('json', schema, validationHook)` on all 11 applicable route files
- All POST/PUT/PATCH JSON body routes now return structured `{ error, issues: [{ field, message }] }` 400 on malformed input
- Profile routes correctly handle dual content-type (JSON validated, FormData passthrough)
- Defined `AppVariables` interface — all authed routes get typed `c.get('user')` returning `User` without cast

## Task Commits

Each task was committed atomically:

1. **Task 1: Eliminate all any types from route handler files** - `b9c3311` (feat)
2. **Task 2: Create Zod schemas and wire validation middleware on all JSON body routes** - `6c70d85` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

**Created:**
- `packages/backend/src/schemas/validation-hook.ts` — shared error hook for structured 400 responses
- `packages/backend/src/schemas/auth.schema.ts` — signupSchema, loginSchema
- `packages/backend/src/schemas/applications.schema.ts` — createApplicationSchema, updateApplicationSchema
- `packages/backend/src/schemas/profile.schema.ts` — updateProfileSchema with passthrough
- `packages/backend/src/schemas/work-experience.schema.ts` — create/update schemas
- `packages/backend/src/schemas/education.schema.ts` — create/update schemas
- `packages/backend/src/schemas/job-preferences.schema.ts` — full enum validation for all preference fields
- `packages/backend/src/schemas/email-preferences.schema.ts` — digestFrequency enum
- `packages/backend/src/schemas/chat.schema.ts` — chatMessageSchema, createConversationSchema
- `packages/backend/src/schemas/linkedin.schema.ts` — profileText with 50k char max
- `packages/backend/src/schemas/admin.schema.ts` — updateRoleSchema, createPromptSchema, updatePromptSchema
- `packages/backend/src/schemas/export.schema.ts` — coverLetterExportSchema

**Modified:**
- `packages/backend/src/services/db.service.ts` — AI: Ai typed, params: (string|number)[], ApplicationJobRow interface, full Job fields in JOIN queries
- `packages/backend/src/middleware/auth.middleware.ts` — AppVariables interface, ADMIN_EMAILS typed, email annotation fixed
- All 11 route files updated with zValidator and typed context

## Decisions Made

- **AppVariables pattern:** Exported from auth.middleware.ts, imported by all routes using requireAuth — eliminates repeated Variables type declaration
- **Profile dual content-type (Option A):** Manual `safeParse` in JSON branch since zValidator can't conditionally validate based on content-type
- **admin import-jobs retained as-is:** Optional JSON body with `.catch(() => ({}))` fallback — internal admin endpoint, no user-facing schema needed
- **Removed job.state references:** Field does not exist in the shared `Job` type — removed state-based location filter, replaced with simple location string match

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added ADMIN_EMAILS to Env interface**
- **Found during:** Task 1 (eliminating any types)
- **Issue:** `ADMIN_EMAILS` was defined in `wrangler.toml` but missing from the TypeScript `Env` interface, causing `requireAdmin` to fail TypeScript compilation
- **Fix:** Added `ADMIN_EMAILS?: string` to the `Env` interface in `db.service.ts`
- **Files modified:** `packages/backend/src/services/db.service.ts`
- **Verification:** TypeScript compiles cleanly in middleware/admin route files
- **Committed in:** b9c3311 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed job.state reference in jobs.ts location filter**
- **Found during:** Task 1 (TypeScript compilation errors)
- **Issue:** The location filtering code in `jobs.ts` referenced `job.state` which does not exist in the `Job` type from `@gethiredpoc/shared`
- **Fix:** Removed the state-based matching block (it would never execute anyway since field doesn't exist), replaced with simple `job.location` string matching using nullish coalescing for null safety
- **Files modified:** `packages/backend/src/routes/jobs.ts`
- **Verification:** TypeScript compiles cleanly, location filtering still works via `location.includes()` fallback
- **Committed in:** b9c3311 (Task 1 commit)

**3. [Rule 1 - Bug] Rebuilt shared package to expose ApplicationUpdate export**
- **Found during:** Task 1 (TypeScript compilation in applications.ts)
- **Issue:** `ApplicationUpdate` was defined and exported in `packages/shared/src/types/api.ts` and `packages/shared/src/index.ts` source files but was missing from the built `dist/index.d.ts`
- **Fix:** Ran `npm run build --workspace=packages/shared` to regenerate the distribution files
- **Files modified:** `packages/shared/dist/` (gitignored, not committed)
- **Verification:** `ApplicationUpdate` appears in dist/index.d.ts, import succeeds in applications.ts
- **Committed in:** b9c3311 (Task 1 commit)

**4. [Rule 2 - Missing Critical] Added AppVariables interface for typed Hono context**
- **Found during:** Task 1 (migrating from local requireAuth to middleware pattern)
- **Issue:** Without a Variables generic, `c.set('user', user)` and `c.get('user')` failed TypeScript — Hono can't infer the variable type without an explicit Variables declaration
- **Fix:** Defined `AppVariables` interface in `auth.middleware.ts` with `user: User`, updated all auth-using route files to declare `Variables: AppVariables` in their Hono generic
- **Files modified:** `packages/backend/src/middleware/auth.middleware.ts`, all route files using requireAuth
- **Verification:** TypeScript compiles cleanly, `c.get('user')` returns `User` without cast
- **Committed in:** b9c3311 (Task 1 commit)

---

**Total deviations:** 4 auto-fixed (3 bugs, 1 missing critical)
**Impact on plan:** All auto-fixes necessary for TypeScript compilation correctness. No scope creep.

## Issues Encountered

- Pre-existing TypeScript errors in `chat.service.ts`, `resume.service.ts`, `job-alerts.service.ts`, `linkedin.service.ts` remain — these are out of scope for this plan (AI model typing, OpenAI tool call types). Deferred to future plan per scope boundary rules.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All route handler files are `any`-free and TypeScript-clean
- Zod validation middleware on all JSON body routes — malformed requests return structured 400 errors
- Phase 3 (security hardening) can build on typed, validated handlers
- Pre-existing service file TypeScript errors (chat.service, resume.service, etc.) need attention before full `npx tsc` passes cleanly — suggest including in Phase 3 scope

---
*Phase: 02-type-safety-input-validation*
*Completed: 2026-02-21*
