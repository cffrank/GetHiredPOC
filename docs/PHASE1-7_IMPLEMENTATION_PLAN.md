# Admin System, AI Chat & Mobile UI - Implementation Plan

## Overview
Transform GetHiredPOC from POC to production-ready SaaS with role-based admin system, AI chat assistant, and mobile-responsive UI.

**Current Critical Issue**: Admin routes (`/api/admin/*`) are UNPROTECTED - anyone can access them!

---

## User Requirements Summary

✅ **Admin System**: Environment-based admin emails, membership billing (free trial → paid)
✅ **Dashboard**: User stats, job stats, AI usage metrics, system health
✅ **Manual Job Queries**: Search Adzuna, import for user, bulk import, preview results
✅ **Configurable Prompts**: Database-stored AI prompts with admin UI editor
✅ **AI Chat**: Persistent left sidebar with full system access (save jobs, update profile, parse job postings)
✅ **Mobile UI**: Responsive design improvements
✅ **Feature Tracking**: Document for future enhancements

---

## Implementation Phases (7 Phases, ~23 Days)

### **Phase 1: Security & Admin Foundation** (Days 1-3) 🔴 CRITICAL

**Problem**: Admin routes unprotected, no role system exists

**Database Migration**: `0010_admin_and_membership.sql`
```sql
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';
ALTER TABLE users ADD COLUMN membership_tier TEXT DEFAULT 'trial';
ALTER TABLE users ADD COLUMN membership_started_at INTEGER;
ALTER TABLE users ADD COLUMN membership_expires_at INTEGER;
ALTER TABLE users ADD COLUMN trial_started_at INTEGER DEFAULT (unixepoch());

CREATE TABLE admin_audit_log (...);  -- Track admin actions
CREATE TABLE system_metrics (...);   -- Dashboard analytics
```

**New Files**:
- `/packages/backend/src/middleware/auth.middleware.ts` - requireAuth, requireAdmin, requirePaidMembership
- `/packages/backend/src/services/admin.service.ts` - getSystemMetrics, getAllUsers, recordMetric
- `/packages/shared/src/types/user.ts` - Add role, membership_tier fields to User interface

**Modified Files**:
- `/packages/backend/src/routes/admin.ts` - Add `admin.use('*', requireAdmin)` at top, add metrics endpoint
- `/packages/backend/src/services/auth.service.ts` - Update SQL queries to include new user fields
- `/packages/backend/wrangler.toml` - Add `ADMIN_EMAILS = "admin@example.com"` to [vars]

**Environment Variables** (via `wrangler secret put`):
```bash
ADMIN_EMAILS="your-admin-email@example.com,another-admin@example.com"
```

**Deliverables**: Secure admin routes, audit logging, membership enforcement, basic metrics API

---

### **Phase 2: Configurable AI Prompts** (Days 4-6)

**Problem**: AI prompts hardcoded in 5 service files - can't update without redeployment

**Database Migration**: `0011_ai_prompts.sql`
```sql
CREATE TABLE ai_prompts (
  prompt_key TEXT UNIQUE,      -- 'cover_letter', 'job_match', 'resume_tailor', etc.
  prompt_template TEXT,        -- Template with {{variable}} placeholders
  model_config TEXT,           -- JSON: { temperature, max_tokens, model }
  version INTEGER,
  is_active INTEGER,
  ...
);

-- Seed with existing prompts from hardcoded versions
INSERT INTO ai_prompts (prompt_key, prompt_name, prompt_template, ...) VALUES (...);
```

**New Files**:
- `/packages/backend/src/services/ai-prompt.service.ts` - getPrompt, renderPrompt, listPrompts, upsertPrompt

**Modified Files**:
- `/packages/backend/src/services/ai-cover-letter.service.ts` - Replace hardcoded prompt with getPrompt()
- `/packages/backend/src/services/job-matching.service.ts` - Replace hardcoded prompt with getPrompt()
- `/packages/backend/src/services/ai-resume.service.ts` - Replace hardcoded prompt with getPrompt()
- `/packages/backend/src/services/linkedin-parser.service.ts` - Replace hardcoded prompt with getPrompt()
- `/packages/backend/src/routes/admin.ts` - Add GET/POST /api/admin/prompts endpoints

