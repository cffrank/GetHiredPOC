# Phase 2: Type Safety + Input Validation - Research

**Researched:** 2026-02-20
**Domain:** TypeScript type safety, Zod schema validation, Hono middleware
**Confidence:** HIGH

---

## Summary

Phase 2 targets six requirements across two domains: eliminating `any` types from API handler files (TYPE-01 through TYPE-03) and adding Zod-based request validation to all endpoints (VALID-01 through VALID-03). The codebase already has a `@gethiredpoc/shared` package that exports named interfaces for API shapes — the gap is that neither `ParsedResume`, `JobMatch`, nor `ApplicationUpdate` live there yet, and none of the route handlers validate incoming request bodies before accessing fields.

The `any` problem is pervasive: 72 occurrences of `: any` in backend route files alone, with every `catch` block using `catch (error: any)`. The fix is mechanical: replace `c: any` in local `requireAuth` helpers with `Context<{Bindings: Env}>`, replace `updates: any` with the existing `UpdateApplicationRequest`/`UpdateProfileRequest` interfaces from shared, and replace `catch (error: any)` with `catch (error: unknown)` + `instanceof Error` narrowing. None of these changes touch business logic.

For validation, `@hono/zod-validator` 0.7.6 (as required by VALID-02) is not yet in the project — it must be installed alongside `zod`. The validator integrates as route-level middleware via `zValidator('json', schema, hook)`, running before the handler and returning 400 on failure. The hook callback gives access to `result.error.errors` (a Zod error array with `path`, `code`, and `message` per field), enabling the structured field-level error response required by VALID-03.

**Primary recommendation:** Install `zod@^3` and `@hono/zod-validator`, write one Zod schema per request type (mirroring the existing TypeScript interfaces in shared), wire them as middleware on the 7 POST/PUT/PATCH routes that accept a JSON body, and replace `catch (error: any)` with `catch (error: unknown)` throughout.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TYPE-01 | All `any` types in API handlers replaced with proper TypeScript interfaces | Hono `Context<{Bindings: Env}>` type replaces `c: any`; existing shared interfaces replace `updates: any` and `params: any[]`; `Ai` class from `@cloudflare/workers-types` replaces `AI: any` in `Env` |
| TYPE-02 | `ParsedResume`, `JobMatch`, and `ApplicationUpdate` types defined in shared package | `ParsedResume` already defined in `resume.service.ts` (backend only); `JobMatch` already defined in `job-matching.service.ts` (backend only); neither is in `@gethiredpoc/shared` yet; `ApplicationUpdate` does not exist as a named type — it is inlined as `updates: any` |
| TYPE-03 | Error catch blocks use typed error handling instead of `catch (error: any)` | 77 `catch (error: any)` occurrences across backend; pattern: `catch (error: unknown) { if (error instanceof Error) ... }` or helper `toErrorMessage(e: unknown): string` |
| VALID-01 | All API endpoints validate request bodies with Zod schemas | `@hono/zod-validator` adds schema validation as route middleware; 7 routes accept JSON body: `POST /auth/signup`, `POST /auth/login`, `POST /applications`, `PUT /applications/:id`, `PATCH /applications/:id`, `PUT /profile`, `PATCH /profile` |
| VALID-02 | `@hono/zod-validator` middleware integrated into all route handlers | Install `@hono/zod-validator@^0.7.6` and `zod@^3`; wire `zValidator('json', schema, hook)` before handler function |
| VALID-03 | Validation errors return structured field-level error details with HTTP 400 | Use the hook callback: `(result, c) => { if (!result.success) return c.json({ error: 'Validation failed', issues: result.error.errors }, 400) }` |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zod | ^3.x (not v4) | Request body schema definitions | @hono/zod-validator 0.7.6 was built against zod v3; zod v4 compatibility was merged May 2025 in middleware but the released package is 0.7.6 from ~2 months ago — safest choice is zod v3 until a new @hono/zod-validator release confirms v4 support |
| @hono/zod-validator | ^0.7.6 | Hono middleware for Zod validation | Required by VALID-02; official Hono ecosystem package; integrates with Hono's context type system |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @cloudflare/workers-types | ^4.20250110.0 (already installed in backend devDeps) | Provides typed `Ai` class for `Env.AI` | Replace `AI: any` in `Env` interface with `Ai` from workers-types |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| zod | valibot | Valibot has smaller bundle but no existing @hono/valibot-validator in VALID-02 spec; requirement explicitly names zod |
| zod v3 | zod v4 | v4 is 14x faster parsing but @hono/zod-validator 0.7.6 compatibility is uncertain; v4 changes import paths and some API surface; use v3 to reduce risk |
| instanceof Error guard | custom assertIsError | Both work; `instanceof Error` is simpler for this codebase's needs |

