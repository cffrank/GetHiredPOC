---
phase: 01-critical-bugs-test-infrastructure
plan: "02"
subsystem: ui
tags: [react, react-query, tanstack-query, json-parsing, optimistic-updates]

# Dependency graph
requires: []
provides:
  - Safe JSON parse helper (safeParseJSON) in JobDetail.tsx preventing crash on malformed requirements data
  - Optimistic update with cache snapshot and rollback in useUpdateApplication mutation
affects:
  - 02-type-safety (TYPE-01 will replace `updates: any` with typed interface in useUpdateApplication)
  - 05-testing (TEST-04 will add component tests for safeParseJSON behavior)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "safeParseJSON<T>(value, fallback) pattern for all server-provided JSON strings parsed client-side"
    - "TanStack Query optimistic update pattern: cancelQueries → snapshot → setQueryData → return context → onError rollback → onSettled invalidate"

key-files:
  created: []
  modified:
    - packages/frontend/src/pages/JobDetail.tsx
    - packages/frontend/src/hooks/useApplications.ts

key-decisions:
  - "Used safeParseJSON helper (not error boundary) for requirements parse — error boundaries are Phase 3 scope (ERR-03)"
  - "Kept updates: any type annotation in useUpdateApplication — Phase 2 (TYPE-01) will replace with typed interface"
  - "onSettled replaces onSuccess in useUpdateApplication — runs on both success and failure ensuring server reconciliation"

patterns-established:
  - "safeParseJSON<T>: any server-provided string parsed as JSON must use this helper with a typed fallback"
  - "Optimistic mutation pattern: cancelQueries first, snapshot cache, apply optimistic update, rollback in onError, reconcile in onSettled"

requirements-completed:
  - BUG-01
  - BUG-03

# Metrics
duration: 2min
completed: 2026-02-20
---

# Phase 1 Plan 02: Frontend Bug Fixes Summary

**safeParseJSON helper in JobDetail prevents crash on malformed requirements JSON; useUpdateApplication gains optimistic update with cache snapshot and rollback on API failure**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-20T22:44:43Z
- **Completed:** 2026-02-20T22:46:43Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- JobDetail.tsx no longer crashes on malformed or missing `job.requirements` JSON — returns empty array via typed safeParseJSON helper
- useUpdateApplication now applies UI changes immediately on mutation, then rolls back if the API call fails
- TypeScript compiles cleanly with zero errors after both changes

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix JobDetail JSON parse crash with safe parse helper** - `4d69e4e` (fix)
2. **Task 2: Add optimistic update with rollback to useUpdateApplication** - `6e6b563` (fix)

**Plan metadata:** _(final docs commit below)_

## Files Created/Modified
- `packages/frontend/src/pages/JobDetail.tsx` - Added safeParseJSON helper above component; replaced raw JSON.parse(job.requirements) with safeParseJSON<string[]>(job.requirements, [])
- `packages/frontend/src/hooks/useApplications.ts` - Replaced simple onSuccess in useUpdateApplication with full optimistic update pattern (onMutate/onError/onSettled)

## Decisions Made
- Used a module-level helper function (not inline try/catch) so the pattern is reusable and testable — aligns with plan guidance and Phase 5 (TEST-04) test plans
- Kept `updates: any` type intentionally per plan instruction — Phase 2 TYPE-01 will add typed interface
- Replaced `onSuccess` entirely with `onSettled` — this is the correct TanStack Query pattern: `onSettled` fires on both success and error, ensuring server reconciliation in all cases

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- BUG-01 and BUG-03 are resolved; core job-viewing and application-tracking flows are stable
- safeParseJSON pattern is established and ready for Phase 5 component tests (TEST-04)
- useUpdateApplication rollback is in place; Phase 2 (TYPE-01) can safely add typed interface without breaking the mutation structure

---
*Phase: 01-critical-bugs-test-infrastructure*
*Completed: 2026-02-20*

## Self-Check: PASSED

- FOUND: packages/frontend/src/pages/JobDetail.tsx
- FOUND: packages/frontend/src/hooks/useApplications.ts
- FOUND: .planning/phases/01-critical-bugs-test-infrastructure/01-02-SUMMARY.md
- FOUND commit: 4d69e4e (Task 1)
- FOUND commit: 6e6b563 (Task 2)
