# Detailed Task Breakdown for GetHiredPOC Implementation

**Project**: Admin System, AI Chat Interface & Mobile UI
**Total Tasks**: 89
**New Files**: 23 | **Modified Files**: 35
**Complexity**: Simple: 27 | Medium: 42 | Complex: 20

---

## Phase 1: Security & Admin Foundation (Days 1-3) - CRITICAL

**Total Tasks**: 10 | **Priority**: 🔴 HIGHEST

### Database & Infrastructure Tasks

**Task 1.1: Create admin and membership database migration**
- **Action**: Create `/migrations/0010_admin_and_membership.sql` with ALTER TABLE statements to add role, membership_tier, membership_started_at, membership_expires_at, trial_started_at columns to users table; CREATE TABLE for admin_audit_log (id, user_id, action, details, ip_address, timestamp); CREATE TABLE for system_metrics (id, metric_key, metric_value, recorded_at)
- **Complexity**: Medium
- **Dependencies**: None
- **Operation**: New file creation
- **Status**: ⬜ Not Started

**Task 1.2: Apply database migration**
- **Action**: Run migration script against D1 database using wrangler CLI to add new user columns and create audit/metrics tables
- **Complexity**: Simple
- **Dependencies**: Task 1.1
- **Operation**: Database operation
- **Status**: ⬜ Not Started

**Task 1.3: Configure admin emails environment variable**
- **Action**: Add `ADMIN_EMAILS = "admin@example.com"` to [vars] section in `/packages/backend/wrangler.toml` as placeholder, then use `wrangler secret put ADMIN_EMAILS` to set actual admin email addresses
- **Complexity**: Simple
- **Dependencies**: None
- **Operation**: Modify existing file + environment configuration
- **Status**: ⬜ Not Started

### Backend Authentication Middleware

**Task 1.4: Create auth middleware with role checking** ⚠️ HIGH RISK
- **Action**: Create `/packages/backend/src/middleware/auth.middleware.ts` implementing three middleware functions: `requireAuth` (validates JWT token exists and is valid), `requireAdmin` (checks user.role === 'admin' against ADMIN_EMAILS env var), `requirePaidMembership` (validates membership_tier is 'paid' and membership_expires_at > now)
- **Complexity**: Medium
- **Dependencies**: Task 1.1 (needs new user columns)
- **Operation**: New file creation
- **Status**: ⬜ Not Started

**Task 1.5: Create admin service for metrics and user management**
- **Action**: Create `/packages/backend/src/services/admin.service.ts` with functions: `getSystemMetrics(env)` (queries system_metrics table for dashboard), `getAllUsers(env, pagination)` (fetches users with role/membership info), `recordMetric(env, metricKey, value)` (inserts into system_metrics), `getUserMetrics(env, userId)` (gets user-specific stats), `updateUserRole(env, userId, role)` (updates user.role with audit logging)
- **Complexity**: Medium
- **Dependencies**: Task 1.1, Task 1.4
- **Operation**: New file creation
- **Status**: ⬜ Not Started

### Type Definitions

**Task 1.6: Update shared User type interface**
- **Action**: Modify `/packages/shared/src/types/user.ts` to add optional fields to User interface: `role?: 'user' | 'admin'`, `membership_tier?: 'trial' | 'paid'`, `membership_started_at?: number`, `membership_expires_at?: number`, `trial_started_at?: number`
- **Complexity**: Simple
- **Dependencies**: None
- **Operation**: Modify existing file
- **Status**: ⬜ Not Started

### Route Protection

**Task 1.7: Protect admin routes with middleware**
- **Action**: Modify `/packages/backend/src/routes/admin.ts` to add `admin.use('*', requireAdmin)` at the very top (before any route definitions), add new GET endpoint `/api/admin/metrics` that calls admin.service.getSystemMetrics(), add GET `/api/admin/users` endpoint with pagination
- **Complexity**: Medium
- **Dependencies**: Task 1.4, Task 1.5
- **Operation**: Modify existing file
- **Status**: ⬜ Not Started

**Task 1.8: Update auth service to include new user fields**
- **Action**: Modify `/packages/backend/src/services/auth.service.ts` to update all SQL SELECT statements to include role, membership_tier, membership_started_at, membership_expires_at, trial_started_at columns; ensure createUser() sets trial_started_at to current timestamp and role to 'user' by default
- **Complexity**: Simple
- **Dependencies**: Task 1.1
- **Operation**: Modify existing file
- **Status**: ⬜ Not Started

### Testing & Validation

**Task 1.9: Create audit logging helper function**
- **Action**: Add `recordAuditLog(env, userId, action, details, ipAddress)` function to admin.service.ts that inserts into admin_audit_log table with timestamp
- **Complexity**: Simple
- **Dependencies**: Task 1.5
- **Operation**: Modify existing file
- **Status**: ⬜ Not Started