**Installation:**
```bash
# In packages/backend
npm install zod@^3 @hono/zod-validator --workspace=packages/backend
```

---

## Architecture Patterns

### Current State — What Needs Changing

**Files with `c: any` local requireAuth helpers (duplicated pattern):**
- `packages/backend/src/routes/applications.ts` line 21
- `packages/backend/src/routes/profile.ts` line 14
- `packages/backend/src/routes/jobs.ts` lines 22, 29
- `packages/backend/src/routes/chat.ts` line 20

Note: A properly typed `requireAuth` already exists in `packages/backend/src/middleware/auth.middleware.ts` using `Context<{ Bindings: Env }>`. These route-local copies should be deleted and replaced with the middleware import.

**Files with `updates: any = {}`:**
- `packages/backend/src/routes/applications.ts` lines 77, 116
- `packages/backend/src/routes/profile.ts` lines 47, 130, 86 (`params: any[]`)

**Missing shared types (TYPE-02):**
- `ParsedResume` — defined in `packages/backend/src/services/resume.service.ts`, not exported from shared
- `JobMatch` — defined in `packages/backend/src/services/job-matching.service.ts`, not exported from shared
- `ApplicationUpdate` — does not exist as a named type anywhere; inlined as `updates: any`

**AI binding type (TYPE-01):**
- `packages/backend/src/services/db.service.ts` line 8: `AI: any;`
- Fix: `import type { Ai } from '@cloudflare/workers-types'` then `AI: Ai;`

**Services with `any` (TYPE-01 scope — handler files only per requirement wording, but services touch it too):**
- `job-matching.service.ts`: `userProfile: any, job: any` — can be typed with new shared types
- `ai-resume.service.ts`: `userProfile: any, job: any`
- `ai-cover-letter.service.ts`: `userProfile: any, job: any`
- `resume.service.ts`: `getUserResumes` returns `Promise<any[]>` — needs `ResumeRecord` type

### Recommended Project Structure

```
packages/
├── shared/
│   └── src/
│       ├── index.ts          # Add exports for ParsedResume, JobMatch, ApplicationUpdate
│       └── types/
│           ├── api.ts        # Existing; ApplicationUpdate interface goes here
│           ├── resume.ts     # NEW: ParsedResume, ResumeRecord types
│           └── job-match.ts  # NEW: JobMatch type
├── backend/
│   └── src/
│       ├── schemas/          # NEW directory: Zod schemas per route group
│       │   ├── auth.schema.ts
│       │   ├── applications.schema.ts
│       │   └── profile.schema.ts
│       ├── routes/           # Wire zValidator middleware
│       └── services/         # Update AI: any → Ai
```

### Pattern 1: zValidator Middleware with Structured Error Hook

**What:** Route-level validation middleware that runs before the handler
**When to use:** Every POST/PUT/PATCH route that accepts a JSON body

```typescript
// Source: https://hono.dev/docs/guides/validation
// Source: https://github.com/honojs/middleware/tree/main/packages/zod-validator
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

// Shared error hook — define once and reuse
const validationHook = (result: any, c: any) => {
  if (!result.success) {
    return c.json({
      error: 'Validation failed',
      issues: result.error.errors.map((e: { path: (string|number)[]; message: string }) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    }, 400)
  }
}

auth.post(
  '/signup',
  zValidator('json', signupSchema, validationHook),
  async (c) => {
    const { email, password } = c.req.valid('json')  // typed, guaranteed present
    // handler logic — no need for manual if (!email || !password) guard
  }
)
```

