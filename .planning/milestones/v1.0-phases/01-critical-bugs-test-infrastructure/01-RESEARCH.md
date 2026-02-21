# Phase 1: Critical Bugs + Test Infrastructure - Research

**Researched:** 2026-02-20
**Domain:** React frontend bugs, D1 schema consistency, TanStack Query mutations, Cloudflare Workers testing
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BUG-01 | JobDetail page handles invalid JSON in requirements field without crashing | Safe JSON.parse pattern identified; try/catch with fallback value at line 55 of JobDetail.tsx |
| BUG-02 | Application status values are consistent between UI and database schema | Schema gap confirmed: DB comment lists 5 values, TypeScript type has 6 (missing "screening"); live data audit query documented |
| BUG-03 | Status updates wait for API confirmation before reflecting the change in the UI, with rollback on failure | No optimistic update / rollback exists in useUpdateApplication; TanStack Query v5 onMutate/onError/onSettled pattern researched |
| TEST-01 | Backend test infrastructure set up with vitest-pool-workers and D1 bindings | @cloudflare/vitest-pool-workers 0.12.x pattern fully documented; exact config from official example obtained |
</phase_requirements>

---

## Summary

Phase 1 addresses three concrete production crashes and establishes the test harness that all subsequent fixes will rely on. The bugs are well-localized in the codebase — each maps to a specific file and line — so the risk of introducing regressions is low if changes are narrow and scoped.

BUG-01 is a single-line crash at `JobDetail.tsx:55`: `JSON.parse(job.requirements)` throws when the value is not valid JSON. The fix is a safe parse helper with a fallback to an empty array. No library is needed. BUG-02 is a schema/type mismatch: the initial migration comment lists `saved|applied|interview|offer|rejected` (5 values) but `ApplicationStatus` in the shared package includes `screening` as well — making it 6 values. Because the column is untyped TEXT with no CHECK constraint, production rows may already contain any of the 6 values, so an audit query must run before any constraint is added. BUG-03 is the absence of optimistic-update logic in `useUpdateApplication`: TanStack Query v5 fires the API call, and the card position only refreshes on success; API failures are swallowed silently with no rollback.

For TEST-01, Cloudflare's official `@cloudflare/vitest-pool-workers` package (version 0.12.x, works with vitest 2.0–3.2) is the correct and only supported way to run tests inside the real Workers runtime with real D1 bindings. The official D1 fixture in `workers-sdk` provides a complete, verified pattern using `readD1Migrations` / `applyD1Migrations` / `ProvidedEnv` declaration. No mock patching of the runtime is needed or wanted.

**Primary recommendation:** Fix each bug in isolation with the minimal code change, write a vitest test that exercises the fix against the D1 binding, and commit. Tests come first for BUG-02 (audit query) and BUG-03 (mutation behavior); BUG-01 can be fixed and the test written simultaneously since it is purely frontend.

---

## Bug Analysis

### BUG-01: JobDetail JSON Parse Crash

**File:** `packages/frontend/src/pages/JobDetail.tsx`, line 55

**Crash site (exact):**
```typescript
const requirements = job.requirements ? JSON.parse(job.requirements) : [];
```

`JSON.parse` throws a `SyntaxError` when the string is not valid JSON (e.g., a plain text description, truncated JSON, or empty string with whitespace). This error propagates unhandled and crashes the React component tree.

**Fix pattern:**
```typescript
function safeParseJSON<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

const requirements = safeParseJSON<string[]>(job.requirements, []);
```

**No library needed.** This is a one-function fix. A fallback of `[]` is correct — the requirements section renders nothing when the array is empty (line 91: `{requirements.length > 0 && ...}`).

**No error boundary needed for this specific fix.** The requirement says "displays a fallback state" — an empty requirements section is sufficient. An error boundary (ERR-03 in Phase 3) is a separate, broader concern.

**Confidence:** HIGH — code examined directly.

---

### BUG-02: Application Status Schema Mismatch

**The gap:**

| Source | Status values |
|--------|--------------|
| `migrations/0001_initial_schema.sql` comment | `saved`, `applied`, `interview`, `offer`, `rejected` (5) |
| `packages/shared/src/types/application.ts` | `saved`, `applied`, `screening`, `interview`, `offer`, `rejected` (6) |
| `packages/frontend/src/pages/Applications.tsx` | Uses `ApplicationStatus[]` from shared — includes `screening` |

