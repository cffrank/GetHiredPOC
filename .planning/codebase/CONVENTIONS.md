# Coding Conventions

**Analysis Date:** 2026-02-20

## Naming Patterns

**Files:**
- TypeScript/React files: PascalCase for components (e.g., `Button.tsx`, `Jobs.tsx`), camelCase for utilities/services (e.g., `api-client.ts`, `useJobs.ts`)
- Service files: Follow pattern `[domain].service.ts` (e.g., `ai.service.ts`, `db.service.ts`, `email.service.ts`)
- Route files: `[domain].ts` in routes folder (e.g., `auth.ts`, `jobs.ts`, `profile.ts`)
- Hook files: `use[Feature].ts` convention (e.g., `useJobs.ts`, `useProfile.ts`, `useRecommendations.ts`)
- UI component files: PascalCase (e.g., `Button.tsx`, `Card.tsx`, `Input.tsx`)
- Feature/page directories: PascalCase directory names with PascalCase file names (e.g., `pages/Profile.tsx`, `pages/admin/AdminDashboard.tsx`)

**Functions:**
- Async functions: Descriptive verbs with camelCase (e.g., `generateTailoredResume`, `getAIGatewayMetrics`, `importJobsForUser`, `fetchLinkedInProfile`)
- Hook functions: Always `use[FeatureName]` convention (e.g., `useJobs`, `useJob`, `useSaveJob`, `useAnalyzeJob`)
- Regular functions: camelCase with action verbs (e.g., `extractState`, `parseResumeJSON`, `formatDate`, `wrapText`)
- Helper/utility functions: Lowercase verbs (e.g., `escapeXml`)
- API client methods: camelCase action-based (e.g., `signup`, `login`, `getJobs`, `saveJob`, `sendChatMessage`)

**Variables:**
- camelCase consistently (e.g., `isEditing`, `fullName`, `linkedInUrl`, `searchParams`)
- Boolean variables: Prefixed with `is`, `has`, `should` (e.g., `isLoading`, `isProduction`, `isEditing`, `showLinkedInPaste`)
- State setters: `set[Variable]` convention in React (e.g., `setTitle`, `setLocation`, `setRemote`, `setLinkedInMessage`)
- Props objects: inline or extracted to interface (e.g., `className`, `variant`, `size` in component props)

**Types:**
- Interfaces: PascalCase with descriptive names, no `I` prefix (e.g., `User`, `Session`, `Job`, `Application`, `ChatMessage`)
- Type aliases: PascalCase (e.g., `ApplicationStatus`, `ResumeData`, `LinkedInProfile`)
- Request/Response types: `[Feature][Action]Request` and `[Feature][Action]Response` (e.g., `SignupRequest`, `SignupResponse`, `CreateApplicationRequest`)
- Union types: Literal strings in lowercase (e.g., `'trial' | 'paid'`, `'pending' | 'accepted' | 'rejected'`)
- Generic type parameters: Capital letters (T, K, V)
- Database/API field names: snake_case (e.g., `full_name`, `linkedin_url`, `created_at`, `job_id`)

## Code Style

**Formatting:**
- No explicit formatter config found in ESLint/Prettier (relying on defaults)
- TypeScript strict mode enabled in `tsconfig.json`
- Target: ES2021/ES2022
- Module resolution: bundler
- Indentation: 2 spaces (default)

**Linting:**
- No `.eslintrc` or explicit ESLint config found
- Project appears to use TypeScript without formal linting rules
- Relying on TypeScript type checking for code quality

**Common Patterns:**
- Spread operator heavily used for props merging: `{ ...options, ...options?.headers }`
- Optional chaining: `c.env.FRONTEND_URL?.includes('pages.dev')`
- Nullish coalescing: `import.meta.env.VITE_API_URL || 'http://localhost:8787'`
- Ternary operators for conditional rendering in JSX

## Import Organization

**Order:**
1. External React/Framework imports (e.g., `import { useState } from 'react'`)
2. External library imports (e.g., `import { useQuery } from '@tanstack/react-query'`)
3. Internal project imports from context (e.g., `import { useAuth } from '../context/AuthContext'`)
4. Internal hooks (e.g., `import { useJobs } from '../hooks/useJobs'`)
5. Component imports (e.g., `import { Button } from '../components/ui/Button'`)
6. Type imports (e.g., `import type { Job } from '@gethiredpoc/shared'`)
7. Icon/Asset imports (e.g., `import { Linkedin, FileText } from 'lucide-react'`)
8. Utility imports (e.g., `import { apiClient } from '../lib/api-client'`)

