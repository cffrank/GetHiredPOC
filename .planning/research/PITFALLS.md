# Pitfalls Research: Production Readiness Stabilization

**Research Date:** 2026-02-20
**Domain:** Common mistakes when stabilizing/hardening a Cloudflare Workers + React app
**Confidence:** High — verified against official Cloudflare docs, Hono GitHub issues, OWASP standards

## Critical Pitfalls

### 1. bcryptjs Exceeds Workers CPU Limit

**Severity:** Critical — production blocker
**Warning signs:** Auth routes intermittently return 500 errors; "exceeded CPU time limit" in Cloudflare logs
**The problem:** bcryptjs is a pure JavaScript bcrypt implementation. Cloudflare Workers have a 50ms CPU time limit (free tier) or 30s wall-clock. bcrypt with default rounds (10-12) can exceed this on Workers.
**Prevention:** Replace bcryptjs with Web Crypto API `PBKDF2` or `bcrypt-edge` (Workers-optimized). Benchmark before deploying.
**Phase:** Should be addressed in Security phase — password hashing is security-critical.

### 2. Fixing Bugs Without Tests = New Fragile Code

**Severity:** Critical — defeats the purpose of stabilization
**Warning signs:** "Fix applied, works in manual testing" without a failing test first
**The problem:** With zero existing test coverage, every bug fix without a preceding failing test is just as fragile as before. The interconnected state in Profile.tsx (11 useState calls) and Applications.tsx makes regressions likely.
**Prevention:** Strict test-first discipline: write failing test → fix bug → verify test passes. No exceptions for "simple" fixes.
**Phase:** Testing infrastructure should be set up early (Phase 1-2) so tests can be written alongside fixes.

### 3. Hono defaultHook Doesn't Propagate to Sub-Routers

**Severity:** High — architectural limitation
**Warning signs:** Validation errors return raw Zod output instead of formatted JSON; inconsistent error formats across routes
**The problem:** When using `@hono/zod-validator` with a global `defaultHook` on the main Hono app, the hook does NOT propagate to sub-routers mounted via `app.route()`. This is confirmed in GitHub issues #2520, #1306, #773.
**Prevention:** Each route file (`auth.ts`, `jobs.ts`, `profile.ts`) must create its own Hono instance with the `defaultHook` passed to its constructor, or use a shared factory function.
**Phase:** Validation layer phase — must be designed correctly from the start.

### 4. Magic Number Validation Must Precede Text Decoding