`screening` is in the TypeScript type and UI but absent from the DB schema comment. The column is `TEXT` with no CHECK constraint, so both values can be stored. However:

1. If old code that knew nothing about `screening` wrote rows with only the 5 original values, some live rows may lack `screening` as an option.
2. If the UI displays a `screening` column but existing rows have values matching `screening` exactly, they would already filter correctly — unless legacy rows used a different string (e.g., `phone-screen`, `phone_screen`).

**Required audit before any constraint is added:**
```sql
SELECT DISTINCT status, COUNT(*) as count
FROM applications
GROUP BY status
ORDER BY count DESC;
```

Run this against the live D1 database via `wrangler d1 execute gethiredpoc-db --command "SELECT DISTINCT status, COUNT(*) as count FROM applications GROUP BY status ORDER BY count DESC"` before deciding what to do.

**Fix path (after audit):**
- If only expected values exist: document that the schema is correct, update the comment, no data migration needed.
- If unexpected values exist: write a data migration UPDATE to normalize them to valid values.
- Do NOT add a CHECK constraint in Phase 1 — that is a follow-on once data is clean. BUG-02's success criterion is that UI values match DB values, not that a constraint is in place.

**Confidence:** HIGH — both files examined directly. Audit step is required before any data change.

---

### BUG-03: Status Update Has No Rollback on API Failure

**Files:**
- `packages/frontend/src/hooks/useApplications.ts` — `useUpdateApplication`
- `packages/frontend/src/pages/Applications.tsx` — `handleDragEnd`

**Current behavior:**

```typescript
// useApplications.ts
export function useUpdateApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }) => apiClient.updateApplication(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
    // NO onMutate, NO onError — failures are swallowed silently
  });
}
```

When `handleDragEnd` fires in `Applications.tsx`, DnD-kit has already visually moved the card. The mutation fires asynchronously. On failure, `invalidateQueries` is never called, so the cache is not refreshed — the card stays in the wrong column indefinitely.

**Required pattern (TanStack Query v5):**
```typescript
export function useUpdateApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      apiClient.updateApplication(id, updates),
    onMutate: async ({ id, updates }) => {
      // Cancel in-flight fetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['applications'] });
      // Snapshot current state for rollback
      const previousApplications = queryClient.getQueryData(['applications']);
      // Optimistically update the cache
      queryClient.setQueryData(['applications'], (old: any) => ({
        ...old,
        applications: old?.applications?.map((app: any) =>
          app.id === id ? { ...app, ...updates } : app
        ),
      }));
      return { previousApplications };
    },
    onError: (_err, _vars, context) => {
      // Roll back to snapshot on failure
      if (context?.previousApplications) {
        queryClient.setQueryData(['applications'], context.previousApplications);
      }
    },
    onSettled: () => {
      // Always reconcile with server after mutation settles
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });
}
```

**Confidence:** HIGH — TanStack Query v5 docs confirmed, version in package.json is `^5.62.11`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @cloudflare/vitest-pool-workers | 0.12.x | Run tests inside Workers runtime with real bindings | Only official Cloudflare solution; no mock patching needed |
| vitest | ~3.2.x | Test runner (pool workers requires 2.0–3.2) | Required by @cloudflare/vitest-pool-workers |
| @tanstack/react-query | ^5.62.11 (already installed) | Mutation with optimistic update / rollback | Already in use; v5 API confirmed |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @cloudflare/workers-types | ^4.x (already installed) | Types for Workers runtime in tests | Required for ProvidedEnv TypeScript declaration |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @cloudflare/vitest-pool-workers | jest + mock Workers runtime | Mock patching defeats the purpose; TEST-01 explicitly bans mock patching |
| @cloudflare/vitest-pool-workers | miniflare standalone | Pool workers wraps miniflare; use the wrapper |

**Installation (TEST-01 only — bugs need no new packages):**
```bash
npm install --save-dev vitest @cloudflare/vitest-pool-workers --workspace=packages/backend
```

---

## Architecture Patterns

### Pattern 1: Safe JSON Parse (BUG-01)

**What:** Wrap `JSON.parse` in try/catch, return typed fallback on failure.

**When to use:** Any time a TEXT column from the DB is expected to contain JSON but could be malformed.

**Example:**
```typescript
// Source: standard TypeScript pattern — no library needed
function safeParseJSON<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
```

