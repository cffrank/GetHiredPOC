# Roadmap: GetHiredPOC — Stabilization & Production Readiness

## Overview

This milestone hardens an existing, feature-complete job search platform for real users. The app has known crashes, zero test coverage, unvalidated API inputs, and several security gaps. The work follows a strict dependency order: stop crashes first, build type safety and validation next, then lock down security and error handling, then fix performance, and finally write the full test suite against a stable codebase. Each phase leaves the app in a better, verifiable state than the one before it.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Critical Bugs + Test Infrastructure** - Stop the crashes and establish the test harness so every fix has a test from day one
- [x] **Phase 2: Type Safety + Input Validation** - Eliminate all `any` types and validate every API endpoint with Zod schemas (completed 2026-02-21)
- [x] **Phase 3: Security + Error Handling** - Apply security headers, sanitize AI output, validate file uploads, and replace raw crashes with typed error responses (completed 2026-02-21)
- [x] **Phase 4: Performance + Graceful Degradation** - Eliminate N+1 queries, add pagination, fix cache invalidation, and make integrations fail gracefully (completed 2026-02-21)
- [ ] **Phase 5: Comprehensive Test Suite** - Unit, integration, component, and E2E tests covering all critical paths

## Phase Details

### Phase 1: Critical Bugs + Test Infrastructure
**Goal**: The three known production crashes are fixed and the test runner is configured so every subsequent fix is written test-first
**Depends on**: Nothing (first phase)
**Requirements**: BUG-01, BUG-02, BUG-03, TEST-01
**Success Criteria** (what must be TRUE):
  1. Navigating to a JobDetail page with malformed requirements JSON does not crash the page — it displays a fallback state
  2. Application status values shown in the UI match the values stored in the database schema, with existing live data audited and normalized before any constraint is added
  3. Clicking "Update Status" on an application waits for the API to confirm before reflecting the change in the UI, and rolls back to the previous status if the API call fails
  4. A developer can run `npm test` in the backend workspace and execute at least one real test against the D1 binding via vitest-pool-workers without mock patching the Workers runtime
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Backend test infrastructure (vitest-pool-workers + D1 smoke test)
- [x] 01-02-PLAN.md — Frontend crash fixes (safe JSON parse + optimistic update rollback)
- [x] 01-03-PLAN.md — Application status schema audit and alignment

### Phase 2: Type Safety + Input Validation
**Goal**: All `any` types are replaced with proper TypeScript interfaces and every API endpoint validates its request body with a Zod schema before the handler runs
**Depends on**: Phase 1
**Requirements**: TYPE-01, TYPE-02, TYPE-03, VALID-01, VALID-02, VALID-03
**Success Criteria** (what must be TRUE):
  1. TypeScript compiles with zero `any` usages in API handler files — all request and response shapes have named interfaces
  2. The `ParsedResume`, `JobMatch`, and `ApplicationUpdate` types exist in a shared package and are imported by both backend services and frontend code
  3. Submitting a malformed request body to any API endpoint (missing required fields, wrong types) returns a structured JSON error with field-level details and an HTTP 400 status — not a 500 or an unhandled exception
  4. All `catch (error: any)` blocks are replaced with typed error handling that preserves error type information
**Plans**: 3 plans

Plans:
- [x] 02-01-PLAN.md — Shared types (ParsedResume, JobMatch, ApplicationUpdate), typed error handling, Zod deps
- [x] 02-02-PLAN.md — Replace all `any` in route handlers, wire Zod validation middleware on all JSON body routes
- [ ] 02-03-PLAN.md — Gap closure: migrate service/frontend files from local type duplicates to shared imports

### Phase 3: Security + Error Handling
**Goal**: The security surface is closed — headers applied, AI output sanitized, file uploads verified, sessions cleaned up, password hashing confirmed safe — and all errors reach users as friendly messages rather than raw crashes or alert() dialogs
**Depends on**: Phase 2
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, ERR-01, ERR-02, ERR-03, ERR-04
**Success Criteria** (what must be TRUE):
  1. Every HTTP response from the API includes CSP, HSTS, and X-Frame-Options headers — verifiable with `curl -I` against any endpoint
  2. Resume fields parsed from AI output are sanitized before storage — injecting `<script>alert(1)</script>` into a resume upload does not result in that string being stored or reflected unescaped
  3. Uploading a file with a `.pdf` extension but non-PDF binary content is rejected with a 400 error before the file reaches any parsing logic
  4. When any component in the Profile, Applications, or JobDetail sections encounters an unhandled JavaScript error, the rest of the application continues to render and the user sees an error message instead of a blank page
  5. All `alert()` calls in the frontend are replaced — users see toast notifications or inline error messages for all success and failure states
