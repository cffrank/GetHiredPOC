---
phase: 03-security-error-handling
verified: 2026-02-21T00:00:00Z
status: passed
score: 18/18 must-haves verified
re_verification: false
---

# Phase 3: Security & Error Handling Verification Report

**Phase Goal:** The security surface is closed — headers applied, AI output sanitized, file uploads verified, sessions cleaned up, password hashing confirmed safe — and all errors reach users as friendly messages rather than raw crashes or alert() dialogs
**Verified:** 2026-02-21
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Every HTTP response from the backend API includes CSP, HSTS, and X-Frame-Options headers | VERIFIED | `secureHeaders()` wired at line 25 of `packages/backend/src/index.ts`, before all routes and CORS middleware |
| 2 | The rwsdk app includes X-Frame-Options header and tightened CSP directives | VERIFIED | `response.headers.set("X-Frame-Options", "SAMEORIGIN")` at line 28 of `src/app/headers.ts`; CSP with `frame-ancestors 'self'` at line 38 |
| 3 | Uploading a file with .pdf extension but non-PDF binary content is rejected with 400 before parsing | VERIFIED | `file.slice(0, 8).arrayBuffer()` plus `validateFileMagicBytes()` check before `parseResume()` in `packages/backend/src/routes/resumes.ts` lines 41-44; identical pattern in `src/app/api/resume-upload.ts` lines 77-82 |
| 4 | Expired sessions are cleaned up by the daily cron job | VERIFIED | `cleanupExpiredSessions(env)` defined at line 118 and wired via `ctx.waitUntil()` at line 144 of `packages/backend/src/index.ts` |
| 5 | Injecting script tags into a resume upload does not result in that string being stored or reflected unescaped | VERIFIED | `filterXSS()` with `stripIgnoreTagBody: ['script', ...]` in both `packages/backend/src/utils/sanitize.ts` and `src/app/lib/sanitize.ts`; called at all write-time points |
| 6 | AI-parsed resume fields are sanitized with max length limits before database storage | VERIFIED | `sanitizeResumeData()` called in `resume.service.ts` line 175 before DB insert; called twice in `resume-upload.ts` (lines 117, 157) for defense-in-depth |
| 7 | New password hashes use PBKDF2 via crypto.subtle instead of bcryptjs | VERIFIED | `hashPassword()` in `packages/backend/src/utils/password.ts` and `src/app/lib/password.ts` uses `crypto.subtle.deriveBits` with PBKDF2, returning `pbkdf2:100000:{saltHex}:{hashHex}` format |
| 8 | Existing bcryptjs-hashed passwords still verify correctly and are re-hashed to PBKDF2 on successful login | VERIFIED | `verifyPassword()` checks for `$2b$`/`$2a$` prefix and delegates to bcryptjs; lazy migration in `auth.service.ts` line 61 and `src/app/lib/auth.ts` line 71 |
| 9 | Frontend components that render resume fields use React default text rendering (no raw HTML injection) | VERIFIED | No raw HTML injection found anywhere in `src/app/` or `packages/frontend/src/`; SECURITY comment at top of `Profile.tsx` documents React auto-escaping |
| 10 | Throwing NotFoundError in a route handler results in a 404 JSON response with the error message | VERIFIED | `app.onError()` in `packages/backend/src/index.ts` lines 104-110 checks `instanceof AppError` and returns `c.json({ error: err.message }, err.statusCode)` |
| 11 | Throwing ValidationError results in a 400, ForbiddenError in a 403, UnauthorizedError in a 401 | VERIFIED | All four error classes in `packages/backend/src/utils/errors.ts` carry correct status codes (400/401/403/404) via `AppError.statusCode` |
| 12 | Unhandled errors still return a generic 500 JSON response | VERIFIED | `app.onError()` fallback branch: `c.json({ error: 'Internal server error' }, 500)` |
| 13 | All typed error responses follow the same JSON shape: `{ error: string }` | VERIFIED | All onError branches return `c.json({ error: ... })` — single consistent shape |
| 14 | When a component in Profile, Applications, or JobDetail crashes, the rest of the page continues to render and shows a friendly error message with Retry | VERIFIED | `ErrorBoundary` wraps `ProfileContent`, `ApplicationsContent`, and job card + analysis sections; navigation always outside all boundaries |
| 15 | All alert() calls in the rwsdk app pages are replaced with toast notifications | VERIFIED | Zero `alert(` found in `src/app/pages/` or `src/app/api/`; 5 Profile.tsx alert() calls replaced with `toast.error()`/`toast.success()` |
| 16 | All confirm() calls in the rwsdk app pages are replaced with inline confirmation UI | VERIFIED | Zero `confirm(` found in `src/app/pages/`; Applications.tsx uses `confirmingDeleteId` state for inline "Delete? Yes/No" |
| 17 | All alert() calls in packages/frontend are replaced with toast notifications | VERIFIED | Zero `alert(` found in `packages/frontend/src/pages/` or `packages/frontend/src/components/`; 7 replacements across AdminPrompts, AdminJobs |
| 18 | All confirm() calls in packages/frontend are replaced with inline confirmation UI | VERIFIED | Zero `confirm(` found in `packages/frontend/src/`; 6 replacements with `confirmingDeleteId`/`confirmingRoleChangeId`/`confirmingDeleteKey` states |

