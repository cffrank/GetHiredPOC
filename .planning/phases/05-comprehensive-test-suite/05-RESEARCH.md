# Phase 5: Comprehensive Test Suite - Research

**Researched:** 2026-02-21
**Domain:** Testing — Vitest (Workers + jsdom), React Testing Library, MSW, Playwright E2E
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TEST-02 | Unit tests for auth, resume parsing, and job matching services | vitest-pool-workers runs inside Workers runtime; `crypto.subtle`, D1, KV all available natively; test auth.service.ts (signup/login/session), password utils (hashPassword/verifyPassword/isLegacyHash), sanitize.ts, job-matching.service.ts pure logic |
| TEST-03 | Integration tests for all API route handlers | Hono's `app.request('/path', {}, env)` pattern with real D1 bindings via vitest-pool-workers; env imported from `cloudflare:test`; migrations applied in setupFiles via `applyD1Migrations` (already configured) |
| TEST-04 | Frontend component tests for Profile, Applications, and JobDetail pages | Vitest + jsdom + @testing-library/react + MSW for API mocking; separate vitest config in `packages/frontend` with `environment: 'jsdom'`; QueryClientProvider wrapper with `retry: false` |
| TEST-05 | E2E tests: signup → profile setup → job search → apply flow | Playwright `@playwright/test` with `webServer` pointing to `packages/frontend` dev server (port 5173) + backend dev server (port 8787); `playwright.config.ts` at root or frontend package root |
</phase_requirements>

---

## Summary

The project already has a working vitest-pool-workers setup in `packages/backend` (Phase 1: TEST-01) with D1 migrations applied via `applyD1Migrations` in `test/apply-migrations.ts`. Phase 5 extends this foundation: add real unit and integration test files to the backend, create a brand-new frontend test setup using Vitest + jsdom + React Testing Library, and stand up Playwright E2E tests for the cross-cutting signup-to-apply flow.

The key architectural insight is that this project has **two separate frontend codebases**: (1) `packages/frontend` — the standalone React+Vite SPA, and (2) `src/` — the rwsdk (Redwood) app. The Success Criteria (TEST-04) specifies "frontend workspace" tests for Profile, Applications, and JobDetail pages which all live in `packages/frontend/src/pages/`. The E2E tests (TEST-05) target the running dev server of `packages/frontend` (Vite at port 5173) with the backend API (Wrangler at port 8787).

The three test layers (backend unit, backend integration, frontend component) require different configurations but share the same vitest version (3.2.4) already installed at workspace root. The Playwright E2E layer requires a new dependency (`@playwright/test`) not currently installed.

**Primary recommendation:** Keep backend unit + integration tests under `packages/backend/test/` using the existing vitest-pool-workers config; add a new `packages/frontend/vitest.config.ts` with jsdom for component tests; add `playwright.config.ts` at the workspace root or `packages/frontend/` for E2E.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `vitest` | 3.2.4 (already installed) | Test runner for backend unit + integration and frontend component tests | Fast, Vite-native, Jest-compatible API, already in use |
| `@cloudflare/vitest-pool-workers` | 0.12.14 (already installed) | Runs backend tests inside real Workers runtime (workerd/Miniflare) | Only way to run `crypto.subtle`, D1, KV in tests without mocking the runtime |
| `@testing-library/react` | ^16.x | Render and query React components in jsdom | Industry standard for React component testing |
| `@testing-library/user-event` | ^14.x | Simulates real user interactions (typing, clicking) | More realistic than `fireEvent`; handles focus, keyboard events |
| `@testing-library/jest-dom` | ^6.x | Custom DOM matchers (`toBeInTheDocument`, `toHaveValue`, etc.) | Readable assertions for DOM state |
| `jsdom` | ^25.x | Browser-like DOM for component tests | Required by vitest `environment: 'jsdom'` |
| `msw` | ^2.x | Intercepts `fetch` calls in tests; mock API responses | Avoids mocking `apiClient` directly; tests real fetch path; works in jsdom via `msw/browser` or `msw/node` |
| `@playwright/test` | ^1.50.x | E2E browser automation | De facto standard for E2E; auto-waits, reliable locators, webServer integration |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `happy-dom` | ^15.x | Alternative to jsdom; faster, lower memory | Optional; can replace jsdom if CI is memory-constrained |
| `@tanstack/react-query` | ^5.x (already in frontend) | Must be wrapped in `QueryClientProvider` in test renders | Every component test that uses `useQuery`/`useMutation` hooks |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| MSW | `vi.mock('../lib/api-client')` | Mocking `apiClient` is simpler but tests the mock, not real fetch; MSW interceptors work at the network layer and are more realistic |
| jsdom | happy-dom | happy-dom is faster; jsdom has broader compatibility; either works for this project |
| Playwright | Cypress | Playwright is faster, has better auto-wait primitives, free parallelism; Cypress has nicer dashboard UI but requires paid plan for parallelism |

