# Codebase Structure

**Analysis Date:** 2026-02-20

## Directory Layout

```
gethiredpoc/
├── packages/
│   ├── backend/                    # Cloudflare Workers API server
│   │   ├── src/
│   │   │   ├── index.ts            # Hono app entry point, route mounting
│   │   │   ├── routes/             # HTTP route handlers
│   │   │   ├── services/           # Business logic
│   │   │   └── middleware/         # Auth and CORS middleware
│   │   ├── dist/                   # Compiled TypeScript (git ignored)
│   │   ├── .wrangler/              # Cloudflare dev state (git ignored)
│   │   ├── wrangler.toml           # Cloudflare Workers config
│   │   ├── tsconfig.json           # TypeScript config
│   │   └── package.json
│   │
│   ├── frontend/                   # React SPA (Vite)
│   │   ├── src/
│   │   │   ├── main.tsx            # React root, providers setup
│   │   │   ├── App.tsx             # Route definitions
│   │   │   ├── components/         # Reusable React components
│   │   │   ├── pages/              # Page components
│   │   │   ├── context/            # React Context (AuthContext)
│   │   │   ├── hooks/              # Custom React hooks
│   │   │   ├── lib/                # Utilities (api-client.ts)
│   │   │   └── styles/             # Global CSS
│   │   ├── dist/                   # Built HTML/JS/CSS (git ignored)
│   │   ├── .wrangler/              # Cloudflare Pages dev state (git ignored)
│   │   ├── vite.config.ts          # Vite build config
│   │   ├── tsconfig.json           # TypeScript config
│   │   ├── tailwind.config.js      # Tailwind CSS config
│   │   ├── postcss.config.js       # PostCSS config
│   │   └── package.json
│   │
│   └── shared/                     # TypeScript type definitions
│       ├── src/
│       │   ├── types/              # Shared type files
│       │   └── index.ts            # Barrel export
│       ├── dist/                   # Compiled types (git ignored)
│       ├── tsconfig.json
│       └── package.json
│
├── migrations/                     # D1 database migration files
├── docs/                          # Documentation
├── .git/                          # Git repository
├── package.json                   # Workspace root config
├── package-lock.json
└── .gitignore

```

## Directory Purposes

**packages/backend/src/routes:**
- Purpose: HTTP route handlers organized by domain
- Contains: Hono router instances for auth, jobs, applications, admin, etc.
- Key files:
  - `auth.ts`: Signup, login, logout, me endpoint
  - `jobs.ts`: Get jobs, save/unsave, hide/unhide, analyze job
  - `applications.ts`: CRUD for user applications
  - `profile.ts`: Get/update user profile
  - `admin.ts`: Admin dashboard endpoints
  - `chat.ts`: Chat conversation messages
  - `recommendations.ts`: Job recommendations engine
  - `export.ts`: Document export (resume, cover letter)

**packages/backend/src/services:**
- Purpose: Business logic encapsulation
- Contains: Service functions for distinct domains
- Key files:
  - `db.service.ts`: Database query functions and Env type definition
  - `auth.service.ts`: Password hashing, user creation, session management
  - `job-matching.service.ts`: Match user preferences to jobs
  - `job-recommendations.service.ts`: Recommend jobs to user
  - `ai-resume.service.ts`: Generate resume via AI
  - `ai-cover-letter.service.ts`: Generate cover letter via AI
  - `ai-prompt.service.ts`: Build prompts for AI calls
  - `adzuna.service.ts`: Fetch jobs from Adzuna API
  - `email.service.ts`: Send emails via Resend
  - `storage.service.ts`: Upload/download files from R2
  - `chat.service.ts`: Manage chat conversations and messages
  - `linkedin.service.ts`: LinkedIn OAuth integration
  - `document-export.service.ts`: Export to PDF/DOCX

**packages/backend/src/middleware:**
- Purpose: Request preprocessing and authentication
- Contains: Middleware functions used in routes
- Key files:
  - `auth.middleware.ts`: `requireAuth()`, `requireAdmin()`, `requirePaidMembership()` middleware

