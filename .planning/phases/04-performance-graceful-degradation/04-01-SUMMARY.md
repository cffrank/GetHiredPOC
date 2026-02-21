---
phase: 04-performance-graceful-degradation
plan: 01
subsystem: api
tags: [unpdf, pdf-parsing, structured-logging, cloudflare-workers, logger]

# Dependency graph
requires:
  - phase: 03-security-error-handling
    provides: sanitize utility, typed error classes used in services being modified
provides:
  - Structured JSON logger utility (createLogger) for Cloudflare Workers
  - PDF text extraction via unpdf replacing broken TextDecoder approach
  - Consistent structured logging in 4 high-traffic backend services
affects: [04-02, 04-03, all future backend service work]

# Tech tracking
tech-stack:
  added: [unpdf@1.4.0]
  patterns:
    - createLogger(module) factory pattern for Cloudflare Workers structured JSON logging
    - unpdf getDocumentProxy + extractText for Workers-compatible PDF parsing

key-files:
  created:
    - packages/backend/src/utils/logger.ts
  modified:
    - packages/backend/src/services/resume.service.ts
    - packages/backend/src/services/job-matching.service.ts
    - packages/backend/src/services/job-recommendations.service.ts
    - packages/backend/src/services/linkedin-parser.service.ts
    - packages/backend/package.json

key-decisions:
  - "unpdf replaces TextDecoder for PDF parsing: TextDecoder produces garbled output for compressed PDF binary; unpdf uses Workers-compatible PDF.js build per Cloudflare official docs"
  - "No external logging libraries: createLogger is a thin console.* wrapper producing JSON.stringify objects — matches Cloudflare Workers Logs structured logging pattern without bundle overhead"
  - "Bundle size 429KB gzip after adding unpdf — well within 10MB paid tier limit"

patterns-established:
  - "Logger pattern: const logger = createLogger('module-name') at module scope, then logger.info/warn/error/debug with data objects"
  - "Structured log fields: {level, module, message, ...data} — all queryable in Cloudflare Workers Logs"

requirements-completed: [GRACE-03, PERF-04]

# Metrics
duration: 4min
completed: 2026-02-21
---

# Phase 4 Plan 01: Logger + PDF Fix Summary

**Structured JSON logger utility and unpdf PDF text extraction replacing broken TextDecoder in 4 high-traffic Cloudflare Workers services**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-02-21T19:22:05Z
- **Completed:** 2026-02-21T19:26:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Created `createLogger(module)` factory producing `{level, module, message, ...data}` JSON entries queryable in Cloudflare Workers Logs
- Replaced broken `TextDecoder` PDF parsing (garbled binary output) with `unpdf@1.4.0` — Cloudflare's officially recommended Workers-compatible PDF.js build
- Adopted structured logging across 4 high-traffic services: resume, job-matching, job-recommendations, linkedin-parser

## Task Commits

Each task was committed atomically:

1. **Task 1: Create structured logger utility and install unpdf** - `bff02b6` (feat)
2. **Task 2: Replace TextDecoder PDF parsing with unpdf and adopt structured logging** - `7601bb1` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `packages/backend/src/utils/logger.ts` - createLogger factory with info/warn/error/debug methods outputting JSON.stringify
- `packages/backend/src/services/resume.service.ts` - extractTextFromPDF uses unpdf; console.* replaced with structured logger
- `packages/backend/src/services/job-matching.service.ts` - all console.* replaced with createLogger('job-matching')
- `packages/backend/src/services/job-recommendations.service.ts` - all console.* replaced with createLogger('job-recommendations')
- `packages/backend/src/services/linkedin-parser.service.ts` - all console.* replaced with createLogger('linkedin-parser')
- `packages/backend/package.json` - added unpdf@1.4.0 dependency

## Decisions Made

- **unpdf over pdf-parse browser build:** pdf-parse uses OffscreenCanvas which is NOT supported in Cloudflare Workers (confirmed: cloudflare/workerd#54). unpdf is the Cloudflare-recommended alternative using a Workers-compatible PDF.js build.
- **Thin logger wrapper, no external library:** Cloudflare Workers Logs natively indexes JSON objects from console.log — no pino/winston needed; adds no bundle overhead.
- **Bundle size verified:** 429KB gzip after unpdf addition — well within limits.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript errors in `chat.service.ts`, `job-alerts.service.ts`, and `linkedin.service.ts` were present before this plan and remain out of scope. The `resume.service.ts` TextDecoder TS error (line 119 pre-plan) was eliminated as a side effect of replacing that code with unpdf.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Logger utility available for all future backend service work in Phase 4
- PDF parsing now produces correct text from real multi-page PDFs
- Ready for 04-02 (LinkedIn empty data detection) and subsequent plans

---
*Phase: 04-performance-graceful-degradation*
*Completed: 2026-02-21*