### Installation

```bash
# Frontend component test deps (in packages/frontend)
npm install -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom msw --workspace=packages/frontend

# Playwright E2E (at workspace root or packages/frontend)
npm install -D @playwright/test
npx playwright install chromium  # or: npx playwright install
```

---

## Architecture Patterns

### Recommended Project Structure

```
packages/backend/
└── test/
    ├── apply-migrations.ts        # EXISTING: runs before every test suite
    ├── env.d.ts                   # EXISTING: ProvidedEnv type declarations
    ├── smoke.test.ts              # EXISTING: D1 smoke test
    ├── unit/
    │   ├── auth.service.test.ts   # hashPassword, verifyPassword, isLegacyHash
    │   ├── password.test.ts       # password utility edge cases
    │   ├── sanitize.test.ts       # XSS sanitization logic
    │   └── job-matching.test.ts   # analyzeJobMatch pure logic / cache key
    └── integration/
        ├── auth.routes.test.ts    # POST /api/auth/signup, /login, /logout, /me
        ├── jobs.routes.test.ts    # GET /api/jobs pagination, filtering
        ├── applications.routes.test.ts  # full CRUD + auth guard
        └── profile.routes.test.ts # GET/PUT /api/profile

packages/frontend/
├── vitest.config.ts              # NEW: jsdom environment, setupFiles
├── test/
│   ├── setup.ts                  # NEW: extend matchers, afterEach cleanup
│   ├── msw/
│   │   ├── server.ts             # MSW setupServer for Node
│   │   └── handlers.ts           # MSW request handlers for apiClient endpoints
│   └── components/
│       ├── Profile.test.tsx      # Profile page render + user interactions
│       ├── Applications.test.tsx # Applications kanban render + status update
│       └── JobDetail.test.tsx    # JobDetail render + safeParseJSON behavior

playwright.config.ts              # NEW: at workspace root or packages/frontend
e2e/
└── signup-to-apply.spec.ts       # Signup → profile → job search → apply
```

### Pattern 1: Backend Unit Tests (Workers Runtime)

**What:** Import service functions directly; call them with test D1/KV env from `cloudflare:test`. No HTTP layer involved.

**When to use:** Testing pure business logic — password hashing, XSS sanitization, cache key generation, fallback template logic.

```typescript
// Source: https://hono.dev/examples/cloudflare-vitest + project's existing smoke.test.ts
// packages/backend/test/unit/auth.service.test.ts
import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import { signup, login } from '../../src/services/auth.service';
import { hashPassword, verifyPassword, isLegacyHash } from '../../src/utils/password';

describe('password utilities', () => {
  it('hashes and verifies a password', async () => {
    const hash = await hashPassword('hunter2');
    expect(hash).toMatch(/^pbkdf2:/);
    expect(await verifyPassword('hunter2', hash)).toBe(true);
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });

  it('identifies legacy bcryptjs hashes', () => {
    expect(isLegacyHash('$2b$10$abc')).toBe(true);
    expect(isLegacyHash('pbkdf2:100000:abc:def')).toBe(false);
  });
});

describe('auth service', () => {
  it('creates a user and returns session on signup', async () => {
    const { user, sessionId } = await signup(env, 'test@example.com', 'password123');
    expect(user.email).toBe('test@example.com');
    expect(sessionId).toBeTruthy();
  });
});
```

