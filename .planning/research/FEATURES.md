# Features Research: Production Readiness Stabilization

**Research Date:** 2026-02-20
**Domain:** Job search platform stabilization (Cloudflare Workers + React)
**Confidence:** High — based on codebase audit findings cross-referenced with OWASP, Cloudflare, and Hono production patterns

## Table Stakes

Features that must exist or the app is unreliable for real users.

### Bug Fixes (Critical)

| Feature | Complexity | Dependencies | Notes |
|---------|-----------|--------------|-------|
| Fix JobDetail JSON.parse crash | Low | None | Wrap in try-catch with fallback empty array |
| Fix application status mismatch | Low | None | Align UI status enum with database schema |
| Fix race condition in status updates | Medium | None | Wait for API confirmation before updating local state |

### Security Hardening (Critical)

| Feature | Complexity | Dependencies | Notes |
|---------|-----------|--------------|-------|
| Input validation on all API endpoints | High | Zod library | Use Hono's built-in Zod validator middleware |
| XSS protection on user-generated content | Medium | DOMPurify or sanitization | Sanitize all parsed resume fields before DB storage |
| File upload MIME verification | Medium | None | Validate file headers (magic numbers), not just MIME type |
| Session storage cleanup | Low | None | Add periodic cleanup for expired DB sessions |

### Type Safety (High)

| Feature | Complexity | Dependencies | Notes |
|---------|-----------|--------------|-------|
| Replace `any` types with proper interfaces | Medium | None | Define ParsedResume, JobMatch, ApplicationUpdate types |
| Typed error handling | Low | None | Replace `catch (error: any)` with proper Error types |

### Error Handling (High)

| Feature | Complexity | Dependencies | Notes |
|---------|-----------|--------------|-------|
| AI response parsing robustness | Medium | None | Structured JSON extraction with fallback templates |
| User-friendly error messages | Medium | None | Replace alert() with toast notifications, error boundaries |

## Differentiators

Quality improvements that set the app apart but aren't strictly required to function.

### Testing Infrastructure

| Feature | Complexity | Dependencies | Notes |
|---------|-----------|--------------|-------|
| Unit tests for services (backend) | High | Vitest + vitest-pool-workers | Tests run in actual Workers runtime with D1 bindings |
| Integration tests for API routes | High | Vitest + unstable_dev | Test full request/response cycles |
| Component tests (frontend) | High | Vitest + React Testing Library | Test key user interactions |
| E2E tests for critical flows | Very High | Playwright | Signup → profile → job search → apply flow |

### Performance Optimization

| Feature | Complexity | Dependencies | Notes |
|---------|-----------|--------------|-------|
| Fix N+1 queries in job analysis | Medium | None | Consolidate 7 queries into 2-3 with JOINs |
| Add pagination to job listings | Medium | None | Cursor-based pagination with DB indexes |
| Smart cache invalidation | Medium | None | Include profile modification timestamp in cache key |
| Resume PDF parsing with proper library | Medium | pdf-parse already installed | Wire up pdf-parse instead of TextDecoder |

### Observability

| Feature | Complexity | Dependencies | Notes |
|---------|-----------|--------------|-------|
| Structured logging | Low | None | Replace console.log with consistent format |
| Error tracking with context | Medium | None | Log stack traces, request context, user IDs |

## Anti-Features

Things to deliberately NOT build during this stabilization milestone.

| Anti-Feature | Why Not |
|-------------|---------|
| Fix LinkedIn API limitations | Requires Partner Program access we don't have — add graceful degradation instead |
| Offline support | Low priority for MVP, high complexity |
| New AI providers | Current stack works; optimize parsing, don't swap providers |
| Feature flags infrastructure | Overkill for stabilization; just fix the code |
| Real-time WebSocket features | Not in current architecture, not needed for stability |
| Mobile app | Web-first strategy unchanged |
| Automated deployment pipeline | Not a code quality issue |
| Performance monitoring dashboard | Nice to have, not needed for production readiness |

## Feature Dependencies

```
Bug Fixes ──────────────────────────────────────────> Can test fixes
    │
    ├─> Type Safety ─────────────────────────────────> Enables better validation
    │       │
    │       └─> Input Validation (Zod) ──────────────> Prevents bad data
    │               │
    │               └─> Security Hardening ──────────> XSS relies on validated input
    │
    ├─> Error Handling ──────────────────────────────> Better UX
    │
    └─> Performance Fixes ───────────────────────────> Faster, more reliable

Testing Infrastructure (can start in parallel with bug fixes)
    │
    ├─> Unit tests for services
    ├─> Integration tests for API
    ├─> Component tests for UI
    └─> E2E tests (after bug fixes complete)
```

## Build Order Recommendation

1. **Bug fixes first** — stop the bleeding
2. **Type safety + validation** — prevent new bugs
3. **Security hardening** — protect users
4. **Performance fixes** — improve experience
5. **Testing infrastructure** — prevent regressions (can overlap with 1-4)
6. **E2E tests** — verify everything works together

---

*Research sources: Cloudflare Workers docs, Hono validation middleware, OWASP Input Validation Cheat Sheet, vitest-pool-workers, Zod documentation*
