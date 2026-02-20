# Architecture

**Analysis Date:** 2026-02-20

## Pattern Overview

**Overall:** Monorepo with client-server separation using Cloudflare Workers (serverless backend) and React (browser frontend), connected through REST API.

**Key Characteristics:**
- Workspace-based monorepo with three packages: `backend`, `frontend`, `shared`
- Backend runs on Cloudflare Workers with D1 database and R2 storage
- Frontend is a React SPA built with Vite deployed to Cloudflare Pages
- Shared types package provides TypeScript interfaces across frontend and backend
- Session-based authentication using secure HTTP-only cookies
- Service-oriented backend architecture with business logic separated from routes

## Layers

**Frontend (React/Vite):**
- Purpose: User interface for job search, applications, profile management, and AI-assisted features
- Location: `packages/frontend/src`
- Contains: React components, pages, hooks, context, utilities
- Depends on: React Router, React Query, Lucide React icons, Tailwind CSS, shared types
- Used by: Browser clients

**Backend (Hono/Cloudflare Workers):**
- Purpose: API server handling authentication, data persistence, external integrations, and AI operations
- Location: `packages/backend/src`
- Contains: Route handlers, services, middleware, database queries
- Depends on: Hono framework, D1 database, R2 storage, KV cache, Cloudflare AI, external APIs
- Used by: Frontend via REST API, Cron jobs for scheduled tasks

**Shared Types:**
- Purpose: Single source of truth for TypeScript interfaces used across frontend and backend
- Location: `packages/shared/src/types`
- Contains: User, Job, Application, Chat, and API type definitions
- Depends on: TypeScript
- Used by: Both frontend and backend packages

**Database (Cloudflare D1):**
- Purpose: Persistent data storage for users, jobs, applications, preferences, etc.
- Contains: Users, sessions, jobs, saved jobs, applications, resumes, work experience, education, preferences
- Access: Through D1 prepared statements in `db.service.ts`

**Storage (Cloudflare R2):**
- Purpose: File storage for resumes, avatars, documents
- Access: Through `storage.service.ts`

**Cache (Cloudflare KV):**
- Purpose: Session storage and temporary caching
- KV_SESSIONS: User session tokens (credentials)
- KV_CACHE: General purpose cache for expensive operations

## Data Flow

**User Authentication Flow:**

1. User enters credentials on Login/Signup page (`packages/frontend/src/pages/Login.tsx`)
2. Frontend calls `apiClient.login()` or `apiClient.signup()` (`packages/frontend/src/lib/api-client.ts`)
3. Backend route handler validates credentials and calls `signup()` or `login()` from `auth.service.ts`
4. `auth.service.ts` hashes password, stores user in D1, creates session in KV_SESSIONS
5. Backend returns Set-Cookie header with session token (HTTP-only cookie)
6. Frontend stores auth state in AuthContext via React Query
7. AuthProvider queries `/api/auth/me` to restore session on page load

**Job Search & Recommendation Flow:**

1. User views Jobs page or triggers search/filter
2. Frontend calls `apiClient.getJobs(filters)` → `GET /api/jobs?...`
3. Backend route `packages/backend/src/routes/jobs.ts` receives request
4. Route calls `requireAuth` middleware to verify user
5. `db.service.ts` queries jobs table with filters
6. If user preferences exist, backend may apply matching logic via `job-matching.service.ts`
7. Results returned to frontend with saved/hidden status
8. Frontend displays via Jobs page with React Query caching

**Job Recommendation Flow:**

1. User navigates to Recommendations page
2. Frontend calls `apiClient.getRecommendations(limit)`
3. Backend route `packages/backend/src/routes/recommendations.ts` receives request
4. Service queries user preferences from database
5. `job-recommendations.service.ts` applies matching algorithm to jobs
6. Returns ranked jobs sorted by match score
7. Frontend displays with cards and action buttons

**AI-Assisted Features Flow:**

1. User clicks "Generate Resume" or "Generate Cover Letter" on job detail
2. Frontend calls `apiClient.generateResume(jobId)` or `apiClient.generateCoverLetter(jobId)`
3. Backend route extracts user profile and job details
4. `ai-resume.service.ts` or `ai-cover-letter.service.ts` builds prompt
5. Calls Cloudflare AI (OpenAI via AI Gateway) with prompt
6. Receives AI-generated content
7. Returns to frontend, user can copy or save
8. Optional: Can export as PDF via `document-export.service.ts`

**Chat/Agent Flow:**

1. User opens ChatInterface component
2. Frontend sends message via `apiClient.sendChatMessage(conversationId, message)`
3. Backend route `packages/backend/src/routes/chat.ts` handles request
4. `chat.service.ts` stores message and builds conversation context
5. Calls AI with full conversation history as context
6. AI may request tool usage (e.g., analyze job, get recommendations)
7. Backend executes requested tool via `ai-prompt.service.ts`
8. AI synthesizes tool result into response
9. Response streamed back to frontend
10. Frontend updates UI with streaming messages