**Key Pattern**:
```typescript
// Old way:
const prompt = "You are an expert cover letter writer...";

// New way:
const promptConfig = await getPrompt(env, 'cover_letter');
const prompt = renderPrompt(promptConfig.prompt_template, {
  user_name: user.full_name,
  job_title: job.title,
  // ...variables
});
```

**Deliverables**: Database-driven prompts, 24hr KV cache, admin API for prompt CRUD

---

### **Phase 3: Layout Refactor & Sidebar** (Days 7-9)

**Problem**: Each page renders `<Navigation />` individually, no centralized layout for sidebar

**New Files**:
- `/packages/frontend/src/components/layouts/UserLayout.tsx` - Wrapper with Navigation + Sidebar
- `/packages/frontend/src/components/Sidebar.tsx` - Collapsible sidebar (placeholder chat for now)

**Modified Files**:
- `/packages/frontend/src/App.tsx` - Wrap protected routes in `<UserLayout><Outlet /></UserLayout>`
- Remove `<Navigation />` from ALL page components:
  - `/packages/frontend/src/pages/Jobs.tsx`
  - `/packages/frontend/src/pages/SavedJobs.tsx`
  - `/packages/frontend/src/pages/Applications.tsx`
  - `/packages/frontend/src/pages/Profile.tsx`
  - `/packages/frontend/src/pages/Resume.tsx`
  - `/packages/frontend/src/pages/Settings.tsx`
  - `/packages/frontend/src/pages/Recommendations.tsx`
  - `/packages/frontend/src/pages/JobPreferences.tsx`
  - `/packages/frontend/src/pages/Onboarding.tsx`

**Layout Structure**:
```
<UserLayout>
  <Navigation />  {/* Top nav */}
  <div className="flex">
    <Sidebar isOpen={sidebarOpen} onToggle={...} />  {/* Left sidebar */}
    <main>
      <Outlet />  {/* Page content */}
    </main>
  </div>
</UserLayout>
```

**Deliverables**: Centralized layout, collapsible sidebar (UI only), state persistence via localStorage

---

### **Phase 4: AI Chat Interface** (Days 10-14) ⭐ MAJOR FEATURE

**Problem**: No conversational AI assistant, manual job/profile management

**Database Migration**: `0012_chat_system.sql`
```sql
CREATE TABLE chat_conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  title TEXT,
  ...
);

CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT,
  role TEXT,  -- 'user' | 'assistant' | 'system'
  content TEXT,
  tool_calls TEXT,   -- JSON of function calls
  tool_results TEXT, -- JSON of results
  ...
);
```

**AI Model Decision**: Use **Claude Sonnet 3.5** (via Anthropic API) for chat
- Better at conversation and tool calling than Llama
- Keep Llama 3.1 for batch operations (cover letters, job matching)
- Requires `ANTHROPIC_API_KEY` environment variable

**New Files**:
- `/packages/backend/src/services/chat.service.ts` - sendChatMessage, executeTool, tool definitions
- `/packages/backend/src/routes/chat.ts` - POST /api/chat/message, GET /api/chat/conversations
- `/packages/frontend/src/components/ChatInterface.tsx` - Message UI with streaming support

**Available Chat Tools** (AI can call these):
1. `search_jobs` - Find jobs by query/location
2. `save_job` - Bookmark a job
3. `get_user_profile` - Fetch user's info
4. `update_user_profile` - Edit user's profile
5. `get_job_preferences` - Fetch job search preferences
6. `update_job_preferences` - Update preferences
7. `parse_job_posting` - Extract structured data from pasted job text
8. `create_application` - Apply to a job

**Modified Files**:
- `/packages/backend/src/index.ts` - Add `app.route('/api/chat', chat)`
- `/packages/frontend/src/components/Sidebar.tsx` - Replace placeholder with `<ChatInterface />`

