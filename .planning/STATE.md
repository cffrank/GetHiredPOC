# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-20)

**Core value:** The app must not crash, lose data, or expose users to security vulnerabilities — every core flow works reliably for real users.
**Current focus:** Phase 2 — Type Safety + Input Validation

## Current Position

Phase: 2 of 5 (Type Safety + Input Validation)
Plan: 1 of 3 in current phase
Status: In progress
Last activity: 2026-02-21 — Completed 02-01: Shared types, typed error handling, Zod deps installed (TYPE-02, TYPE-03)

Progress: [████░░░░░░] 40%

## Performance Metrics

**Velocity:**
- Total plans completed: 4
- Average duration: ~10 min
- Total execution time: ~40 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-critical-bugs-test-infrastructure | 3 | ~30 min | ~10 min |
| 02-type-safety-input-validation | 1 | ~10 min | ~10 min |

**Recent Trend:**
- Last 5 plans: 01-01 (backend test infra), 01-02 (frontend bug fixes), 01-03 (status alignment), 02-01 (shared types + typed errors)
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

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 2]: Audit actual frontend request shapes before writing Zod schemas — prevents rejecting traffic that was previously valid
- [Phase 3]: Benchmark bcryptjs CPU usage in the actual Workers environment before deciding whether to replace with PBKDF2
- [Phase 3]: Identify exactly which AI-parsed resume fields are user-influenced and need XSS sanitization vs safe structured fields

## Session Continuity

Last session: 2026-02-21
Stopped at: Completed 02-01-PLAN.md — Shared types (ParsedResume, JobMatch, ApplicationUpdate) + typed error handling (77 catch blocks migrated) + zod installed
Resume file: None