---

### Pattern 2: D1 Audit Query (BUG-02)

**What:** Run `SELECT DISTINCT` before modifying schema or data to understand what is actually in the live database.

**When to use:** Before adding any CHECK constraint or normalizing enum-like TEXT columns.

**Example:**
```bash
# Run against the live D1 database
npx wrangler d1 execute gethiredpoc-db \
  --command "SELECT DISTINCT status, COUNT(*) as count FROM applications GROUP BY status ORDER BY count DESC" \
  --remote
```

---

### Pattern 3: TanStack Query v5 Optimistic Update with Rollback (BUG-03)

**What:** `onMutate` snapshots and updates cache; `onError` restores snapshot; `onSettled` re-syncs.

**When to use:** Any mutation where UI should feel instant AND incorrect state must not persist on failure.

**Example:** (see BUG-03 section above for complete code)

---

### Pattern 4: vitest-pool-workers with D1 (TEST-01)

**What:** `defineWorkersProject` + `readD1Migrations` in config; `applyD1Migrations` in setup file; `env` from `cloudflare:test` in tests.

**When to use:** Any backend test that touches D1.

**vitest.config.mts:**
```typescript
// Source: https://github.com/cloudflare/workers-sdk/tree/main/fixtures/vitest-pool-workers-examples/d1
import path from "node:path";
import {
  defineWorkersProject,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersProject(async () => {
  const migrationsPath = path.join(__dirname, "../../migrations");
  const migrations = await readD1Migrations(migrationsPath);

  return {
    test: {
      setupFiles: ["./test/apply-migrations.ts"],
      poolOptions: {
        workers: {
          singleWorker: true,
          wrangler: { configPath: "./wrangler.toml" },
          miniflare: {
            bindings: { TEST_MIGRATIONS: migrations },
          },
        },
      },
    },
  };
});
```

**test/apply-migrations.ts:**
```typescript
// Source: https://raw.githubusercontent.com/cloudflare/workers-sdk/main/fixtures/vitest-pool-workers-examples/d1/test/apply-migrations.ts
import { applyD1Migrations, env } from "cloudflare:test";

// applyD1Migrations is idempotent — safe to call in setup files that run multiple times
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
```

**TypeScript env declaration (test/env.d.ts):**
```typescript
import type { D1Database } from "@cloudflare/workers-types";

declare module "cloudflare:test" {
  interface ProvidedEnv {
    DB: D1Database;
    TEST_MIGRATIONS: D1Migration[];
  }
}
```

**Example test accessing D1:**
```typescript
import { env } from "cloudflare:test";

it("reads from D1", async () => {
  const result = await env.DB.prepare("SELECT 1 AS val").first<{ val: number }>();
  expect(result?.val).toBe(1);
});
```

**tsconfig.json additions for backend:**
```json
{
  "compilerOptions": {
    "types": ["@cloudflare/workers-types", "@cloudflare/vitest-pool-workers"]
  },
  "include": ["src/**/*", "test/**/*", "vitest.config.mts"]
}
```

---

### Anti-Patterns to Avoid

- **Direct JSON.parse without try/catch:** Crashes on the first malformed row. The DB column is TEXT — there is no schema-level guarantee it is valid JSON.
- **Optimistic update without rollback:** The UI lies to the user and never corrects itself on failure. Always implement `onError` when using `onMutate`.
- **Adding a CHECK constraint before auditing live data:** Will fail if existing rows contain values not in the constraint list. Audit first.
- **Mock-patching the Workers runtime in tests:** Defeats the purpose of TEST-01. Use `@cloudflare/vitest-pool-workers` to run tests in the real runtime.
- **Using `vitest.config.ts` instead of `vitest.config.mts`:** The config uses `async` + top-level `await` (`readD1Migrations`); `.mts` extension signals ESM module to Node.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Optimistic update cache management | Custom local state with useState | TanStack Query onMutate/onError/onSettled | React-Query manages race conditions, cancellation, and reconciliation; custom state creates split-brain bugs |
| Workers test runtime | Mock classes for D1/KV/etc | @cloudflare/vitest-pool-workers | Mocks diverge from real behavior; pool workers uses actual workerd |
| Migration runner in tests | Custom SQL exec loop | applyD1Migrations from cloudflare:test | applyD1Migrations is idempotent and tracks applied migrations in d1_migrations table |