**Environment Variables**:
```bash
wrangler secret put ANTHROPIC_API_KEY
```

**Deliverables**: Functional conversational AI, tool calling, job parsing from pasted text, chat history

---

### **Phase 5: Admin Dashboard UI** (Days 15-17)

**Problem**: No UI for admin features (only APIs exist)

**New Files**:
- `/packages/frontend/src/components/layouts/AdminLayout.tsx` - Admin-specific layout with nav
- `/packages/frontend/src/pages/admin/AdminDashboard.tsx` - Metrics cards
- `/packages/frontend/src/pages/admin/AdminUsers.tsx` - User list with pagination
- `/packages/frontend/src/pages/admin/AdminJobs.tsx` - Job search/import UI
- `/packages/frontend/src/pages/admin/AdminPrompts.tsx` - Prompt editor with live preview

**Modified Files**:
- `/packages/frontend/src/App.tsx` - Add admin routes under AdminLayout
- `/packages/frontend/src/components/ProtectedRoute.tsx` - Add `requireAdmin` prop, check user.role
- `/packages/frontend/src/components/Navigation.tsx` - Add "Admin" link for admin users

**Admin Routes**:
```typescript
<Route element={<ProtectedRoute requireAdmin />}>
  <Route element={<AdminLayout />}>
    <Route path="/admin" element={<AdminDashboard />} />
    <Route path="/admin/users" element={<AdminUsers />} />
    <Route path="/admin/jobs" element={<AdminJobs />} />
    <Route path="/admin/prompts" element={<AdminPrompts />} />
  </Route>
</Route>
```

**Deliverables**: Complete admin UI, metrics visualization, user management, job import controls, prompt editor

---

### **Phase 6: Mobile Responsive UI** (Days 18-20)

**Problem**: Current UI not optimized for mobile, boring visual design

**Modified Files**:
- `/packages/frontend/tailwind.config.js` - Add custom colors, touch-friendly sizing
- `/packages/frontend/src/components/Sidebar.tsx` - Mobile overlay, hamburger menu, touch gestures
- `/packages/frontend/src/components/ui/Button.tsx` - Min-height 44px (Apple touch target)
- `/packages/frontend/src/pages/Jobs.tsx` - Stack badges on mobile, responsive cards
- `/packages/frontend/src/pages/JobDetail.tsx` - Mobile-friendly layout
- `/packages/frontend/src/pages/Applications.tsx` - Touch-friendly drag-drop

**Design Improvements**:
- Inter font family
- Soft shadows (0 2px 8px rgba(0,0,0,0.08))
- Primary color palette (blue 50-900)
- 44px minimum touch targets
- Collapsible sidebar on mobile (overlay mode)

**Deliverables**: Mobile-responsive sidebar, touch-friendly buttons, modern visual design

---

### **Phase 7: Testing & Documentation** (Days 21-23)

**New Files**:
- `/TESTING.md` - Manual testing checklist (security, chat, admin, mobile)
- `/FEATURE_REQUESTS.md` - Template for tracking future enhancements
- `/docs/DEPLOYMENT.md` - Step-by-step deployment guide
- `/docs/ARCHITECTURE.md` - System diagram, database schema, AI architecture

**Testing Checklist Sections**:
- ✅ Phase 1: Admin auth protection
- ✅ Phase 2: Prompt loading and caching
- ✅ Phase 3: Layout persistence
- ✅ Phase 4: Chat tool calling
- ✅ Phase 5: Admin dashboard
- ✅ Phase 6: Mobile responsiveness
- ✅ Phase 7: End-to-end flows

**Deliverables**: Documentation, testing framework, feature tracking system

---

## Critical Files Summary

### Highest Priority (Phase 1 - Security)
1. `/packages/backend/src/middleware/auth.middleware.ts` - NEW ⚠️
2. `/packages/backend/src/routes/admin.ts` - MODIFY (add middleware)
3. `/migrations/0010_admin_and_membership.sql` - NEW
4. `/packages/backend/wrangler.toml` - MODIFY (add ADMIN_EMAILS)

