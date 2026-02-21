# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-20)

**Core value:** The app must not crash, lose data, or expose users to security vulnerabilities — every core flow works reliably for real users.
**Current focus:** Phase 5 — Comprehensive Test Suite

## Current Position

Phase: 5 of 5 (Comprehensive Test Suite)
Plan: 3 of 4 in current phase
Status: In Progress — 05-03 complete (frontend component tests: Profile, Applications, JobDetail)
Last activity: 2026-02-21 — Completed 05-03: frontend Vitest+MSW component tests (TEST-04)

Progress: [█████████░] 95%

## Performance Metrics

**Velocity:**
- Total plans completed: 9
- Average duration: ~14 min
- Total execution time: ~129 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-critical-bugs-test-infrastructure | 3 | ~30 min | ~10 min |
| 02-type-safety-input-validation | 3 | ~78 min | ~26 min |
| 03-security-error-handling | 3+ | ~21 min | ~7 min |

**Recent Trend:**
- Last 5 plans: 02-01 (shared types + typed errors), 02-02 (route any types + Zod validation), 02-03 (shared type import migration), 03-01 (security headers + file validation + session cleanup), 03-04 (error boundaries + toast notifications)
- Trend: On track

*Updated after each plan completion*
| Phase 03-security-error-handling P03 | 3 | 2 tasks | 6 files |
| Phase 03-security-error-handling P02 | 6 | 3 tasks | 11 files |
| Phase 04-performance-graceful-degradation P01 | 4 | 2 tasks | 6 files |
| Phase 04-performance-graceful-degradation P02 | 4 | 2 tasks | 7 files |
| Phase 04-performance-graceful-degradation P03 | 3 | 2 tasks | 3 files |
| Phase 04-performance-graceful-degradation P04 | 3 | 2 tasks | 5 files |
| Phase 05-comprehensive-test-suite P03 | 18 | 2 tasks | 8 files |

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
- [Phase 03-05]: AdminJobs confirm() replaced with inline yellow-tinted panels showing query count/userId context — better UX for non-reversible bulk operations
- [Phase 03-05]: AdminPrompts delete confirmation moved inline to viewer panel (confirmingDeleteKey state) — keeps list view uncluttered
- [Phase 03-03]: Catch blocks use 'if (error instanceof AppError) throw error' pattern to allow typed errors to propagate to global handler while still catching unexpected errors
- [Phase 03-03]: applications PUT/PATCH now check application existence and ownership before updating — adds NotFoundError and ForbiddenError guards that were previously missing
- [Phase 03-02]: Two parallel sanitize.ts utilities (backend + rwsdk app) — codebases cannot share packages/backend imports at runtime
- [Phase 03-02]: bcryptjs retained as dynamic import in verifyPassword for legacy hash support only; all new hashes use PBKDF2 via crypto.subtle
- [Phase 03-02]: Lazy PBKDF2 migration: isLegacyHash() check after successful login triggers re-hash — no forced password reset
- [Phase 04-performance-graceful-degradation]: unpdf replaces TextDecoder for PDF parsing in resume.service.ts — TextDecoder garbles compressed PDF binary; unpdf uses Workers-compatible PDF.js per Cloudflare official docs (PERF-04)
- [Phase 04-performance-graceful-degradation]: createLogger(module) factory pattern for Cloudflare Workers — thin console.* wrapper producing JSON.stringify objects queryable in Workers Logs; no external library needed (GRACE-03)
- [Phase 04-02]: hasLinkedInData() checks positions/educations/skills arrays — all empty signals only basic OpenID Connect data (name/email); redirects to ?warning=linkedin_limited_data
- [Phase 04-02]: Both codebase paths updated for LinkedIn warning — packages/backend + src/app each have independent LinkedIn OAuth implementations
- [Phase 04-02]: PARSE_FALLBACK constant for AI parse errors — score:50 'fair' returned instead of throwing; jobs with failed AI analysis still appear in recommendations
- [Phase 04-03]: buildUserContext loads user+workHistory+education in parallel with Promise.all — single call before loop replaces 3 per-job queries
- [Phase 04-03]: Cache key uses updated_at as profile version: v${updated_at} suffix — old keys expire via 7-day TTL without prefix-delete
- [Phase 04-04]: Migration numbered 0015 (not 0012 as plan suggested) — 0012 through 0014 already existed
- [Phase 04-04]: chat.service.ts getJobs caller destructured to { jobs } from PaginatedJobs — passes limit:10 to avoid fetching more than needed
- [Phase 04-04]: Preference-based filtering in jobs route operates on paginated.jobs slice after DB query — cursor pagination applied at DB level, filter at app level
- [Phase 05-03]: Profile page reads user data from AuthContext via /api/auth/me — no separate /api/profile call needed in tests
- [Phase 05-03]: JobDetail wrapped in Routes+Route path=/jobs/:id so useParams() returns correct id in tests
- [Phase 05-03]: MSW onUnhandledRequest:error caught missing work-experience and education endpoints; added to default handlers

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 2 - RESOLVED]: Frontend request shapes audited in 02-02 — schemas use .passthrough() where needed, all schemas match api-client.ts patterns
- [Phase 3 - RESOLVED]: Benchmarked bcryptjs — replaced with PBKDF2 via crypto.subtle in 03-02; lazy migration for existing users
- [Phase 3 - RESOLVED]: Audited AI-parsed fields in 03-02 — plain-text fields get trim+maxLength only, rich-text fields get js-xss + maxLength

## Session Continuity

Last session: 2026-02-21
Stopped at: Completed 05-03-PLAN.md — frontend component tests for Profile, Applications, JobDetail (TEST-04)
Resume file: None