**Score:** 18/18 truths verified

---

## Required Artifacts

| Artifact | Provides | Status | Details |
|----------|----------|--------|---------|
| `packages/backend/src/index.ts` | `secureHeaders` middleware + session cleanup in scheduled handler | VERIFIED | `secureHeaders()` at line 25; `cleanupExpiredSessions` at line 118/144 |
| `src/app/headers.ts` | X-Frame-Options header + tightened CSP | VERIFIED | X-Frame-Options at line 28; frame-ancestors in CSP at line 38 |
| `packages/backend/src/routes/resumes.ts` | Magic byte validation before resume parsing | VERIFIED | `validateFileMagicBytes` imported and called at lines 12/41-44 |
| `src/app/api/resume-upload.ts` | Magic byte validation before resume upload processing | VERIFIED | Inline `validateFileMagicBytes` at lines 14-35, called at lines 77-82 |
| `packages/backend/src/utils/file-validation.ts` | Shared magic byte validation utility | VERIFIED | `validateFileMagicBytes()` with PDF and text/plain checks |
| `packages/backend/src/utils/sanitize.ts` | XSS sanitization utility (js-xss + max lengths) | VERIFIED | `sanitizeField`, `sanitizeResumeData` exported; `filterXSS` with strict whitelist |
| `src/app/lib/sanitize.ts` | Parallel sanitize utility for rwsdk app | VERIFIED | Same shape, adapted for rwsdk `ParsedResume` type (name/headline/achievements vs fullName) |
| `packages/backend/src/utils/password.ts` | PBKDF2 hashing with bcryptjs backward compat | VERIFIED | `hashPassword`, `verifyPassword`, `isLegacyHash` all exported; timing-safe comparison |
| `src/app/lib/password.ts` | PBKDF2 hashing for rwsdk app | VERIFIED | Identical implementation to backend utility |
| `packages/backend/src/utils/errors.ts` | Typed error classes (AppError + 4 subclasses) | VERIFIED | `AppError`, `NotFoundError`, `ValidationError`, `ForbiddenError`, `UnauthorizedError` all present |
| `src/app/components/ErrorBoundary.tsx` | Error boundary wrapper with `ErrorFallback` for rwsdk app | VERIFIED | `ErrorFallback` with friendly message + Retry button; `"use client"` directive for RSC |
| `src/app/components/Toast.tsx` | Toast provider for rwsdk app | VERIFIED | `ToastProvider` wrapping sonner `Toaster`; `toast` re-exported |
| `packages/frontend/src/components/ErrorBoundary.tsx` | Error boundary wrapper for packages/frontend | VERIFIED | Same `ErrorFallback` pattern (no `"use client"` needed — standard React app) |
| `packages/frontend/src/components/Toast.tsx` | Toast provider for packages/frontend | VERIFIED | `ToastProvider` + `toast` re-export |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `packages/backend/src/index.ts` | `hono/secure-headers` | `app.use(secureHeaders({...}))` before routes | WIRED | Line 25, before CORS middleware and all route mounts |
| `packages/backend/src/index.ts` | D1 sessions table | `cleanupExpiredSessions` in scheduled handler | WIRED | `DELETE FROM sessions WHERE expires_at < ?` at line 122; called via `ctx.waitUntil()` at line 144 |
| `packages/backend/src/services/resume.service.ts` | `packages/backend/src/utils/sanitize.ts` | `sanitizeResumeData` called before DB insert | WIRED | Import at line 3; called at line 175 before INSERT |
| `src/app/api/resume-upload.ts` | `src/app/lib/sanitize.ts` | `sanitizeResumeData` at both defense-in-depth points | WIRED | Import at line 5; called at line 117 (upload) and line 157 (confirm) |
| `packages/backend/src/services/auth.service.ts` | `packages/backend/src/utils/password.ts` | `hashPassword`/`verifyPassword` replace direct bcryptjs calls | WIRED | Import at line 3; `hashPassword` at lines 23, 62; `verifyPassword` at line 55 |
| `src/app/lib/auth.ts` | `src/app/lib/password.ts` | `hashPassword`/`verifyPassword` + lazy migration | WIRED | Import at line 1; `hashPassword` at lines 33, 72; `verifyPassword` at line 65 |
| `packages/backend/src/index.ts` | `packages/backend/src/utils/errors.ts` | `app.onError` checks `instanceof AppError` | WIRED | Import at line 4; `instanceof AppError` check at line 105 |
| `packages/backend/src/routes/*.ts` | `packages/backend/src/utils/errors.ts` | `throw new NotFoundError/ValidationError/ForbiddenError/UnauthorizedError` | WIRED | Confirmed in auth.ts, jobs.ts, resumes.ts, applications.ts |
| `src/app/pages/Profile.tsx` | `src/app/components/ErrorBoundary.tsx` | `ErrorBoundary` wraps profile card and resume modal | WIRED | Import at line 11; used at lines 296 (modal) and 396 (ProfileContent) |
| `src/app/pages/Profile.tsx` | `sonner` via Toast.tsx | `toast.success`/`toast.error` replace alert() | WIRED | Import at line 12; 4 toast calls in handleResumeUpload/handleConfirmResume |
| `src/app/Document.tsx` | `sonner` via Toast.tsx | `ToastProvider` rendered in root document | WIRED | Import at line 1; `<ToastProvider />` at line 15 |
| `packages/frontend/src/main.tsx` | `sonner` via Toast.tsx | `ToastProvider` rendered in app root | WIRED | Import at line 6; `<ToastProvider />` at line 27 |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SEC-01 | 03-01 | Security headers (CSP, HSTS, X-Frame-Options) applied globally via Hono secureHeaders | SATISFIED | `secureHeaders()` in backend index.ts; X-Frame-Options + CSP in src/app/headers.ts |
| SEC-02 | 03-02 | AI-parsed resume fields sanitized for XSS before database storage | SATISFIED | `sanitizeResumeData()` in both codebases; js-xss with strict whitelist; applied at 3 storage points |
| SEC-03 | 03-01 | File uploads validated via magic byte inspection before processing | SATISFIED | `validateFileMagicBytes()` in file-validation.ts and inlined in resume-upload.ts; both reject non-PDF .pdf files with 400 |
| SEC-04 | 03-01 | Expired sessions cleaned up from D1 database periodically | SATISFIED | `cleanupExpiredSessions()` wired into daily cron via `ctx.waitUntil()` |
| SEC-05 | 03-02 | bcryptjs CPU usage profiled in Workers; replaced with PBKDF2 if exceeding limits | SATISFIED | PBKDF2 via `crypto.subtle` in both password.ts utilities; bcryptjs retained only for legacy hash verification |
| ERR-01 | 03-03 | Typed error classes (NotFoundError, ValidationError, ForbiddenError) with correct HTTP status codes | SATISFIED | All 5 error classes present in errors.ts with status codes 400/401/403/404 |
| ERR-02 | 03-03 | Global error handler converts typed errors to consistent JSON responses | SATISFIED | `app.onError()` with `instanceof AppError` check returns `{ error: message }` at correct status |
| ERR-03 | 03-04, 03-05 | React error boundaries contain crashes per UI domain (Profile, Applications, JobDetail) | SATISFIED | Per-section boundaries in all 3 rwsdk pages; `ErrorFallback` in both codebases |
| ERR-04 | 03-04, 03-05 | User-friendly error notifications replace alert() calls | SATISFIED | Zero alert()/confirm() in both codebases; sonner toast notifications throughout |

