# Project Research Summary

**Project:** GetHired POC — Production Readiness Stabilization
**Domain:** Job search platform (Cloudflare Workers + Hono + React 19 + D1)
**Researched:** 2026-02-20
**Confidence:** HIGH

## Executive Summary

This project is a functioning job search platform that needs hardening before it can be trusted in production. The codebase has identifiable, concrete problems — crashing JSON.parse calls, unvalidated API inputs, type-unsafe `any` casts, race conditions in UI state, and zero automated test coverage — rather than architectural rot. The recommended approach is a disciplined stabilization sequence: fix crashes first, then layer in type safety and input validation, then security hardening, then performance, with testing built incrementally alongside each phase rather than bolted on at the end.

The technology choices are already made and correct. Cloudflare Workers + Hono + D1 is a well-supported stack, and the tools needed for stabilization (Zod, vitest-pool-workers, Playwright, Hono's built-in secureHeaders) are mature and well-documented. The primary risk is version incompatibility: Vitest must stay at `~3.2.x` (not 4.x) and Zod must stay at `^3.25.x` (not 4.x) due to confirmed bugs in their respective integration libraries. Installing the wrong versions will silently break things that appear to work in development.

The second major risk is attempting bug fixes without first establishing a test harness. With zero current test coverage and heavily stateful frontend components (Profile.tsx has 11 useState calls), any fix made without a failing test is as fragile as the original bug. The sequence matters: test infrastructure should be started in Phase 1 alongside bug fixes, not deferred to the end. By Phase 5 there should be confidence from test coverage, not just manual verification.

## Key Findings

### Recommended Stack

The stabilization adds targeted libraries to the existing stack rather than replacing anything. Backend testing requires `vitest ~3.2.x` with `@cloudflare/vitest-pool-workers 0.12.x` — this is the only way to test Hono routes and D1 service calls against the real Workers runtime without mocking the platform. Frontend testing uses the same Vitest version with `@testing-library/react ^16.3.2` (React 19 support required v16+) and `msw ^2.12.10` for API mocking. E2E uses `@playwright/test ^1.58.2`. Input validation uses `zod ^3.25.x` with `@hono/zod-validator ^0.7.6`. Security headers come free from Hono's built-in `secureHeaders()` — no additional library required.

**Core technologies:**
- `vitest ~3.2.x`: Test runner — pinned version required, v4 incompatible with Workers pool
- `@cloudflare/vitest-pool-workers 0.12.x`: Run backend tests in real V8 isolate with D1/KV bindings
- `@testing-library/react ^16.3.2`: Component testing — v16+ needed for React 19
- `msw ^2.12.10`: Mock service worker for frontend API stubs
- `@playwright/test ^1.58.2`: E2E testing for critical user flows
- `zod ^3.25.x`: Schema validation — pinned to v3, v4 breaks @hono/zod-validator
- `@hono/zod-validator ^0.7.6`: Hono middleware integration for typed request validation
- `hono/secure-headers` (built-in): CSP, HSTS, X-Frame-Options — zero additional install
- `react-error-boundary ^6.0.0`: Graceful React component crash containment

### Expected Features

The stabilization scope is tightly bounded. There are no new user-facing features — only reliability, security, and testability improvements to what already exists.

**Must have (table stakes):**
- Fix JobDetail JSON.parse crash — uncaught exceptions break the page entirely
- Fix application status mismatch — UI enum vs DB schema misalignment causes incorrect display
- Fix race condition in status updates — optimistic UI without rollback creates inconsistent state
- Input validation on all API endpoints — currently accepts arbitrary payloads
- XSS protection on AI-parsed resume fields — user-uploaded content stored unescaped
- File upload MIME/magic-byte verification — MIME type alone is trivially spoofed
- Session storage cleanup — expired sessions accumulate in D1 with no cleanup
- Replace `any` types with proper interfaces — `ParsedResume`, `JobMatch`, `ApplicationUpdate`
- Typed error handling — `catch (error: any)` hides root cause on all error paths
- Robust AI response parsing — structured extraction with fallback when AI returns malformed JSON
- User-friendly error messages — replace `alert()` with toast notifications and error boundaries

**Should have (differentiators):**
- Unit tests for backend services (vitest-pool-workers)
- Integration tests for API routes
- Component tests for key UI interactions
- E2E tests for the signup → profile → job search → apply flow
- N+1 query fix in job analysis (7 queries → 2-3 JOINs)
- Cursor-based pagination on job listings
- Smart cache invalidation keyed on profile `updated_at`
- Wire up pdf-parse (already installed, not wired) instead of TextDecoder for PDFs
- Structured logging replacing ad-hoc console.log calls

**Defer (v2+):**
- LinkedIn API limitations (requires Partner Program access not currently held)
- Offline support (high complexity, low MVP priority)
- New AI providers (parsing optimization is the real fix, not swapping models)
- Real-time WebSocket features
- Performance monitoring dashboard
- Automated deployment pipeline
- Feature flags infrastructure

### Architecture Approach

The existing service-oriented architecture is sound. Stabilization adds layers to the existing Hono middleware chain rather than restructuring it. The new middleware order is: CORS (existing) → secureHeaders (new) → auth (existing) → zValidator (new) → route handler (existing) → service layer (existing) → D1/R2/AI (existing), with a global typed error handler replacing the current catch-all. React error boundaries wrap per-domain UI sections to contain component crashes. Backend tests run in real Workers runtime via miniflare — no platform mocking.

**Major components:**
1. Security Headers Middleware — CSP, HSTS, X-Frame-Options applied globally via `secureHeaders()`
2. Validation Middleware (Zod) — per-route request schema validation replacing manual checks
3. Typed Error Classes — `NotFoundError`, `ValidationError`, `ForbiddenError`, `ConflictError` → consistent HTTP status codes
4. React Error Boundaries — per-domain crash containment (Profile, Applications, JobSearch)
5. Backend Test Suite — vitest-pool-workers with miniflare providing real D1 bindings
6. Frontend Test Suite — Vitest + React Testing Library + MSW for isolated component tests
7. E2E Test Suite — Playwright covering the critical happy path and error flows
8. File Validation Layer — ArrayBuffer magic-byte inspection in storage.service.ts before any text decoding

### Critical Pitfalls

1. **bcryptjs exceeds Workers CPU limit** — Benchmark current password hashing. If it hits the 50ms CPU limit, replace with Web Crypto API PBKDF2 or `bcrypt-edge`. Silent 500 errors on auth routes are the symptom.

2. **Fixing bugs without tests creates new fragile code** — The stated goal is stabilization, not just patching. Every bug fix needs a failing test first. With 11 useState calls in Profile.tsx and zero current coverage, regression risk without tests is high.

3. **Hono defaultHook doesn't propagate to sub-routers** — The `defaultHook` for validation error formatting must be defined on each sub-router (auth.ts, jobs.ts, profile.ts) individually, or via a shared factory function. A single global hook won't reach mounted routes.

4. **Magic byte validation must precede text decoding** — File content must be read as ArrayBuffer first, magic bytes checked, then passed to pdf-parse or TextDecoder. Doing it in reverse corrupts the binary headers and makes validation unreliable.

5. **Status enum fix can break live D1 data** — Before changing the status constraint, run `SELECT DISTINCT status FROM applications` to audit actual stored values. Normalize existing data in a migration before adding constraints, or deployed rows with old values will crash.

6. **Zod schemas too strict on retrofit** — Auditing actual frontend request shapes before writing schemas prevents rejecting traffic that was previously accepted. Start with `.passthrough()`, tighten incrementally.

## Implications for Roadmap

Based on combined research, the dependency chain is clear and the phases should follow it strictly.

### Phase 1: Critical Bug Fixes + Test Infrastructure Bootstrap

**Rationale:** Stop the crashes first — these are production blockers. Set up the test runner simultaneously so fixes are written test-first from the beginning, not patched and hoped for.
**Delivers:** A crash-free, minimally-safe application with a working test harness.
**Addresses:** JobDetail crash, status mismatch, race condition, vitest-pool-workers setup, backend test config.
**Avoids:** Pitfall #2 (fix without tests) by establishing infrastructure before the first fix lands. Pitfall #5 (status enum live data) by auditing D1 before touching schema.

### Phase 2: Type Safety + Input Validation Layer

**Rationale:** Typed interfaces and Zod schemas are the foundation that all subsequent security and error handling work depends on. You can't write correct typed error classes if the request types are `any`.
**Delivers:** All `any` eliminated from request/response paths; every API endpoint validates its inputs with Zod schemas; typed error classes in place.
**Uses:** `zod ^3.25.x`, `@hono/zod-validator ^0.7.6`.
**Implements:** Validation middleware layer in the Hono chain; shared types in `packages/shared/src/types/`.
**Avoids:** Pitfall #3 (defaultHook propagation) by designing per-router validation from the start. Pitfall #6 (schemas too strict) by auditing frontend request shapes first.

### Phase 3: Security Hardening + Error Handling

**Rationale:** Security work depends on the validation layer being in place (XSS protection needs to know what fields exist; error handling needs typed errors). This phase closes the security surface.
**Delivers:** Global security headers; XSS sanitization on AI-parsed fields; magic-byte file validation; bcryptjs profiled and replaced if needed; global typed error handler; React error boundaries.
**Addresses:** Input validation, XSS protection, file upload MIME verification, session cleanup, user-friendly errors.
**Avoids:** Pitfall #1 (bcryptjs CPU) by profiling and switching to PBKDF2 if needed. Pitfall #4 (magic byte order) by reading ArrayBuffer before TextDecoder. Pitfall #7 (DOMPurify in Workers) by using string-based sanitization on the backend.

### Phase 4: Performance Optimization

**Rationale:** Performance fixes (query consolidation, pagination, cache invalidation) depend on correct types being in place. These are reliability improvements, not crashes, so they come after security is sealed.
**Delivers:** N+1 queries eliminated; cursor-based pagination on job listings; cache invalidation keyed on profile timestamp; pdf-parse wired correctly.
**Addresses:** Fix N+1 queries, add pagination, smart cache invalidation, resume PDF parsing.
**Avoids:** Pitfall (cache sub-profile writes) by ensuring all profile-related table mutations bump `profiles.updated_at`. Pitfall (pagination breaking frontend) by returning metadata alongside results with backward-compatible large page defaults.

### Phase 5: Comprehensive Testing

**Rationale:** By this phase, the codebase is stable and correct. Write the full test suite to lock in the fixed behavior and prevent regressions. E2E tests come last because they require a fully functional system.
**Delivers:** Unit tests for all services; integration tests for all API routes; component tests for key UI interactions; Playwright E2E for the critical flow.
**Addresses:** All testing infrastructure features. bcryptjs profiled in test environment.
**Avoids:** Pitfall #8 (over-testing low-value code) by following risk-priority order: auth flows → AI parsing → data mutations → API routes → UI components → layout.

### Phase Ordering Rationale

- Bug fixes must come before validation to avoid validating broken code paths.
- Type safety must precede security because security work (error classes, XSS field targeting) references the types.
- Security must precede performance because a faster-but-insecure app ships vulnerabilities.
- E2E tests must come after all other fixes are in place — they test the full stack integration.
- Test infrastructure bootstraps in Phase 1 so that every subsequent phase can write tests alongside the work, not as a separate concern.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (bcryptjs):** Benchmark actual CPU usage in the specific Workers environment before committing to PBKDF2 migration — the threshold varies by tier and work factor.
- **Phase 3 (XSS sanitization):** The specific fields returned by the AI parser need to be audited to determine which require sanitization vs which are safe structured data.
- **Phase 4 (pagination):** Cursor-based pagination with D1 requires careful index design — needs query plan review to confirm indexes are used.

Phases with standard patterns (skip research-phase):
- **Phase 1 (bug fixes):** All three bugs have clear, documented fixes — JSON try-catch, enum alignment, optimistic UI rollback.
- **Phase 2 (Zod validation):** Pattern is well-documented in Hono's official guide; only unknown is existing request shapes, resolved by auditing frontend code.
- **Phase 5 (testing):** vitest-pool-workers, RTL, and Playwright patterns are all officially documented with examples.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified against npm registry and confirmed GitHub issues for version constraints |
| Features | HIGH | Derived from direct codebase audit (CONCERNS.md cross-referenced with source files) |
| Architecture | HIGH | All patterns from official Cloudflare, Hono, and Zod documentation |
| Pitfalls | HIGH | All critical pitfalls confirmed in official docs or multiple GitHub issues |

**Overall confidence:** HIGH

### Gaps to Address

- **bcryptjs CPU measurement:** Current cost factor unknown. Must benchmark in actual Workers environment before deciding whether to replace. Handle in Phase 3 planning.
- **Actual request shapes:** Frontend API call shapes need code audit before Zod schemas are written. Prevents breaking existing functionality with over-strict validation. Handle at start of Phase 2.
- **D1 existing status values:** The actual distinct status values in the live database are unknown until audited. Handle at start of Phase 1 before touching status code.
- **AI parser output fields:** Need to identify exactly which fields in the AI response are user-influenced and require XSS sanitization vs which are safe structured fields. Handle during Phase 3 planning.

## Sources

### Primary (HIGH confidence)
- Cloudflare Workers Vitest Integration docs — vitest-pool-workers setup and version constraints
- Hono validation guide — zValidator middleware and defaultHook limitation
- `@hono/zod-validator` GitHub issue #1148 — confirmed Zod 4 incompatibility
- Hono GitHub issues #2520, #1306, #773 — confirmed defaultHook sub-router limitation
- `vitest-pool-workers` GitHub issue #11064 — confirmed Vitest 4 incompatibility
- @testing-library/react changelog — confirmed v16+ requirement for React 19
- Playwright official docs — webServer config for full-stack E2E

### Secondary (MEDIUM confidence)
- OWASP Input Validation Cheat Sheet — XSS prevention and file upload validation patterns
- Cloudflare community forums — bcryptjs CPU limit reports with measurements
- Codebase audit (CONCERNS.md + source files) — current bug inventory and type safety gaps

### Tertiary (LOW confidence)
- D1 existing data status values — unknown until runtime audit; assumption based on schema mismatch noted in CONCERNS.md

---
*Research completed: 2026-02-20*
*Ready for roadmap: yes*
