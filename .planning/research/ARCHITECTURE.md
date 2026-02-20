# Architecture Research: Production Readiness Stabilization

**Research Date:** 2026-02-20
**Domain:** Stabilization architecture for Cloudflare Workers (Hono) + React (Vite) app
**Confidence:** High — based on official Cloudflare, Hono, and Zod documentation

## Architecture Overview

How testing, validation, error handling, and security integrate into the existing service-oriented architecture.

### Layered Request Flow (with new stabilization layers)

```
Browser Request
    │
    ▼
┌─────────────────────────────────┐
│  Hono App (index.ts)            │
│  ┌───────────────────────────┐  │
│  │ 1. CORS Middleware        │  │  ← existing
│  │ 2. Security Headers       │  │  ← NEW: secureHeaders()
│  │ 3. Auth Middleware         │  │  ← existing (requireAuth)
│  │ 4. Validation Middleware   │  │  ← NEW: zValidator()
│  │ 5. Route Handler          │  │  ← existing
│  │ 6. Service Layer           │  │  ← existing
│  │ 7. Database/Storage/AI     │  │  ← existing
│  └───────────────────────────┘  │
│  Global Error Handler           │  ← IMPROVED: typed errors
└─────────────────────────────────┘
    │
    ▼
JSON Response (with proper error format)
```

## Component Boundaries

| Component | Responsibility | Communicates With | New/Existing |
|-----------|---------------|-------------------|-------------|
| Security Headers Middleware | CSP, HSTS, X-Frame-Options | All responses | NEW |
| Validation Middleware (Zod) | Request body/query validation | Route handlers | NEW |
| Typed Error Classes | Consistent error types | Route handlers, services | NEW |
| Error Handler (global) | Convert typed errors to JSON | All routes | IMPROVED |
| React Error Boundaries | Catch component crashes | Per-domain UI sections | NEW |
| Backend Test Suite | Service + route testing | vitest-pool-workers + D1 | NEW |
| Frontend Test Suite | Component + hook testing | Vitest + React Testing Library | NEW |
| E2E Test Suite | Full user flow testing | Playwright | NEW |

## Data Flow Patterns

### Normal Request/Response (with validation)

```
Client POST /api/profile
    │
    ▼
Auth Middleware ─── unauthorized? ──→ 401 JSON error
    │ (authenticated)
    ▼
zValidator(body, ProfileSchema) ─── invalid? ──→ 400 JSON error with field details
    │ (valid, typed)
    ▼
Route Handler (typed body: ProfileUpdate)
    │
    ▼
Service Layer (db.service.ts)
    │
    ▼
D1 Database
    │
    ▼
200 JSON response
```

### File Upload (with magic byte validation)

```
Client POST /api/resume-upload (FormData)
    │
    ▼
Auth Middleware
    │
    ▼
Route Handler extracts file
    │
    ▼
storage.service.ts:
  1. Check MIME type (user-provided, untrusted)
  2. Read first 4-8 bytes (magic numbers)        ← NEW
  3. Validate magic bytes match claimed type       ← NEW
  4. If PDF: verify starts with %PDF-
  5. If DOCX: verify starts with PK (ZIP header)
  6. Reject mismatches → 400 error
    │ (validated)
    ▼
Resume parsing (pdf-parse for PDF, TextDecoder for text)
    │
    ▼
AI extraction → Sanitize output fields            ← NEW
    │
    ▼
Save to D1 + R2
```

### Error Propagation

```
Service throws TypedError
    │
    ▼
Route handler catch block
    │
    ▼
handleRouteError(error, c):
  ├─ NotFoundError     → 404 { error: message }
  ├─ ValidationError   → 400 { error: message, fields: {...} }
  ├─ ForbiddenError    → 403 { error: message }
  ├─ ConflictError     → 409 { error: message }
  └─ Unknown           → 500 { error: "Internal server error" }
    │
    ▼
Structured log: { level, error_type, message, user_id, path, timestamp }
```

## Patterns to Follow

### 1. Zod Validation at Route Entry

Use `@hono/zod-validator` — integrates directly with Hono middleware chain:

```typescript
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

auth.post('/signup', zValidator('json', signupSchema), async (c) => {
  const { email, password } = c.req.valid('json') // fully typed, validated
  // ...
})
```

### 2. Centralized Typed Error Classes