**All 9 requirements satisfied. No orphaned requirements.**

---

## Anti-Patterns Found

No blockers or warnings found.

| File | Issue | Severity | Notes |
|------|-------|----------|-------|
| `src/app/api/resume-upload.ts:25` | `TextDecoder('utf-8', { fatal: true })` missing `ignoreBOM: false` | Info | Backend utility has `ignoreBOM: false` to satisfy `@cloudflare/workers-types`. Root tsconfig also includes workers-types but `tsc --noEmit` does not surface this as an error. Functionally identical — the default for `ignoreBOM` is false. Worth harmonizing in a cleanup pass. |

---

## Human Verification Required

### 1. Security Headers in Network Responses

**Test:** Deploy to Cloudflare Workers staging. Run `curl -I https://<backend-staging>/api/health` and `curl -I https://<app-staging>/` and inspect response headers.
**Expected:** CSP, Strict-Transport-Security, X-Frame-Options present on all responses. HSTS only on non-dev responses for the rwsdk app.
**Why human:** Cannot deploy or make live network requests in this environment.

### 2. Toast Notifications Visual Behavior

**Test:** Log in to the app. Upload a resume that fails (wrong file type). Trigger a successful resume import.
**Expected:** Error toast appears top-right, stays 5 seconds. Success toast appears top-right, disappears after 3 seconds. Error toast includes a "Retry" action button.
**Why human:** Visual rendering and timing behavior cannot be verified statically.