### High Priority (Phases 2-4 - Core Features)
5. `/packages/backend/src/services/ai-prompt.service.ts` - NEW
6. `/packages/backend/src/services/chat.service.ts` - NEW (most complex)
7. `/packages/frontend/src/components/layouts/UserLayout.tsx` - NEW
8. `/packages/frontend/src/components/ChatInterface.tsx` - NEW
9. `/packages/frontend/src/App.tsx` - MODIFY (routing)

### Medium Priority (Phase 5 - Admin UI)
10. `/packages/frontend/src/pages/admin/*` - NEW (4 files)
11. `/packages/frontend/src/components/ProtectedRoute.tsx` - MODIFY

---

## Deployment Sequence

1. **Phase 1 Deploy** (CRITICAL) - Secure admin routes immediately
   - Run migration 0010
   - Set ADMIN_EMAILS secret
   - Deploy backend
   - Verify admin protection works

2. **Phase 2 Deploy** - Enable configurable prompts
   - Run migration 0011
   - Deploy backend with prompt service
   - Test existing AI features still work

3. **Phase 3 Deploy** - Layout refactor
   - Deploy frontend with new layout
   - Verify all pages render correctly

4. **Phase 4 Deploy** - AI Chat (requires Claude API key)
   - Run migration 0012
   - Set ANTHROPIC_API_KEY secret
   - Deploy backend + frontend
   - Test chat tool calling

5. **Phase 5 Deploy** - Admin Dashboard
   - Deploy frontend with admin UI
   - Test admin workflow end-to-end

6. **Phase 6 Deploy** - Mobile improvements
   - Deploy frontend with responsive UI
   - Test on mobile devices

7. **Phase 7** - Documentation (no deployment)

---

## Environment Variables Needed

```bash
# Phase 1
wrangler secret put ADMIN_EMAILS
# Value: "admin@example.com,another-admin@example.com"

# Phase 4
wrangler secret put ANTHROPIC_API_KEY
# Value: Your Claude API key from https://console.anthropic.com/

# Existing (already configured)
# ADZUNA_APP_KEY, RESEND_API_KEY, LINKEDIN_CLIENT_SECRET
```

---

## Key Design Decisions

**Admin Authentication**: Environment variable list of emails (simple, secure, no UI needed for initial MVP)

**Membership Model**: Free trial (14 days) → Paid (simple two-tier, add Stripe later)

**AI Chat Model**: Claude Sonnet 3.5 (conversational quality) + Llama 3.1 (batch operations cost efficiency)

**Chat Placement**: Persistent left sidebar (always accessible like ChatGPT)

**Mobile Strategy**: Collapsible sidebar with overlay on mobile, 44px touch targets

**Prompt Storage**: Database with KV cache (updateable without deployment)

---

## Risks & Mitigations

**Risk**: Claude API costs could be high for chat
**Mitigation**: Rate limit chat to 10 messages/hour per user, monitor usage

**Risk**: Chat tool calling could modify data unexpectedly
**Mitigation**: Add audit logging for all tool calls, allow undo

**Risk**: Mobile sidebar UX could be confusing
**Mitigation**: User testing after Phase 3, iterate on feedback

**Risk**: Migration complexity with existing users
**Mitigation**: All new fields have defaults, backward compatible

---

## Success Metrics

After implementation, measure:
- ✅ Admin can view metrics dashboard
- ✅ Admin can import jobs via UI
- ✅ Admin can edit AI prompts without redeployment
- ✅ Users can chat with AI to find jobs
- ✅ Users can paste job posting → AI saves it
- ✅ Mobile users can access all features
- ✅ Zero unauthorized admin access attempts succeed

---

## Future Enhancements (Post-MVP)

From user's request: "add a document for feature requests"

See `/FEATURE_REQUESTS.md` (created in Phase 7) for:
- Stripe payment integration
- Weekly job digest emails
- Visual resume builder (WYSIWYG)
- LinkedIn auto-apply integration
- Salary range filtering
- Company size preferences
- Advanced search filters
