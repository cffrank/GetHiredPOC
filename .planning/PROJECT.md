# GetHiredPOC — Stabilization & Production Readiness

## What This Is

A job search platform built on Cloudflare Workers (Hono backend) and React (Vite frontend) that helps users find jobs, track applications, and leverage AI for resume generation, cover letters, and job matching. This milestone focuses on resolving all known issues from the codebase audit to make the app production-ready.

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

### Active

- [ ] Fix all known bugs (JobDetail crash, status mismatch, race conditions)
- [ ] Resolve tech debt (remove `any` types, add proper type definitions)
- [ ] Address security vulnerabilities (XSS, file upload validation, input validation)
- [ ] Fix performance bottlenecks (N+1 queries, pagination, cache invalidation)
- [ ] Add comprehensive test coverage (unit, integration, E2E)
- [ ] Improve AI response handling (structured parsing, fallbacks)
- [ ] Add proper input validation across API endpoints
- [ ] Fix LinkedIn integration to gracefully handle API limitations
- [ ] Add error boundaries and user-friendly error handling
- [ ] Improve resume PDF parsing with proper library

### Out of Scope

- Offline support — low priority, not needed for MVP launch
- New features or capabilities — this milestone is fixes only
- Mobile app — web-first, mobile deferred
- Migration away from current hosting (Cloudflare) — infrastructure is fine
- Real-time chat/WebSocket — not part of current architecture

## Context

The app was built through iterative phases (1-7) and has accumulated tech debt and bugs identified in a comprehensive codebase audit (`.planning/codebase/CONCERNS.md`). The audit covers:

- **3 known bugs** (JobDetail crash, status mismatch, race condition)
- **5 tech debt items** (any types, PDF parsing, LinkedIn limits, fragile JSON parsing, weak validation)
- **4 security concerns** (session mismatch, file upload, XSS, OAuth timeout)
- **4 performance bottlenecks** (N+1 queries, AI latency, cache invalidation, no pagination)
- **4 fragile areas** (Profile state, regex parsing, status validation, LinkedIn integration)
- **Zero test coverage** across all critical paths

Stack: TypeScript 5.9, Hono 4.7, React 19, Cloudflare Workers/D1/R2/KV, Vite 6, Tailwind CSS 3.4.

## Constraints

- **Platform**: Must stay on Cloudflare Workers ecosystem (D1, R2, KV, AI)
- **Budget**: Free tier — no paid services or infrastructure changes
- **Backwards compatibility**: Existing user data and sessions must not break
- **AI providers**: Open to changing AI approach but must work with Cloudflare AI Gateway

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fix by severity (critical → low) | Maximize stability gains early | — Pending |
| Add tests alongside fixes | Prevent regressions, verify fixes work | — Pending |
| Keep LinkedIn integration, add graceful degradation | Can't fix API limits, but can handle them properly | — Pending |
| Open to AI provider changes | Current Llama 3.1 8B may not be best for structured output | — Pending |

---
*Last updated: 2026-02-20 after initialization*