---

## Common Pitfalls

### Pitfall 1: Forgetting `cancelQueries` in `onMutate`

**What goes wrong:** A background refetch in-flight when `onMutate` fires can overwrite the optimistic update with stale server data before the mutation response arrives.

**Why it happens:** TanStack Query background refetches and mutations run concurrently.

**How to avoid:** Always call `await queryClient.cancelQueries({ queryKey: ['applications'] })` as the first line of `onMutate`.

**Warning signs:** Card flickers back to original position momentarily after drag, then jumps to the new position.

---

### Pitfall 2: `vitest.config.mts` Migration Path

**What goes wrong:** `readD1Migrations` receives the wrong path and finds no migrations, so tests run against an empty schema.

**Why it happens:** The backend package is at `packages/backend/` but migrations live at the monorepo root `migrations/`. The path must traverse up two directories.

**How to avoid:**
```typescript
const migrationsPath = path.join(__dirname, "../../migrations");
```
Verify with a `console.log` during first run, or add an assertion that `migrations.length > 0`.

**Warning signs:** Tables don't exist in tests; `no such table` errors.

---

### Pitfall 3: TypeScript Types for `cloudflare:test` Bindings

**What goes wrong:** TypeScript errors on `env.DB` or `env.TEST_MIGRATIONS` because `ProvidedEnv` is not declared.

**Why it happens:** `cloudflare:test` is a virtual module; its `env` type is only populated if you declare the `ProvidedEnv` interface.

**How to avoid:** Create `packages/backend/test/env.d.ts` with the `ProvidedEnv` declaration and ensure `tsconfig.json` includes `test/**/*`.

---

### Pitfall 4: `D1Migration[]` Type Availability

**What goes wrong:** `D1Migration` type is not found.

**Why it happens:** The type is exported from `@cloudflare/vitest-pool-workers`, not from `@cloudflare/workers-types`.

**How to avoid:** Import from the correct source:
```typescript
import type { D1Migration } from "@cloudflare/vitest-pool-workers";
```
Or add `"@cloudflare/vitest-pool-workers"` to the `types` array in `tsconfig.json`.

---

### Pitfall 5: `singleWorker: true` Requirement

**What goes wrong:** Each test file gets a fresh Worker context, meaning migrations applied in the setup file don't persist between test files.

**Why it happens:** Without `singleWorker: true`, each test file gets an isolated context.

**How to avoid:** Set `singleWorker: true` in `poolOptions.workers`. The `applyD1Migrations` function is idempotent so multiple calls are safe.

---

### Pitfall 6: wrangler.toml `environment` Setting

**What goes wrong:** Test D1 binding ID doesn't match what wrangler.toml declares, causing "binding not found" errors.

**Why it happens:** The official D1 example uses a `production` environment with a separate D1 binding declaration. The project's `wrangler.toml` declares D1 at the top level.

**How to avoid:** For this project, do NOT set `environment: "production"` in vitest config (unlike the example). The `wrangler.toml` has no named environments — the top-level `[[d1_databases]]` binding named `DB` is what the tests need.

---

## Code Examples

### Complete `useUpdateApplication` with Optimistic Update

```typescript
// packages/frontend/src/hooks/useApplications.ts
export function useUpdateApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      apiClient.updateApplication(id, updates),

    onMutate: async ({ id, updates }) => {
      // 1. Cancel any outgoing refetches (avoid overwriting optimistic update)
      await queryClient.cancelQueries({ queryKey: ['applications'] });

      // 2. Snapshot the previous state for rollback
      const previousApplications = queryClient.getQueryData(['applications']);

      // 3. Optimistically update the cache
      queryClient.setQueryData(['applications'], (old: any) => ({
        ...old,
        applications: old?.applications?.map((app: any) =>
          app.id === id ? { ...app, ...updates } : app
        ),
      }));

      // 4. Return snapshot as context (available in onError and onSettled)
      return { previousApplications };
    },

    onError: (_err, _vars, context) => {
      // Roll back to the snapshot if mutation fails
      if (context?.previousApplications) {
        queryClient.setQueryData(['applications'], context.previousApplications);
      }
    },

    onSettled: () => {
      // Always reconcile with the server after success OR failure
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });
}
```

### Minimal Smoke Test for D1 (satisfies TEST-01 success criterion)