### Pattern 2: Replacing `c: any` with Proper Context Type

**What:** Helper functions that accept a Hono Context must use the generic type
**When to use:** Any function that takes a context and reads `c.env`, `c.req`, or sets variables

```typescript
// Source: https://hono.dev/docs/api/context
import { Context } from 'hono'
import type { Env } from '../services/db.service'

// BEFORE (wrong):
async function requireAuth(c: any): Promise<User>

// AFTER (correct):
async function requireAuth(c: Context<{ Bindings: Env }>): Promise<User>

// BETTER: use the existing middleware
import { requireAuth } from '../middleware/auth.middleware'
// Then use: app.use('*', requireAuth) or per-route
```

### Pattern 3: Typed Catch Blocks

**What:** Replace `catch (error: any)` with `catch (error: unknown)` + type narrowing
**When to use:** Every catch block — 77 in total across backend routes and services

```typescript
// Helper to define once in a utils module:
function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Unknown error'
}

// BEFORE:
} catch (error: any) {
  return c.json({ error: error.message }, 500)
}

// AFTER:
} catch (error: unknown) {
  return c.json({ error: toMessage(error) }, 500)
}
```

### Pattern 4: Moving Types to Shared Package

**What:** `ParsedResume`, `JobMatch`, `ApplicationUpdate` must be in `@gethiredpoc/shared`
**When to use:** Whenever a type is needed by both backend service files and frontend

```typescript
// packages/shared/src/types/resume.ts (NEW FILE)
export interface ParsedResume {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
  workExperience: Array<{
    company: string;
    title: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }>;
  education: Array<{
    school: string;
    degree?: string;
    fieldOfStudy?: string;
    startDate?: string;
    endDate?: string;
    gpa?: string;
  }>;
  skills?: string[];
}

// packages/shared/src/types/job-match.ts (NEW FILE)
export interface JobMatch {
  jobId: string;
  score: number; // 0-100
  strengths: string[];
  concerns: string[];
  recommendation: 'strong' | 'good' | 'fair' | 'weak';
}

// packages/shared/src/types/api.ts (existing, add to it)
export interface ApplicationUpdate {
  status?: string;
  notes?: string;
  ai_match_score?: number;
  ai_analysis?: string;
}
```

### Anti-Patterns to Avoid

- **Skipping the hook callback and relying on default zValidator error format:** The default just returns 400 with no body. VALID-03 requires field-level detail — always provide the hook.
- **Creating Zod schemas that don't match existing TypeScript interfaces:** Schemas should mirror the shared interfaces exactly. If they diverge, TypeScript won't catch it. Use `z.infer<typeof schema>` to derive the TS type from Zod schema, or validate the Zod inferred type matches the shared interface.
- **Putting Zod schemas in the shared package:** Zod is a backend dependency. The shared package has no `zod` dep and produces plain TS interfaces. Keep Zod schemas in `packages/backend/src/schemas/`.
- **Adding Zod to frontend package:** The frontend uses the shared TS interfaces, not Zod validation. Frontend validation is out of scope for this phase.
- **Using `c.req.json()` after `zValidator`:** Once `zValidator('json', schema)` middleware runs, use `c.req.valid('json')` to get the typed, parsed body — not `c.req.json()` again.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Request body validation | Manual `if (!field)` checks in each handler | `zValidator` middleware | zod handles type coercion, nested validation, union types; manual checks can't produce field-level error details |
| Error message extraction from unknown | Complex try/catch chains | `error instanceof Error ? error.message : String(error)` one-liner | Standard TS pattern; covers all error shapes |
| Typed context helpers | `c: any` then cast inside | `Context<{ Bindings: Env }>` generic | Hono provides full generic Context type; casting hides bugs |

**Key insight:** Zod validation middleware eliminates the need for the manual `if (!email || !password)` guards that currently litter every handler. Once the schema runs, fields are guaranteed to exist with the right types — handlers can destructure directly from `c.req.valid('json')`.

