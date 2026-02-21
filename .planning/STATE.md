# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-20)

**Core value:** The app must not crash, lose data, or expose users to security vulnerabilities — every core flow works reliably for real users.
**Current focus:** Phase 3 — Security + Error Handling

## Current Position

Phase: 3 of 5 (Security + Error Handling)
Plan: 4 of ? in current phase
Status: In progress — 03-01 and 03-04 complete
Last activity: 2026-02-21 — Completed 03-01: Security headers, magic byte validation, session cleanup (SEC-01, SEC-03, SEC-04) + 03-04: Error boundaries and toast notifications (ERR-03, ERR-04)

Progress: [███████░░░] 70%

## Performance Metrics

**Velocity:**
- Total plans completed: 8
- Average duration: ~14 min
- Total execution time: ~114 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-critical-bugs-test-infrastructure | 3 | ~30 min | ~10 min |
| 02-type-safety-input-validation | 3 | ~78 min | ~26 min |
| 03-security-error-handling | 2+ | ~6 min | ~3 min |

**Recent Trend:**
- Last 5 plans: 02-01 (shared types + typed errors), 02-02 (route any types + Zod validation), 02-03 (shared type import migration), 03-01 (security headers + file validation + session cleanup), 03-04 (error boundaries + toast notifications)
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
- [Phase 03-01]: secureHeaders applied before CORS middleware on backend API — headers set on all responses including CORS preflight
- [Phase 03-01]: validateFileMagicBytes inlined in src/app/api/resume-upload.ts — two codebases cannot share packages/backend/src/utils/
- [Phase 03-01]: DOC/DOCX types pass through magic byte check — no reliable magic byte check for compound binary formats in Workers runtime
- [Phase 03-01]: cleanupExpiredSessions uses ctx.waitUntil() alongside importJobsForAllUsers — non-blocking, independently failable
- [Phase 03-04]: ErrorBoundary uses "use client" directive for rwsdk RSC compatibility — Navigation always placed outside ErrorBoundary to stay visible on section crash
- [Phase 03-04]: handleResumeUpload signature made optional (e?: React.FormEvent) to support both form submit and Retry toast action callback
- [Phase 03-04]: confirmingDeleteId state replaces confirm() dialog — shows inline "Delete? Yes / No" UI within the application card

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 2 - RESOLVED]: Frontend request shapes audited in 02-02 — schemas use .passthrough() where needed, all schemas match api-client.ts patterns
- [Phase 3]: Benchmark bcryptjs CPU usage in the actual Workers environment before deciding whether to replace with PBKDF2
- [Phase 3]: Identify exactly which AI-parsed resume fields are user-influenced and need XSS sanitization vs safe structured fields

## Session Continuity

Last session: 2026-02-21
Stopped at: Completed 03-01-PLAN.md — Security headers, magic byte file validation, D1 session cleanup (SEC-01, SEC-03, SEC-04)
Resume file: None