**Plans**: 5 plans

Plans:
- [ ] 03-01-PLAN.md — Security headers, magic byte file validation, session cleanup (SEC-01, SEC-03, SEC-04)
- [ ] 03-02-PLAN.md — AI resume sanitization with js-xss, render-time sanitization audit, PBKDF2 password hashing migration (SEC-02, SEC-05)
- [ ] 03-03-PLAN.md — Typed error classes and global error handler (ERR-01, ERR-02)
- [ ] 03-04-PLAN.md — Error boundaries and toast notifications for rwsdk app (ERR-03, ERR-04)
- [ ] 03-05-PLAN.md — Error boundaries and toast notifications for packages/frontend (ERR-03, ERR-04)

### Phase 4: Performance + Graceful Degradation
**Goal**: The app handles load without slow N+1 queries, paginates job listings correctly, invalidates caches accurately, parses PDFs reliably, and fails gracefully when LinkedIn or AI returns bad data
**Depends on**: Phase 3
**Requirements**: PERF-01, PERF-02, PERF-03, PERF-04, GRACE-01, GRACE-02, GRACE-03
**Success Criteria** (what must be TRUE):
  1. The job analysis endpoint executes 2-3 database queries instead of 7 — verifiable by enabling D1 query logging and counting statements for a single analysis request
  2. The job listings API returns paginated results with a cursor token — a frontend request for page 2 uses the cursor from page 1, not an offset, and the correct jobs are returned without duplicates
  3. Triggering a job match re-analysis after updating a user profile returns fresh results, not cached results from before the profile change
  4. Uploading a multi-page PDF resume produces a correctly parsed text representation — the parsed output contains full resume content, not garbled binary artifacts from TextDecoder
  5. Connecting LinkedIn when the API returns no profile data shows the user a notification explaining the limitation instead of silently completing with no data imported
**Plans**: 4 plans

Plans:
- [ ] 04-01-PLAN.md — Structured logger utility + PDF parsing with unpdf (GRACE-03, PERF-04)
- [ ] 04-02-PLAN.md — LinkedIn empty data handling + AI response fallback templates (GRACE-01, GRACE-02)
- [ ] 04-03-PLAN.md — N+1 query consolidation + cache invalidation with profile-versioned keys (PERF-01, PERF-03)
- [ ] 04-04-PLAN.md — Cursor-based pagination for job listings (PERF-02)

### Phase 5: Comprehensive Test Suite
**Goal**: All critical paths have automated test coverage that will catch regressions — unit tests for services, integration tests for API routes, component tests for key UI interactions, and E2E tests for the end-to-end signup-to-apply flow
**Depends on**: Phase 4
**Requirements**: TEST-02, TEST-03, TEST-04, TEST-05
**Success Criteria** (what must be TRUE):
  1. Running `npm test` in the backend workspace executes unit tests for auth, resume parsing, and job matching services and all tests pass
  2. Running `npm test` in the backend workspace executes integration tests against all API route handlers using real D1 bindings via vitest-pool-workers and all tests pass
  3. Running `npm test` in the frontend workspace executes component tests for the Profile, Applications, and JobDetail pages and all tests pass
  4. Running `npx playwright test` executes the signup → profile setup → job search → apply flow end-to-end against a running dev server and the flow completes without errors
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Critical Bugs + Test Infrastructure | 3/3 | Complete    | 2026-02-21 |
| 2. Type Safety + Input Validation | 3/3 | Complete    | 2026-02-21 |
| 3. Security + Error Handling | 5/5 | Complete   | 2026-02-21 |
| 4. Performance + Graceful Degradation | 4/4 | Complete    | 2026-02-21 |
| 5. Comprehensive Test Suite | 0/TBD | Not started | - |