---

## Common Pitfalls

### Pitfall 1: Zod Schema Duplicating Already-Defined TypeScript Interfaces

**What goes wrong:** Developer defines `z.object({ email: z.string(), password: z.string() })` in schema and separately `interface LoginRequest { email: string; password: string }` in shared — then one gets updated but not the other.
**Why it happens:** The `any`-typed `c.req.json()` path hides the inconsistency.
**How to avoid:** In `applications.schema.ts`, derive the Zod schema from the shared interface shape, or use `z.infer<typeof schema>` as the type and remove the separate TS interface. For this project, the shared interfaces already exist and are used by frontend — keep them as the source of truth; make Zod schemas match them exactly.
**Warning signs:** TypeScript compiles but a field that appears in the interface isn't in the schema (or vice versa).

### Pitfall 2: Breaking Frontend Traffic That Was Previously Valid

**What goes wrong:** Current backend code accepts `status?: string` (any string). New Zod schema might add `z.enum(['saved', 'applied', 'screening', 'interview', 'offer', 'rejected'])` for status — if frontend sends a value not in the enum, it now gets 400 instead of the old silent acceptance.
**Why it happens:** Validation makes implicit contracts explicit. Frontend sends `status: "saved"` which is fine. But if any path sends an unexpected value, it now breaks.
**How to avoid:** Audit `packages/frontend/src/lib/api-client.ts` before writing schemas. The audit shows `createApplication(job_id, status?)` and `updateApplication(id, updates: any)` — status values come from `ApplicationStatus` union type, so an enum schema is safe.
**Warning signs:** STATE.md explicitly called this out as a blocker: "Audit actual frontend request shapes before writing Zod schemas — prevents rejecting traffic that was previously valid."

### Pitfall 3: Profile Route Accepts FormData OR JSON (Dual Content-Type)

**What goes wrong:** `PUT /api/profile` handles both `multipart/form-data` (file upload with avatar) and `application/json` (text-only update). `zValidator('json', schema)` only validates JSON — if applied naively, it breaks the FormData path.
**Why it happens:** The profile route has two content-type branches. `zValidator` with target `'json'` will reject a multipart request.
**How to avoid:** Apply zValidator only to the JSON branch (use separate routes or skip the validator middleware and do manual Zod parsing inside the handler for this route). Or: split profile update into two endpoints (`PUT /api/profile` for JSON, `POST /api/profile/avatar` for file upload).
**Warning signs:** FormData profile updates returning 400 after adding zValidator.

### Pitfall 4: requireAuth Local Copies Still Using `c: any`

**What goes wrong:** There's a properly typed `requireAuth` in `auth.middleware.ts` but each route file (`applications.ts`, `profile.ts`, `jobs.ts`, `chat.ts`) also defines a local `requireAuth(c: any)`. TYPE-01 requires zero `any` in handler files — the local copies must go.
**Why it happens:** The middleware was added after the routes were written.
**How to avoid:** Delete local `requireAuth` from each route file and import from `../middleware/auth.middleware`. The middleware version stores user in context via `c.set('user', user)` — route handlers then access via `c.get('user') as User`.
**Warning signs:** Remaining `: any` in route files after the migration.

### Pitfall 5: `AI: any` in Env Can Be Typed as `Ai` from workers-types

**What goes wrong:** `db.service.ts` declares `AI: any`. This spreads `any` inference to all callers.
**Why it happens:** Workers AI binding type wasn't in workers-types when the project was created (or wasn't known to be there).
**How to avoid:** `@cloudflare/workers-types` 4.20250110.0 (in backend devDeps) does export `abstract class Ai<AiModelList>`. Use `import type { Ai } from '@cloudflare/workers-types'` and change `AI: any` to `AI: Ai`.
**Warning signs:** TypeScript errors on `env.AI.run(...)` calls if the model string isn't in the known models list — may need `env.AI.run(modelId as any, ...)` for the gateway call pattern.

---

## Code Examples

Verified patterns from official sources and project inspection:

