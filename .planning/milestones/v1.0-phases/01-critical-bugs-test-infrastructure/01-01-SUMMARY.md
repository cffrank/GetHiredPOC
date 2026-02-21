---
phase: 01-critical-bugs-test-infrastructure
plan: 01
subsystem: testing
tags: [vitest, vitest-pool-workers, cloudflare-workers, d1, miniflare, workerd]

# Dependency graph
requires: []
provides:
  - "@cloudflare/vitest-pool-workers test harness running in real Workers runtime"
  - "D1 migrations applied automatically before tests via applyD1Migrations"
  - "packages/backend test infrastructure: vitest.config.mts, test/apply-migrations.ts, test/env.d.ts"
  - "npm test in packages/backend runs a passing D1 smoke test"
affects:
  - 01-02-PLAN.md
  - 01-03-PLAN.md
  - all subsequent backend test plans

# Tech tracking
tech-stack:
  added:
    - "vitest ^3.2.4 — test runner required by vitest-pool-workers"
    - "@cloudflare/vitest-pool-workers ^0.12.14 — runs tests in real Workers runtime (workerd)"
  patterns:
    - "defineWorkersProject + readD1Migrations in vitest.config.mts for D1 test setup"
    - "applyD1Migrations called in setup file for idempotent schema initialization"
    - "ProvidedEnv declaration in test/env.d.ts for typed cloudflare:test bindings"
    - "singleWorker: true ensures migrations persist across test files"

key-files:
  created:
    - "packages/backend/vitest.config.mts — test runner config with defineWorkersProject and D1 migrations"
    - "packages/backend/test/apply-migrations.ts — setup file applying D1 migrations before each run"
    - "packages/backend/test/env.d.ts — ProvidedEnv TypeScript declarations for DB and TEST_MIGRATIONS"
    - "packages/backend/test/smoke.test.ts — D1 smoke test proving bindings work"
    - "migrations/0010_admin_and_membership_remote.sql.disabled — renamed duplicate migration"
  modified:
    - "packages/backend/package.json — added test script and vitest devDependencies"
    - "packages/backend/tsconfig.json — added vitest-pool-workers to types, test files to include"

key-decisions:
  - "Use ../../migrations path in vitest.config.mts matching wrangler.toml migrations_dir"
  - "Do NOT set environment in wrangler options — wrangler.toml has no named environments"
  - "Remove rootDir from tsconfig.json to allow type-checking test/ files outside src/"
  - "Rename 0010_admin_and_membership_remote.sql to .disabled to fix duplicate column conflict in test migrations"

patterns-established:
  - "Pattern: backend tests use env from cloudflare:test — no mock patching of Workers runtime"
  - "Pattern: migrations path is path.join(__dirname, '../../migrations') relative to packages/backend/"
  - "Pattern: D1 binding name DB matches wrangler.toml [[d1_databases]] binding exactly"

requirements-completed: [TEST-01]

# Metrics
duration: 3min
completed: 2026-02-20
---

# Phase 1 Plan 01: Backend Test Infrastructure Summary

**vitest-pool-workers test harness with real D1 bindings running in workerd runtime via applyD1Migrations and defineWorkersProject**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-20T21:04:43Z
- **Completed:** 2026-02-20T21:08:03Z
- **Tasks:** 2 completed
- **Files modified:** 7

## Accomplishments

- D1 smoke test passes in real Workers runtime (workerd via miniflare) with no mock patching
- All migrations automatically applied before tests run via applyD1Migrations
- TypeScript types fully wired: ProvidedEnv gives typed access to env.DB and env.TEST_MIGRATIONS
- Foundation in place for all subsequent backend test plans (01-02, 01-03, all future phases)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install vitest and pool-workers, configure test runner** - `5797e8c` (chore)
2. **Task 2: Create test setup files and D1 smoke test** - `49d6d39` (feat)

## Files Created/Modified

- `packages/backend/vitest.config.mts` — defineWorkersProject config with readD1Migrations pointed at ../../migrations
- `packages/backend/test/apply-migrations.ts` — setup file: applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
- `packages/backend/test/env.d.ts` — ProvidedEnv interface declaration for DB: D1Database and TEST_MIGRATIONS: D1Migration[]
- `packages/backend/test/smoke.test.ts` — smoke test querying SELECT COUNT(*) FROM jobs to verify D1 works
- `packages/backend/package.json` — added test script and vitest/vitest-pool-workers devDependencies
- `packages/backend/tsconfig.json` — added @cloudflare/vitest-pool-workers to types, test/**/* and vitest.config.mts to include, removed rootDir
- `migrations/0010_admin_and_membership_remote.sql.disabled` — renamed duplicate migration to prevent SQLITE_ERROR in tests

## Decisions Made

- Removed `rootDir: ./src` from tsconfig.json — needed to include test/**/* files outside src/ for type checking without errors
- Renamed `0010_admin_and_membership_remote.sql` to `.disabled` — the file was a production-compat copy of the original 0010 migration; both added a `role` column causing duplicate column SQLITE_ERROR when applyD1Migrations ran all migrations fresh in the in-memory D1

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Renamed duplicate migration file causing SQLITE_ERROR on test startup**
- **Found during:** Task 2 (running npm test after creating test files)
- **Issue:** `migrations/0010_admin_and_membership_remote.sql` and `migrations/0010_admin_and_membership.sql` both add `ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`. In the live D1, only the original had been applied so wrangler listed the `_remote` version as "pending". But `applyD1Migrations` applies all migrations fresh against an empty in-memory D1, causing `D1_ERROR: duplicate column name: role: SQLITE_ERROR`.
- **Fix:** Renamed `0010_admin_and_membership_remote.sql` to `0010_admin_and_membership_remote.sql.disabled` so readD1Migrations skips it
- **Files modified:** migrations/0010_admin_and_membership_remote.sql (renamed)
- **Verification:** npm test passes: 1 test passing after rename
- **Committed in:** 49d6d39 (Task 2 commit)

**2. [Rule 1 - Bug] Removed rootDir restriction from tsconfig.json**
- **Found during:** Task 1 verification (tsc --noEmit)
- **Issue:** `rootDir: ./src` prevented TypeScript from including `vitest.config.mts` and `test/**/*` files since they are outside `src/`
- **Fix:** Removed `rootDir: ./src` from compilerOptions — TypeScript infers root from included files; wrangler builds from src/ directly so this doesn't affect production builds
- **Files modified:** packages/backend/tsconfig.json
- **Verification:** No vitest/pool-workers related TypeScript errors
- **Committed in:** 5797e8c (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 bugs)
**Impact on plan:** Both fixes necessary for the test infrastructure to function. No scope creep.

## Issues Encountered

None beyond the two auto-fixed deviations documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Backend test infrastructure complete: `npm test --workspace=packages/backend` runs and passes
- Plans 01-02 and 01-03 can now write tests using `env.DB` from `cloudflare:test`
- The `singleWorker: true` + `applyD1Migrations` pattern is established for all future test files
- No blockers — the 0010 migration rename does not affect production (wrangler d1 migrations list still shows the correct pending migration via production tracking table)

---
*Phase: 01-critical-bugs-test-infrastructure*
*Completed: 2026-02-20*