**Task 1.10: Verify admin route protection**
- **Action**: Test that unauthenticated requests to /api/admin/* return 401, authenticated non-admin users return 403, and admin users can access; test with curl or Postman
- **Complexity**: Simple
- **Dependencies**: Task 1.7
- **Operation**: Manual testing
- **Status**: ⬜ Not Started

---

## Phase 2: Configurable AI Prompts (Days 4-6)

**Total Tasks**: 9 | **Priority**: High

### Database Schema

**Task 2.1: Create AI prompts database migration**
- **Action**: Create `/migrations/0011_ai_prompts.sql` with CREATE TABLE ai_prompts (id, prompt_key TEXT UNIQUE, prompt_name TEXT, prompt_template TEXT, model_config TEXT as JSON, version INTEGER DEFAULT 1, is_active INTEGER DEFAULT 1, created_at INTEGER, updated_at INTEGER); include INSERT statements to seed 5 existing prompts: 'cover_letter', 'job_match', 'resume_tailor', 'linkedin_parse', 'job_description_parse' with their current hardcoded templates
- **Complexity**: Medium
- **Dependencies**: None
- **Operation**: New file creation
- **Status**: ⬜ Not Started

**Task 2.2: Apply AI prompts migration**
- **Action**: Run migration script to create ai_prompts table and seed with existing prompt templates
- **Complexity**: Simple
- **Dependencies**: Task 2.1
- **Operation**: Database operation
- **Status**: ⬜ Not Started

### Prompt Service

**Task 2.3: Create AI prompt service with caching**
- **Action**: Create `/packages/backend/src/services/ai-prompt.service.ts` with functions: `getPrompt(env, promptKey)` (fetches from DB with 24hr KV cache fallback), `renderPrompt(template, variables)` (replaces {{variable}} placeholders using regex), `listPrompts(env)` (returns all active prompts), `upsertPrompt(env, promptKey, data)` (updates existing or creates new prompt, increments version, invalidates cache)
- **Complexity**: Complex
- **Dependencies**: Task 2.2
- **Operation**: New file creation
- **Status**: ⬜ Not Started

### Migrate Existing Services

**Task 2.4: Refactor cover letter service to use dynamic prompts**
- **Action**: Modify `/packages/backend/src/services/ai-cover-letter.service.ts` to replace hardcoded prompt string with `const promptConfig = await getPrompt(env, 'cover_letter')` and `const prompt = renderPrompt(promptConfig.prompt_template, { user_name: user.full_name, job_title: job.title, company_name: job.company, user_experience: resume.experience })` before sending to AI model
- **Complexity**: Medium
- **Dependencies**: Task 2.3
- **Operation**: Modify existing file
- **Status**: ⬜ Not Started

**Task 2.5: Refactor job matching service to use dynamic prompts**
- **Action**: Modify `/packages/backend/src/services/job-matching.service.ts` to replace hardcoded prompt with getPrompt(env, 'job_match') and renderPrompt() using variables: job_title, job_description, user_skills, user_experience
- **Complexity**: Medium
- **Dependencies**: Task 2.3
- **Operation**: Modify existing file
- **Status**: ⬜ Not Started

**Task 2.6: Refactor resume service to use dynamic prompts**
- **Action**: Modify `/packages/backend/src/services/ai-resume.service.ts` to replace hardcoded prompt with getPrompt(env, 'resume_tailor') and renderPrompt() using variables: original_resume, job_title, job_description, keywords
- **Complexity**: Medium
- **Dependencies**: Task 2.3
- **Operation**: Modify existing file
- **Status**: ⬜ Not Started

**Task 2.7: Refactor LinkedIn parser to use dynamic prompts**
- **Action**: Modify `/packages/backend/src/services/linkedin-parser.service.ts` to replace hardcoded prompt with getPrompt(env, 'linkedin_parse') and renderPrompt() using variables: linkedin_profile_data, extracted_sections
- **Complexity**: Medium
- **Dependencies**: Task 2.3
- **Operation**: Modify existing file
- **Status**: ⬜ Not Started

### Admin API Endpoints

**Task 2.8: Add admin prompt management endpoints**
- **Action**: Modify `/packages/backend/src/routes/admin.ts` to add GET `/api/admin/prompts` (returns listPrompts()), GET `/api/admin/prompts/:key` (returns specific prompt), POST `/api/admin/prompts/:key` (calls upsertPrompt() with request body containing prompt_template, model_config), DELETE `/api/admin/prompts/:key` (sets is_active = 0)
- **Complexity**: Medium
- **Dependencies**: Task 2.3
- **Operation**: Modify existing file
- **Status**: ⬜ Not Started

### Testing

**Task 2.9: Verify prompt caching and fallback**
- **Action**: Test that prompts are fetched from DB on first call, cached in KV for 24 hours, and existing AI features (cover letter generation, job matching) still work correctly with dynamic prompts
- **Complexity**: Simple
- **Dependencies**: Tasks 2.4-2.7
- **Operation**: Manual testing
- **Status**: ⬜ Not Started

---

## Phase 3: Layout Refactor & Sidebar (Days 7-9)

**Total Tasks**: 13 | **Priority**: Medium

### Layout Components

**Task 3.1: Create centralized user layout wrapper**
- **Action**: Create `/packages/frontend/src/components/layouts/UserLayout.tsx` that renders Navigation component at top, creates flex container with Sidebar and main content area using `<Outlet />` from react-router-dom, manages sidebar open/close state with useState and persists to localStorage
- **Complexity**: Medium
- **Dependencies**: None
- **Operation**: New file creation
- **Status**: ⬜ Not Started

**Task 3.2: Create collapsible sidebar component**
- **Action**: Create `/packages/frontend/src/components/Sidebar.tsx` with props isOpen and onToggle, render collapsible div with transition animations, include placeholder content (h2 "AI Assistant" and p "Chat coming in Phase 4"), add collapse/expand button, use Tailwind for fixed width (300px open, 60px collapsed)
- **Complexity**: Medium
- **Dependencies**: None
- **Operation**: New file creation
- **Status**: ⬜ Not Started

### Routing Updates

**Task 3.3: Update App.tsx to use UserLayout wrapper**
- **Action**: Modify `/packages/frontend/src/App.tsx` to wrap all protected routes (Routes that require authentication) inside `<Route element={<UserLayout />}>`, ensure Outlet is used so child routes render inside the layout
- **Complexity**: Simple
- **Dependencies**: Task 3.1
- **Operation**: Modify existing file
- **Status**: ⬜ Not Started

### Remove Duplicate Navigation

**Task 3.4: Remove Navigation from Jobs page**
- **Action**: Modify `/packages/frontend/src/pages/Jobs.tsx` to delete the `<Navigation />` component import and JSX element since layout now handles it
- **Complexity**: Simple
- **Dependencies**: Task 3.3
- **Operation**: Modify existing file
- **Status**: ⬜ Not Started

**Task 3.5: Remove Navigation from SavedJobs page**
- **Action**: Modify `/packages/frontend/src/pages/SavedJobs.tsx` to delete the `<Navigation />` component import and JSX element
- **Complexity**: Simple
- **Dependencies**: Task 3.3
- **Operation**: Modify existing file
- **Status**: ⬜ Not Started

**Task 3.6: Remove Navigation from Applications page**
- **Action**: Modify `/packages/frontend/src/pages/Applications.tsx` to delete the `<Navigation />` component import and JSX element
- **Complexity**: Simple
- **Dependencies**: Task 3.3
- **Operation**: Modify existing file
- **Status**: ⬜ Not Started

**Task 3.7: Remove Navigation from Profile page**
- **Action**: Modify `/packages/frontend/src/pages/Profile.tsx` to delete the `<Navigation />` component import and JSX element
- **Complexity**: Simple
- **Dependencies**: Task 3.3
- **Operation**: Modify existing file
- **Status**: ⬜ Not Started

**Task 3.8: Remove Navigation from Resume page**
- **Action**: Modify `/packages/frontend/src/pages/Resume.tsx` to delete the `<Navigation />` component import and JSX element
- **Complexity**: Simple
- **Dependencies**: Task 3.3
- **Operation**: Modify existing file
- **Status**: ⬜ Not Started

**Task 3.9: Remove Navigation from Settings page**
- **Action**: Modify `/packages/frontend/src/pages/Settings.tsx` to delete the `<Navigation />` component import and JSX element
- **Complexity**: Simple
- **Dependencies**: Task 3.3
- **Operation**: Modify existing file
- **Status**: ⬜ Not Started

**Task 3.10: Remove Navigation from Recommendations page**
- **Action**: Modify `/packages/frontend/src/pages/Recommendations.tsx` to delete the `<Navigation />` component import and JSX element
- **Complexity**: Simple
- **Dependencies**: Task 3.3
- **Operation**: Modify existing file
- **Status**: ⬜ Not Started

**Task 3.11: Remove Navigation from JobPreferences page**
- **Action**: Modify `/packages/frontend/src/pages/JobPreferences.tsx` to delete the `<Navigation />` component import and JSX element
- **Complexity**: Simple
- **Dependencies**: Task 3.3
- **Operation**: Modify existing file
- **Status**: ⬜ Not Started

**Task 3.12: Remove Navigation from Onboarding page**
- **Action**: Modify `/packages/frontend/src/pages/Onboarding.tsx` to delete the `<Navigation />` component import and JSX element
- **Complexity**: Simple
- **Dependencies**: Task 3.3
- **Operation**: Modify existing file
- **Status**: ⬜ Not Started

### Testing

**Task 3.13: Verify layout persistence and navigation**
- **Action**: Test that sidebar state persists across page navigation using localStorage, verify all pages render correctly without duplicate navigation headers, test collapse/expand functionality
- **Complexity**: Simple
- **Dependencies**: Tasks 3.4-3.12
- **Operation**: Manual testing
- **Status**: ⬜ Not Started

---

## Phase 4: AI Chat Interface (Days 10-14) - MAJOR FEATURE

**Total Tasks**: 17 | **Priority**: ⭐ HIGHEST

### Database Schema

**Task 4.1: Create chat system database migration**
- **Action**: Create `/migrations/0012_chat_system.sql` with CREATE TABLE chat_conversations (id TEXT PRIMARY KEY, user_id TEXT, title TEXT, created_at INTEGER, updated_at INTEGER); CREATE TABLE chat_messages (id TEXT PRIMARY KEY, conversation_id TEXT, role TEXT CHECK(role IN ('user', 'assistant', 'system')), content TEXT, tool_calls TEXT as JSON array, tool_results TEXT as JSON array, created_at INTEGER, FOREIGN KEY(conversation_id) REFERENCES chat_conversations(id))
- **Complexity**: Medium
- **Dependencies**: None
- **Operation**: New file creation
- **Status**: ⬜ Not Started

**Task 4.2: Apply chat database migration**
- **Action**: Run migration script to create chat_conversations and chat_messages tables
- **Complexity**: Simple
- **Dependencies**: Task 4.1
- **Operation**: Database operation
- **Status**: ⬜ Not Started

**Task 4.3: Configure Anthropic API key**
- **Action**: Run `wrangler secret put ANTHROPIC_API_KEY` to securely store Claude API key for chat functionality
- **Complexity**: Simple
- **Dependencies**: None
- **Operation**: Environment configuration
- **Status**: ⬜ Not Started

### Chat Service & Tool Definitions

**Task 4.4: Create chat service with tool calling framework** ⚠️ HIGH RISK
- **Action**: Create `/packages/backend/src/services/chat.service.ts` with functions: `sendChatMessage(env, userId, conversationId, message)` (sends to Claude API with tools enabled, handles streaming), `executeTool(env, userId, toolName, toolInput)` (router function that calls appropriate service), `getConversations(env, userId)` (lists user's chat history), `createConversation(env, userId, title)`, stores tool_calls and tool_results in chat_messages table
- **Complexity**: Complex
- **Dependencies**: Task 4.2
- **Operation**: New file creation
- **Status**: ⬜ Not Started

**Task 4.5: Define search_jobs tool in chat service**
- **Action**: Add tool definition to chat.service.ts: `search_jobs` with parameters (query: string, location: string, distance: number), implementation calls existing job search service, returns array of job objects with id, title, company, location, salary
- **Complexity**: Medium
- **Dependencies**: Task 4.4
- **Operation**: Modify existing file
- **Status**: ⬜ Not Started

**Task 4.6: Define save_job tool in chat service**
- **Action**: Add tool definition: `save_job` with parameters (job_id: string, notes?: string), implementation calls existing saved jobs service to bookmark job for user, returns success confirmation
- **Complexity**: Simple
- **Dependencies**: Task 4.4
- **Operation**: Modify existing file
- **Status**: ⬜ Not Started

**Task 4.7: Define get_user_profile tool in chat service**
- **Action**: Add tool definition: `get_user_profile` with no parameters, implementation queries users table and returns user's full_name, email, location, linkedin_url, current_job_title, skills
- **Complexity**: Simple
- **Dependencies**: Task 4.4
- **Operation**: Modify existing file
- **Status**: ⬜ Not Started

**Task 4.8: Define update_user_profile tool in chat service**
- **Action**: Add tool definition: `update_user_profile` with parameters (fields object with optional full_name, location, linkedin_url, current_job_title, skills), implementation updates users table, returns updated profile
- **Complexity**: Medium
- **Dependencies**: Task 4.4
- **Operation**: Modify existing file
- **Status**: ⬜ Not Started

**Task 4.9: Define get_job_preferences tool in chat service**
- **Action**: Add tool definition: `get_job_preferences` with no parameters, implementation queries job_preferences table for user, returns desired_job_titles, preferred_locations, min_salary, job_types
- **Complexity**: Simple
- **Dependencies**: Task 4.4
- **Operation**: Modify existing file
- **Status**: ⬜ Not Started

**Task 4.10: Define update_job_preferences tool in chat service**
- **Action**: Add tool definition: `update_job_preferences` with parameters (preferences object with optional desired_job_titles array, preferred_locations array, min_salary number), implementation updates job_preferences table
- **Complexity**: Medium
- **Dependencies**: Task 4.4
- **Operation**: Modify existing file
- **Status**: ⬜ Not Started

**Task 4.11: Define parse_job_posting tool in chat service** ⚠️ HIGH RISK
- **Action**: Add tool definition: `parse_job_posting` with parameters (job_text: string), implementation sends to AI with structured extraction prompt, returns parsed object with title, company, location, salary, requirements, description
- **Complexity**: Complex
- **Dependencies**: Task 4.4
- **Operation**: Modify existing file
- **Status**: ⬜ Not Started

**Task 4.12: Define create_application tool in chat service**
- **Action**: Add tool definition: `create_application` with parameters (job_id: string, cover_letter?: string), implementation creates application record in applications table, optionally generates cover letter if not provided, returns application_id
- **Complexity**: Medium
- **Dependencies**: Task 4.4
- **Operation**: Modify existing file
- **Status**: ⬜ Not Started

### Chat API Routes

**Task 4.13: Create chat API endpoints**
- **Action**: Create `/packages/backend/src/routes/chat.ts` with POST `/api/chat/message` (accepts conversationId, message, calls sendChatMessage(), returns streamed response), GET `/api/chat/conversations` (returns getConversations()), POST `/api/chat/conversations` (creates new conversation), all routes require authentication
- **Complexity**: Medium
- **Dependencies**: Task 4.4
- **Operation**: New file creation
- **Status**: ⬜ Not Started

**Task 4.14: Register chat routes in main app**
- **Action**: Modify `/packages/backend/src/index.ts` to import chat routes and add `app.route('/api/chat', chat)` after other route registrations
- **Complexity**: Simple
- **Dependencies**: Task 4.13
- **Operation**: Modify existing file
- **Status**: ⬜ Not Started

### Frontend Chat Interface

**Task 4.15: Create ChatInterface component with streaming support**
- **Action**: Create `/packages/frontend/src/components/ChatInterface.tsx` with message list display (scrollable), input textarea with send button, handles streaming responses from API using EventSource or fetch with ReadableStream, displays user and assistant messages with distinct styling, shows typing indicator during streaming, renders tool calls as activity badges (e.g. "Searching jobs..." "Saved job")
- **Complexity**: Complex
- **Dependencies**: Task 4.13
- **Operation**: New file creation
- **Status**: ⬜ Not Started

**Task 4.16: Integrate ChatInterface into Sidebar**
- **Action**: Modify `/packages/frontend/src/components/Sidebar.tsx` to replace placeholder content with `<ChatInterface />` component, add conversation switcher dropdown at top, ensure proper scrolling behavior
- **Complexity**: Medium
- **Dependencies**: Task 4.15
- **Operation**: Modify existing file
- **Status**: ⬜ Not Started

### Testing

**Task 4.17: Test chat tool calling end-to-end**
- **Action**: Test each tool individually: search for jobs via chat, save a job, update profile fields, parse pasted job posting, create application; verify tool_calls and tool_results are stored in database; test conversation history persistence
- **Complexity**: Medium
- **Dependencies**: Task 4.16
- **Operation**: Manual testing
- **Status**: ⬜ Not Started

---

## Phase 5: Admin Dashboard UI (Days 15-17)

**Total Tasks**: 10 | **Priority**: Medium

### Admin Layout

**Task 5.1: Create admin-specific layout wrapper**
- **Action**: Create `/packages/frontend/src/components/layouts/AdminLayout.tsx` that renders admin navigation with links to Dashboard, Users, Jobs, Prompts; includes `<Outlet />` for child routes; displays user's admin status badge; different color scheme (darker header) to distinguish from user area
- **Complexity**: Medium
- **Dependencies**: None
- **Operation**: New file creation
- **Status**: ⬜ Not Started

### Admin Page Components

**Task 5.2: Create admin dashboard with metrics cards**
- **Action**: Create `/packages/frontend/src/pages/admin/AdminDashboard.tsx` that fetches from GET `/api/admin/metrics`, displays cards for: Total Users, Active Trials, Paid Members, Total Jobs, Jobs This Week, AI Requests (24h), System Health status; uses recharts library for trend graphs; auto-refreshes every 30 seconds
- **Complexity**: Complex
- **Dependencies**: Phase 1 Task 1.7 (metrics API)
- **Operation**: New file creation
- **Status**: ⬜ Not Started

**Task 5.3: Create admin users management page** ⚠️ HIGH RISK
- **Action**: Create `/packages/frontend/src/pages/admin/AdminUsers.tsx` that fetches from GET `/api/admin/users`, displays table with columns: Email, Name, Role, Membership Tier, Trial/Membership Dates, Actions; includes pagination (20 per page), search filter by email/name, click row to view user details modal, inline edit for role (user/admin)
- **Complexity**: Complex
- **Dependencies**: Phase 1 Task 1.7 (users API)
- **Operation**: New file creation
- **Status**: ⬜ Not Started

**Task 5.4: Create admin job import interface**
- **Action**: Create `/packages/frontend/src/pages/admin/AdminJobs.tsx` with form for manual job search (query, location, distance inputs), "Preview Results" button that shows Adzuna results in table, checkboxes to select jobs, "Import for User" action that opens user selector dropdown, "Bulk Import" to add selected jobs to database, displays recent import history
- **Complexity**: Complex
- **Dependencies**: Need to add admin job import API endpoint
- **Operation**: New file creation
- **Status**: ⬜ Not Started

**Task 5.5: Add admin job import API endpoint**
- **Action**: Modify `/packages/backend/src/routes/admin.ts` to add POST `/api/admin/jobs/import` that accepts array of Adzuna job data and optional userId, inserts into jobs table, optionally adds to user's saved jobs, records audit log
- **Complexity**: Medium
- **Dependencies**: Phase 1 Task 1.5 (admin service)
- **Operation**: Modify existing file
- **Status**: ⬜ Not Started

**Task 5.6: Create admin prompt editor with live preview**
- **Action**: Create `/packages/frontend/src/pages/admin/AdminPrompts.tsx` that fetches all prompts from GET `/api/admin/prompts`, displays list with prompt_key, prompt_name, last updated; clicking prompt opens editor with textarea for prompt_template, JSON editor for model_config (temperature, max_tokens), live preview panel showing rendered prompt with sample variables, Save button calls POST `/api/admin/prompts/:key`, version history display
- **Complexity**: Complex
- **Dependencies**: Phase 2 Task 2.8 (prompt API)
- **Operation**: New file creation
- **Status**: ⬜ Not Started

### Routing & Access Control

**Task 5.7: Add admin routes to App.tsx**
- **Action**: Modify `/packages/frontend/src/App.tsx` to add protected admin routes: `<Route element={<ProtectedRoute requireAdmin />}>` wrapping `<Route element={<AdminLayout />}>` containing child routes: `/admin` (AdminDashboard), `/admin/users` (AdminUsers), `/admin/jobs` (AdminJobs), `/admin/prompts` (AdminPrompts)
- **Complexity**: Medium
- **Dependencies**: Tasks 5.1-5.6
- **Operation**: Modify existing file
- **Status**: ⬜ Not Started

**Task 5.8: Update ProtectedRoute to support admin requirement**
- **Action**: Modify `/packages/frontend/src/components/ProtectedRoute.tsx` to add optional prop `requireAdmin?: boolean`, check authenticated user's role field, redirect to /jobs if user is not admin when requireAdmin is true, show unauthorized message
- **Complexity**: Medium
- **Dependencies**: Phase 1 Task 1.6 (user type with role field)
- **Operation**: Modify existing file
- **Status**: ⬜ Not Started

**Task 5.9: Add admin navigation link to main Navigation**
- **Action**: Modify `/packages/frontend/src/components/Navigation.tsx` to conditionally render "Admin" link in navigation menu when user.role === 'admin', links to /admin, styled distinctly (badge or different color)
- **Complexity**: Simple
- **Dependencies**: Task 5.8
- **Operation**: Modify existing file
- **Status**: ⬜ Not Started

### Testing

**Task 5.10: Test admin access control and UI flows**
- **Action**: Test that non-admin users cannot access /admin routes (redirected), admin users can access all admin pages, metrics display correctly, user list loads with pagination, job import preview and import works, prompt editor saves and invalidates cache
- **Complexity**: Medium
- **Dependencies**: Tasks 5.7-5.9
- **Operation**: Manual testing
- **Status**: ⬜ Not Started

---

## Phase 6: Mobile Responsive UI (Days 18-20)

**Total Tasks**: 11 | **Priority**: Medium

### Design System Updates

**Task 6.1: Update Tailwind config with custom design tokens**
- **Action**: Modify `/packages/frontend/tailwind.config.js` to add custom colors in theme.extend.colors (primary blue 50-900 palette, success green, warning amber), add Inter font to fontFamily, add custom spacing for touch targets (min-44), add soft shadow utilities (shadow-soft: 0 2px 8px rgba(0,0,0,0.08))
- **Complexity**: Simple
- **Dependencies**: None
- **Operation**: Modify existing file
- **Status**: ⬜ Not Started

**Task 6.2: Update Button component for touch-friendly sizing**
- **Action**: Modify `/packages/frontend/src/components/ui/Button.tsx` to enforce min-height of 44px (Apple touch target guideline), increase padding to px-6 py-3, add active:scale-95 for touch feedback, ensure text is readable at small sizes (text-base minimum)
- **Complexity**: Simple
- **Dependencies**: None
- **Operation**: Modify existing file
- **Status**: ⬜ Not Started

### Sidebar Mobile Optimization

**Task 6.3: Make Sidebar responsive with overlay mode** ⚠️ HIGH RISK
- **Action**: Modify `/packages/frontend/src/components/Sidebar.tsx` to detect screen size using Tailwind breakpoints, on mobile (< md): render as overlay with fixed position and z-50, add backdrop blur overlay when open, swipe gesture to close using touch events, hamburger menu button visible on mobile; on desktop: normal sidebar behavior with fixed width
- **Complexity**: Complex
- **Dependencies**: Phase 3 Task 3.2
- **Operation**: Modify existing file
- **Status**: ⬜ Not Started

### Page Component Responsiveness

**Task 6.4: Make Jobs page mobile responsive**
- **Action**: Modify `/packages/frontend/src/pages/Jobs.tsx` to stack job cards vertically on mobile, make job badges wrap and stack on small screens, reduce padding on mobile (px-4 instead of px-8), make search filters collapse into expandable drawer on mobile, ensure touch-friendly job card click targets
- **Complexity**: Medium
- **Dependencies**: None
- **Operation**: Modify existing file
- **Status**: ⬜ Not Started

**Task 6.5: Make JobDetail page mobile responsive**
- **Action**: Modify `/packages/frontend/src/pages/JobDetail.tsx` to stack job header info vertically on mobile, make action buttons (Save, Apply) stack vertically on small screens with full width, reduce font sizes appropriately (responsive text-xl to text-lg), ensure proper spacing on mobile
- **Complexity**: Medium
- **Dependencies**: None
- **Operation**: Modify existing file
- **Status**: ⬜ Not Started

**Task 6.6: Make Applications page mobile responsive with touch-friendly drag-drop**
- **Action**: Modify `/packages/frontend/src/pages/Applications.tsx` to make Kanban columns stack vertically on mobile with horizontal scroll, increase drag handle size for touch interaction, add haptic-style feedback on drag (visual scale animation), ensure dropzones are large enough for finger targets, add "Move to" dropdown as alternative to drag-drop on mobile
- **Complexity**: Complex
- **Dependencies**: None
- **Operation**: Modify existing file
- **Status**: ⬜ Not Started

**Task 6.7: Make SavedJobs page mobile responsive**
- **Action**: Modify `/packages/frontend/src/pages/SavedJobs.tsx` to use card layout that stacks on mobile, make filter chips wrap properly, ensure swipe-to-delete gesture works on touch devices, optimize table view for small screens (hide less important columns, show expandable details)
- **Complexity**: Medium
- **Dependencies**: None
- **Operation**: Modify existing file
- **Status**: ⬜ Not Started

**Task 6.8: Make Profile page mobile responsive**
- **Action**: Modify `/packages/frontend/src/pages/Profile.tsx` to stack form fields vertically on mobile, ensure input fields are full width on small screens, make edit/save buttons stack vertically with full width on mobile
- **Complexity**: Simple
- **Dependencies**: None
- **Operation**: Modify existing file
- **Status**: ⬜ Not Started

**Task 6.9: Make admin pages mobile responsive**
- **Action**: Modify admin pages (AdminDashboard, AdminUsers, AdminJobs, AdminPrompts) to make metrics cards stack on mobile, make data tables horizontally scrollable on small screens, ensure admin forms work on mobile with proper spacing
- **Complexity**: Medium
- **Dependencies**: Phase 5 tasks
- **Operation**: Modify existing files
- **Status**: ⬜ Not Started

### Visual Design Polish

**Task 6.10: Apply modern design system across all components**
- **Action**: Update all components to use new color palette from Tailwind config, replace hard shadows with soft shadows (shadow-soft), ensure consistent Inter font usage, add subtle transitions (transition-all duration-200) to interactive elements, increase border-radius for modern look (rounded-lg instead of rounded-md)
- **Complexity**: Medium
- **Dependencies**: Task 6.1
- **Operation**: Modify existing files
- **Status**: ⬜ Not Started

### Testing

**Task 6.11: Test mobile responsiveness on multiple devices**
- **Action**: Test on actual mobile devices (iOS and Android) and desktop at different breakpoints: 320px (small phone), 375px (iPhone), 768px (tablet), 1024px (desktop); verify sidebar overlay works, touch targets are 44px+, no horizontal scroll on mobile, all forms and buttons are usable
- **Complexity**: Medium
- **Dependencies**: Tasks 6.3-6.10
- **Operation**: Manual testing
- **Status**: ⬜ Not Started

---

## Phase 7: Testing & Documentation (Days 21-23)

**Total Tasks**: 10 | **Priority**: Medium

### Testing Documentation

**Task 7.1: Create comprehensive testing checklist**
- **Action**: Create `/TESTING.md` with sections for each phase: Phase 1 security tests (admin protection, membership checks, audit logging), Phase 2 prompt tests (caching, dynamic loading, AI generation), Phase 3 layout tests (navigation, sidebar persistence), Phase 4 chat tests (tool calling, streaming, history), Phase 5 admin tests (dashboard, user management, job import), Phase 6 mobile tests (responsive breakpoints, touch targets), Phase 7 end-to-end tests (full user journey from signup to job application)
- **Complexity**: Medium
- **Dependencies**: None
- **Operation**: New file creation
- **Status**: ⬜ Not Started

**Task 7.2: Execute and document all phase tests**
- **Action**: Run through entire testing checklist from Task 7.1, document pass/fail status for each test, capture screenshots of issues, create bug tickets for failures, verify all critical paths work (signup, job search, save job, chat interaction, admin access)
- **Complexity**: Complex
- **Dependencies**: Task 7.1, all previous phases
- **Operation**: Manual testing
- **Status**: ⬜ Not Started

### Project Documentation

**Task 7.3: Create deployment guide**
- **Action**: Create `/docs/DEPLOYMENT.md` with step-by-step instructions: prerequisites (Wrangler CLI, Cloudflare account), database migration sequence (0010 → 0011 → 0012), environment variable setup (ADMIN_EMAILS, ANTHROPIC_API_KEY), deployment commands for backend and frontend, post-deployment verification checklist, rollback procedures
- **Complexity**: Medium
- **Dependencies**: None
- **Operation**: New file creation
- **Status**: ⬜ Not Started

**Task 7.4: Create architecture documentation**
- **Action**: Create `/docs/ARCHITECTURE.md` with system overview diagram, database schema with ER diagram showing all tables and relationships, AI architecture explaining dual-model approach (Claude for chat, Llama for batch), authentication flow diagram, admin access control explanation, API endpoint reference with request/response examples
- **Complexity**: Complex
- **Dependencies**: None
- **Operation**: New file creation
- **Status**: ⬜ Not Started

**Task 7.5: Create feature request tracking template**
- **Action**: Create `/FEATURE_REQUESTS.md` with template structure: Feature name, Description, Business value, Technical complexity estimate, Dependencies, Priority (High/Medium/Low); pre-populate with post-MVP features from plan: Stripe payment integration, Weekly job digest emails, Visual resume builder (WYSIWYG), LinkedIn auto-apply integration, Salary range filtering, Company size preferences, Advanced search filters
- **Complexity**: Simple
- **Dependencies**: None
- **Operation**: New file creation
- **Status**: ⬜ Not Started

### Code Quality & Cleanup

**Task 7.6: Add code comments and JSDoc to complex functions**
- **Action**: Add JSDoc comments to all service functions in chat.service.ts, ai-prompt.service.ts, admin.service.ts explaining parameters, return types, and behavior; add inline comments for complex logic (tool calling, prompt rendering, caching strategy)
- **Complexity**: Medium
- **Dependencies**: All previous phases
- **Operation**: Modify existing files
- **Status**: ⬜ Not Started

**Task 7.7: Remove console.logs and add proper error logging**
- **Action**: Search codebase for console.log statements, replace with proper error handling using try/catch blocks, add structured logging for important events (admin actions, chat tool calls, AI requests), ensure errors include context (userId, timestamp, action)
- **Complexity**: Simple
- **Dependencies**: None
- **Operation**: Modify existing files
- **Status**: ⬜ Not Started

**Task 7.8: Create README with project overview**
- **Action**: Update root `/README.md` with project description, features list (admin system, AI chat, mobile UI), tech stack (Hono, React, Cloudflare Workers, D1, Claude AI), quick start guide linking to DEPLOYMENT.md, architecture overview linking to docs/ARCHITECTURE.md, contribution guidelines
- **Complexity**: Simple
- **Dependencies**: Tasks 7.3, 7.4
- **Operation**: Modify existing file
- **Status**: ⬜ Not Started

### Final Validation

**Task 7.9: Perform security audit** ⚠️ HIGH RISK
- **Action**: Verify all admin routes are protected with requireAdmin middleware, check that user data is properly isolated (users can't access other users' data), validate JWT token expiration and refresh logic, ensure environment variables don't leak to frontend, test SQL injection protection in all queries, verify CORS configuration
- **Complexity**: Complex
- **Dependencies**: All previous phases
- **Operation**: Security testing
- **Status**: ⬜ Not Started

**Task 7.10: Performance testing and optimization**
- **Action**: Test API response times for all endpoints under load, verify KV cache hit rates for prompts are >90%, check chat streaming performance, optimize database queries with indexes if needed, test frontend bundle size and lazy loading, verify Cloudflare Workers don't hit CPU time limits
- **Complexity**: Complex
- **Dependencies**: All previous phases
- **Operation**: Performance testing
- **Status**: ⬜ Not Started

---

## Summary Statistics

- **Total Tasks**: 89
- **New Files**: 23
- **Modified Files**: 35
- **Simple Tasks**: 27
- **Medium Tasks**: 42
- **Complex Tasks**: 20

## Critical Path Dependencies

1. **Phase 1** must complete before any admin features work (security foundation)
2. **Phase 2** requires Phase 1 database schema (prompts reference user roles)
3. **Phase 3** is independent, can run parallel to Phase 2
4. **Phase 4** requires Phase 3 (chat goes in sidebar)
5. **Phase 5** requires Phases 1, 2, and 4 (admin UI needs all backend APIs)
6. **Phase 6** requires Phase 3 (mobile optimizes layout/sidebar)
7. **Phase 7** requires all previous phases (testing and documentation)

## High-Risk Tasks (Require Extra Attention)

- **Task 1.4** (Auth middleware): Critical security component - any bugs expose system
- **Task 4.4** (Chat service): Most complex feature with tool calling - integration complexity
- **Task 4.11** (Parse job posting): AI accuracy critical for user experience
- **Task 5.3** (Admin users page): Must handle pagination and data security properly
- **Task 6.3** (Mobile sidebar): Complex responsive behavior with touch gestures
- **Task 7.9** (Security audit): Must catch any vulnerabilities before production

## Parallel Execution Opportunities

**Can work in parallel**:
- Tasks 1.1, 1.3, 1.6 (no dependencies on each other)
- Phase 2 and Phase 3 (after Phase 1 completes)
- Tasks 3.4-3.12 (all remove Navigation independently)
- Tasks 4.5-4.12 (tool definitions can be added simultaneously)
- Tasks 6.4-6.9 (page responsiveness updates are independent)

## Estimated Timeline

- **Phase 1**: 3 days (critical, no shortcuts)
- **Phase 2**: 3 days (can partially overlap with Phase 3)
- **Phase 3**: 3 days (can partially overlap with Phase 2)
- **Phase 4**: 5 days (most complex, requires careful implementation)
- **Phase 5**: 3 days (UI work, straightforward once APIs exist)
- **Phase 6**: 3 days (polish and optimization)
- **Phase 7**: 3 days (documentation and testing)

**Total**: ~23 days (with some parallel work, could reduce to ~20 days)
