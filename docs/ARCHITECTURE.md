# GetHiredPOC - System Architecture Documentation

This document provides a comprehensive overview of the GetHiredPOC system architecture, including technology stack, database schema, API design, and AI services integration.

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Infrastructure Architecture](#infrastructure-architecture)
4. [Database Schema](#database-schema)
5. [API Architecture](#api-architecture)
6. [AI Services Architecture](#ai-services-architecture)
7. [Authentication & Authorization](#authentication--authorization)
8. [Frontend Architecture](#frontend-architecture)
9. [File Structure](#file-structure)
10. [Data Flow Diagrams](#data-flow-diagrams)
11. [Security Architecture](#security-architecture)
12. [Performance Optimization](#performance-optimization)

---

## System Overview

GetHiredPOC is a modern job search SaaS platform with AI-powered features built on Cloudflare's edge infrastructure. The system enables users to search for jobs, get AI-powered match analysis, generate tailored cover letters and resumes, and interact with an AI chat assistant for job discovery.

### Key Features

- **User Management**: Secure authentication, role-based access control, membership tiers
- **Job Discovery**: Job search, filtering, saving, and application tracking
- **AI Features**: Job matching analysis, cover letter generation, resume tailoring, chat assistant
- **Admin Dashboard**: System metrics, user management, job import, AI prompt configuration
- **LinkedIn Integration**: OAuth-based profile import
- **Mobile-First Design**: Responsive UI with collapsible sidebar

### Architecture Principles

- **Edge-First**: Built entirely on Cloudflare's edge infrastructure for global performance
- **Serverless**: No traditional servers to manage - scales automatically
- **Type-Safe**: Full TypeScript coverage across frontend and backend
- **API-First**: Clear separation between frontend and backend via REST API
- **Security-First**: Role-based access, encrypted secrets, audit logging

---

## Technology Stack

### Frontend

| Technology | Purpose | Version |
|------------|---------|---------|
| **React** | UI framework | 19.x |
| **TypeScript** | Type safety | 5.x |
| **Vite** | Build tool and dev server | 5.x |
| **React Router** | Client-side routing | 6.x |
| **Tailwind CSS** | Styling framework | 3.x |
| **Lucide React** | Icon library | Latest |

### Backend

| Technology | Purpose | Version |
|------------|---------|---------|
| **Hono** | Web framework (lightweight Express alternative) | 4.x |
| **TypeScript** | Type safety | 5.x |
| **Cloudflare Workers** | Serverless runtime | Latest |
| **Wrangler** | Cloudflare CLI and deployment tool | 3.x |

### Data Layer

| Technology | Purpose | Details |
|------------|---------|---------|
| **D1 Database** | Primary SQL database | SQLite-based, edge-replicated |
| **KV Store** | Key-value cache and sessions | Low-latency distributed cache |
| **R2 Storage** | Object storage for files | S3-compatible file storage |

### AI Services

| Service | Purpose | Model |
|---------|---------|-------|
| **Anthropic Claude** | Chat assistant | Claude Sonnet 3.5 |
| **Cloudflare Workers AI** | Batch operations | Llama 3.1 8B Instruct |
| **AI Gateway** | Caching, rate limiting, observability | Cloudflare AI Gateway |

### External APIs

| Service | Purpose | Usage |
|---------|---------|-------|
| **Adzuna** | Job listings data | Job search and import |
| **LinkedIn** | Profile import | OAuth 2.0 authentication |
| **Resend** | Transactional emails | Email delivery |

---

## Infrastructure Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Cloudflare Global Network                    │
│                          (Edge Locations)                        │
└─────────────────────────────────────────────────────────────────┘
                                  │
                   ┌──────────────┼──────────────┐
                   │                             │
         ┌─────────▼─────────┐         ┌────────▼────────┐
         │  Cloudflare Pages │         │ Cloudflare      │
         │   (Frontend CDN)  │         │  Workers API    │
         │                   │         │   (Backend)     │
         │  - React App      │         │                 │
         │  - Static Assets  │         │  - Hono Server  │
         │  - Auto-scaled    │         │  - Auto-scaled  │
         └───────────────────┘         └────────┬────────┘
                                                 │
                         ┌───────────────────────┼───────────────────────┐
                         │                       │                       │
                    ┌────▼────┐           ┌──────▼──────┐         ┌─────▼─────┐
                    │   D1    │           │     KV      │         │     R2    │
                    │Database │           │   Storage   │         │  Storage  │
                    │         │           │             │         │           │
                    │ - Users │           │ - Sessions  │         │ - Resumes │
                    │ - Jobs  │           │ - Cache     │         │ - Files   │
                    │ - Chats │           │ - Prompts   │         │           │
                    └─────────┘           └─────────────┘         └───────────┘
                                                 │
                         ┌───────────────────────┼───────────────────────┐
                         │                       │                       │
                    ┌────▼────┐           ┌──────▼──────┐         ┌─────▼─────┐
                    │Anthropic│           │  Cloudflare │         │  Adzuna   │
                    │ Claude  │           │ Workers AI  │         │    API    │
                    │   API   │           │  (Llama)    │         │           │
                    │         │           │             │         │           │
                    │Chat, Q&A│           │Cover Letter │         │Job Search │
                    └─────────┘           └─────────────┘         └───────────┘
```

### Edge Architecture Benefits

- **Low Latency**: Runs in 300+ Cloudflare data centers worldwide
- **Auto-Scaling**: Automatically scales to handle traffic spikes
- **High Availability**: Built-in redundancy and failover
- **DDoS Protection**: Cloudflare's network absorbs attacks
- **Global Distribution**: Serves users from nearest edge location

---

## Database Schema

### Core Tables

#### users

Primary user account and profile data.

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,                          -- UUID
  email TEXT UNIQUE NOT NULL,                   -- Login email
  password_hash TEXT NOT NULL,                  -- bcrypt hash
  full_name TEXT,                               -- Display name
  bio TEXT,                                     -- User bio/summary
  location TEXT,                                -- City, State, Country
  skills TEXT,                                  -- JSON: ["React", "TypeScript"]
  avatar_url TEXT,                              -- Profile picture URL
  linkedin_url TEXT,                            -- LinkedIn profile URL
  address TEXT,                                 -- Full address

  -- Phase 1: Admin & Membership
  role TEXT DEFAULT 'user',                     -- 'user' | 'admin'
  membership_tier TEXT DEFAULT 'trial',         -- 'trial' | 'paid'
  membership_started_at INTEGER,                -- Unix timestamp
  membership_expires_at INTEGER,                -- Unix timestamp
  trial_started_at INTEGER DEFAULT (unixepoch()),

  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

#### sessions

User authentication sessions.

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,                          -- Session token
  user_id TEXT NOT NULL,                        -- FK to users
  expires_at INTEGER NOT NULL,                  -- Unix timestamp
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

#### jobs

Job listings from Adzuna and manual imports.

```sql
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,                          -- UUID
  title TEXT NOT NULL,                          -- Job title
  company TEXT NOT NULL,                        -- Company name
  location TEXT,                                -- City, State
  state TEXT,                                   -- State abbreviation
  remote INTEGER DEFAULT 0,                     -- Boolean: 0=on-site, 1=remote, 2=hybrid
  description TEXT,                             -- Full job description
  requirements TEXT,                            -- JSON: ["3+ years", "React"]
  salary_min INTEGER,                           -- Annual salary minimum
  salary_max INTEGER,                           -- Annual salary maximum
  posted_date INTEGER DEFAULT (unixepoch()),    -- When job was posted
  source TEXT DEFAULT 'adzuna',                 -- 'adzuna' | 'manual' | 'user'
  source_url TEXT,                              -- External job posting URL
  is_hidden INTEGER DEFAULT 0,                  -- Admin can hide jobs
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_jobs_title ON jobs(title);
CREATE INDEX idx_jobs_location ON jobs(location);
CREATE INDEX idx_jobs_state ON jobs(state);
CREATE INDEX idx_jobs_remote ON jobs(remote);
CREATE INDEX idx_jobs_company ON jobs(company);
CREATE INDEX idx_jobs_is_hidden ON jobs(is_hidden);
```

#### saved_jobs

User's bookmarked jobs.

```sql
CREATE TABLE saved_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  UNIQUE(user_id, job_id)
);

CREATE INDEX idx_saved_jobs_user_id ON saved_jobs(user_id);
```

#### applications

Job applications with status tracking.

```sql
CREATE TABLE applications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  status TEXT DEFAULT 'saved',                  -- 'saved' | 'applied' | 'interview' | 'offer' | 'rejected'
  notes TEXT,                                   -- User's notes
  ai_match_score INTEGER,                       -- 0-100 match score
  ai_analysis TEXT,                             -- JSON: cached AI match analysis
  applied_date INTEGER,                         -- When user applied
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_applications_status ON applications(status);
```

### Profile Tables

#### work_experience

User's work history.

```sql
CREATE TABLE work_experience (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company TEXT NOT NULL,
  title TEXT NOT NULL,
  location TEXT,
  start_date TEXT,                              -- YYYY-MM format
  end_date TEXT,                                -- YYYY-MM or null (current)
  description TEXT,                             -- Responsibilities and achievements
  is_current INTEGER DEFAULT 0,                 -- Boolean
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_work_experience_user_id ON work_experience(user_id);
```

#### education

User's education history.

```sql
CREATE TABLE education (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  school TEXT NOT NULL,
  degree TEXT,
  field_of_study TEXT,
  start_date TEXT,                              -- YYYY format
  end_date TEXT,                                -- YYYY or null (current)
  is_current INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_education_user_id ON education(user_id);
```

#### job_search_preferences

User's job search criteria.

```sql
CREATE TABLE job_search_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  desired_titles TEXT,                          -- JSON: ["Software Engineer", "Developer"]
  desired_locations TEXT,                       -- JSON: ["San Francisco", "Remote"]
  desired_states TEXT,                          -- JSON: ["CA", "NY"]
  remote_only INTEGER DEFAULT 0,
  min_salary INTEGER,
  max_salary INTEGER,
  job_types TEXT,                               -- JSON: ["full-time", "contract"]
  industries TEXT,                              -- JSON: ["tech", "finance"]
  company_sizes TEXT,                           -- JSON: ["startup", "enterprise"]
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### AI & Chat Tables

#### ai_prompts

Configurable AI prompt templates (Phase 2).

```sql
CREATE TABLE ai_prompts (
  id TEXT PRIMARY KEY,
  prompt_key TEXT UNIQUE NOT NULL,              -- 'cover_letter', 'job_match', etc.
  prompt_name TEXT NOT NULL,                    -- Human-readable name
  prompt_template TEXT NOT NULL,                -- Template with {{variable}} placeholders
  description TEXT,                             -- What this prompt does
  model_config TEXT,                            -- JSON: {model, temperature, max_tokens, gateway}
  version INTEGER DEFAULT 1,                    -- Version tracking
  is_active INTEGER DEFAULT 1,                  -- Soft delete flag
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_ai_prompts_key ON ai_prompts(prompt_key);
CREATE INDEX idx_ai_prompts_active ON ai_prompts(is_active);
```

Default prompts:
- `cover_letter` - Generate personalized cover letters
- `job_match` - Analyze candidate-job fit
- `resume_tailor` - Create tailored resumes
- `linkedin_parse` - Extract structured data from LinkedIn profiles

#### chat_conversations

User's chat conversations with AI assistant (Phase 4).

```sql
CREATE TABLE chat_conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_chat_conversations_user ON chat_conversations(user_id);
CREATE INDEX idx_chat_conversations_updated ON chat_conversations(updated_at DESC);
```

#### chat_messages

Individual messages in chat conversations.

```sql
CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL,                           -- 'user' | 'assistant'
  content TEXT NOT NULL,                        -- Message text
  tool_calls TEXT,                              -- JSON: tool calls made by assistant
  tool_results TEXT,                            -- JSON: tool execution results
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE
);

CREATE INDEX idx_chat_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at ASC);
```

### Admin Tables

#### admin_audit_log

Audit trail for admin actions (Phase 1).

```sql
CREATE TABLE admin_audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,                        -- Admin who performed action
  action TEXT NOT NULL,                         -- 'edit_prompt', 'import_jobs', etc.
  details TEXT,                                 -- JSON: action details
  ip_address TEXT,                              -- Request IP
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_audit_log_user_id ON admin_audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON admin_audit_log(created_at DESC);
```

#### system_metrics

System-wide metrics for admin dashboard (Phase 1).

```sql
CREATE TABLE system_metrics (
  id TEXT PRIMARY KEY,
  metric_key TEXT NOT NULL,                     -- 'total_users', 'ai_requests', etc.
  metric_value REAL NOT NULL,                   -- Numeric value
  recorded_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_system_metrics_key ON system_metrics(metric_key);
CREATE INDEX idx_system_metrics_recorded_at ON system_metrics(recorded_at DESC);
```

---

## API Architecture

### REST API Design

The backend exposes a RESTful API with consistent patterns.

#### Base URL

- **Production**: `https://gethiredpoc-api.your-username.workers.dev/api`
- **Local**: `http://localhost:8787/api`

#### Response Format

All responses follow this structure:

**Success**:
```json
{
  "data": { ... },
  "message": "Optional success message"
}
```

**Error**:
```json
{
  "error": "Error message",
  "details": { ... }  // Optional
}
```

### API Endpoints

#### Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/signup` | Create new user account | No |
| POST | `/login` | Authenticate user | No |
| POST | `/logout` | End user session | Yes |
| GET | `/me` | Get current user | Yes |

#### Jobs (`/api/jobs`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | List jobs (with filters) | Yes |
| GET | `/:id` | Get job details | Yes |
| POST | `/:id/save` | Save job | Yes |
| DELETE | `/:id/unsave` | Unsave job | Yes |
| GET | `/saved` | Get saved jobs | Yes |
| POST | `/:id/analyze` | AI match analysis | Yes |

**Query Parameters for GET /**:
- `search` - Search term (title, company)
- `location` - Location filter
- `state` - State abbreviation
- `remote` - 0 (on-site), 1 (remote), 2 (hybrid)
- `limit` - Results per page (default: 50)
- `offset` - Pagination offset

#### Applications (`/api/applications`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | List user's applications | Yes |
| POST | `/` | Create application | Yes |
| PUT | `/:id` | Update application | Yes |
| DELETE | `/:id` | Delete application | Yes |

#### Profile (`/api/profile`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | Get user profile | Yes |
| PUT | `/` | Update profile | Yes |

#### Work Experience (`/api/work-experience`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | List work experience | Yes |
| POST | `/` | Add work experience | Yes |
| PUT | `/:id` | Update work experience | Yes |
| DELETE | `/:id` | Delete work experience | Yes |

#### Education (`/api/education`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | List education | Yes |
| POST | `/` | Add education | Yes |
| PUT | `/:id` | Update education | Yes |
| DELETE | `/:id` | Delete education | Yes |

#### Job Preferences (`/api/job-preferences`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | Get job preferences | Yes |
| PUT | `/` | Update job preferences | Yes |

#### Resumes (`/api/resumes`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/upload` | Upload resume file | Yes |
| POST | `/parse` | Parse resume with AI | Yes |

#### LinkedIn (`/api/linkedin`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/auth` | Initiate OAuth flow | Yes |
| GET | `/callback` | OAuth callback | Yes |
| POST | `/import` | Import LinkedIn profile | Yes |

#### Chat (`/api/chat`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/conversations` | List conversations | Yes |
| POST | `/conversations` | Create conversation | Yes |
| GET | `/conversations/:id` | Get conversation with messages | Yes |
| POST | `/conversations/:id/messages` | Send message | Yes |
| DELETE | `/conversations/:id` | Delete conversation | Yes |

#### Export (`/api/export`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/resume` | Generate resume PDF | Yes |
| POST | `/cover-letter` | Generate cover letter PDF | Yes |

#### Admin (`/api/admin`) - Requires Admin Role

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/metrics` | System metrics | Admin |
| GET | `/users` | List all users | Admin |
| GET | `/prompts` | List AI prompts | Admin |
| GET | `/prompts/:key` | Get prompt by key | Admin |
| PUT | `/prompts/:key` | Update prompt | Admin |
| POST | `/prompts` | Create new prompt | Admin |
| POST | `/jobs/search` | Search Adzuna API | Admin |
| POST | `/jobs/import` | Import jobs from Adzuna | Admin |

---

## AI Services Architecture

### AI Model Selection

GetHiredPOC uses different AI models for different use cases:

| Use Case | Model | Reason |
|----------|-------|--------|
| **Chat Assistant** | Claude Sonnet 3.5 (Anthropic) | Superior conversational ability, tool calling, context understanding |
| **Cover Letters** | Llama 3.1 8B (Cloudflare Workers AI) | Cost-effective, good quality for templated content |
| **Job Matching** | Llama 3.1 8B (Cloudflare Workers AI) | Fast, deterministic scoring, runs on edge |
| **Resume Tailoring** | Llama 3.1 8B (Cloudflare Workers AI) | Batch processing, cost-effective |

### AI Gateway

All AI requests route through Cloudflare AI Gateway for:
- **Caching**: Reduce duplicate requests
- **Rate Limiting**: Prevent API overuse
- **Observability**: Monitor usage and costs
- **Fallback**: Graceful degradation on errors

### Chat Tool Calling

The AI chat assistant can call these tools:

#### 1. `search_jobs`

Search for jobs based on user criteria.

**Parameters**:
```typescript
{
  query?: string;          // Search term
  location?: string;       // Location filter
  state?: string;          // State abbreviation
  remote?: boolean;        // Remote-only filter
  limit?: number;          // Max results
}
```

#### 2. `save_job`

Bookmark a job for the user.

**Parameters**:
```typescript
{
  jobId: string;          // Job ID to save
}
```

#### 3. `get_user_profile`

Retrieve user's profile data.

**Parameters**: None

#### 4. `update_user_profile`

Update user's profile information.

**Parameters**:
```typescript
{
  fullName?: string;
  bio?: string;
  location?: string;
  skills?: string[];
}
```

#### 5. `get_job_preferences`

Retrieve user's job search preferences.

**Parameters**: None

#### 6. `update_job_preferences`

Update user's job search criteria.

**Parameters**:
```typescript
{
  desiredTitles?: string[];
  desiredLocations?: string[];
  remoteOnly?: boolean;
  minSalary?: number;
  maxSalary?: number;
}
```

#### 7. `parse_job_posting`

Extract structured data from pasted job text.

**Parameters**:
```typescript
{
  jobText: string;        // Raw job posting text
}
```

#### 8. `create_application`

Apply to a job.

**Parameters**:
```typescript
{
  jobId: string;
  notes?: string;
}
```

---

## Authentication & Authorization

### Authentication Flow

```
┌──────────┐                ┌──────────┐                ┌──────────┐
│  Client  │                │  Backend │                │    D1    │
└────┬─────┘                └────┬─────┘                └────┬─────┘
     │                           │                           │
     │  POST /api/auth/login     │                           │
     ├──────────────────────────>│                           │
     │  {email, password}        │                           │
     │                           │  Query user by email      │
     │                           ├──────────────────────────>│
     │                           │                           │
     │                           │  Return user + hash       │
     │                           │<──────────────────────────┤
     │                           │                           │
     │                           │  bcrypt.compare()         │
     │                           │  (verify password)        │
     │                           │                           │
     │                           │  Create session           │
     │                           ├──────────────────────────>│
     │                           │                           │
     │                           │  Return session token     │
     │                           │<──────────────────────────┤
     │                           │                           │
     │  Set-Cookie: session=...  │                           │
     │  (HttpOnly, Secure)       │                           │
     │<──────────────────────────┤                           │
     │                           │                           │
```

### Session Management

- Sessions stored in D1 database (not KV for persistence)
- Session token stored in HttpOnly, Secure, SameSite=Lax cookie
- 7-day expiration (configurable)
- Automatic cleanup of expired sessions via cron

### Authorization Middleware

#### `requireAuth`

Validates user session, attaches user to request context.

```typescript
export async function requireAuth(c: Context, next: Next) {
  const sessionToken = getCookie(c, 'session');
  if (!sessionToken) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const session = await getSession(c.env, sessionToken);
  if (!session || session.expires_at < Date.now() / 1000) {
    return c.json({ error: 'Session expired' }, 401);
  }

  const user = await getUserById(c.env, session.user_id);
  if (!user) {
    return c.json({ error: 'User not found' }, 401);
  }

  c.set('user', user);
  await next();
}
```

#### `requireAdmin`

Validates admin role for protected admin routes.

```typescript
export async function requireAdmin(c: Context, next: Next) {
  await requireAuth(c, next);

  const user = c.get('user');
  const adminEmails = c.env.ADMIN_EMAILS?.split(',') || [];

  if (user.role !== 'admin' && !adminEmails.includes(user.email)) {
    return c.json({ error: 'Access denied' }, 403);
  }

  await next();
}
```

### Admin Role Assignment

Admins are identified by:
1. `role = 'admin'` in users table, OR
2. Email in `ADMIN_EMAILS` environment variable

This dual approach allows:
- Dynamic admin assignment via environment variable
- Persistent admin role in database
- Easy onboarding of new admins

---

## Frontend Architecture

### Component Structure

```
src/
├── components/
│   ├── layouts/
│   │   ├── UserLayout.tsx          # User page wrapper with nav + sidebar
│   │   └── AdminLayout.tsx         # Admin page wrapper
│   ├── ui/
│   │   ├── Button.tsx              # Reusable button component
│   │   ├── Card.tsx                # Card container
│   │   ├── Input.tsx               # Form input
│   │   ├── Badge.tsx               # Status badge
│   │   └── ...                     # Other UI primitives
│   ├── Navigation.tsx              # Top navigation bar
│   ├── Sidebar.tsx                 # Collapsible sidebar with chat
│   ├── ChatInterface.tsx           # AI chat component
│   ├── ProtectedRoute.tsx          # Auth route guard
│   └── ...
├── pages/
│   ├── Home.tsx                    # Landing page
│   ├── Login.tsx                   # Login page
│   ├── Signup.tsx                  # Signup page
│   ├── Jobs.tsx                    # Job listings
│   ├── JobDetail.tsx               # Job detail view
│   ├── SavedJobs.tsx               # Saved jobs list
│   ├── Applications.tsx            # Application tracker
│   ├── Profile.tsx                 # User profile
│   ├── Resume.tsx                  # Resume management
│   ├── Settings.tsx                # User settings
│   ├── Recommendations.tsx         # AI job recommendations
│   ├── JobPreferences.tsx          # Job search preferences
│   ├── Onboarding.tsx              # New user onboarding
│   └── admin/
│       ├── AdminDashboard.tsx      # Admin metrics dashboard
│       ├── AdminUsers.tsx          # User management
│       ├── AdminJobs.tsx           # Job import interface
│       └── AdminPrompts.tsx        # AI prompt editor
├── context/
│   └── AuthContext.tsx             # Authentication state
├── hooks/
│   └── useAuth.ts                  # Auth hooks
├── lib/
│   └── api.ts                      # API client utilities
└── App.tsx                         # Root component with routing
```

### State Management

- **Auth State**: React Context (`AuthContext`)
- **Local State**: React `useState` for component-level state
- **Server State**: Direct API calls (no caching layer like React Query)
- **Sidebar State**: localStorage for persistence

### Routing

Uses React Router v6 with nested routes:

```typescript
<Routes>
  {/* Public routes */}
  <Route path="/" element={<Home />} />
  <Route path="/login" element={<Login />} />
  <Route path="/signup" element={<Signup />} />

  {/* Protected user routes */}
  <Route element={<ProtectedRoute />}>
    <Route element={<UserLayout />}>
      <Route path="/jobs" element={<Jobs />} />
      <Route path="/jobs/:id" element={<JobDetail />} />
      {/* ... more user routes */}
    </Route>
  </Route>

  {/* Protected admin routes */}
  <Route element={<ProtectedRoute requireAdmin />}>
    <Route element={<AdminLayout />}>
      <Route path="/admin" element={<AdminDashboard />} />
      {/* ... more admin routes */}
    </Route>
  </Route>
</Routes>
```

---

## File Structure

### Project Root

```
gethiredpoc/
├── packages/
│   ├── backend/              # Cloudflare Workers API
│   │   ├── src/
│   │   │   ├── index.ts      # Main entry point
│   │   │   ├── routes/       # API route handlers
│   │   │   ├── services/     # Business logic
│   │   │   └── middleware/   # Auth, CORS, etc.
│   │   ├── wrangler.toml     # Cloudflare config
│   │   └── package.json
│   └── frontend/             # React application
│       ├── src/
│       │   ├── components/   # React components
│       │   ├── pages/        # Page components
│       │   ├── context/      # React context
│       │   ├── hooks/        # Custom hooks
│       │   └── main.tsx      # Entry point
│       ├── public/           # Static assets
│       ├── index.html        # HTML template
│       ├── vite.config.mts   # Vite config
│       └── package.json
├── migrations/               # Database migrations (shared)
├── docs/                     # Documentation
├── .git/                     # Git repository
├── package.json              # Workspace root
└── README.md
```

### Backend Structure

```
packages/backend/src/
├── index.ts                  # Hono app, routes, CORS
├── routes/
│   ├── auth.ts               # Authentication endpoints
│   ├── jobs.ts               # Job CRUD and search
│   ├── applications.ts       # Application tracking
│   ├── profile.ts            # User profile
│   ├── work-experience.ts    # Work history
│   ├── education.ts          # Education history
│   ├── resumes.ts            # Resume upload/parse
│   ├── job-preferences.ts    # Job search preferences
│   ├── linkedin.ts           # LinkedIn OAuth
│   ├── chat.ts               # AI chat endpoints
│   ├── admin.ts              # Admin endpoints
│   ├── ai-jobs.ts            # AI job recommendations
│   ├── recommendations.ts    # Job recommendations
│   ├── export.ts             # PDF export
│   └── email-preferences.ts  # Email settings
├── services/
│   ├── db.service.ts         # Database queries (core)
│   ├── auth.service.ts       # Auth logic
│   ├── admin.service.ts      # Admin operations
│   ├── ai-prompt.service.ts  # Prompt management
│   ├── ai.service.ts         # Generic AI utilities
│   ├── ai-cover-letter.service.ts  # Cover letter generation
│   ├── ai-resume.service.ts  # Resume tailoring
│   ├── chat.service.ts       # Chat + tool calling
│   ├── job-matching.service.ts     # Job match analysis
│   ├── adzuna.service.ts     # Adzuna API integration
│   ├── linkedin.service.ts   # LinkedIn OAuth
│   ├── linkedin-parser.service.ts  # Parse LinkedIn data
│   ├── resume.service.ts     # Resume parsing
│   ├── job-preferences.service.ts  # Preferences logic
│   ├── job-alerts.service.ts       # Job alert emails
│   ├── job-recommendations.service.ts  # AI recommendations
│   ├── email.service.ts      # Email sending (Resend)
│   ├── storage.service.ts    # R2 file storage
│   └── document-export.service.ts  # PDF generation
└── middleware/
    └── auth.middleware.ts    # requireAuth, requireAdmin
```

---

## Data Flow Diagrams

### User Job Search Flow

```
┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐
│  User   │      │Frontend │      │ Backend │      │   D1    │
└────┬────┘      └────┬────┘      └────┬────┘      └────┬────┘
     │                │                │                │
     │  1. Navigate   │                │                │
     │  to /jobs      │                │                │
     ├───────────────>│                │                │
     │                │                │                │
     │                │  2. GET /api/jobs              │
     │                │    ?location=WI&remote=1       │
     │                ├───────────────>│                │
     │                │                │                │
     │                │                │  3. Query jobs │
     │                │                ├───────────────>│
     │                │                │                │
     │                │                │  4. Return rows│
     │                │                │<───────────────┤
     │                │                │                │
     │                │  5. JSON response              │
     │                │<───────────────┤                │
     │                │                │                │
     │  6. Render     │                │                │
     │  job cards     │                │                │
     │<───────────────┤                │                │
     │                │                │                │
     │  7. Click job  │                │                │
     │  "Analyze"     │                │                │
     ├───────────────>│                │                │
     │                │                │                │
     │                │  8. POST /api/jobs/:id/analyze │
     │                ├───────────────>│                │
     │                │                │                │
     │                │                │  9. Get prompt │
     │                │                │  (KV or D1)    │
     │                │                │                │
     │                │                │  10. Call AI   │
     │                │                │  (Workers AI)  │
     │                │                │                │
     │                │                │  11. Save      │
     │                │                │  analysis      │
     │                │                ├───────────────>│
     │                │                │                │
     │                │  12. Return analysis           │
     │                │<───────────────┤                │
     │                │                │                │
     │  13. Display   │                │                │
     │  match score   │                │                │
     │<───────────────┤                │                │
```

### AI Chat Flow with Tool Calling

```
┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
│  User   │   │Sidebar  │   │ Backend │   │ Claude  │   │   D1    │
└────┬────┘   └────┬────┘   └────┬────┘   └────┬────┘   └────┬────┘
     │             │             │             │             │
     │  1. Type    │             │             │             │
     │  message    │             │             │             │
     ├────────────>│             │             │             │
     │             │             │             │             │
     │             │  2. POST /api/chat/      │             │
     │             │     conversations/       │             │
     │             │     :id/messages         │             │
     │             ├────────────>│             │             │
     │             │             │             │             │
     │             │             │  3. Send to Claude       │
     │             │             │  with tools & history    │
     │             │             ├────────────>│             │
     │             │             │             │             │
     │             │             │  4. Claude decides       │
     │             │             │  to call search_jobs     │
     │             │             │<────────────┤             │
     │             │             │             │             │
     │             │             │  5. Execute tool         │
     │             │             │  search_jobs()           │
     │             │             │             │             │
     │             │             │  6. Query jobs           │
     │             │             ├──────────────────────────>│
     │             │             │             │             │
     │             │             │  7. Return results       │
     │             │             │<──────────────────────────┤
     │             │             │             │             │
     │             │             │  8. Send tool results    │
     │             │             │  back to Claude          │
     │             │             ├────────────>│             │
     │             │             │             │             │
     │             │             │  9. Claude generates     │
     │             │             │  response with results   │
     │             │             │<────────────┤             │
     │             │             │             │             │
     │             │             │  10. Save messages       │
     │             │             ├──────────────────────────>│
     │             │             │             │             │
     │             │  11. Return response    │             │
     │             │<────────────┤             │             │
     │             │             │             │             │
     │  12. Display│             │             │             │
     │  AI message │             │             │             │
     │<────────────┤             │             │             │
```

---

## Security Architecture

### Security Layers

1. **Transport Security**: HTTPS enforced by Cloudflare
2. **Authentication**: Session-based with secure cookies
3. **Authorization**: Role-based access control (RBAC)
4. **Input Validation**: Backend validates all inputs
5. **SQL Injection Prevention**: Prepared statements only
6. **XSS Prevention**: React escapes by default
7. **CSRF Protection**: SameSite cookies
8. **Rate Limiting**: Cloudflare + custom limits
9. **Secrets Management**: Encrypted environment variables
10. **Audit Logging**: Admin action tracking

### Password Security

- Hashing: bcrypt with 10 rounds
- No plaintext storage
- Password requirements enforced (min length, complexity)

### Session Security

- HttpOnly cookies (JavaScript cannot access)
- Secure flag (HTTPS only)
- SameSite=Lax (CSRF protection)
- 7-day expiration
- Database-backed (not just client tokens)

### API Security

- CORS configured to allow only known origins
- Admin routes require admin role
- User data isolated (can only access own data)
- Rate limiting on expensive operations (AI calls)

---

## Performance Optimization

### Caching Strategy

#### KV Cache
- AI prompts: 24 hours
- Session tokens: Until expiration
- Static assets: 1 year (via CDN)

#### Database Optimization
- Indexes on frequently queried columns
- Denormalized AI analysis (stored in applications table)
- Pagination for large result sets

#### AI Gateway
- Duplicate request caching
- Request coalescing
- Response streaming for chat

### Frontend Optimization

- Code splitting by route
- Lazy loading for heavy components
- Image optimization
- Minification and compression
- Tree shaking unused code

### Backend Optimization

- Edge execution (low latency globally)
- Minimal dependencies (fast cold starts)
- Efficient database queries
- Async operations where possible

---

## Monitoring & Observability

### Metrics Tracked

- Request count (by endpoint)
- Response time (p50, p95, p99)
- Error rate (by status code)
- AI request count and cost
- Database query performance
- User signups and engagement

### Logging

- Structured JSON logs
- Error stack traces
- Admin action audit trail
- AI request/response logging (for debugging)

### Alerts (Recommended)

- Error rate > 5%
- Response time > 2 seconds
- AI API failures
- Database connection issues

---

**Last Updated**: 2025-01-05
**Version**: 1.0
