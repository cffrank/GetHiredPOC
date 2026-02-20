# Testing Patterns

**Analysis Date:** 2026-02-20

## Test Framework

**Runner:**
- Not detected - No test framework currently configured
- No `vitest.config.*` or `jest.config.*` files found
- No `*.test.ts`, `*.spec.ts`, `*.test.tsx`, or `*.spec.tsx` files in project source

**Assertion Library:**
- Not applicable - Testing not implemented

**Run Commands:**
```bash
# No testing commands defined in package.json
# Testing infrastructure: Not yet implemented
```

## Test File Organization

**Location:**
- Test infrastructure not established
- No convention set for test file placement

**Naming:**
- No test naming pattern established

**Structure:**
- Not applicable

## Test Structure

**Current State:**
- Manual testing only through browser/UI testing
- Backend API testing likely done via HTTP client (Postman, curl, or similar)
- Frontend component testing relies on dev environment and visual verification

## Mocking

**Framework:**
- Not configured - No mocking library setup detected

**Patterns:**
- Backend uses mock functions for placeholder logic: `mockJobAnalysis()` in `ai.service.ts`
- Mock function simulates async delay: `await new Promise((resolve) => setTimeout(resolve, 1500))`
- Mock logic contains seed-based scoring and recommendation generation
- Not tied to a testing framework, just placeholder implementations

**Example Mock Pattern:**
```typescript
// In packages/backend/src/services/ai.service.ts
export async function mockJobAnalysis(
  userSkills: string[],
  jobRequirements: string[]
): Promise<AIAnalysis> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Generate realistic mock score based on skill overlap
  const matchingSkills = userSkills.filter((skill) =>
    jobRequirements.some((req) =>
      req.toLowerCase().includes(skill.toLowerCase()) ||
      skill.toLowerCase().includes(req.toLowerCase())
    )
  );

  // ... rest of mock logic
}
```

**What to Mock:**
- External API calls (AI analysis, LinkedIn OAuth, etc.)
- Long-running operations
- Third-party services (Adzuna, Resend email, etc.)

**What NOT to Mock:**
- Database queries - Should test with real data store
- Internal function chains - Test the full business logic flow
- Type definitions - No need to mock types

## Fixtures and Factories

**Test Data:**
- No fixture or factory pattern established
- Shared types serve as de-facto data contracts
- No test data builders found

**Location:**
- Not applicable - No testing infrastructure

## Coverage

**Requirements:**
- Not enforced - No coverage targets or tooling configured

**View Coverage:**
- Not applicable

## Test Types

**Unit Tests:**
- Not implemented
- Scope: Individual service functions, utility functions, React hooks
- Recommended approach: Test service functions in isolation with mocked dependencies

**Integration Tests:**
- Not implemented
- Scope: API routes with database interactions
- Recommended approach: Test routes with real database, mocked external APIs

**E2E Tests:**
- Not implemented
- Framework: Could use Playwright or Cypress for browser automation
- Recommended scope: Critical user flows (signup, job search, apply)

## Common Patterns

### Async Testing (Not Yet Implemented)

**Recommended pattern based on existing async code:**
```typescript
// For async functions in services
test('should import jobs successfully', async () => {
  const result = await importJobsForUser(env, userId, preferences);
  expect(result.imported).toBeGreaterThan(0);
});

// For React hooks with useQuery
test('should fetch jobs with filters', async () => {
  const { result, waitForNextUpdate } = renderHook(
    () => useJobs({ title: 'React' }),
    { wrapper: QueryClientProvider }
  );

  await waitForNextUpdate();
  expect(result.current.data).toBeDefined();
});
```

### Error Testing (Not Yet Implemented)

**Recommended pattern based on existing error handling:**
```typescript
// For service functions that throw
test('should throw on invalid credentials', async () => {
  await expect(login(env, 'test@test.com', 'wrong')).rejects.toThrow();
});

// For API routes
test('should return 400 on missing email', async () => {
  const response = await testRequest.post('/api/auth/signup')
    .send({ password: 'test123' });

  expect(response.status).toBe(400);
  expect(response.body.error).toBeDefined();
});

// For React components
test('should show error message on API failure', async () => {
  const { queryClient } = setupTestQueryClient();
  queryClient.setQueryData(['jobs'], () => {
    throw new Error('API failed');
  });

  const { getByText } = render(<Jobs />);
  await waitFor(() => {
    expect(getByText(/error/i)).toBeInTheDocument();
  });
});
```

## Testing Challenges & Gaps

**Areas Without Test Infrastructure:**

1. **API Routes** (`packages/backend/src/routes/`)
   - No tests for auth flow (signup, login, logout)
   - No tests for job operations (save, unsave, analyze)
   - No tests for profile updates
   - No tests for application lifecycle

2. **Services** (`packages/backend/src/services/`)
   - Database operations not tested (db.service.ts)
   - AI integration not tested (ai.service.ts, ai-resume.service.ts)
   - External API integration not tested (adzuna.service.ts, linkedin.service.ts, email.service.ts)
   - File operations not tested (storage.service.ts, document-export.service.ts)

3. **Frontend Hooks** (`packages/frontend/src/hooks/`)
   - Query hooks not tested (useJobs.ts, useRecommendations.ts, etc.)
   - Mutation hooks not tested (useSaveJob.ts, useUpdateProfile.ts, etc.)
   - Hook cache invalidation logic not tested

4. **Frontend Components** (`packages/frontend/src/components/`, `packages/frontend/src/pages/`)
   - UI components not tested (Button, Card, Input, etc.)
   - Page components not tested (Jobs.tsx, Profile.tsx, etc.)
   - Form submission logic not tested
   - Loading and error states not tested

5. **Authentication & Authorization**
   - Session management not tested
   - Cookie handling not tested
   - Protected route access not tested

## Recommendations for Test Implementation

**Phase 1 - Foundation:**
1. Install testing framework: `vitest` (recommended for modern projects) or `jest`
2. Install testing libraries: `@testing-library/react`, `@testing-library/user-event` for frontend
3. Install assertion library: `vitest` includes built-in assertions

**Phase 2 - Backend Testing:**
1. Create test directory structure: `packages/backend/src/__tests__/`
2. Test database service in isolation with test database
3. Test authentication service with mocked password hashing
4. Test service layer functions with mocked dependencies

**Phase 3 - Frontend Testing:**
1. Create test directory structure: `packages/frontend/src/__tests__/`
2. Test UI components in isolation
3. Test custom hooks with `@testing-library/react`
4. Test page components with mocked API responses

**Phase 4 - E2E Testing:**
1. Install Playwright or Cypress
2. Create critical user journey tests
3. Test full authentication flow
4. Test job search and application workflow

---

*Testing analysis: 2026-02-20*