### Pattern 2: Backend Integration Tests (Hono + Real D1)

**What:** Use `app.request(path, options, env)` to call the full Hono app stack including middleware, validation, error handling, and D1 queries. The `env` is the real test binding from `cloudflare:test`.

**When to use:** Testing that routes return correct status codes, response shapes, and database side-effects under auth and validation constraints.

```typescript
// Source: https://hono.dev/examples/cloudflare-vitest
// packages/backend/test/integration/auth.routes.test.ts
import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import app from '../../src/index';

describe('POST /api/auth/signup', () => {
  it('returns 201 and sets session cookie on valid signup', async () => {
    const res = await app.request('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'new@example.com', password: 'password123' }),
    }, env);

    expect(res.status).toBe(201);
    const body = await res.json<{ user: { email: string } }>();
    expect(body.user.email).toBe('new@example.com');
    expect(res.headers.get('Set-Cookie')).toMatch(/session=/);
  });

  it('returns 400 on duplicate email', async () => {
    await app.request('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'dup@example.com', password: 'pw' }),
    }, env);

    const res = await app.request('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'dup@example.com', password: 'pw' }),
    }, env);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/applications (auth guard)', () => {
  it('returns 401 without session cookie', async () => {
    const res = await app.request('/api/applications', {}, env);
    expect(res.status).toBe(401);
  });
});
```

**CRITICAL: Authentication helper for integration tests.** Routes protected by `requireAuth` check for a session cookie. Integration tests must either:
1. Call `/api/auth/signup` or `/api/auth/login` first, extract `Set-Cookie`, and pass it in subsequent requests, OR
2. Insert a user+session directly via `env.DB.prepare(...)` in a `beforeEach` block.

Option 2 is preferred for speed — direct D1 insert is faster than going through the full signup route.

### Pattern 3: Frontend Component Tests (React Testing Library + MSW)

**What:** Render components into jsdom, mock API responses via MSW server, assert on DOM state. Each test gets its own `QueryClient` with `retry: false`.

**When to use:** Testing that UI components render correctly, handle loading/error states, and call correct mutations on user interaction.

```typescript
// packages/frontend/vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
  },
});
```

```typescript
// packages/frontend/test/setup.ts
import { expect, afterEach, beforeAll, afterAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { server } from './msw/server';

expect.extend(matchers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => { cleanup(); server.resetHandlers(); });
afterAll(() => server.close());
```

```typescript
// packages/frontend/test/msw/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('http://localhost:8787/api/auth/me', () =>
    HttpResponse.json({ user: { id: '1', email: 'test@example.com', full_name: 'Test User', role: 'user' } })
  ),
  http.get('http://localhost:8787/api/applications', () =>
    HttpResponse.json({ applications: [] })
  ),
  // ... more handlers
];
```

```typescript
// packages/frontend/test/components/Applications.test.tsx
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import Applications from '../../src/pages/Applications';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClient new QueryClient({ defaultOptions: { queries: { retry: false } } }}>
    <MemoryRouter>{children}</MemoryRouter>
  </QueryClient>
);

test('shows empty state when no applications', async () => {
  render(<Applications />, { wrapper });
  // wait for query to settle
  expect(await screen.findByText(/no applications/i)).toBeInTheDocument();
});
```

**NOTE:** The `AuthContext` in `packages/frontend` uses `useQuery(['auth', 'me'])`. Tests that render pages using `useAuth()` must have an MSW handler for `GET /api/auth/me` returning a valid user, or the `ProtectedRoute` will redirect.

### Pattern 4: E2E Tests (Playwright)

**What:** Real browser automation against a running frontend dev server. Tests the full stack: browser → Vite dev server → Wrangler backend → D1.

