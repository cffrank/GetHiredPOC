# Codebase Concerns

**Analysis Date:** 2026-02-20

## Tech Debt

**Excessive `any` type usage:**
- Issue: Multiple files use `any` type instead of proper type definitions, reducing type safety and maintainability
- Files:
  - `src/app/lib/job-matching-v2.ts` (lines 23-24, 66-72: AI parameter, work experience/education results)
  - `src/app/lib/resume-parser.ts` (line 40: AI parameter)
  - `src/app/api/resume-upload.ts` (line 105: parsed resume body)
  - `src/app/api/applications.ts` (lines 37-38, 61, 63: request body handling)
- Impact: Type checking failures not caught at compile time, harder to refactor, unclear data structure contracts
- Fix approach: Replace `any` with specific interfaces matching actual data structures; define ParsedResume, JobMatch, and ApplicationUpdate types explicitly

**Resume parsing lacks proper PDF support:**
- Issue: PDF file type detection passes but actual parsing uses simple TextDecoder, not a real PDF parser. Comments indicate this is incomplete.
- Files: `src/app/api/resume-upload.ts` (lines 49-58)
- Impact: PDF resumes will be corrupted when decoded as raw text, resulting in unparseable content for AI
- Fix approach: Integrate proper PDF library (pdf-parse, pdfjs) or use cloud-based PDF extraction service

**LinkedIn API limitations not fully addressed:**
- Issue: Code comments acknowledge LinkedIn API v2 requires Partner Program access for most profile endpoints (work experience, education, skills, certifications). Current implementation returns empty arrays for these fields.
- Files: `src/app/lib/linkedin-oauth.ts` (lines 138-159)
- Impact: Users importing from LinkedIn get only basic profile data (ID, name), defeating the purpose of LinkedIn integration
- Fix approach: Either integrate with LinkedIn Sign-In API partner program or implement fallback to resume-based profile building

**AI JSON parsing fragile:**
- Issue: Multiple files use regex-based JSON extraction that can fail on malformed AI responses
- Files:
  - `src/app/lib/resume-parser.ts` (lines 115-124)
  - `src/app/lib/job-matching-v2.ts` (lines 205-214)
- Impact: AI occasionally returns non-JSON or malformed JSON that causes silent failures (caught as generic "Failed to parse" error)
- Fix approach: Add structured AI prompt validation; use Claude API with response_format=json_schema if available; add fallback templates

**Weak validation of parsed resume data:**
- Issue: Resume parser validates only name field (line 127 in resume-parser.ts) but allows any other field to be empty strings without validation
- Files: `src/app/lib/resume-parser.ts` (lines 126-144)
- Impact: Users can save incomplete/invalid resume data to database (e.g., work experience with missing company/title)
- Fix approach: Implement comprehensive validation for required fields before saving; validate array items contain required properties

## Known Bugs

**Status field mismatch in Applications:**
- Symptoms: Applications.tsx hardcodes status values (line 214-218) but database may have different status values
- Files:
  - `src/app/pages/Applications.tsx` (lines 101-108, 214-218)
  - `src/app/lib/db.ts` (line 19: type definition shows "saved" | "applied" | "interview" | "offer" | "rejected")
- Trigger: Display code expects "screening" status (line 89) but database schema shows "applied" and "saved" as separate statuses
- Fix approach: Align status enums; add database constraint to enforce valid status values; update UI to match schema definition

**Race condition in status updates:**
- Symptoms: Applications.tsx optimistically updates local state before API returns (line 57), creating inconsistency if update fails
- Files: `src/app/pages/Applications.tsx` (lines 47-61)
- Trigger: User changes application status, network fails, UI shows old status but database has new value
- Workaround: Refresh page to re-sync
- Fix approach: Wait for API confirmation before updating local state; add error toast to revert optimistic update on failure

**Unhandled JSON parsing in JobDetail:**
- Symptoms: JobDetail.tsx parses job.requirements as JSON without try-catch (line 113)
- Files: `src/app/pages/JobDetail.tsx` (line 113)
- Trigger: Job record has invalid JSON in requirements field
- Workaround: None - page crashes
- Fix approach: Wrap JSON.parse in try-catch; provide fallback empty array

## Security Considerations

**Session storage in KV has expiration mismatch:**
- Risk: KV sessions expire after 7 days (expirationTtl), but database sessions have separate expires_at. If KV key expires first and isn't cleaned, KV will drop it but database record persists. If DB is checked first (unlikely), stale session could be used.
- Files: `src/app/lib/auth.ts` (lines 87-106)
- Current mitigation: getSession() checks KV first (line 112), so stale DB records can't be accessed
- Recommendations: Add periodic cleanup job to delete expired sessions from DB; document that KV is source of truth; consider single storage location (DB with cache)