### Zod Schema with Enum and Optional Fields

```typescript
// Source: https://github.com/honojs/middleware/tree/main/packages/zod-validator
// packages/backend/src/schemas/applications.schema.ts
import { z } from 'zod'

export const createApplicationSchema = z.object({
  job_id: z.string().min(1, 'job_id is required'),
  status: z.enum(['saved', 'applied', 'screening', 'interview', 'offer', 'rejected']).optional(),
})

export const updateApplicationSchema = z.object({
  status: z.enum(['saved', 'applied', 'screening', 'interview', 'offer', 'rejected']).optional(),
  notes: z.string().nullable().optional(),
  ai_match_score: z.number().min(0).max(100).nullable().optional(),
  ai_analysis: z.string().nullable().optional(),
}).refine(obj => Object.keys(obj).length > 0, { message: 'At least one field required' })
```

### Shared Validation Error Hook

```typescript
// packages/backend/src/schemas/validation-hook.ts
import type { ZodError } from 'zod'
import type { Context } from 'hono'

export function validationHook(
  result: { success: boolean; error?: ZodError },
  c: Context
) {
  if (!result.success && result.error) {
    return c.json({
      error: 'Validation failed',
      issues: result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    }, 400)
  }
}
```

### Applying Middleware in Route

```typescript
// Source: packages/backend/src/routes/applications.ts (after migration)
import { zValidator } from '@hono/zod-validator'
import { createApplicationSchema } from '../schemas/applications.schema'
import { validationHook } from '../schemas/validation-hook'
import { requireAuth } from '../middleware/auth.middleware'

applications.post(
  '/',
  requireAuth,
  zValidator('json', createApplicationSchema, validationHook),
  async (c) => {
    const user = c.get('user') as User  // set by requireAuth middleware
    const { job_id, status } = c.req.valid('json')  // typed, no need for if-guards
    const application = await createApplication(c.env, user.id, job_id, status)
    return c.json({ application }, 201)
  }
)
```

### Typed Error Handling Helper

```typescript
// packages/backend/src/utils/errors.ts (new file)
export function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'An unexpected error occurred'
}

// Usage in catch blocks:
} catch (error: unknown) {
  return c.json({ error: toMessage(error) }, 500)
}
```

### Fixing Env.AI Type