**When to use:** The signup-to-apply flow that crosses authentication boundary and multiple page transitions.

```typescript
// playwright.config.ts (at workspace root, or packages/frontend)
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,  // false for tests sharing DB state
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev:frontend',  // starts Vite on :5173
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

```typescript
// e2e/signup-to-apply.spec.ts
import { test, expect } from '@playwright/test';

test('signup → profile → job search → apply', async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;

  // Step 1: Signup
  await page.goto('/signup');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('Test1234!');
  await page.getByRole('button', { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/profile/);

  // Step 2: Profile setup (fill name and save)
  await page.getByRole('button', { name: /edit/i }).click();
  await page.getByLabel(/full name/i).fill('E2E Test User');
  await page.getByRole('button', { name: /save/i }).click();
  await expect(page.getByText('E2E Test User')).toBeVisible();

  // Step 3: Job search
  await page.goto('/jobs');
  await expect(page.getByRole('heading', { name: /jobs/i })).toBeVisible();

  // Step 4: Click first job and apply
  const firstJobLink = page.getByRole('link').filter({ hasText: /./ }).first();
  await firstJobLink.click();
  await expect(page).toHaveURL(/\/jobs\//);
  await page.getByRole('button', { name: /apply/i }).click();
  await expect(page).toHaveURL(/\/applications/);
});
```

**CRITICAL E2E consideration:** The E2E tests require the backend API to also be running (`npm run dev:backend` on port 8787). Playwright's `webServer` only starts one server. Options:
1. Use two `webServer` entries (Playwright v1.22+ supports array of webServer configs)
2. Require manual backend startup before E2E
3. Use a single `concurrently` command that starts both

### Anti-Patterns to Avoid

- **Mocking `cloudflare:test` env in backend tests:** The Workers runtime provides real `crypto.subtle`, real D1, real KV. Do not mock these — that defeats the purpose of vitest-pool-workers.
- **Using `vi.mock('../lib/api-client')` for component tests:** This tests the mock, not real fetch behavior. Use MSW handlers instead.
- **Single global `QueryClient` across tests:** React Query's cache will leak between tests. Always create a new `QueryClient` per test or per `render`.
- **Hard-coded test user emails in integration tests:** Tests run in sequence against the same in-memory D1; use unique emails per test (e.g., `test-${Date.now()}@example.com`) to avoid unique constraint failures.
- **Skipping `await cleanup()` in component tests:** Without cleanup, DOM from previous tests bleeds into next test's `screen` queries.
- **E2E tests that depend on specific DB state:** E2E tests run against a real dev server with a real (remote) D1 unless `--local` flag is used with wrangler. Prefer self-contained tests that create their own data.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fetch request interception in jsdom tests | Custom fetch spy/stub | MSW `setupServer` with `http.get/post` handlers | MSW handles URL matching, query params, response streaming; custom spies break on implementation changes |
| DOM assertions | `document.querySelector` + raw comparisons | `@testing-library/jest-dom` matchers | `toBeInTheDocument`, `toHaveValue`, `toBeVisible` have edge case handling built in |
| Waiting for async UI | `setTimeout` or manual delays | `screen.findBy*` (returns promise) or `waitFor()` | Auto-polling prevents flaky timing; `findBy*` is built into RTL |
| E2E server management | Custom process spawning | Playwright `webServer` config | Handles startup detection, port polling, process cleanup |
| Auth state in integration tests | Mocking `requireAuth` middleware | Real signup/login via D1 seed or route call | Mocking middleware doesn't test that cookie parsing works correctly |

**Key insight:** Mock at the network boundary (MSW), not at the module boundary (`vi.mock`). This keeps tests honest about what the component actually does.

---

## Common Pitfalls

### Pitfall 1: vitest-pool-workers env object missing secrets

**What goes wrong:** Integration tests call routes that read `c.env.RESEND_API_KEY` or `c.env.AI` — these aren't in `wrangler.toml` vars, so tests get `undefined` and may throw or behave differently.

**Why it happens:** `wrangler.toml` `[vars]` are passed to test env automatically. Secrets (via `wrangler secret put`) are NOT — they don't exist in the test environment.

**How to avoid:** Add `miniflare.bindings` in `vitest.config.mts` for secrets needed by tests, or skip testing routes that call external services in integration tests (test those with mocks in unit tests). For AI routes, add a mock binding or skip with `.skip`.

**Warning signs:** `TypeError: Cannot read properties of undefined` in route handlers during tests; AI/email routes failing in integration test suite.

### Pitfall 2: React Query retry loops in component tests

**What goes wrong:** A component test that expects an error state hangs for 30+ seconds before the test times out. React Query retries failed requests 3 times with exponential backoff by default.

**Why it happens:** Default `retry: 3` plus `retryDelay: exponentialDelay` adds up to ~30 seconds of wait time on a request that MSW is returning a 500 for.

**How to avoid:** Always create `QueryClient` with `defaultOptions: { queries: { retry: false }, mutations: { retry: false } }` in test wrappers.

**Warning signs:** Tests pass but take 30+ seconds; test timeout errors on components that show error states.

### Pitfall 3: AuthContext redirects in component tests

**What goes wrong:** Rendering `<Profile>` redirects to `/login` instead of rendering the profile form.

**Why it happens:** `AuthContext` calls `useQuery(['auth', 'me'])` which calls `apiClient.me()` which fetches `GET /api/auth/me`. Without an MSW handler, the request fails → `user` is `undefined` → `ProtectedRoute` redirects.

**How to avoid:** Add an MSW handler for `GET /api/auth/me` in the global handler list returning a valid user object. Use `server.use(http.get(...))` within individual tests to override to unauthenticated state when needed.

**Warning signs:** Tests see redirect behavior or empty renders when the component should display data.

### Pitfall 4: Duplicate email errors in sequential integration tests

**What goes wrong:** The second test that runs `signup(env, 'fixed@example.com', 'pw')` gets `Email already registered` because the first test left that user in D1.

**Why it happens:** The D1 database (Miniflare in-memory) persists between tests within a suite run. `applyD1Migrations` only runs once per process in `setupFiles` — it does not reset between tests.

**How to avoid:** Use unique emails per test (`test-${Date.now()}@example.com` or `test-${crypto.randomUUID()}@example.com`). Alternatively, add a `beforeEach` that deletes test users by email prefix. Do NOT reset migrations between tests — that's too slow.

**Warning signs:** Tests pass when run individually but fail when run together; `400 Email already registered` errors.

### Pitfall 5: Playwright baseURL mismatch with dev proxy

**What goes wrong:** Playwright navigates to `/api/...` which returns a 404 because the Vite proxy `/api → :8787` only works when the Vite dev server is running.

**Why it happens:** If `webServer` only starts the frontend (`npm run dev:frontend`), the backend at `:8787` is not running and all API calls fail.

**How to avoid:** Use two webServer entries (Playwright supports array). Or use a `concurrently` command: `"command": "concurrently 'npm run dev:frontend' 'npm run dev:backend'"`. Or explicitly document that E2E tests require a separately running backend.

**Warning signs:** E2E tests fail at login/signup steps with network errors; frontend loads but API calls return 404/502.

### Pitfall 6: vitest-pool-workers and `singleWorker: true` constraint

**What goes wrong:** Adding too many test files causes slow sequential execution or unexpected state sharing.

**Why it happens:** The existing config sets `singleWorker: true` which means all tests run in the same Worker instance. This is required for D1 (otherwise multiple Workers each get their own D1 instance). State (inserted users, etc.) persists across the entire test run in the same D1.

**How to avoid:** Design tests to be additive — create data, don't assume an empty DB (except for D1 which is reset by migrations). Use unique identifiers. Do NOT change `singleWorker` to `false` — it will break D1 test isolation.

---

## Code Examples

Verified patterns from official sources:

### Backend unit test (password utility)

```typescript
// Source: Cloudflare Workers testing docs + project's existing smoke.test.ts pattern
import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, isLegacyHash } from '../../src/utils/password';