**Sensitive file upload lacks MIME type verification:**
- Risk: File type validation uses MIME type from user-submitted form, which is unreliable. Attacker can rename executable as .pdf
- Files: `src/app/api/resume-upload.ts` (lines 28-34)
- Current mitigation: File is then decoded as text, so binary executables produce garbage that AI rejects
- Recommendations: Add magic number (file header) validation; scan file content for executable signatures; use allowlist of safe MIME types with content validation

**Resume data auto-saves to user profile:**
- Risk: User uploads resume, parser extracts "malicious" data (e.g., injected script in work description field), gets saved to DB
- Files:
  - `src/app/pages/Profile.tsx` (lines 112-137)
  - `src/app/lib/resume-parser.ts` (lines 154-241)
- Current mitigation: None - data is stored and rendered as-is
- Recommendations: Sanitize all parsed fields before saving (especially work description, bio); apply XSS protection when rendering; add content security policy headers

**OAuth state validation expires in 10 minutes:**
- Risk: State token used for CSRF protection expires quickly, but OIDC standard uses 5-10 minutes. Slow networks or debugging delays could cause false rejection.
- Files: `src/app/lib/linkedin-oauth.ts` (line 63: expirationTtl 600 seconds)
- Current mitigation: Reasonable expiration time for most users
- Recommendations: Increase TTL to 15-30 minutes; log rejected states for analysis; consider allowing configurable timeout

## Performance Bottlenecks

**N+1 queries in job analysis:**
- Problem: `analyzeJobMatchV2` fetches user profile, then makes 7 separate database queries (work experience, education, certifications, languages, projects each with individual prepare)
- Files: `src/app/lib/job-matching-v2.ts` (lines 30-72)
- Cause: Each entity type requires separate query; no query optimization or batching
- Improvement path: Consolidate into 2-3 queries using JOINs; consider denormalizing frequently-accessed profile data; cache full profile after first analysis

**AI model inference time not optimized:**
- Problem: Resume parsing and job matching both call Llama-3.1-8B which has ~5-10 second latency per request
- Files:
  - `src/app/api/resume-upload.ts` (line 74)
  - `src/app/api/jobs.ts` (line 139)
- Cause: No request batching or queue; each request waits synchronously
- Improvement path: Implement request queue with batch processing; pre-compute common analyses; use smaller model variant for initial scoring; add timeout with fallback to mock analysis

**Caching too aggressive on job analysis:**
- Problem: Job analysis cached for 7 days per user, but user profile changes (adds skills) don't invalidate cache
- Files: `src/app/api/jobs.ts` (lines 127-143)
- Cause: Cache key includes only user_id and job_id, not profile hash or modification timestamp
- Improvement path: Include profile modification timestamp in cache key; add manual cache invalidation when profile updates; reduce TTL to 24 hours

**No pagination on job list:**
- Problem: `getJobs` returns all matching jobs in memory; potentially thousands of records
- Files: `src/app/lib/db.ts` (lines 35-66)
- Cause: No LIMIT/OFFSET or cursor-based pagination
- Improvement path: Add limit/offset parameters; implement cursor pagination for better performance; add database index on posted_date

## Fragile Areas

**Profile page with large state surface:**
- Files: `src/app/pages/Profile.tsx`
- Why fragile: 11 separate useState calls managing form state, loading states, modal states, resume parsing. Changes to one flow can cause unintended side effects.
- Safe modification: Extract resume upload modal to separate component; use useReducer for related state; add integration tests for form flows
- Test coverage: No visible tests for Profile.tsx; resume parsing flow untested

**Resume parsing JSON extraction regex:**
- Files: `src/app/lib/resume-parser.ts` (lines 115-124), `src/app/lib/job-matching-v2.ts` (lines 205-214)
- Why fragile: Regex `/{[\s\S]*}/` is greedy and can match unexpected braces in AI response; markdown code block detection uses simple string matching without proper parsing
- Safe modification: Add explicit JSON schema validation after parsing; use JSON.parse with reviver function for custom type handling; add logging of raw AI response for debugging
- Test coverage: No visible test cases for malformed AI responses

**Status state not validated in Applications:**
- Files: `src/app/pages/Applications.tsx` (lines 101-108, 209-220)
- Why fragile: UI hardcodes status values but database has different enum; mismatch between hardcoded statuses and database schema definition
- Safe modification: Export status enum from db.ts; use it in UI; add validation that status is in allowed set before API call
- Test coverage: No tests for invalid status transitions

**LinkedIn integration with limited API support:**
- Files: `src/app/lib/linkedin-oauth.ts` (lines 138-159)
- Why fragile: Code structure expects work experience, education, skills arrays to be populated, but they're always empty due to API limitations; saveLinkedInProfile() loops over empty arrays
- Safe modification: Add feature flag to enable/disable LinkedIn import; return early with user notification if data is empty; document API limitations prominently
- Test coverage: No tests for LinkedIn callback handler

## Scaling Limits