```typescript
// packages/backend/src/lib/errors.ts
export class AppError extends Error {
  constructor(public statusCode: number, message: string) { super(message) }
}
export class NotFoundError extends AppError { constructor(m: string) { super(404, m) } }
export class ValidationError extends AppError { constructor(m: string) { super(400, m) } }
export class ForbiddenError extends AppError { constructor(m: string) { super(403, m) } }
```

### 3. Magic Byte File Validation (Workers-native)

```typescript
const MAGIC_BYTES: Record<string, number[]> = {
  'application/pdf': [0x25, 0x50, 0x44, 0x46],  // %PDF
  'application/vnd.openxmlformats-officedocument': [0x50, 0x4B, 0x03, 0x04],  // PK (ZIP)
}
```

No DOM required — works in Workers runtime.

### 4. React Error Boundaries Per Domain

```
<ErrorBoundary fallback={<ProfileError />}>
  <Profile />
</ErrorBoundary>

<ErrorBoundary fallback={<ApplicationsError />}>
  <Applications />
</ErrorBoundary>
```

### 5. Backend Testing with vitest-pool-workers

Tests run in actual Workers runtime with real D1 bindings:

```typescript
// vitest.config.ts (backend)
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.toml' },
        miniflare: { d1Databases: ['DB'] }
      }
    }
  }
})
```

### 6. Frontend Testing with Vitest + React Testing Library

Shares Vite config — no separate bundler needed.

### 7. Hono secureHeaders() Middleware

```typescript
import { secureHeaders } from 'hono/secure-headers'
app.use('*', secureHeaders())
```

## Anti-Patterns to Avoid

| Anti-Pattern | Why | Do Instead |
|-------------|-----|------------|
| Validate inside handler body | Repetitive, error-prone, untyped | Use zValidator() middleware |
| Test against real Cloudflare services | Slow, flaky, costs money | Use vitest-pool-workers with miniflare |
| DOMPurify in Workers | No DOM available, fails at deploy | Use string-based sanitization or allowlist |
| Catch-all `error: any` → 400 | Hides server errors as client errors | Use typed error classes with correct status codes |
| Optimistic UI without rollback | Creates inconsistent state on failure | Wait for API confirmation or implement proper rollback |

## Build Order (Dependency Chain)

```
Phase 1: Bug Fixes
  └─ Fix crashes, status mismatches, race conditions
  └─ No dependencies — can start immediately

Phase 2: Type Safety + Validation Layer
  └─ Define proper types (replaces `any`)
  └─ Add Zod schemas + zValidator middleware
  └─ Depends on: Bug fixes (so we're not validating broken code)

Phase 3: Error Handling + Security
  └─ Typed error classes + global handler
  └─ Security headers, XSS sanitization, file validation
  └─ React error boundaries
  └─ Depends on: Validation layer (errors reference validated types)

Phase 4: Performance
  └─ N+1 query consolidation, pagination, cache fix
  └─ Depends on: Type safety (queries use proper types)

Phase 5: Testing
  └─ Unit tests for services, integration tests for routes
  └─ Component tests, E2E tests
  └─ Can overlap with phases 1-4 (test as you fix)
```

## File Location Map

| New File/Change | Package | Location |
|----------------|---------|----------|
| Zod schemas | backend | `packages/backend/src/schemas/` |
| Typed errors | backend | `packages/backend/src/lib/errors.ts` |
| Error handler helper | backend | `packages/backend/src/lib/error-handler.ts` |
| Security headers | backend | `packages/backend/src/index.ts` (middleware) |
| File validation | backend | `packages/backend/src/services/storage.service.ts` |
| Sanitization utils | backend | `packages/backend/src/lib/sanitize.ts` |
| Backend test config | backend | `packages/backend/vitest.config.ts` |
| Backend tests | backend | `packages/backend/src/__tests__/` |
| Error boundaries | frontend | `packages/frontend/src/components/ErrorBoundary.tsx` |
| Frontend test config | frontend | `packages/frontend/vitest.config.ts` |
| Frontend tests | frontend | `packages/frontend/src/__tests__/` |
| E2E tests | root | `e2e/` |
| E2E config | root | `playwright.config.ts` |
| Shared types (updated) | shared | `packages/shared/src/types/` |

---

*Research sources: Cloudflare Workers Vitest Integration, Hono Validation Guide, Hono Secure Headers, @hono/zod-validator, Zod v4, DOMPurify docs*