**packages/frontend/src/pages:**
- Purpose: Full-page components matching routes
- Contains: One component per route, handles page-level logic
- Key files:
  - `Home.tsx`: Landing page, public
  - `Login.tsx`, `Signup.tsx`: Auth pages
  - `Jobs.tsx`: Job listing with filters
  - `JobDetail.tsx`: Single job view with AI features
  - `SavedJobs.tsx`: User's saved jobs
  - `Recommendations.tsx`: AI job recommendations
  - `Profile.tsx`: User profile editor
  - `Applications.tsx`: Track job applications
  - `Resume.tsx`: Resume management
  - `Settings.tsx`: User settings
  - `JobPreferences.tsx`: Job search preferences
  - `Onboarding.tsx`: First-time user setup
  - `admin/AdminDashboard.tsx`: Admin panel

**packages/frontend/src/components:**
- Purpose: Reusable UI components
- Contains: Presentational and container components
- Key files:
  - `layouts/UserLayout.tsx`: Main layout for authenticated users (sidebar, nav)
  - `layouts/AdminLayout.tsx`: Layout for admin pages
  - `Sidebar.tsx`: Navigation sidebar
  - `Navigation.tsx`: Top nav
  - `ProtectedRoute.tsx`: Route guard component
  - `OnboardingWizard.tsx`: Guided setup flow
  - `ChatInterface.tsx`: AI chat UI
  - `WorkExperience.tsx`: Work history input form
  - `Education.tsx`: Education history input form
  - `ui/`: Headless UI components (Button, Input, Label, Badge, Card)

**packages/frontend/src/context:**
- Purpose: Global state via React Context
- Contains: Context providers and custom hooks
- Key files:
  - `AuthContext.tsx`: Authentication state (user, login, logout mutations)

**packages/frontend/src/hooks:**
- Purpose: Custom React hooks for data fetching
- Contains: Hooks using React Query for API calls
- Key files:
  - `useProfile.ts`: Get/update user profile
  - `useJobs.ts`: Fetch jobs with filters
  - `useApplications.ts`: Fetch user applications
  - `useJobPreferences.ts`: Get/update job preferences
  - `useRecommendations.ts`: Fetch recommendations

**packages/frontend/src/lib:**
- Purpose: Shared utilities and helpers
- Contains:
  - `api-client.ts`: Centralized HTTP client for all endpoints

**packages/frontend/src/styles:**
- Purpose: Global CSS and Tailwind customization
- Contains:
  - `globals.css`: Global styles imported in main.tsx

**packages/shared/src/types:**
- Purpose: TypeScript interfaces used across packages
- Contains:
  - `user.ts`: User, Session, UserWithSkills types
  - `job.ts`: Job, SavedJob, JobWithRequirements types
  - `application.ts`: Application, AIAnalysis types
  - `chat.ts`: ChatMessage, ChatConversation types
  - `preferences.ts`: JobSearchPreferences, constants
  - `api.ts`: Request/response types for all endpoints

## Key File Locations

**Entry Points:**
- Backend: `packages/backend/src/index.ts` - Hono app setup and route mounting
- Frontend: `packages/frontend/src/main.tsx` - React root and provider setup
- Frontend routes: `packages/frontend/src/App.tsx` - Route definitions and guards

**Configuration:**
- Backend: `packages/backend/wrangler.toml` - Cloudflare Workers config (env vars, bindings, databases)
- Backend: `packages/backend/tsconfig.json` - TypeScript with ES2022 target
- Frontend: `packages/frontend/vite.config.ts` - Vite build config with React plugin
- Frontend: `packages/frontend/tailwind.config.js` - Tailwind CSS customization
- Frontend: `packages/frontend/tsconfig.json` - TypeScript with React JSX

**Core Logic:**
- Authentication: `packages/backend/src/services/auth.service.ts`
- Jobs: `packages/backend/src/routes/jobs.ts` + `packages/backend/src/services/job-*.service.ts`
- Applications: `packages/backend/src/routes/applications.ts`
- AI Features: `packages/backend/src/services/ai-*.service.ts`
- API Client: `packages/frontend/src/lib/api-client.ts`
- Auth Context: `packages/frontend/src/context/AuthContext.tsx`

**Testing:**
- None currently configured (no test files found)