### 3. Error Boundary Recovery

**Test:** Simulate a render error inside Profile or JobDetail. Verify the boundary catches it and navigation remains visible.
**Expected:** "Oops, something went wrong! Let's try that again." message with Retry button appears inside the crashed section. Top navigation bar remains fully functional.
**Why human:** Runtime render behavior cannot be verified statically.

### 4. PBKDF2 Backward Compatibility (Live Login)

**Test:** If any existing user accounts have bcryptjs `$2b$` hashes in the database, log in with those credentials.
**Expected:** Login succeeds. After login, querying `password_hash` for that user shows `pbkdf2:100000:...` format (lazy migration fired).
**Why human:** Requires a database with pre-existing bcryptjs hashes and a live login flow.

---

## Observations

### Architectural Decision: Two Parallel Utility Files

`sanitize.ts` and `password.ts` each exist in both `packages/backend/src/utils/` and `src/app/lib/`. This is intentional: the rwsdk app cannot import from `packages/backend` at runtime (separate Cloudflare Worker bundles). The two `ParsedResume` types also differ — the backend uses `@gethiredpoc/shared` (`fullName`, no `headline`/`certifications`/`languages`/`achievements`) while the rwsdk uses its own type from `resume-parser.ts`. Both implementations are substantively equivalent.

### Security Bonus: Ownership Guard Added

`packages/backend/src/routes/applications.ts` received a previously-missing ownership authorization check (`ForbiddenError` if `application.user_id !== user.id`) as part of the typed errors work. This closes a BOLA (broken object level authorization) gap that existed pre-phase.

---

## Summary

Phase 3 goal achieved. All 9 requirements (SEC-01 through SEC-05, ERR-01 through ERR-04) are satisfied with substantive, wired implementations. The security surface is closed: headers on both Workers, XSS sanitization on all AI output with defense-in-depth, magic byte validation before file parsing, sessions cleaned nightly, and PBKDF2 replacing bcryptjs with transparent migration. Errors propagate through typed classes to a consistent JSON shape, and both frontend apps surface failures as toast notifications behind per-section error boundaries — no blocking browser dialogs remain.

---

_Verified: 2026-02-21T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