```typescript
// packages/backend/src/services/db.service.ts
import type { Ai } from '@cloudflare/workers-types'

export interface Env {
  DB: D1Database;
  STORAGE: R2Bucket;
  KV_CACHE: KVNamespace;
  KV_SESSIONS: KVNamespace;
  AI: Ai;                      // was: AI: any
  // ...rest unchanged
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `catch (error: any)` | `catch (error: unknown)` + `instanceof Error` | TypeScript 4.0 (2020) | Compiler now allows `unknown` as catch variable type; `any` is an explicit opt-out |
| Manual validation guards (`if (!field)`) | Zod schema middleware | ~2022 with Hono ecosystem | Validation happens before handler runs; errors are structured, not ad-hoc strings |
| Zod v3 method chaining (`z.string().email()`) | Zod v4 top-level functions (`z.email()`) | Zod v4 released May 2025 | Significant API changes; stick with v3 for this project given @hono/zod-validator version |

**Deprecated/outdated:**
- `catch (error: any)`: Technically still compiles with strict mode because TypeScript only enforces `unknown` when `useUnknownInCatchVariables: true` (part of `strict: true` in TypeScript 4.4+). Backend `tsconfig.json` has `"strict": true` — this means `catch (error: any)` is an explicit override that bypasses the protection strict mode offers.

---

## Open Questions

1. **Should Zod schemas live in shared or backend?**
   - What we know: shared package has no `zod` dep; frontend doesn't need runtime Zod validation
   - What's unclear: Could a future requirement add frontend validation using same schemas?
   - Recommendation: Keep schemas in `packages/backend/src/schemas/` for now. The shared package exports plain TypeScript interfaces — Zod schemas are an implementation detail of the backend validation layer.

2. **Profile route dual content-type — split or single endpoint with conditional validation?**
   - What we know: `PUT /api/profile` branches on `content-type` header; `zValidator('json', ...)` only works for JSON; FormData path is used for avatar uploads
   - What's unclear: Does the requirement "all API endpoints validate request bodies" include the FormData path?
   - Recommendation: Apply `zValidator('json', schema)` only to the JSON branch by splitting into two routes: `PUT /api/profile` (JSON only) and `POST /api/profile/avatar` (FormData). Or: manually call `schema.safeParse(body)` inside the JSON branch of the existing handler. The simpler fix is manual `safeParse` inside the handler for the profile route only, avoiding a route restructure.

3. **How broadly to interpret TYPE-01 scope ("API handler files")?**
   - What we know: The requirement says "API handler files"; services (`job-matching.service.ts`, `ai-resume.service.ts`) also have heavy `any` usage
   - What's unclear: Are services in scope for TYPE-01?
   - Recommendation: Success criterion 1 says "all request and response shapes have named interfaces" — interpret this as route handler files primarily. Services can be updated as collateral benefit when shared types are created for TYPE-02, but don't let service cleanup block the phase.

4. **`@cloudflare/workers-types` `Ai` class — will `run()` call type-check with the model strings we use?**
   - What we know: `Ai` is `abstract class Ai<AiModelList extends AiModelListType = AiModels>` — it takes a generic for the model list
   - What's unclear: Whether the specific model IDs used in the project (`@cf/meta/llama-3.1-8b-instruct`, etc.) are in the `AiModels` union type
   - Recommendation: Try `AI: Ai` first. If the model ID strings fail type-checking, use `AI: Ai<AiModels>` where `AiModels` allows the specific models. Fallback: keep `AI: Ai` and cast the model ID (`env.AI.run(modelId as Parameters<typeof env.AI.run>[0], options)`).

---

## Sources

### Primary (HIGH confidence)

- Hono docs — https://hono.dev/docs/guides/validation — zValidator signature, targets, and hook callback pattern
- Hono docs — https://hono.dev/docs/api/context — Context generic type with Bindings and Variables
- GitHub honojs/middleware — https://github.com/honojs/middleware/issues/1148 — Confirmed @hono/zod-validator merged Zod v4 support (PR #1173, May 27 2025) but 0.7.6 is the current release; use zod v3 to be safe
- Project code — `packages/backend/src/routes/*.ts` — 72 occurrences of `: any` in routes; 77 `catch (error: any)` across backend; counted directly
- Project code — `packages/shared/src/types/api.ts` — Existing shared interfaces confirm `UpdateApplicationRequest`, `CreateApplicationRequest` already exist (but not used in handlers)
- Project code — `packages/backend/src/middleware/auth.middleware.ts` — Properly typed `requireAuth` already exists using `Context<{ Bindings: Env }>`
- `@cloudflare/workers-types` package (v4.20260228.0 in root node_modules) — `Ai` abstract class confirmed in `latest/index.d.ts`

### Secondary (MEDIUM confidence)

- WebSearch — Zod v4 release notes https://zod.dev/v4 — confirmed v4 stable, breaking API changes for string validators, confirmed by multiple sources
- WebSearch — @hono/zod-validator 0.7.6 is current release, ~2 months old — npm registry result; no changelog detail available

### Tertiary (LOW confidence)

- WebSearch — TypeScript `catch (error: unknown)` + `instanceof Error` as replacement for `catch (error: any)` — community blog posts; pattern itself is LOW but well-established; `useUnknownInCatchVariables` being part of `strict: true` since TS 4.4 is HIGH confidence from official TypeScript docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — project already uses Hono 4.11.3; @hono/zod-validator and zod v3 are the natural add
- Architecture: HIGH — code examined directly; all `any` locations counted; route patterns understood
- Pitfalls: HIGH for items 1, 2, 4 (confirmed from code); MEDIUM for item 3 (Env.AI type behavior under strict generics not fully tested)

**Research date:** 2026-02-20
**Valid until:** 2026-03-22 (stable ecosystem; 30-day validity)
