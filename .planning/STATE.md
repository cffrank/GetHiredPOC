# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-20)

**Core value:** The app must not crash, lose data, or expose users to security vulnerabilities — every core flow works reliably for real users.
**Current focus:** Phase 2 — Type Safety + Input Validation

## Current Position

Phase: 2 of 5 (Type Safety + Input Validation)
Plan: 3 of 3 in current phase (COMPLETE)
Status: Phase 2 complete — ready for Phase 3
Last activity: 2026-02-21 — Completed 02-03: Migrated JobMatch and ParsedResume to shared package imports, closing phase 2 verification gap (TYPE-01, TYPE-02, TYPE-03, VALID-01, VALID-02, VALID-03)

Progress: [██████░░░░] 60%

## Performance Metrics

**Velocity:**
- Total plans completed: 6
- Average duration: ~18 min
- Total execution time: ~108 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-critical-bugs-test-infrastructure | 3 | ~30 min | ~10 min |
| 02-type-safety-input-validation | 3 | ~78 min | ~26 min |

**Recent Trend:**
- Last 5 plans: 01-02 (frontend bug fixes), 01-03 (status alignment), 02-01 (shared types + typed errors), 02-02 (route any types + Zod validation), 02-03 (shared type import migration)
- Trend: On track

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Fix by severity order (bugs → types → security → performance → tests) — dependency chain confirmed by research
- [Roadmap]: Test infrastructure bootstrapped in Phase 1 alongside bug fixes — prevents fixing without tests
- [01-01]: Removed rootDir from tsconfig.json to allow test/ files to be included outside src/
- [01-01]: Renamed 0010_admin_and_membership_remote.sql to .disabled — duplicate migration caused SQLITE_ERROR in fresh in-memory D1
- [01-01]: Do NOT set environment in vitest wrangler options — wrangler.toml has no named environments
- [01-02]: useUpdateApplication wraps optimistic update with rollback on API error
- [01-02]: JobDetail uses safeParseJSON helper to avoid crash on malformed JSON
- [01-03]: Case A confirmed — only 'saved' and 'applied' in production; no data migration needed
- [01-03]: Kept 'screening' in ApplicationStatus type; column is unconstrained TEXT so it is safe
- [02-01]: ApplicationUpdate added as type alias for UpdateApplicationRequest (identical shape, avoids duplication)
- [02-01]: Route files use local msg variable from toMessage() to enable string comparisons for auth error detection
- [02-01]: Service files use inline instanceof narrowing rather than toMessage() import when constructing new Error() messages
- [Phase 02-02]: AppVariables interface exported from auth.middleware.ts — all routes using requireAuth declare Variables: AppVariables in Hono generic for typed c.get('user')
- [Phase 02-02]: Profile dual content-type uses manual safeParse (Option A) — zValidator can't conditionally validate based on content-type; JSON branch validated, FormData bypasses schema
- [Phase 02-02]: ADMIN_EMAILS added to Env interface — was in wrangler.toml but missing from TypeScript type, caused requireAdmin to fail compile
- [Phase 02-03]: Re-export JobMatch/ParsedResume from service files — job-recommendations.service.ts imports JobMatch from service file; re-export preserves consumers without changes
- [Phase 02-03]: Renamed local wrapper type to JobRecommendation in Recommendations.tsx — avoids naming conflict with imported shared JobMatch

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 2 - RESOLVED]: Frontend request shapes audited in 02-02 — schemas use .passthrough() where needed, all schemas match api-client.ts patterns
- [Phase 3]: Benchmark bcryptjs CPU usage in the actual Workers environment before deciding whether to replace with PBKDF2
- [Phase 3]: Identify exactly which AI-parsed resume fields are user-influenced and need XSS sanitization vs safe structured fields

## Session Continuity

Last session: 2026-02-21
Stopped at: Completed 02-03-PLAN.md — Migrated JobMatch and ParsedResume to shared package imports
Resume file: None
