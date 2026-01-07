# Migration Plan: RW SDK → Vite + React SPA + Express API

## Overview
Rebuild JobMatch AI application from RW SDK to a standard tech stack while preserving all existing functionality and data.

## Architecture Decisions

### Tech Stack
- **Frontend**: Vite + React 19 + TypeScript + React Router v6
- **Backend**: Hono (not Express) on Cloudflare Workers
- **UI**: shadcn/ui components + Tailwind CSS
- **State**: React Query (TanStack Query) for data fetching/caching
- **Auth**: HTTPOnly cookie sessions (keep existing flow)
- **Infrastructure**: Keep Cloudflare D1, R2, KV (no data migration needed)
- **Drag-and-Drop**: @dnd-kit for Applications kanban board

**Key Decision: Hono over Express**
- Hono is designed for Cloudflare Workers runtime (V8 isolates, not Node.js)
- No adapter needed - works natively with Workers Request/Response
- Smaller bundle, faster performance
- Express-like API but built for edge computing

### Project Structure (Monorepo)
```
gethiredpoc/
├── packages/
│   ├── shared/          # Shared TypeScript types
│   ├── backend/         # Hono API on Cloudflare Workers
│   └── frontend/        # Vite React SPA
├── migrations/          # Keep existing D1 migrations
├── wrangler.toml        # Backend deployment config
└── package.json         # Workspace root
```

## Implementation Phases

### Phase 1: Setup Project Structure (Day 1-2)
1. Create monorepo with npm workspaces
2. Initialize packages: `shared`, `backend`, `frontend`
3. Copy existing migrations to root
4. Set up TypeScript configs with path aliases

**Files to create:**
- `/package.json` - workspace root config
- `/packages/shared/package.json` + `/packages/shared/tsconfig.json`
- `/packages/backend/package.json` + `/packages/backend/tsconfig.json`
- `/packages/frontend/package.json` + `/packages/frontend/tsconfig.json` + `/packages/frontend/vite.config.ts`

### Phase 2: Shared Types (Day 2)
1. Extract all TypeScript interfaces from current codebase
2. Create type definitions in `packages/shared/src/types/`

**Files to create:**
- `/packages/shared/src/types/user.ts` - User, Session types
- `/packages/shared/src/types/job.ts` - Job, SavedJob types
- `/packages/shared/src/types/application.ts` - Application types
- `/packages/shared/src/types/api.ts` - API request/response types
- `/packages/shared/src/index.ts` - Export all types

### Phase 3: Backend API with Hono (Day 3-5)

**Step 1: Core Setup**
```typescript
// /packages/backend/src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authRoutes } from './routes/auth';
import { jobsRoutes } from './routes/jobs';
import { applicationsRoutes } from './routes/applications';
import { profileRoutes } from './routes/profile';

type Bindings = {
  DB: D1Database;
  STORAGE: R2Bucket;
  KV_CACHE: KVNamespace;
  KV_SESSIONS: KVNamespace;
  AI: any;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('/*', cors({
  origin: (origin) => origin, // Allow configured origins
  credentials: true
}));

app.route('/api/auth', authRoutes);
app.route('/api/jobs', jobsRoutes);
app.route('/api/applications', applicationsRoutes);
app.route('/api/profile', profileRoutes);

export default app;
```

**Step 2: Port Auth Logic**
- Copy logic from `/home/carl/project/gethiredpoc/src/app/api/auth.ts`
- Adapt to Hono route handlers
- Keep bcrypt hashing, session management with KV

**Step 3: Port Remaining APIs**
- Jobs API (including AI analysis)
- Applications API
- Profile API (including R2 file uploads)

**Critical files to create:**
- `/packages/backend/src/index.ts` - Hono app entry
- `/packages/backend/src/routes/auth.ts` - Auth endpoints
- `/packages/backend/src/routes/jobs.ts` - Jobs endpoints
- `/packages/backend/src/routes/applications.ts` - Applications endpoints
- `/packages/backend/src/routes/profile.ts` - Profile endpoints
- `/packages/backend/src/services/auth.service.ts` - Auth business logic
- `/packages/backend/src/services/db.service.ts` - Database operations
- `/packages/backend/src/services/storage.service.ts` - R2 file handling
- `/packages/backend/wrangler.toml` - Cloudflare config (copy from root)