**State Management:**

- Frontend: React Query for server state, AuthContext for authentication state
- Backend: D1 database for persistent state, KV for session and cache
- No Redux/Zustand; using React Query's cache management
- AuthContext wraps app to provide `useAuth()` hook in all components

## Key Abstractions

**Service Layer:**
- Purpose: Encapsulate business logic separate from HTTP handling
- Examples: `auth.service.ts`, `job-matching.service.ts`, `ai-resume.service.ts`
- Pattern: Functions exported from services, called by route handlers
- Each service handles a specific domain (auth, jobs, AI, etc.)

**API Client (`packages/frontend/src/lib/api-client.ts`):**
- Purpose: Centralized HTTP client for all frontend API calls
- Pattern: Object with methods for each endpoint, handles auth, errors, FormData
- Includes: Request interceptor for credentials, error handling, JSON parsing

**Route Handlers:**
- Purpose: HTTP endpoint handlers that orchestrate services
- Location: `packages/backend/src/routes/`
- Pattern: Hono router for each domain (auth.ts, jobs.ts, etc.)
- Each route uses middleware for auth checks, then calls services

**Authentication Middleware:**
- Purpose: Verify user is authenticated/authorized before accessing protected endpoints
- Location: `packages/backend/src/middleware/auth.middleware.ts`
- Functions: `requireAuth()`, `requireAdmin()`, `requirePaidMembership()`
- Pattern: Middleware chain - check auth, set context, pass to next

**Context/Hooks:**
- Purpose: Expose state and actions to components
- Frontend examples: `AuthContext`, `useProfile`, `useJobs`, `useApplications`
- Pattern: Custom hooks using React Query queries and mutations

## Entry Points

**Backend (`packages/backend/src/index.ts`):**
- Location: `packages/backend/src/index.ts`
- Triggers: HTTP requests via Cloudflare Workers, scheduled cron jobs
- Responsibilities:
  - Create Hono app with CORS middleware
  - Mount all route handlers
  - Export fetch handler and scheduled handler
  - Scheduled: Daily job imports from Adzuna API at 1 AM UTC

**Frontend (`packages/frontend/src/main.tsx`):**
- Location: `packages/frontend/src/main.tsx`
- Triggers: Browser navigation
- Responsibilities:
  - Initialize React root
  - Setup QueryClient with default options
  - Wrap app with BrowserRouter, QueryClientProvider, AuthProvider
  - Render App component

**Frontend App Routes (`packages/frontend/src/App.tsx`):**
- Location: `packages/frontend/src/App.tsx`
- Defines: All public and protected routes
- Public: Home, Login, Signup
- Protected (user): Onboarding, Jobs, Saved Jobs, Recommendations, Profile, Applications, Resume, Settings, Preferences
- Protected (admin): Admin Dashboard, Users, Jobs, Prompts
- Uses: ProtectedRoute component to guard routes with auth checks

## Error Handling

**Strategy:** Two-layer error handling - middleware rejects invalid requests, services throw errors caught by routes

**Patterns:**

- Middleware errors: Return HTTP error responses (400, 401, 403, 404, 500)
- Service layer: Throw descriptive Error objects with messages
- Route handlers: Wrap service calls in try-catch, convert to JSON responses
- Frontend: apiClient.request() throws on non-2xx status, caught by React Query or page logic
- User errors: Display error toast/notification via UI component
- Backend logging: console.error() for debugging, visible in Cloudflare logs

**Example** (`packages/backend/src/routes/auth.ts`):
```typescript
auth.post('/signup', async (c) => {
  try {
    const body = await c.req.json();
    // ... validation ...
    const { user, sessionId } = await signup(c.env, email, password);
    return c.json({ user }, 201, { 'Set-Cookie': ... });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});
```

## Cross-Cutting Concerns

**Logging:**
- Backend: console.log/console.error in services and routes
- Visible in Cloudflare Workers dashboard
- Cron jobs log start/completion with timestamps
- No centralized logging aggregation configured

**Validation:**
- Route handlers validate request bodies (email, password presence)
- Database layer provides type safety through TypeScript
- Frontend forms validate before submission
- No dedicated validation library (bcryptjs used for password hashing)

**Authentication:**
- Session-based with HTTP-only secure cookies
- Sessions stored in KV_SESSIONS with user_id and expiration
- `getCurrentUser()` in auth.service retrieves session and loads user
- Middleware applies auth checks per route
- Frontend AuthContext provides `useAuth()` hook for components

**API Communication:**
- REST API with JSON request/response
- CORS enabled for development and production origins
- Credentials included in all requests (for cookie auth)
- Single apiClient object centralizes all endpoints

---

*Architecture analysis: 2026-02-20*
