# External Integrations

**Analysis Date:** 2026-02-20

## APIs & External Services

**OpenAI (Chat/AI):**
- Service: GPT-4o-mini for conversational job search assistant
  - SDK/Client: `openai` 6.15.0
  - Auth: `OPENAI_API_KEY` (secret, set via `npx wrangler secret put`)
  - Implementation: `packages/backend/src/services/chat.service.ts` (lines 464-670)
  - Gateway: Routes through Cloudflare AI Gateway using unified API endpoint
  - Features: Tool calling for job search, profile management, application tracking

**Adzuna (Job Listings):**
- Service: Job posting data aggregation from Adzuna job board
  - Credentials: `ADZUNA_APP_ID` (public: `65f2bced`), `ADZUNA_APP_KEY` (secret)
  - Implementation: `packages/backend/src/services/adzuna.service.ts`
  - Base URL: `https://api.adzuna.com/v1/api/jobs/us/search/`
  - Features:
    - Search jobs by title, location, salary
    - Import jobs into D1 database
    - Deduplication by external_url
    - Location parsing (state extraction)
    - Remote/hybrid detection
  - Cron: Daily import at 1 AM UTC (`packages/backend/wrangler.toml` line 57)

**LinkedIn OAuth:**
- Service: User profile import via LinkedIn OAuth 2.0
  - Client ID: `86gnb581r70q6j` (public, in wrangler.toml)
  - Client Secret: `LINKEDIN_CLIENT_SECRET` (secret)
  - Implementation: `packages/backend/src/services/linkedin.service.ts`
  - OAuth Endpoints:
    - Auth: `https://www.linkedin.com/oauth/v2/authorization`
    - Token exchange: `https://www.linkedin.com/oauth/v2/accessToken`
    - Profile: `https://api.linkedin.com/v2/userinfo` (OpenID Connect)
  - Scope: `openid profile email`
  - CSRF Protection: State stored in KV_SESSIONS (10 min TTL)
  - Data imported: First/last name, positions, education, skills
  - Callback: `/api/linkedin/callback` (route: `packages/backend/src/routes/linkedin.ts`)

**Resend (Email):**
- Service: Transactional email delivery
  - SDK/Client: `resend` 6.6.0
  - Auth: `RESEND_API_KEY` (secret, set via `npx wrangler secret put`)
  - Implementation: `packages/backend/src/services/email.service.ts`
  - From: `GetHired POC <noreply@gethiredpoc.com>`
  - Email Types:
    - Welcome email (on signup)
    - Application status updates
    - Job digest notifications
    - Custom reminder emails
  - Preferences: Email log stored in database with delivery status
  - User preferences: Digest frequency (daily/weekly/monthly), notification toggles

## Data Storage

**Databases:**
- Cloudflare D1 (SQLite)
  - Database: `gethiredpoc-db` (ID: `a927d1e6-cf48-4b67-82f6-472964063676`)
  - Binding: `DB`
  - Client: D1 SQL prepared statements (in Hono context)
  - Tables:
    - `users` - User profiles, auth, membership
    - `jobs` - Job postings (from Adzuna and AI-generated)
    - `saved_jobs` - Bookmarked jobs
    - `applications` - Job applications with status tracking
    - `chat_conversations` - Chat history with AI assistant
    - `chat_messages` - Individual messages with tool calls
    - `job_search_preferences` - User preferences for role, location, salary
    - `work_experience` - User work history (from LinkedIn or manual)
    - `education` - Educational background
    - `email_preferences` - Email notification settings
    - `email_log` - Email delivery audit log
  - Migrations: Located in `migrations/` directory (referenced in backend `wrangler.toml`)

**File Storage:**
- Cloudflare R2
  - Bucket: `gethiredpoc-storage`
  - Binding: `STORAGE`
  - Use cases: Resume uploads, generated PDFs, cover letters, document templates