### Phase 4: Frontend React SPA (Day 6-8)

**Step 1: Vite + React Setup**
```bash
npm create vite@latest packages/frontend -- --template react-ts
```

**Step 2: Install Dependencies**
```bash
cd packages/frontend
npm install react-router-dom @tanstack/react-query
npm install @dnd-kit/core @dnd-kit/sortable
npm install clsx tailwind-merge lucide-react
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Step 3: Setup shadcn/ui**
```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card badge input label
```

**Step 4: Configure Routing**
```typescript
// /packages/frontend/src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="/saved" element={<SavedJobs />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/applications" element={<Applications />} />
      </Route>
    </Routes>
  );
}
```

**Step 5: API Client with React Query**
```typescript
// /packages/frontend/src/lib/api-client.ts
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export const apiClient = {
  async request(endpoint: string, options?: RequestInit) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    return response.json();
  },

  // Auth
  signup: (email: string, password: string) =>
    apiClient.request('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),

  // ... other methods
};
```

**Step 6: Migrate Pages**
Port each page from `/home/carl/project/gethiredpoc/src/app/pages/`:
1. Home.tsx - Landing page
2. Login.tsx - Login form
3. Signup.tsx - Signup form
4. Jobs.tsx - Job listings with search/filter
5. JobDetail.tsx - Job detail with Apply, Save, AI Analysis
6. SavedJobs.tsx - Saved jobs list
7. Profile.tsx - User profile view/edit
8. Applications.tsx - Kanban board with @dnd-kit

**Step 7: Create Reusable Components**
- Navigation.tsx (from `/home/carl/project/gethiredpoc/src/app/components/Navigation.tsx`)
- ProtectedRoute.tsx (new - wraps protected routes)
- UI components from shadcn/ui (Button, Card, Badge, Input, Label)

**Critical files to create:**
- `/packages/frontend/src/main.tsx` - React entry point
- `/packages/frontend/src/App.tsx` - Router configuration
- `/packages/frontend/src/lib/api-client.ts` - API communication
- `/packages/frontend/src/hooks/useAuth.ts` - Auth state with React Query
- `/packages/frontend/src/hooks/useJobs.ts` - Jobs queries
- `/packages/frontend/src/hooks/useApplications.ts` - Applications queries
- `/packages/frontend/src/context/AuthContext.tsx` - Auth provider
- `/packages/frontend/src/components/Navigation.tsx` - Top nav bar
- `/packages/frontend/src/components/ProtectedRoute.tsx` - Auth guard
- `/packages/frontend/src/pages/*.tsx` - All 8 page components
- `/packages/frontend/index.html` - HTML entry
- `/packages/frontend/vite.config.ts` - Vite config
- `/packages/frontend/tailwind.config.js` - Tailwind config
- `/packages/frontend/src/styles/globals.css` - Global styles

### Phase 5: Integration & Testing (Day 9-10)

**Local Development**
1. Start backend: `cd packages/backend && wrangler dev`
2. Start frontend: `cd packages/frontend && npm run dev`
3. Test all features end-to-end:
   - Signup/Login flow
   - Job browsing and search
   - Save jobs
   - Apply for jobs
   - AI match analysis
   - Profile editing with avatar upload
   - Application tracker with drag-and-drop

**Fix Issues**
- Debug CORS configuration
- Fix cookie handling (HTTPOnly, Secure, SameSite)
- Verify session persistence
- Test file uploads to R2

### Phase 6: Deployment (Day 11-12)

**Backend Deployment**
```bash
cd packages/backend
npm run build
wrangler deploy
# Output: https://gethiredpoc-api.workers.dev
```

**Frontend Deployment**
```bash
cd packages/frontend
npm run build
npx wrangler pages deploy dist --project-name=gethiredpoc
# Output: https://gethiredpoc.pages.dev
```

**Configure Environment Variables**
- Backend: Set `FRONTEND_URL` in wrangler.toml or via Wrangler secrets
- Frontend: Set `VITE_API_URL` in Cloudflare Pages settings

**Test Production**
- Run through full user flow on production URLs
- Verify all API endpoints work
- Test file uploads
- Verify drag-and-drop works

## Critical Implementation Details

### 1. Cookie Configuration for Cross-Origin

**Development (same origin):**
```typescript
c.cookie('session', sessionId, {
  httpOnly: true,
  secure: false,
  sameSite: 'lax',
  maxAge: 604800 // 7 days
});
```

**Production (cross-origin):**
```typescript
c.cookie('session', sessionId, {
  httpOnly: true,
  secure: true,
  sameSite: 'none', // Required for cross-origin
  maxAge: 604800
});
```

### 2. R2 File Upload with Hono

```typescript
// In profile route
app.put('/profile', async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('avatar') as File;

  if (file) {
    const key = `avatars/${userId}/${Date.now()}-${file.name}`;
    await c.env.STORAGE.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type }
    });

    const avatarUrl = `/api/files/${key}`;
    // Update user in DB
  }
});
```

### 3. React Query Setup

```typescript
// /packages/frontend/src/main.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1
    }
  }
});

<QueryClientProvider client={queryClient}>
  <AuthProvider>
    <App />
  </AuthProvider>
</QueryClientProvider>
```

### 4. Drag-and-Drop Kanban

```typescript
import { DndContext, closestCorners } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

export default function Applications() {
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      updateApplicationMutation.mutate({
        id: active.id,
        status: over.id // new status column
      });
    }
  };

  return (
    <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCorners}>
      {STATUSES.map(status => (
        <SortableContext key={status} items={apps[status]} strategy={verticalListSortingStrategy}>
          {/* Application cards */}
        </SortableContext>
      ))}
    </DndContext>
  );
}
```

### 5. Protected Routes Pattern

```typescript
// /packages/frontend/src/components/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
```

## Key Files Reference

### Must Port from Current Codebase
- `/home/carl/project/gethiredpoc/src/app/api/auth.ts` → Backend auth routes
- `/home/carl/project/gethiredpoc/src/app/api/jobs.ts` → Backend jobs routes
- `/home/carl/project/gethiredpoc/src/app/api/applications.ts` → Backend applications routes
- `/home/carl/project/gethiredpoc/src/app/api/profile.ts` → Backend profile routes
- `/home/carl/project/gethiredpoc/src/app/lib/db.ts` → Database service
- `/home/carl/project/gethiredpoc/src/app/lib/auth.ts` → Auth utilities
- `/home/carl/project/gethiredpoc/src/app/pages/*.tsx` → All 8 page components
- `/home/carl/project/gethiredpoc/src/app/components/Navigation.tsx` → Navigation
- `/home/carl/project/gethiredpoc/src/app/components/ui/*.tsx` → UI components (replace with shadcn/ui)
- `/home/carl/project/gethiredpoc/src/app/styles/globals.css` → Global styles
- `/home/carl/project/gethiredpoc/migrations/*.sql` → Database migrations

### Keep As-Is
- All database migrations (no changes needed)
- Cloudflare resources (D1, R2, KV - same IDs)

## No Data Migration Required
✅ Using same D1 database
✅ Using same R2 bucket
✅ Using same KV namespaces
✅ All existing user data, jobs, applications preserved

## Rollback Plan
- Keep current RW SDK code in `main` branch
- Work in new `migrate-to-spa` branch
- Can revert by switching branches and redeploying old Worker
- No data loss risk since infrastructure unchanged

## Success Criteria
- [ ] All 8 pages render correctly
- [ ] Authentication works (signup, login, logout, session persistence)
- [ ] Job browsing with search/filter works
- [ ] Save/unsave jobs works
- [ ] Apply for jobs works
- [ ] AI match analysis works
- [ ] Profile edit works including avatar upload
- [ ] Application tracker kanban with drag-and-drop works
- [ ] All API endpoints return correct data
- [ ] Production deployment successful
- [ ] No regressions in functionality
