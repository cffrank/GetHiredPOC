---
phase: 03-security-error-handling
plan: 02
subsystem: auth
tags: [xss, sanitization, pbkdf2, bcryptjs, password-hashing, web-crypto, workers, resume-parsing]

# Dependency graph
requires:
  - phase: 03-01
    provides: security headers and file validation foundation
provides:
  - XSS sanitization of AI-parsed resume fields via js-xss (write-time + render-time defense-in-depth)
  - PBKDF2 password hashing via crypto.subtle replacing bcryptjs in both auth modules
  - Backward-compatible lazy migration from bcryptjs to PBKDF2 on login
affects: [auth, resume-upload, resume-parsing, password-reset, profile]

# Tech tracking
tech-stack:
  added: [xss@1.0.15]
  patterns:
    - PBKDF2 via Web Crypto API (no npm, native Workers runtime)
    - Defense-in-depth sanitization (write-time + render-time via React JSX auto-escaping)
    - Lazy hash migration (transparent PBKDF2 upgrade on successful login)
    - Constant-time comparison for PBKDF2 hash verification

key-files:
  created:
    - packages/backend/src/utils/sanitize.ts
    - packages/backend/src/utils/password.ts
    - src/app/lib/sanitize.ts
    - src/app/lib/password.ts
  modified:
    - packages/backend/src/services/resume.service.ts
    - packages/backend/src/services/auth.service.ts
    - src/app/api/resume-upload.ts
    - src/app/lib/auth.ts
    - src/app/pages/Profile.tsx
    - packages/frontend/src/pages/Resume.tsx
    - packages/frontend/src/components/Education.tsx

key-decisions:
  - "Two parallel sanitize.ts utilities (backend + rwsdk app) — codebases cannot share packages/backend imports at runtime"
  - "sanitizeField takes richText=false parameter — plain-text fields (name, email, phone) get trim+maxLength only, rich-text fields get XSS filter too"
  - "bcryptjs retained as dynamic import in verifyPassword for legacy hash support — not in new hashing path"
  - "timingSafeEqual used for PBKDF2 hash comparison — prevents timing-based hash oracle attacks"
  - "Lazy migration via isLegacyHash() check after successful login — no forced password reset needed"

patterns-established:
  - "PBKDF2 format: pbkdf2:{iterations}:{saltHex}:{hashHex} — version-aware parsing enables future iterations changes"
  - "Sanitization at both API boundary (upload response) and storage (confirm) — covers client-side tampering"

requirements-completed: [SEC-02, SEC-05]

# Metrics
duration: 6min
completed: 2026-02-21
---

# Phase 3 Plan 02: XSS Sanitization and PBKDF2 Password Hashing Summary

**js-xss write-time sanitization on AI-parsed resume fields plus PBKDF2 password hashing with bcryptjs lazy migration in both backend and rwsdk auth modules**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-02-21T16:21:45Z
- **Completed:** 2026-02-21T16:27:42Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments

- Created sanitization utilities in both codebases: `sanitizeField()` (trim+maxLength for plain text, XSS filter for rich text) and `sanitizeResumeData()` wired into resume storage paths
- Created PBKDF2 password utilities in both auth modules: new hashes use `pbkdf2:100000:{saltHex}:{hashHex}`, legacy bcryptjs hashes (`$2b$`/`$2a$`) still verify and are lazily re-hashed on login
- Audited all resume-rendering frontend components — confirmed no raw HTML injection of resume data, added security comments documenting React auto-escaping as render-time sanitization

## Task Commits

Each task was committed atomically:

1. **Task 1: AI resume field sanitization with js-xss** - `f4c703f` (feat)
2. **Task 2: Replace bcryptjs with PBKDF2 in both auth modules** - `b3e7ced` (feat)
3. **Task 3: Audit and verify render-time sanitization** - `cef51cd` (docs — security comments landed in prior session's docs commit)

## Files Created/Modified

- `packages/backend/src/utils/sanitize.ts` - XSS sanitization utility using js-xss; sanitizeField + sanitizeResumeData for @gethiredpoc/shared ParsedResume
- `packages/backend/src/utils/password.ts` - PBKDF2 hashPassword/verifyPassword with bcryptjs legacy fallback and isLegacyHash helper
- `src/app/lib/sanitize.ts` - Parallel sanitize utility for rwsdk app's ParsedResume (has name/headline/achievements vs shared's fullName)
- `src/app/lib/password.ts` - Same PBKDF2 implementation for rwsdk app
- `packages/backend/src/services/resume.service.ts` - saveResume() sanitizes parsedData before DB insert
- `packages/backend/src/services/auth.service.ts` - hashPassword/verifyPassword from utils/password; lazy migration on login
- `src/app/api/resume-upload.ts` - sanitizeResumeData applied at both defense-in-depth points
- `src/app/lib/auth.ts` - hashPassword/verifyPassword from lib/password; lazy migration on login
- `src/app/pages/Profile.tsx` - SECURITY comment documenting React JSX render-time sanitization
- `packages/frontend/src/pages/Resume.tsx` - SECURITY comment added
- `packages/frontend/src/components/Education.tsx` - SECURITY comment added

## Decisions Made

- Two parallel sanitize.ts utilities were needed because the rwsdk app cannot import from packages/backend at runtime. The two `ParsedResume` types also differ: backend uses `@gethiredpoc/shared` (with `fullName`), rwsdk app uses its own type from `resume-parser.ts` (with `name`, `headline`, `certifications`, `languages`, `achievements`).
- The `sanitizeField` function takes a `richText=false` flag — plain-text identity fields (name, email, phone, location) receive only trim+maxLength since XSS filtering is unnecessary and could corrupt valid content.
- bcryptjs is kept as a dynamic import in `verifyPassword` — only loaded when a legacy hash is encountered. This avoids CPU cost in the Workers environment for all new users while maintaining compatibility.
- timingSafeEqual applied to PBKDF2 hash comparison to prevent timing-based oracle attacks.

## Deviations from Plan

None - plan executed exactly as written. The two parallel sanitize utilities (backend + rwsdk) were anticipated in the plan.

## Issues Encountered

None. Pre-existing TypeScript errors in chat.service.ts, job-alerts.service.ts, linkedin.service.ts, and parts of resume.service.ts (AI model type mismatches) were out of scope — not introduced by this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- SEC-02 (XSS sanitization) and SEC-05 (bcryptjs CPU safety) are closed
- All resume data written to DB passes through js-xss sanitization at both the backend API and rwsdk API layers
- All new password registrations produce PBKDF2 hashes; existing bcryptjs users migrate transparently on next login
- Ready for phase 3 completion (03-04, 03-05 already done per STATE.md)

---
*Phase: 03-security-error-handling*
*Completed: 2026-02-21*