**Caching:**
- Cloudflare KV (Key-Value Store)
  - Namespace 1: `KV_CACHE` (ID: `7ad0fb2965a4468c983557e3535ec772`)
    - Purpose: General cache layer
  - Namespace 2: `KV_SESSIONS` (ID: `e96d7669b11c4f63b2b1ce41026a0c5d`)
    - Purpose: Session management
    - Session TTL: 7 days (set in `packages/backend/src/services/auth.service.ts`)
    - OAuth state storage: 10 minute TTL
    - Implementation: `packages/backend/src/services/auth.service.ts` (lines 77-96)

## Authentication & Identity

**Auth Provider:**
- Custom auth system + LinkedIn OAuth integration
  - Implementation:
    - Password-based: `packages/backend/src/services/auth.service.ts`
    - OAuth flow: `packages/backend/src/services/linkedin.service.ts`
  - Session storage: D1 database + KV cache
  - Password hashing: bcryptjs with salt rounds 10
  - Session cookies: HttpOnly, path `/`, 7 day Max-Age
    - Production: Secure, SameSite=None (cross-origin)
    - Development: SameSite=Lax (same-origin)
  - Routes:
    - Login/Signup: `packages/backend/src/routes/auth.ts`
    - LinkedIn callback: `packages/backend/src/routes/linkedin.ts`

## Monitoring & Observability

**Error Tracking:**
- None detected - Uses console logging instead

**Logs:**
- Console logging throughout codebase
- Critical logs in:
  - Chat service: Tool execution and OpenAI API calls (`packages/backend/src/services/chat.service.ts`)
  - Adzuna import: Job parsing and database operations (`packages/backend/src/services/adzuna.service.ts`)
  - Email service: Send attempts and failures (`packages/backend/src/services/email.service.ts`)

## CI/CD & Deployment

**Hosting:**
- Frontend: Cloudflare Pages
- Backend: Cloudflare Workers

**Deployment:**
- Frontend: `npm run deploy:frontend` → `wrangler pages deploy dist --project-name=gethiredpoc`
- Backend: `npm run deploy:backend` → `wrangler deploy`
- Orchestration: Root script `npm run deploy` triggers both

**Development:**
- Frontend dev: `npm run dev:frontend` (Vite on port 5173)
- Backend dev: `npm run dev:backend` (Wrangler on port 8787)
- Parallel: `npm run dev` (concurrently both)

**CI Pipeline:**
- None detected - Manual deployment via Wrangler

## Environment Configuration

**Required env vars (public):**
- `FRONTEND_URL` - Frontend deployment URL (default: `https://gethiredpoc.pages.dev`)
- `BACKEND_URL` - Backend API URL (default: `https://gethiredpoc-api.carl-f-frank.workers.dev`)
- `CLOUDFLARE_ACCOUNT_ID` - Account ID for API Gateway (`280c58ea17d9fe3235c33bd0a52a256b`)
- `LINKEDIN_CLIENT_ID` - OAuth public ID (`86gnb581r70q6j`)
- `ADZUNA_APP_ID` - Adzuna public ID (`65f2bced`)
- `ADMIN_EMAILS` - Comma-separated admin email list (`carl.f.frank@gmail.com,admin@example.com`)

**Required secrets (set via `npx wrangler secret put`):**
- `RESEND_API_KEY` - Email service authentication
- `LINKEDIN_CLIENT_SECRET` - OAuth secret
- `ADZUNA_APP_KEY` - Adzuna API key
- `OPENAI_API_KEY` - OpenAI API key for chat
- `AI_GATEWAY_TOKEN` - Cloudflare AI Gateway authentication token
- `CLOUDFLARE_API_TOKEN` - (if needed for advanced operations)

**Secrets location:**
- Wrangler CLI manages secrets securely in Cloudflare Workers dashboard
- Not stored in `.env` or wrangler.toml
- Local dev: Can use `.dev.vars` file (in gitignore) for local testing

## Webhooks & Callbacks

**Incoming:**
- LinkedIn OAuth callback: `/api/linkedin/callback` - Receives authorization code and state
  - Implementation: `packages/backend/src/routes/linkedin.ts`
  - Validates state (CSRF protection)
  - Exchanges code for access token
  - Fetches profile and saves to database

**Outgoing:**
- None detected - System does not currently trigger external webhooks

---

*Integration audit: 2026-02-20*
