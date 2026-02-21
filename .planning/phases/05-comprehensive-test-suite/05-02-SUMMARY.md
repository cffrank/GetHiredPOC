---
phase: 05-comprehensive-test-suite
plan: 02
subsystem: testing
tags: [vitest, cloudflare-workers, d1, integration-tests, hono, auth, session-cookies]

# Dependency graph
requires:
  - phase: 05-comprehensive-test-suite
    provides: vitest-pool-workers test infrastructure with real D1 bindings (from 05-01)

provides:
  - Integration tests for auth routes (signup, login, logout, me) with session cookie handling
  - Integration tests for jobs routes (pagination shape, cursor, limit, title filter)
  - Integration tests for applications routes (CRUD, auth guards, ownership checks, 404/403)
  - Integration tests for profile routes (GET/PUT/PATCH with auth guard and Zod validation)

affects: [future test phases, CI/CD pipeline validation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Use worker.fetch(request, env, ctx) to call the Hono worker from integration tests — app default export is { fetch, scheduled } not a Hono instance"
    - "Extract session cookie from Set-Cookie header by splitting on semicolon and taking first segment"
    - "Seed test data via direct D1 INSERT OR IGNORE in beforeAll blocks"
    - "Use unique email per test: ${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com"

key-files:
  created:
    - packages/backend/test/integration/auth.routes.test.ts
    - packages/backend/test/integration/jobs.routes.test.ts
    - packages/backend/test/integration/applications.routes.test.ts
    - packages/backend/test/integration/profile.routes.test.ts

key-decisions:
  - "Import worker default export (not app Hono instance) and call worker.fetch(request, env, ctx) — index.ts exports { fetch: app.fetch, scheduled } not the Hono app directly"
  - "Jobs table column is external_url not url — discovered from 0003_phase2_schema.sql migration; test inserts use correct schema"
  - "GET /api/auth/me returns { user: null } with 200 when no session exists — not a 401; test documents this behavior explicitly"

patterns-established:
  - "makeRequest(path, options) helper wraps worker.fetch with localhost base URL for clean test authoring"
  - "createSessionCookie(email, password) helper signs up user and extracts session cookie for use in subsequent requests"

requirements-completed: [TEST-03]

# Metrics
duration: 22min
completed: 2026-02-21
---

# Phase 05 Plan 02: Backend Route Integration Tests Summary

**34 integration tests across 4 route handlers using real D1/KV bindings via vitest-pool-workers — auth, jobs, applications, and profile routes all covered with session cookie auth flow**

## Performance

- **Duration:** 22 min
- **Started:** 2026-02-21T14:01:00Z
- **Completed:** 2026-02-21T14:23:00Z
- **Tasks:** 2
- **Files modified:** 4 created

## Accomplishments
- Auth route tests (10): signup (201+cookie, duplicate 400, Zod validation 400), login (200+cookie, 401), me (with/without session), logout (cookie cleared with Max-Age=0)
- Jobs route tests (6): pagination shape validation (jobs array + nextCursor + hasMore), limit parameter, cursor-based second page, title filter
- Applications route tests (9): auth guard (401), empty list for new user, POST create (201), Zod status validation (400), PUT update (200), 404 not found, 403 ownership cross-user, PATCH notes
- Profile route tests (9): auth guard (401), GET returns profile with fields, PUT updates single field, PUT updates multiple fields, PUT invalid linkedin_url (400), PUT empty body (400), PATCH bio

## Task Commits

Each task was committed atomically:

1. **Task 1: Create auth and jobs route integration tests** - `c4c75a5` (feat)
2. **Task 2: Create applications and profile route integration tests** - `870a23e` (feat)

**Plan metadata:** (committed below)

## Files Created/Modified
- `packages/backend/test/integration/auth.routes.test.ts` - Auth route tests with session cookie helper
- `packages/backend/test/integration/jobs.routes.test.ts` - Jobs pagination tests with seeded test data
- `packages/backend/test/integration/applications.routes.test.ts` - Applications CRUD tests with ownership checks
- `packages/backend/test/integration/profile.routes.test.ts` - Profile GET/PUT/PATCH tests with field validation

## Decisions Made
- **worker.fetch() not app.request():** The `src/index.ts` default export is `{ fetch: app.fetch, scheduled }` — a Cloudflare Worker handler object, not the Hono app instance. Calling `worker.fetch(new Request(url, opts), env, ctx)` is the correct pattern for integration testing.
- **external_url column:** The jobs table uses `external_url` (from migration 0003) not `url` — discovered by reading the migration files when D1 threw `table jobs has no column named url`.
- **GET /api/auth/me returns 200 with null:** The route returns `{ user: null, 200 }` when no session exists, not 401. The test explicitly documents this behavior.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed wrong import pattern for app under test**
- **Found during:** Task 1 (auth routes test execution)
- **Issue:** Plan said `import app from '../../src/index'` and call `app.request()`. But `index.ts` exports `{ fetch, scheduled }` not a Hono app — `app.request is not a function` error.
- **Fix:** Import as `worker` (the default export), create a `makeRequest()` helper that builds a `Request` and calls `worker.fetch(request, env, {} as ExecutionContext)`
- **Files modified:** `auth.routes.test.ts`, `jobs.routes.test.ts`, `applications.routes.test.ts`, `profile.routes.test.ts`
- **Verification:** All tests pass with correct 201/200/400/401/403/404 responses
- **Committed in:** c4c75a5 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed wrong column name in jobs seed INSERT**
- **Found during:** Task 1 (jobs test beforeAll block)
- **Issue:** Plan example used `url` column but the jobs table schema has `external_url` (from 0003_phase2_schema.sql). D1 threw `table jobs has no column named url`.
- **Fix:** Changed `url` to `external_url` in INSERT statement; also removed `source` from the explicit non-nullable required columns (it has a default).
- **Files modified:** `jobs.routes.test.ts`, `applications.routes.test.ts`
- **Verification:** beforeAll seeds successfully, all 6 jobs route tests pass
- **Committed in:** c4c75a5 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 - bug fixes)
**Impact on plan:** Both fixes required for tests to run at all. No scope creep — same test coverage as planned.

## Issues Encountered
- `close timed out after 10000ms` warning appears at end of each vitest run — pre-existing behavior in vitest-pool-workers, not caused by our tests; all tests pass cleanly.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- 4 integration test files cover all core API routes; TEST-03 complete
- Full backend test suite: 79 passing, 1 pre-existing skip (80 total)
- Ready for Phase 05 Plan 03 (frontend component tests or E2E)

---
*Phase: 05-comprehensive-test-suite*
*Completed: 2026-02-21*
