# GetHiredPOC — Job Search Platform

## What This Is

A job search platform built on Cloudflare Workers (Hono backend) and React (Vite frontend) that helps users find jobs, track applications, and leverage AI for resume generation, cover letters, and job matching. The platform is now stabilized with comprehensive test coverage, security hardening, and performance optimizations.

## Core Value

The app must not crash, lose data, or expose users to security vulnerabilities — every core flow (signup, profile, job search, AI features, applications) works reliably for real users.

## Requirements

### Validated

- ✓ User authentication with email/password and session management — existing
- ✓ Job search with filters (title, location, remote) — existing
- ✓ Application tracking with status management — existing
- ✓ User profile with resume upload and parsing — existing
- ✓ AI resume generation via Cloudflare Workers AI — existing
- ✓ AI cover letter generation — existing
- ✓ Job match analysis with 0-100% scoring — existing
- ✓ Smart job recommendations — existing
- ✓ Daily job alert emails via cron — existing
- ✓ LinkedIn OAuth integration (basic profile only) — existing
- ✓ Chat/agent interface with OpenAI GPT-4o-mini — existing
- ✓ Admin dashboard with user and job management — existing
- ✓ Document export (PDF/DOCX) — existing
- ✓ Fix all known bugs (JobDetail crash, status mismatch, race conditions) — v1.0
- ✓ Resolve tech debt (remove `any` types, add proper type definitions) — v1.0
- ✓ Address security vulnerabilities (XSS, file upload validation, input validation) — v1.0
- ✓ Fix performance bottlenecks (N+1 queries, pagination, cache invalidation) — v1.0
- ✓ Add comprehensive test coverage (unit, integration, E2E) — v1.0
- ✓ Improve AI response handling (structured parsing, fallbacks) — v1.0
- ✓ Add proper input validation across API endpoints — v1.0
- ✓ Fix LinkedIn integration to gracefully handle API limitations — v1.0
- ✓ Add error boundaries and user-friendly error handling — v1.0
- ✓ Improve resume PDF parsing with proper library — v1.0

### Active

(None — define next milestone requirements via `/gsd:new-milestone`)

### Out of Scope

- Offline support — low priority, not needed for current state
- Mobile app — web-first, mobile deferred
- Migration away from current hosting (Cloudflare) — infrastructure is fine
- Real-time chat/WebSocket — not part of current architecture
- LinkedIn Partner Program API access — requires external approval

## Context

**Shipped v1.0** on 2026-02-21 with 18,297 LOC TypeScript across 5 phases and 19 plans.

Stack: TypeScript 5.9, Hono 4.7, React 19, Cloudflare Workers/D1/R2/KV, Vite 6, Tailwind CSS 3.4, Vitest (backend + frontend), Playwright (E2E).

**Test coverage:** 93+ backend tests (vitest-pool-workers with real D1), 14 frontend component tests (jsdom + MSW), 1 E2E Playwright spec (signup-to-apply flow).

**Known tech debt (from v1.0 audit):**
- Pagination UI missing — users limited to first 20 jobs (backend supports cursor pagination)
- ErrorBoundary component exists in packages/frontend but no page imports it
- Frontend `updates: any` in hooks/api-client (shared type available, not imported)
- Profile.tsx has 3 raw JSON.parse calls (safeParseJSON not propagated)

## Constraints

- **Platform**: Must stay on Cloudflare Workers ecosystem (D1, R2, KV, AI)
- **Budget**: Free tier — no paid services or infrastructure changes
- **Backwards compatibility**: Existing user data and sessions must not break
- **AI providers**: Open to changing AI approach but must work with Cloudflare AI Gateway

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fix by severity (critical → low) | Maximize stability gains early | ✓ Good — dependency chain worked well |
| Add tests alongside fixes | Prevent regressions, verify fixes work | ✓ Good — 93+ tests now protect all changes |
| Keep LinkedIn integration, add graceful degradation | Can't fix API limits, but can handle them properly | ✓ Good — user notification on limited data |
| PBKDF2 via crypto.subtle replaces bcryptjs | Workers CPU limits, native crypto available | ✓ Good — lazy migration preserves existing users |
| Two parallel utility files (sanitize, password) | rwsdk and packages/backend are separate Worker bundles | ⚠ Revisit — worth extracting shared package |
| vitest-pool-workers for backend tests | Real D1/KV bindings, no mocking needed | ✓ Good — tests run in actual Workers runtime |
| MSW for frontend component tests | Mock API without coupling to implementation | ✓ Good — 14 tests with clean separation |
| Cursor-based pagination over offset | Correct results without duplicates at scale | ✓ Good — backend complete, frontend UI pending |

---
*Last updated: 2026-02-21 after v1.0 milestone*
