# Stack Research: Production Readiness Stabilization

**Research Date:** 2026-02-20
**Domain:** Testing, validation, security, and production readiness tooling for Cloudflare Workers + React
**Confidence:** High — versions verified against npm registry and official docs (Feb 2026)

## Critical Version Constraints

| Constraint | Details | Source |
|-----------|---------|--------|
| Vitest must be `~3.2.x` | `@cloudflare/vitest-pool-workers` v0.12.x does NOT support Vitest 4.x | Cloudflare docs + GitHub issue #11064 |
| Zod must be `^3.25.x` | `@hono/zod-validator` v0.7.6 has unresolved Zod 4 compatibility bug (issue #1148) | hono/middleware GitHub |
| @testing-library/react must be `^16.x` | v16+ required for React 19 support | RTL changelog |

## Recommended Stack

### Backend Testing

| Tool | Version | Purpose | Confidence |
|------|---------|---------|-----------|
| vitest | `~3.2.x` | Test runner (Workers-compatible) | HIGH |
| @cloudflare/vitest-pool-workers | `0.12.x` | Run tests in actual Workers runtime with D1/KV | HIGH |

**Configuration pattern:**
```typescript
// packages/backend/vitest.config.ts
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.toml' },
        miniflare: {
          d1Databases: ['DB'],
          kvNamespaces: ['KV_CACHE', 'KV_SESSIONS'],
        }
      }
    }
  }
})
```

Tests run in real V8 isolate with actual D1 bindings — no mocking the runtime.

### Frontend Testing

| Tool | Version | Purpose | Confidence |
|------|---------|---------|-----------|
| vitest | `~3.2.x` | Test runner (shared with backend) | HIGH |
| @testing-library/react | `^16.3.2` | React 19 component testing | HIGH |
| jsdom | `^26.x` | Browser environment for tests | HIGH |
| msw | `^2.12.10` | Mock API responses in tests | HIGH |

### E2E Testing

| Tool | Version | Purpose | Confidence |
|------|---------|---------|-----------|
| @playwright/test | `^1.58.2` | Full browser E2E tests | HIGH |

Use Playwright's `webServer` config to start both backend and frontend for E2E runs.

### Input Validation

| Tool | Version | Purpose | Confidence |
|------|---------|---------|-----------|
| zod | `^3.25.x` | Schema validation (NOT v4) | HIGH |
| @hono/zod-validator | `^0.7.6` | Hono middleware integration | HIGH |

**Usage pattern — replaces `any` types:**
```typescript
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

route.post('/endpoint', zValidator('json', schema), async (c) => {
  const body = c.req.valid('json') // fully typed, no `any`
})
```

### Security

| Tool | Version | Purpose | Confidence |
|------|---------|---------|-----------|
| hono/secure-headers | built-in | CSP, X-Frame-Options, HSTS, referrer policy | HIGH |
| react-error-boundary | `^6.0.0` | Catch React component crashes gracefully | HIGH |

**Security headers — zero install, built into Hono 4.7:**
```typescript
import { secureHeaders } from 'hono/secure-headers'
app.use('*', secureHeaders())
```

**File upload validation — no library needed:**
Magic number byte inspection is ~5 lines of inline TypeScript. The `file-type` npm package requires Node.js stream APIs that don't work in Workers' V8 isolate.

### XSS Sanitization

For Workers (no DOM): use string-based HTML entity encoding at write time. DOMPurify requires DOM — use it only on the frontend if needed.

### Password Hashing

Keep `bcryptjs` for now but profile CPU usage in Workers. If it exceeds 50ms CPU limit, switch to Web Crypto API `PBKDF2` which is native to Workers.

## What NOT to Use

| Tool | Why Not |
|------|---------|
| Jest | Doesn't support Workers runtime; Vitest is the Cloudflare standard |
| Cypress | Slower than Playwright, worse Workers integration |
| Enzyme | Dead project, doesn't support React 19 |
| helmet | Express-only; Hono has built-in `secureHeaders` |
| Vitest 4.x | Incompatible with @cloudflare/vitest-pool-workers |
| Zod 4.x | Incompatible with @hono/zod-validator (issue #1148) |
| @types/node | Workers aren't Node.js; use @cloudflare/workers-types |
| file-type npm | Requires Node.js streams, fails in Workers V8 isolate |
| DOMPurify (backend) | No DOM in Workers; use string-based sanitization |

## Installation Commands

**Backend (packages/backend):**
```bash
npm install zod @hono/zod-validator
npm install -D vitest@~3.2.0 @cloudflare/vitest-pool-workers@~0.12.0
```

**Frontend (packages/frontend):**
```bash
npm install react-error-boundary
npm install -D vitest@~3.2.0 @testing-library/react@^16.3.2 @testing-library/jest-dom jsdom msw@^2.12.10
```

**Root (E2E):**
```bash
npm install -D @playwright/test@^1.58.2
npx playwright install chromium
```

---

*Research sources: Cloudflare Workers Vitest docs, Hono validation guide, @hono/zod-validator GitHub, Playwright docs, Cloudflare Workers rate limiting API, vitest-pool-workers GitHub issues*