**Database session table unbounded growth:**
- Current capacity: Stores one session per user per login; no automatic cleanup
- Limit: Session table grows by ~100-1000 rows/day depending on user activity; no TTL enforcement at DB level
- Scaling path: Add VACUUM/cleanup job to delete expired sessions weekly; implement automatic cleanup trigger; move sessions to time-series database

**KV storage key namespace collision risk:**
- Current capacity: Uses prefixes like `linkedin_oauth:`, `job-analysis-v2:`, `session:` with manual namespace management
- Limit: As features add more KV keys, risk of name collisions; no centralized key registry
- Scaling path: Implement key versioning scheme (e.g., `v1:linkedin_oauth:...`); create constants file with all KV keys; use tuples for composite keys

**Resume parsing AI token usage unbounded:**
- Current capacity: Each resume upload consumes ~1500-2000 tokens; no rate limiting or quota
- Limit: Can exhaust monthly AI token budget if user uploads many resumes or receives spam uploads
- Scaling path: Add rate limiting per user; implement token budget tracking; add upload queue with daily limits; fall back to mock parser on limit

**Job matching analysis not optimized for many applications:**
- Current capacity: Each job analysis requires fetching user profile + 7 queries + AI call (~15-20 seconds)
- Limit: Users with 100+ applications would timeout when loading applications page if all analyses are computed
- Scaling path: Pre-compute analyses asynchronously on profile update; cache aggressively; compute on-demand only when explicitly requested; add background job queue

## Dependencies at Risk

**bcryptjs potential security issues:**
- Risk: bcryptjs is pure JavaScript implementation; slower and less audited than native C implementations; library maintenance status unclear
- Impact: Password hashing slower on high-load servers; potential for timing attacks if implementation has flaws
- Migration plan: Migrate to `@noble/hashes` or Node.js native crypto module; benchmark performance; update hash rounds if needed during migration

**LinkedIn API v2 partner program requirement:**
- Risk: Full LinkedIn profile import blocked by Partner Program access which may be difficult to obtain; API endpoint stability not guaranteed
- Impact: Feature doesn't work as intended; users get minimal data from LinkedIn import
- Migration plan: Implement alternative profile sources (GitHub import, manual entry); use resume-only approach; consider other OAuth providers with better API coverage

## Missing Critical Features

**No input validation on API requests:**
- Problem: API handlers use `any` types for request bodies; no schema validation (zod, yup, etc.)
- Blocks: Can't enforce data integrity; malformed requests accepted and cause downstream errors
- Priority: High - security and stability issue

**No error boundary for async operations:**
- Problem: Profile page and Applications page both have async operations that can throw but catch silently with `alert()`
- Blocks: Users see generic alerts instead of helpful error messages; no error logging for debugging
- Priority: High - user experience and observability issue

**No optimistic UI feedback for slow operations:**
- Problem: Resume parsing shows "Parsing..." but takes 5-10 seconds; no progress indication; user thinks it's frozen
- Blocks: Poor user experience for slow AI operations
- Priority: Medium - can be fixed with better UX

**No offline support:**
- Problem: All features require network; no caching of job listings or saved jobs for offline viewing
- Blocks: Mobile users in poor connectivity can't browse saved jobs
- Priority: Low - nice-to-have for MVP

## Test Coverage Gaps

**No tests for resume parsing flow:**
- What's not tested:
  - Malformed AI responses
  - Partial resume data (missing fields)
  - Oversized resumes (edge case validation)
  - Database insertion of parsed data
- Files: `src/app/api/resume-upload.ts`, `src/app/lib/resume-parser.ts`
- Risk: Resume parsing silently fails on edge cases; regressions not caught
- Priority: High

**No tests for job matching analysis:**
- What's not tested:
  - Empty user profile (no work experience)
  - Missing job requirements field
  - AI response parsing with malformed JSON
  - Cache invalidation logic
- Files: `src/app/lib/job-matching-v2.ts`, `src/app/api/jobs.ts`
- Risk: Matching logic may fail silently; cache inconsistencies not detected
- Priority: High

**No tests for authentication flows:**
- What's not tested:
  - Session expiration handling
  - OAuth state validation
  - Cookie parsing edge cases
  - Concurrent login attempts
- Files: `src/app/lib/auth.ts`, `src/app/lib/linkedin-oauth.ts`
- Risk: Auth bugs affect all users; regressions could expose accounts
- Priority: Critical

**No tests for UI state management:**
- What's not tested:
  - Form submission error handling
  - Drag-and-drop status updates
  - Race conditions in status changes
  - Loading state transitions
- Files: `src/app/pages/Profile.tsx`, `src/app/pages/Applications.tsx`
- Risk: UI bugs cause lost work or confusing states
- Priority: Medium

**No E2E tests:**
- What's not tested: End-to-end user flows (signup → upload resume → analyze job → apply)
- Risk: Regression in any layer breaks entire user journey
- Priority: High

---

*Concerns audit: 2026-02-20*