describe('hashPassword / verifyPassword', () => {
  it('produces a PBKDF2 hash and verifies it correctly', async () => {
    const hash = await hashPassword('mypassword');
    expect(hash).toMatch(/^pbkdf2:100000:/);
    expect(await verifyPassword('mypassword', hash)).toBe(true);
    expect(await verifyPassword('wrongpassword', hash)).toBe(false);
  });

  it('detects legacy bcryptjs format', () => {
    expect(isLegacyHash('$2b$10$somehashedvalue')).toBe(true);
    expect(isLegacyHash('pbkdf2:100000:aabbcc:ddeeff')).toBe(false);
  });
});
```

### Backend integration test with auth session

```typescript
// Source: https://hono.dev/examples/cloudflare-vitest
import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import app from '../../src/index';

// Helper: sign up and return session cookie
async function createSessionCookie(email: string, password: string): Promise<string> {
  const res = await app.request('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }, env);
  const cookie = res.headers.get('Set-Cookie') ?? '';
  // Extract just the session=xxx part
  return cookie.split(';')[0];
}

describe('GET /api/applications', () => {
  it('returns 401 without auth', async () => {
    const res = await app.request('/api/applications', {}, env);
    expect(res.status).toBe(401);
  });

  it('returns empty list for newly created user', async () => {
    const cookie = await createSessionCookie(`app-test-${Date.now()}@x.com`, 'pw');
    const res = await app.request('/api/applications', {
      headers: { Cookie: cookie },
    }, env);
    expect(res.status).toBe(200);
    const body = await res.json<{ applications: unknown[] }>();
    expect(body.applications).toEqual([]);
  });
});
```

### Frontend component test with MSW

```typescript
// Source: https://mswjs.io/docs/quick-start + https://tkdodo.eu/blog/testing-react-query
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { server } from '../msw/server';
import { http, HttpResponse } from 'msw';
import Applications from '../../src/pages/Applications';

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

test('renders applications list', async () => {
  server.use(
    http.get('http://localhost:8787/api/applications', () =>
      HttpResponse.json({
        applications: [
          { id: '1', status: 'applied', job: { title: 'Engineer', company: 'Acme', remote: 0 } },
        ],
      })
    )
  );

  renderWithProviders(<Applications />);
  expect(await screen.findByText('Engineer')).toBeInTheDocument();
  expect(screen.getByText('Acme')).toBeInTheDocument();
});
```

### MSW server setup for Node (vitest)

```typescript
// packages/frontend/test/msw/server.ts
// Source: https://mswjs.io/docs/quick-start
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

### Playwright E2E with two webServer entries

```typescript
// Source: https://playwright.dev/docs/test-configuration#multiple-web-servers
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npm run dev:frontend',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev:backend',
      url: 'http://localhost:8787',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Jest + jsdom alone for Workers | vitest-pool-workers runs tests in real workerd runtime | 2023 | `crypto.subtle`, D1, KV work natively; no mocking needed |
| `fetch` mock / axios-mock-adapter | MSW 2.0 with `http` and `HttpResponse` API | 2023 (MSW 2.0) | Network-layer interception; works for all fetch-based code |
| `fireEvent` in RTL | `@testing-library/user-event` v14 | 2022 | Simulates real browser events (focus, keyboard, etc.); more realistic |
| Cypress | Playwright | 2022+ | Playwright faster, free parallel, better auto-wait |
| `SELF.fetch()` for integration tests | `app.request(path, options, env)` | Hono-specific | More direct; doesn't require the full worker entrypoint; works with sub-apps |

**Deprecated/outdated:**
- `jest.fn()` mocking of D1: Replaced by vitest-pool-workers real bindings — don't mock what the runtime provides
- MSW 1.x `rest.get()` syntax: Replaced by MSW 2.x `http.get()` with `HttpResponse` — check MSW version when following tutorials

---

## Open Questions

1. **E2E test DB isolation**
   - What we know: E2E tests run against a real dev backend with a real D1 (either local via `--local` wrangler flag or remote)
   - What's unclear: Whether to use `wrangler dev --local` (local SQLite) for E2E to avoid polluting production/staging DB
   - Recommendation: Use `npm run dev:backend` with `--local` flag for E2E test runs; document this in the plan

2. **AI service binding in integration tests**
   - What we know: The `AI` binding is needed by `resume.service.ts`, `job-matching.service.ts`, `recommendations.ts` routes; Miniflare can provide a mock AI binding
   - What's unclear: Whether `@cloudflare/vitest-pool-workers` 0.12.14 includes a `miniflare.ai` mock or requires manual mocking
   - Recommendation: Skip AI-dependent routes in integration tests (test with `vi.spyOn` in unit tests), or add `miniflare.bindings.AI = { run: async () => ({...}) }` to vitest config

3. **Frontend test command in `package.json`**
   - What we know: `packages/frontend/package.json` has no `test` script; the Success Criteria says "Running `npm test` in the frontend workspace"
   - What's unclear: Whether to add `"test": "vitest run"` to `packages/frontend/package.json` or use a workspace-level command
   - Recommendation: Add `"test": "vitest run"` to `packages/frontend/package.json` scripts

4. **`packages/frontend` vs root `src/` app for E2E**
   - What we know: There are two frontends: `packages/frontend` (Vite SPA) and `src/` (rwsdk). The Success Criteria mentions `npx playwright test` which runs at the workspace root. Profile/Applications/JobDetail live in `packages/frontend`.
   - What's unclear: Whether E2E targets `packages/frontend` at `:5173` or the rwsdk app
   - Recommendation: Target `packages/frontend` (the Vite SPA at `:5173`) since that's where the three named pages live

---

## Sources

### Primary (HIGH confidence)

- Cloudflare Workers Testing docs - https://developers.cloudflare.com/workers/testing/vitest-integration/ — confirmed vitest-pool-workers setup, `cloudflare:test` env, SELF pattern
- Hono Testing guide - https://hono.dev/docs/guides/testing — confirmed `app.request(path, options, env)` pattern for integration tests
- Hono Cloudflare Vitest example - https://hono.dev/examples/cloudflare-vitest — confirmed `import { env } from 'cloudflare:test'` + `app.request` pattern
- Playwright config docs - https://playwright.dev/docs/test-configuration — confirmed `webServer` array support, `baseURL`, locator patterns
- Tkdodo React Query testing - https://tkdodo.eu/blog/testing-react-query — confirmed `retry: false` pattern, `QueryClientProvider` wrapper per test

### Secondary (MEDIUM confidence)

- Robin Wieruch Vitest + RTL guide - https://www.robinwieruch.de/vitest-react-testing-library/ — confirmed vitest.config.ts structure, setup.ts pattern
- MSW Quick Start - https://mswjs.io/docs/quick-start — confirmed `setupServer`, `server.listen`, `http.get`, `HttpResponse` API
- E2E testing React with Playwright guide - https://articles.mergify.com/e-2-e-testing-react-playwright/ — confirmed `playwright.config.ts` structure
- Project's existing `packages/backend/test/` files — confirmed migration pattern, D1 binding type declarations, smoke test structure

### Tertiary (LOW confidence)

- WebSearch results on MSW 2.0 + React Query patterns — general community consensus; verified against official MSW docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries have official docs; versions confirmed from installed packages
- Architecture: HIGH — backend test pattern confirmed from existing working smoke test + Hono docs; frontend pattern confirmed from official RTL + MSW docs
- Pitfalls: MEDIUM-HIGH — D1 unique email pitfall confirmed from understanding of `singleWorker: true` config; AuthContext redirect pitfall confirmed from reading source code; AI binding uncertainty is LOW

**Research date:** 2026-02-21
**Valid until:** 2026-05-21 (stable ecosystem; Playwright and vitest release cadence is fast but configs are stable)