**Path Aliases:**
- `@/*`: Points to `src/*` (configured in `tsconfig.json`)
- `@gethiredpoc/shared`: Cross-package imports for shared types
- `@gethiredpoc/backend`: Backend package reference
- Relative paths used for local imports (e.g., `../components/ui/Button`)

## Error Handling

**Patterns:**
- Try-catch blocks with generic error handling (e.g., `catch (error: any)`)
- Errors typed as `any` due to lack of strict error typing
- API client errors: Attempts JSON parsing with fallback (`.catch(() => ({ error: 'Request failed' }))`)
- Service functions throw errors for caller to handle
- Route handlers wrap in try-catch and return JSON error responses with status codes
- Async operations sometimes use `.catch()` for non-blocking error handling
- Email sending is non-blocking and errors logged to console only

**Error Response Pattern:**
```typescript
// Backend returns:
c.json({ error: error.message }, statusCode)

// Frontend throws from API client:
throw new Error(error.error || 'Request failed')
```

**Global Error Handler:**
- Backend: `app.onError((err, c) => { console.error(err); return c.json({ error: 'Internal server error' }, 500); })`
- Frontend: Errors propagate to React Query, causing UI refetch retries or manual error state handling

## Logging

**Framework:** `console` (no dedicated logging library)

**Patterns:**
- Contextual logging with prefixes: `console.log('[Cron]', message)`, `console.log('[Admin]', message)`, `console.log('[Job Import]', message)`
- Warning logs: `console.warn('[Admin] Configuration missing')`
- Error logs: `console.error('Error context:', error)`
- Debug logs for operations: `console.log('Searching Adzuna: ...')`
- Cache hit indicators: `console.log('[AI Resume] Cache hit for ${cacheKey}')`
- Used primarily in backend services for debugging and monitoring

## Comments

**When to Comment:**
- Inline comments explain non-obvious logic (e.g., `// Simulate API delay`, `// Generate realistic mock score`)
- Comments explain "why" decisions, not "what" code does
- Comments for workarounds or TODOs (e.g., `// Note: 'hybrid' filter not yet implemented`)
- Comments for error handling explanations
- Comments for API response field meanings (e.g., `// JSON string: ["React", "TypeScript"]`)

**JSDoc/TSDoc:**
- Not heavily used in codebase
- Type information from TypeScript interfaces is primary documentation
- Some parameter documentation in shared type definitions

## Function Design

**Size:**
- Functions range from 5-50 lines
- Services handle business logic (30-50 lines typical)
- Hooks focused and single-responsibility (10-25 lines)
- Components keep logic minimal, delegation to hooks and services

**Parameters:**
- Typed with explicit interfaces (e.g., `filters?: { title?: string; remote?: boolean; location?: string }`)
- Environment object passed as first parameter in services: `env: Env`
- Request context parameter common in routes: `c` (Hono context)
- Optional parameters use `?` notation
- Destructuring in function parameters when multiple related params

**Return Values:**
- Async functions return `Promise<Type>`
- API handlers return `Response` or JSON via context methods
- Query hooks return React Query result objects with `{ data, isLoading, error }`
- Mutation hooks return mutation function and status
- Services return typed data directly or throw errors

## Module Design

**Exports:**
- Named exports for utilities, services, and hooks (e.g., `export function useJobs()`, `export async function searchAdzunaJobs()`)
- Default exports for page components (e.g., `export default function Profile()`)
- Type exports: `export type { User, Session }` pattern
- Constants exported from types: `export { INDUSTRIES, EMPLOYMENT_STATUS_LABELS }`

**Barrel Files:**
- Shared package uses barrel pattern: `src/index.ts` re-exports all types from subfolders
- Enables clean imports: `import type { User } from '@gethiredpoc/shared'`
- Frontend may use barrel files in components (not verified in sample)

**Module Boundaries:**
- `packages/shared`: Contains only types and constants - no implementation
- `packages/frontend`: React components, hooks, pages, context, styling
- `packages/backend`: Services, routes, middleware, API handlers
- Clear separation: No cross-package implementation code, only type imports

---

*Convention analysis: 2026-02-20*