**Database:**
- Migrations: `migrations/` directory (applied by Cloudflare D1)
- Schema queries: Inline in `packages/backend/src/services/db.service.ts`

## Naming Conventions

**Files:**
- Services: `domain.service.ts` (e.g., `auth.service.ts`, `job-matching.service.ts`)
- Routes: `domain.ts` (e.g., `jobs.ts`, `applications.ts`)
- Pages: PascalCase (e.g., `JobDetail.tsx`, `SavedJobs.tsx`)
- Components: PascalCase (e.g., `Sidebar.tsx`, `OnboardingWizard.tsx`)
- Utilities: camelCase (e.g., `api-client.ts`, `auth.middleware.ts`)
- Types: domain + extension (e.g., `user.ts`, `job.ts`, `chat.ts`)

**Directories:**
- Multi-word: kebab-case (e.g., `job-preferences`, `work-experience`, `email-preferences`)
- Single word: lowercase (e.g., `routes`, `services`, `hooks`, `pages`, `components`, `styles`)
- Organizational: PascalCase for layout/feature subdirs (e.g., `layouts`, `admin`)
- UI components: `ui/` subdirectory with PascalCase components

**Variables/Functions:**
- camelCase for functions, variables, exported constants
- SCREAMING_SNAKE_CASE for enum values and constants (e.g., in `preferences.ts`: `INDUSTRIES`, `EMPLOYMENT_STATUS_LABELS`)
- Types: PascalCase interfaces (e.g., `User`, `Job`, `AuthContextType`)

## Where to Add New Code

**New Feature (e.g., "Jobs Matching"):**
- Service layer: `packages/backend/src/services/job-matching.service.ts`
- Route handlers: Add endpoints to `packages/backend/src/routes/jobs.ts`
- Frontend page: Create `packages/frontend/src/pages/JobMatching.tsx`
- Frontend components: Add to `packages/frontend/src/components/` (e.g., `MatchingFilter.tsx`)
- Custom hook: `packages/frontend/src/hooks/useJobMatching.ts` (if complex data fetching)
- API client: Add methods to `packages/frontend/src/lib/api-client.ts`
- Types: Add to `packages/shared/src/types/job.ts` or new domain file

**New Component/Module:**
- Implementation: `packages/frontend/src/components/YourComponent.tsx` (reusable) or `packages/frontend/src/pages/YourPage.tsx` (full page)
- Styling: Use Tailwind CSS inline (via `className`), no separate CSS files
- If using form: Consider importing from `packages/frontend/src/components/ui/` (Input, Button, Label, etc.)

**Backend Service Function:**
- Location: `packages/backend/src/services/domain.service.ts` (create if doesn't exist)
- Pattern: Export async function that takes `env: Env` as first param, returns Promise
- Call from routes: Import in appropriate route file, call within try-catch

**Shared Type:**
- Location: `packages/shared/src/types/domain.ts`
- Export in: `packages/shared/src/index.ts` (barrel export)
- Usage: Import in both backend and frontend from `@gethiredpoc/shared`

**New API Endpoint:**
1. Create/extend service in `packages/backend/src/services/`
2. Add route handler in `packages/backend/src/routes/domain.ts`
3. Mount route in `packages/backend/src/index.ts` if new domain
4. Add type in `packages/shared/src/types/api.ts` (request/response types)
5. Add client method in `packages/frontend/src/lib/api-client.ts`
6. Use in component via fetch or custom hook with React Query

## Special Directories

**Migrations (`migrations/`):**
- Purpose: D1 database schema migrations
- Generated: By developer, committed to git
- Applied: Automatically by Cloudflare on deployment
- Not committed: No (migrations should be committed)

**dist/ directories:**
- Purpose: Compiled/built output
- Generated: Yes (by `npm run build` or `npm run dev`)
- Committed: No (all in .gitignore)

**.wrangler/ directories:**
- Purpose: Local Cloudflare development state
- Generated: Yes (by `wrangler dev`)
- Committed: No (git ignored, contains local miniflare state)

**node_modules/**
- Purpose: Installed dependencies
- Generated: Yes (by `npm install`)
- Committed: No (git ignored, use package-lock.json)

---

*Structure analysis: 2026-02-20*