```typescript
// packages/backend/test/smoke.test.ts
import { env } from "cloudflare:test";
import { describe, it, expect } from "vitest";

describe("D1 smoke", () => {
  it("can execute SQL against the D1 binding", async () => {
    const result = await env.DB
      .prepare("SELECT COUNT(*) AS cnt FROM jobs")
      .first<{ cnt: number }>();
    expect(result?.cnt).toBeGreaterThanOrEqual(0);
  });
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Mock Workers runtime (jest + custom mocks) | @cloudflare/vitest-pool-workers (real workerd) | 2023–2024 | Tests run in same runtime as production; no mock divergence |
| TanStack Query v4 `variables` optimistic UI | TanStack Query v5 `onMutate` / `onError` / `onSettled` | v5 (2023) | Rollback and reconciliation are now built-in patterns |

---

## Open Questions

1. **Live `applications` status values**
   - What we know: DB schema column is `TEXT` with no CHECK constraint; UI has used `screening` since at least the time the TypeScript type was written.
   - What is unclear: Whether any production rows exist with `screening` or with unexpected values.
   - Recommendation: Run the audit query (`SELECT DISTINCT status, COUNT(*) ...`) against the live D1 before writing any migration. The blocker in STATE.md explicitly flags this.

2. **D1 binding name in vitest config for this project**
   - What we know: `wrangler.toml` declares binding `DB`. The official example uses `DATABASE`.
   - What is unclear: Whether `applyD1Migrations(env.DB, env.TEST_MIGRATIONS)` will pick up the correct local D1 automatically, or if a local database must be seeded first.
   - Recommendation: Use `env.DB` (matching the `wrangler.toml` binding name). For local testing without a real D1 ID, miniflare creates an in-memory D1. The `applyD1Migrations` call populates the schema from migrations; no pre-existing data is needed for smoke tests.

3. **Frontend test framework for BUG-01 and BUG-03**
   - What we know: Phase 1 success criteria are met if the bugs are fixed and TEST-01 (backend) is passing. Frontend tests are not required until Phase 5 (TEST-04).
   - What is unclear: The phase description says "every subsequent fix is written test-first" — does this apply to the frontend fixes?
   - Recommendation: Write backend tests first (TEST-01 infrastructure). For BUG-01 and BUG-03 (frontend), fix the code and add a brief comment noting that component tests will be added in Phase 5. Do not block Phase 1 on frontend test infrastructure.

---

## Sources

### Primary (HIGH confidence)

- `packages/frontend/src/pages/JobDetail.tsx` — BUG-01 crash site confirmed at line 55
- `packages/frontend/src/pages/Applications.tsx` — BUG-03 drag handler examined
- `packages/frontend/src/hooks/useApplications.ts` — confirmed: no onMutate/onError/onSettled
- `packages/shared/src/types/application.ts` — ApplicationStatus includes `screening`
- `migrations/0001_initial_schema.sql` — confirmed `screening` absent from DB comment
- `packages/backend/wrangler.toml` — D1 binding name is `DB`, migrations at `../../migrations`
- [Cloudflare Workers SDK D1 vitest example](https://github.com/cloudflare/workers-sdk/tree/main/fixtures/vitest-pool-workers-examples/d1) — `readD1Migrations` / `applyD1Migrations` pattern
- [Cloudflare vitest-pool-workers configuration docs](https://developers.cloudflare.com/workers/testing/vitest-integration/configuration/) — `readD1Migrations`, `applyD1Migrations` API
- [Cloudflare Test APIs docs](https://developers.cloudflare.com/workers/testing/vitest-integration/test-apis/) — `env` and `SELF` access pattern confirmed
- [TanStack Query v5 optimistic updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates) — `onMutate`/`onError`/`onSettled` pattern confirmed

### Secondary (MEDIUM confidence)

- [Hono Cloudflare Vitest example](https://hono.dev/examples/cloudflare-vitest) — confirms `app.request('/path', {}, env)` pattern for Hono route testing
- npm registry: `@cloudflare/vitest-pool-workers` version 0.12.12 (published 2026-02-18), compatible with vitest 2.0–3.2

### Tertiary (LOW confidence)

- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions from npm, official Cloudflare docs, package.json confirmed
- Architecture: HIGH — all patterns from official docs or direct code inspection
- Pitfalls: HIGH — sourced from official docs and direct examination of the codebase

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (stable APIs, 30-day window)