**Severity:** High — security validation bypass
**Warning signs:** File validation always passes or always fails; uploaded PDFs work but validation claims they're invalid
**The problem:** The existing code reads the file as text via `TextDecoder` before any validation. If magic byte checks are added after text decoding, the binary header bytes are already corrupted by the text conversion. Validation will either always-fail (corrupted bytes don't match) or be trivially bypassable.
**Prevention:** Read raw `ArrayBuffer` first → check magic bytes → only then decode as text (for text files) or pass to pdf-parse (for PDFs).
**Phase:** Security hardening phase — file upload validation.

### 5. Status Enum Fix Can Break Live Data

**Severity:** High — data migration risk
**Warning signs:** After deploying status fix, some applications show blank status or crash
**The problem:** CONCERNS.md notes the UI has "screening" status but DB schema shows different values. However, existing D1 rows may have inconsistent status values from previous versions. Adding a DB constraint without auditing existing data will break those rows.
**Prevention:** Before any schema change: `SELECT DISTINCT status FROM applications` to audit actual values. Write a migration that normalizes existing data BEFORE adding constraints.
**Phase:** Bug fixes phase — status mismatch fix.

### 6. Cache Invalidation Misses Sub-Profile Writes

**Severity:** Medium — stale data shown to users
**Warning signs:** User adds new skills/experience, but job match scores don't update
**The problem:** The planned fix (include profile `updated_at` in cache key) only works if `profiles.updated_at` is bumped on EVERY write path — including work_experience, education, skills, certifications. If those tables are updated without touching the profile timestamp, cache keys won't change.
**Prevention:** Every mutation to profile-related tables must also `UPDATE profiles SET updated_at = datetime('now') WHERE id = ?`. Or use a profile version counter instead of timestamp.
**Phase:** Performance optimization phase — cache invalidation fix.

## Moderate Pitfalls

### 7. DOMPurify Won't Work in Workers

**Severity:** Medium — deploy failure
**Warning signs:** Build succeeds locally but deploy fails with "document is not defined" or "window is not defined"
**The problem:** DOMPurify and isomorphic-dompurify both require a DOM environment. Cloudflare Workers have no DOM.
**Prevention:** Use string-based sanitization: HTML entity encoding for output, or an allowlist approach that strips disallowed characters. No DOM-dependent libraries.
**Phase:** Security hardening phase — XSS prevention.

### 8. Over-Testing Low-Value Code

**Severity:** Medium — wasted effort
**Warning signs:** Writing tests for simple getters, static config, or UI layout while critical paths remain untested
**The problem:** With comprehensive depth selected, there's a temptation to test everything. But testing Tailwind class names or static route definitions adds no safety.
**Prevention:** Prioritize tests by risk: auth flows > AI parsing > data mutations > API routes > UI components > layout/styling. Never test framework behavior.
**Phase:** All testing phases — maintain discipline throughout.

### 9. Zod Validation Too Strict on Existing Data

**Severity:** Medium — breaks existing functionality
**Warning signs:** After adding validation, existing API calls start failing; frontend forms that worked before now reject
**The problem:** Adding strict Zod schemas to endpoints that previously accepted loose data will reject requests from existing frontend code or data that doesn't match the new schema.
**Prevention:** Audit actual request shapes from frontend before defining schemas. Start with permissive schemas that match current behavior, then tighten incrementally. Use `.passthrough()` initially.
**Phase:** Validation layer phase — incremental rollout.

### 10. Testing AI Responses with Deterministic Expectations

**Severity:** Medium — flaky tests
**Warning signs:** AI-related tests pass sometimes, fail other times; tests break when AI model changes
**The problem:** AI responses are non-deterministic. Tests that assert exact output will be flaky. Tests that mock AI responses only test the parsing logic, not the integration.
**Prevention:** Test AI integration in two layers: (1) unit tests with mocked AI responses for parsing logic, (2) integration tests that verify AI returns parseable JSON (not specific content). Use snapshot-like tolerance.
**Phase:** Testing phase — AI service tests.

## Low Pitfalls

### 11. Pagination Breaking Existing Frontend

**Severity:** Low — UI regression
**Warning signs:** Job list shows fewer results; "load more" doesn't work; saved job counts change
**Prevention:** Backend returns pagination metadata alongside results. Frontend initially requests large page size to match current behavior, then add UI for pagination.

### 12. Session Cleanup Job Deleting Active Sessions

**Severity:** Low — user logouts
**Warning signs:** Users randomly logged out after cleanup runs
**Prevention:** Cleanup checks both KV expiration AND DB `expires_at`. Only delete if both agree the session is expired.

## Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| bcryptjs CPU limit | HIGH | Confirmed in Cloudflare community forums with CPU measurements |
| Hono defaultHook limitation | HIGH | Confirmed in 3 GitHub issues (#2520, #1306, #773) |
| Test-first discipline | HIGH | Universal software engineering principle |
| Magic number ordering | HIGH | Binary vs text encoding is deterministic |
| Status enum live data | MEDIUM | Standard DB migration risk, specific to this app |
| Cache invalidation sub-paths | MEDIUM | Logical derivation from codebase audit |
| DOMPurify in Workers | HIGH | No DOM in Workers is a platform constraint |
| Zod strictness | MEDIUM | Common pattern in validation retrofits |

---

*Research sources: Cloudflare Workers docs, Hono GitHub issues, OWASP standards, Cloudflare community forums*
