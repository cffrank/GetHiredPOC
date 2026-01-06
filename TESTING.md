# GetHiredPOC - Manual Testing Checklist

This document provides comprehensive manual testing procedures for all phases of the GetHiredPOC application. Test these scenarios before and after each deployment to ensure system integrity.

## Testing Overview

- **Testing Environment**: Both local development and production
- **Required Accounts**: Admin account, regular user account, test data
- **Tools Needed**: Browser DevTools, API testing tools (optional)
- **Estimated Time**: 2-3 hours for full test suite

---

## Phase 1: Admin Authentication & Authorization

### Test Case 1.1: Admin Route Protection

**Objective**: Verify that admin routes are protected and only accessible to admin users

**Steps**:
1. Sign out of the application
2. Navigate to `/admin` directly
3. Verify you are redirected to `/login`
4. Log in with a non-admin account
5. Navigate to `/admin`
6. Verify you receive "Access Denied" or are redirected

**Expected Result**:
- Unauthenticated users redirected to login
- Non-admin users cannot access admin routes
- Error message displayed for unauthorized access

**Pass/Fail**: ☐

---

### Test Case 1.2: Admin Email Verification

**Objective**: Verify admin role assignment based on environment variable

**Steps**:
1. Check `wrangler.toml` or environment for `ADMIN_EMAILS` value
2. Log in with an email in the admin list
3. Navigate to `/admin`
4. Verify access is granted
5. Log out and log in with a non-admin email
6. Navigate to `/admin`
7. Verify access is denied

**Expected Result**:
- Users with emails in `ADMIN_EMAILS` have admin role
- Admin users can access `/admin` routes
- Non-admin users cannot access admin routes

**Pass/Fail**: ☐

---

### Test Case 1.3: Membership Tier System

**Objective**: Verify trial and paid membership tracking

**Steps**:
1. Create a new user account
2. Check database: `SELECT role, membership_tier, trial_started_at FROM users WHERE email = 'test@example.com'`
3. Verify `membership_tier = 'trial'` and `trial_started_at` is set
4. As admin, navigate to `/admin/users`
5. Verify user appears with "Trial" membership status

**Expected Result**:
- New users default to 'trial' membership
- Trial start date is recorded
- Admin dashboard shows membership status

**Pass/Fail**: ☐

---

### Test Case 1.4: Admin Audit Logging

**Objective**: Verify admin actions are logged

**Steps**:
1. Log in as admin
2. Perform admin actions (edit prompt, import jobs, view users)
3. Check database: `SELECT * FROM admin_audit_log ORDER BY created_at DESC LIMIT 10`
4. Verify actions are recorded with user_id, action, and timestamp

**Expected Result**:
- Admin actions logged to `admin_audit_log` table
- Logs include user_id, action type, details, and timestamp
- No errors in logging mechanism

**Pass/Fail**: ☐

---

## Phase 2: Configurable AI Prompts

### Test Case 2.1: Prompt Loading from Database

**Objective**: Verify AI prompts are loaded from database instead of hardcoded values

**Steps**:
1. Check database: `SELECT prompt_key, prompt_name FROM ai_prompts WHERE is_active = 1`
2. Verify prompts exist for: `cover_letter`, `job_match`, `resume_tailor`, `linkedin_parse`
3. Trigger a cover letter generation (from job detail page)
4. Verify cover letter is generated successfully
5. Trigger a job match analysis
6. Verify match analysis completes

**Expected Result**:
- All required prompts exist in database
- AI features use database prompts
- No errors referencing missing prompts

**Pass/Fail**: ☐

---

### Test Case 2.2: Prompt Editing via Admin UI

**Objective**: Verify admins can edit AI prompts without redeployment

**Steps**:
1. Log in as admin
2. Navigate to `/admin/prompts`
3. Select "Cover Letter Generator" prompt
4. Edit the prompt template (add a test phrase like "TEST EDIT")
5. Save the changes
6. Generate a cover letter for a job
7. Verify the cover letter includes the test phrase

**Expected Result**:
- Admin can edit prompt templates
- Changes save successfully
- Updated prompts immediately affect AI generations

**Pass/Fail**: ☐

---

### Test Case 2.3: Prompt Caching with KV

**Objective**: Verify prompts are cached in KV for 24 hours

**Steps**:
1. Clear KV cache (if possible) or use new prompt key
2. Trigger AI generation (cover letter or job match)
3. Check backend logs for database query
4. Trigger same AI generation again
5. Check logs - should indicate cache hit, not database query
6. Wait 24+ hours (or manually expire cache)
7. Trigger generation again
8. Verify database query occurs

**Expected Result**:
- First request queries database
- Subsequent requests use KV cache
- Cache expires after 24 hours
- Performance improvement on cached requests

**Pass/Fail**: ☐

---

### Test Case 2.4: Model Configuration

**Objective**: Verify model configuration is stored and used correctly

**Steps**:
1. Navigate to `/admin/prompts`
2. Check model configuration for each prompt
3. Verify JSON format: `{"model": "...", "temperature": 0.7, "max_tokens": 600}`
4. Trigger AI generation
5. Verify AI uses correct model and parameters (check logs)

**Expected Result**:
- Model config stored as valid JSON
- AI services use configured model parameters
- Temperature and max_tokens respected

**Pass/Fail**: ☐

---

## Phase 3: Layout Refactor & Sidebar

### Test Case 3.1: Centralized Layout Structure

**Objective**: Verify all user pages use UserLayout component

**Steps**:
1. Navigate to each user page: `/jobs`, `/saved`, `/applications`, `/profile`, `/resume`, `/settings`, `/recommendations`, `/preferences`
2. Verify Navigation component appears on all pages
3. Verify Sidebar appears on all pages
4. Verify no duplicate navigation elements

**Expected Result**:
- Navigation renders once per page (not duplicated)
- Sidebar appears consistently across all pages
- Clean layout without redundant components

**Pass/Fail**: ☐

---

### Test Case 3.2: Sidebar Collapse/Expand

**Objective**: Verify sidebar can be toggled open/closed

**Steps**:
1. Navigate to `/jobs`
2. Verify sidebar is visible (default state)
3. Click sidebar toggle button
4. Verify sidebar collapses
5. Click toggle again
6. Verify sidebar expands
7. Navigate to another page
8. Verify sidebar state persists

**Expected Result**:
- Sidebar toggles between open and closed states
- Toggle button works consistently
- Sidebar state persists across navigation
- Smooth animation during toggle

**Pass/Fail**: ☐

---

### Test Case 3.3: Sidebar State Persistence

**Objective**: Verify sidebar state is saved to localStorage

**Steps**:
1. Open sidebar (if closed)
2. Open browser DevTools > Application > Local Storage
3. Check for `sidebarOpen` key
4. Verify value is `true` or `"true"`
5. Close sidebar
6. Check localStorage again - value should be `false` or `"false"`
7. Refresh page
8. Verify sidebar opens/closes based on localStorage value

**Expected Result**:
- Sidebar state stored in localStorage
- State persists across page refreshes
- State persists across browser sessions

**Pass/Fail**: ☐

---

## Phase 4: AI Chat Interface

### Test Case 4.1: Chat Interface Rendering

**Objective**: Verify chat interface appears in sidebar

**Steps**:
1. Log in as regular user
2. Navigate to any user page
3. Open sidebar (if closed)
4. Verify chat interface is visible
5. Verify message input field is present
6. Verify send button is present
7. Verify conversation history area is present

**Expected Result**:
- Chat interface renders in sidebar
- All UI elements visible and functional
- No layout issues or overlapping elements

**Pass/Fail**: ☐

---

### Test Case 4.2: Basic Chat Conversation

**Objective**: Verify users can send messages and receive AI responses

**Steps**:
1. Open chat sidebar
2. Type a simple message: "Hello, can you help me find a job?"
3. Click send or press Enter
4. Verify message appears in chat history
5. Wait for AI response
6. Verify AI response appears
7. Verify conversation is saved

**Expected Result**:
- User message sent successfully
- AI responds within reasonable time (< 10 seconds)
- Messages appear in correct order
- Conversation persists in UI

**Pass/Fail**: ☐

---

### Test Case 4.3: Chat Tool Calling - Search Jobs

**Objective**: Verify AI can search for jobs using tool calling

**Steps**:
1. Open chat sidebar
2. Send message: "Find me remote software engineer jobs in Wisconsin"
3. Wait for AI response
4. Verify AI calls `search_jobs` tool (check response mentions jobs)
5. Verify job results are returned
6. Verify AI provides summary of found jobs

**Expected Result**:
- AI understands job search intent
- `search_jobs` tool is called with correct parameters
- Job results are returned and displayed
- AI provides helpful summary

**Pass/Fail**: ☐

---

### Test Case 4.4: Chat Tool Calling - Save Job

**Objective**: Verify AI can save jobs for the user

**Steps**:
1. Open chat sidebar
2. Get a job ID (from jobs page or previous search)
3. Send message: "Save job [job_id] for me"
4. Wait for AI response
5. Verify AI calls `save_job` tool
6. Navigate to `/saved`
7. Verify job appears in saved jobs list

**Expected Result**:
- AI recognizes save intent
- `save_job` tool called successfully
- Job saved to user's saved jobs
- Confirmation message from AI

**Pass/Fail**: ☐

---

### Test Case 4.5: Chat Tool Calling - Update Profile

**Objective**: Verify AI can update user profile

**Steps**:
1. Open chat sidebar
2. Send message: "Update my bio to 'Experienced software engineer passionate about AI'"
3. Wait for AI response
4. Verify AI calls `update_user_profile` tool
5. Navigate to `/profile`
6. Verify bio is updated

**Expected Result**:
- AI understands profile update intent
- `update_user_profile` tool called with correct data
- Profile updated successfully
- AI confirms update

**Pass/Fail**: ☐

---

### Test Case 4.6: Chat Tool Calling - Parse Job Posting

**Objective**: Verify AI can parse pasted job postings

**Steps**:
1. Open chat sidebar
2. Copy a job posting from a real job board (Indeed, LinkedIn, etc.)
3. Send message: "Parse this job posting: [paste job text]"
4. Wait for AI response
5. Verify AI extracts key information (title, company, location, salary, requirements)
6. Verify structured data is saved

**Expected Result**:
- AI recognizes job posting text
- `parse_job_posting` tool called
- Job data extracted accurately
- Job can be saved or applied to

**Pass/Fail**: ☐

---

### Test Case 4.7: Chat Conversation History

**Objective**: Verify chat conversations are saved and can be retrieved

**Steps**:
1. Send several chat messages
2. Navigate away from page
3. Return to same page
4. Open chat sidebar
5. Verify previous conversation is loaded
6. Refresh page
7. Verify conversation still persists

**Expected Result**:
- Conversations saved to database
- Chat history loads on page load
- Messages appear in correct chronological order
- No duplicate messages

**Pass/Fail**: ☐

---

### Test Case 4.8: Multiple Chat Conversations

**Objective**: Verify users can create and switch between conversations

**Steps**:
1. Start a new chat conversation
2. Send some messages
3. Create a new conversation
4. Send different messages
5. Switch back to first conversation
6. Verify first conversation messages appear
7. Switch to second conversation
8. Verify second conversation messages appear

**Expected Result**:
- Multiple conversations can be created
- Conversations are isolated (no message mixing)
- Switching conversations loads correct history
- Conversation list shows all conversations

**Pass/Fail**: ☐

---

## Phase 5: Admin Dashboard UI

### Test Case 5.1: Admin Dashboard Access

**Objective**: Verify admin dashboard is accessible to admin users

**Steps**:
1. Log in as admin
2. Navigate to `/admin`
3. Verify dashboard loads successfully
4. Verify metrics cards are visible
5. Verify navigation to other admin pages works

**Expected Result**:
- Admin dashboard accessible
- No authentication errors
- Dashboard renders all sections
- Clean, professional UI

**Pass/Fail**: ☐

---

### Test Case 5.2: System Metrics Display

**Objective**: Verify system metrics are displayed accurately

**Steps**:
1. Navigate to `/admin`
2. Verify metrics cards show:
   - Total users count
   - Total jobs count
   - Total applications count
   - AI usage statistics
3. Create a new user (in another tab)
4. Refresh admin dashboard
5. Verify user count increased

**Expected Result**:
- All metrics display valid numbers
- Metrics reflect actual database counts
- Metrics update when data changes
- No errors in metrics calculation

**Pass/Fail**: ☐

---

### Test Case 5.3: Admin User Management

**Objective**: Verify admin can view and manage users

**Steps**:
1. Navigate to `/admin/users`
2. Verify user list displays
3. Check pagination (if > 50 users)
4. Search for a specific user
5. View user details
6. Verify membership tier displayed
7. Verify trial expiration dates shown

**Expected Result**:
- User list loads successfully
- All user fields displayed correctly
- Pagination works smoothly
- Search functionality works
- User details accurate

**Pass/Fail**: ☐

---

### Test Case 5.4: Admin Job Import

**Objective**: Verify admin can search and import jobs from Adzuna

**Steps**:
1. Navigate to `/admin/jobs`
2. Enter search criteria (e.g., "software engineer", "Wisconsin")
3. Click "Search Jobs"
4. Verify job results appear
5. Preview a job listing
6. Click "Import" on a job
7. Verify success message
8. Navigate to `/jobs` (user view)
9. Verify imported job appears

**Expected Result**:
- Adzuna API search works
- Job results display correctly
- Import functionality works
- Imported jobs visible to users

**Pass/Fail**: ☐

---

### Test Case 5.5: Admin Prompt Editor

**Objective**: Verify admin can edit AI prompts via UI

**Steps**:
1. Navigate to `/admin/prompts`
2. Verify all prompts listed (cover_letter, job_match, etc.)
3. Click "Edit" on a prompt
4. Modify prompt template
5. Update model configuration
6. Save changes
7. Verify success message
8. Test AI feature using updated prompt
9. Verify changes reflected in AI output

**Expected Result**:
- Prompt list displays all prompts
- Editor shows current prompt template
- Changes save successfully
- Live preview works (if implemented)
- Updated prompts work immediately

**Pass/Fail**: ☐

---

### Test Case 5.6: Admin Prompt Live Preview

**Objective**: Verify prompt editor shows live preview of rendered prompt

**Steps**:
1. Navigate to `/admin/prompts`
2. Select a prompt with variables (e.g., cover_letter)
3. Edit prompt template
4. Verify live preview updates in real-time
5. Verify variables are highlighted or indicated
6. Verify sample data fills variables in preview

**Expected Result**:
- Live preview renders prompt with sample data
- Preview updates as user types
- Variables clearly indicated
- Preview helps admin understand prompt structure

**Pass/Fail**: ☐

---

## Phase 6: Mobile Responsive UI

### Test Case 6.1: Mobile Sidebar Behavior

**Objective**: Verify sidebar works correctly on mobile devices

**Steps**:
1. Open application on mobile device or browser DevTools mobile emulation
2. Set viewport to 375x667 (iPhone SE)
3. Navigate to `/jobs`
4. Verify sidebar is closed by default
5. Tap hamburger menu icon
6. Verify sidebar opens as overlay
7. Verify sidebar covers main content
8. Tap outside sidebar or close button
9. Verify sidebar closes

**Expected Result**:
- Sidebar hidden by default on mobile
- Hamburger menu visible and functional
- Sidebar opens as full-screen or overlay
- Easy to close sidebar
- No horizontal scrolling issues

**Pass/Fail**: ☐

---

### Test Case 6.2: Touch Target Sizing

**Objective**: Verify all interactive elements meet 44px minimum touch target size

**Steps**:
1. Open application on mobile device
2. Inspect all buttons, links, and interactive elements
3. Verify touch targets are at least 44px x 44px
4. Test tapping buttons and links
5. Verify no accidental taps on adjacent elements

**Expected Result**:
- All buttons meet 44px minimum height
- Links have adequate spacing
- No precision tapping required
- Comfortable mobile interaction

**Pass/Fail**: ☐

---

### Test Case 6.3: Responsive Job Cards

**Objective**: Verify job listings display correctly on mobile

**Steps**:
1. Open `/jobs` on mobile device
2. Verify job cards stack vertically
3. Verify all job information is readable
4. Verify badges and tags wrap appropriately
5. Tap a job card to view details
6. Verify job detail page is mobile-friendly

**Expected Result**:
- Job cards display well on small screens
- No horizontal scrolling
- Text is readable (not too small)
- Images scale appropriately
- No layout breaking

**Pass/Fail**: ☐

---

### Test Case 6.4: Mobile Navigation

**Objective**: Verify navigation works on mobile devices

**Steps**:
1. Open application on mobile device
2. Verify navigation is visible or accessible via menu
3. Test all navigation links
4. Verify dropdown menus work on mobile
5. Verify user menu accessible

**Expected Result**:
- Navigation adapts to mobile screen
- All links accessible
- Dropdowns work with touch
- No overlapping elements

**Pass/Fail**: ☐

---

### Test Case 6.5: Mobile Form Inputs

**Objective**: Verify forms are mobile-friendly

**Steps**:
1. Open profile edit page on mobile
2. Tap on text inputs
3. Verify keyboard appears appropriately
4. Verify input fields zoom correctly (not too much)
5. Fill out form fields
6. Submit form
7. Verify validation messages visible

**Expected Result**:
- Input fields have appropriate font size (16px minimum to prevent zoom)
- Keyboard type matches input (email, number, etc.)
- Form submits successfully on mobile
- Validation messages clear and visible

**Pass/Fail**: ☐

---

### Test Case 6.6: Mobile Chat Interface

**Objective**: Verify chat works well on mobile devices

**Steps**:
1. Open sidebar on mobile
2. Open chat interface
3. Send a message
4. Verify chat input accessible when keyboard open
5. Verify message history scrollable
6. Verify AI responses display correctly

**Expected Result**:
- Chat interface adapts to mobile
- Keyboard doesn't hide input field
- Messages display without horizontal scroll
- Smooth scrolling in conversation

**Pass/Fail**: ☐

---

## Phase 7: End-to-End User Flows

### Test Case 7.1: New User Onboarding Flow

**Objective**: Verify complete new user experience

**Steps**:
1. Navigate to homepage (logged out)
2. Click "Sign Up"
3. Create new account
4. Complete onboarding form (profile setup)
5. Set job preferences
6. Browse jobs
7. Save a job
8. Generate a cover letter
9. Apply to job
10. Verify application tracked

**Expected Result**:
- Seamless onboarding flow
- No confusing steps or errors
- User guided through setup
- All features work for new user

**Pass/Fail**: ☐

---

### Test Case 7.2: Job Search & Application Flow

**Objective**: Verify complete job search and application process

**Steps**:
1. Log in as user
2. Navigate to `/jobs`
3. Use filters to search (location, remote, title)
4. Click on a job to view details
5. Get AI match analysis
6. Save job for later
7. Generate tailored resume
8. Generate cover letter
9. Apply to job
10. Verify application appears in `/applications`

**Expected Result**:
- All search features work
- Job details display correctly
- AI features work seamlessly
- Application saved successfully

**Pass/Fail**: ☐

---

### Test Case 7.3: Admin Job Management Flow

**Objective**: Verify admin can find and import jobs for users

**Steps**:
1. Log in as admin
2. Navigate to `/admin/jobs`
3. Search Adzuna for jobs ("React Developer", "Remote")
4. Preview search results
5. Import multiple jobs
6. Log out and log in as regular user
7. Navigate to `/jobs`
8. Verify imported jobs visible
9. Verify jobs match search criteria

**Expected Result**:
- Admin can search external APIs
- Import process smooth
- Imported jobs immediately available
- Jobs correctly formatted and complete

**Pass/Fail**: ☐

---

### Test Case 7.4: AI Chat Job Discovery Flow

**Objective**: Verify user can find and apply to jobs via chat

**Steps**:
1. Log in as user
2. Open chat sidebar
3. Ask: "Find me remote Python jobs paying over $100k"
4. Review AI's job suggestions
5. Ask: "Tell me more about the first job"
6. Ask: "Save that job for me"
7. Ask: "Generate a cover letter for it"
8. Verify job saved and cover letter generated
9. Navigate to saved jobs to confirm

**Expected Result**:
- AI understands complex queries
- Job search via chat works
- Job details provided accurately
- Save and generation tools work via chat

**Pass/Fail**: ☐

---

### Test Case 7.5: Profile Import from LinkedIn

**Objective**: Verify LinkedIn profile import functionality

**Steps**:
1. Log in as user
2. Navigate to profile page
3. Click "Import from LinkedIn"
4. Authorize LinkedIn OAuth
5. Verify profile data imported (name, headline, work history)
6. Verify work experience saved
7. Verify education saved
8. Edit imported data
9. Save changes

**Expected Result**:
- LinkedIn OAuth works
- Profile data imported accurately
- Work experience and education parsed correctly
- User can edit imported data

**Pass/Fail**: ☐

---

## Performance Testing

### Test Case P.1: Page Load Times

**Objective**: Verify pages load within acceptable time

**Steps**:
1. Open browser DevTools > Network tab
2. Clear cache
3. Navigate to each main page
4. Record load time
5. Verify < 3 seconds for initial load
6. Verify < 1 second for subsequent navigation

**Expected Result**:
- Fast page loads
- No blocking resources
- Efficient caching

**Pass/Fail**: ☐

---

### Test Case P.2: AI Response Times

**Objective**: Verify AI features respond quickly

**Steps**:
1. Generate cover letter - time it
2. Get job match analysis - time it
3. Send chat message - time it
4. Verify all < 10 seconds

**Expected Result**:
- AI responses within reasonable time
- No timeouts or hanging requests

**Pass/Fail**: ☐

---

## Security Testing

### Test Case S.1: Authentication Required

**Objective**: Verify protected routes require authentication

**Steps**:
1. Log out
2. Try accessing: `/jobs`, `/profile`, `/admin`, `/applications`
3. Verify all redirect to `/login`

**Expected Result**:
- All protected routes redirect unauthenticated users
- No data exposed without login

**Pass/Fail**: ☐

---

### Test Case S.2: SQL Injection Prevention

**Objective**: Verify SQL injection attacks are prevented

**Steps**:
1. Try job search with: `'; DROP TABLE users; --`
2. Try login with SQL injection in email field
3. Verify no errors or unexpected behavior
4. Verify database intact

**Expected Result**:
- Prepared statements prevent injection
- Invalid input handled gracefully
- No database corruption

**Pass/Fail**: ☐

---

### Test Case S.3: XSS Prevention

**Objective**: Verify cross-site scripting attacks are prevented

**Steps**:
1. Try entering: `<script>alert('XSS')</script>` in profile bio
2. Save and view profile
3. Verify script doesn't execute
4. Verify HTML escaped or sanitized

**Expected Result**:
- User input sanitized
- Scripts don't execute
- Safe rendering of user content

**Pass/Fail**: ☐

---

## Data Integrity Testing

### Test Case D.1: Database Migrations

**Objective**: Verify all migrations applied successfully

**Steps**:
1. Check database schema
2. Verify all tables exist (users, jobs, applications, saved_jobs, chat_conversations, chat_messages, ai_prompts, admin_audit_log, system_metrics)
3. Verify all columns exist
4. Verify indexes created

**Expected Result**:
- All migrations applied
- Schema matches expected structure
- No missing tables or columns

**Pass/Fail**: ☐

---

### Test Case D.2: Foreign Key Constraints

**Objective**: Verify referential integrity enforced

**Steps**:
1. Try deleting a user with saved jobs
2. Verify cascade delete removes saved jobs
3. Try creating application with invalid job_id
4. Verify foreign key constraint error

**Expected Result**:
- Cascade deletes work
- Invalid references prevented
- Data integrity maintained

**Pass/Fail**: ☐

---

## Accessibility Testing

### Test Case A.1: Keyboard Navigation

**Objective**: Verify site navigable via keyboard

**Steps**:
1. Use only Tab, Enter, and arrow keys
2. Navigate through main pages
3. Open and interact with modals
4. Fill out forms
5. Submit forms

**Expected Result**:
- All interactive elements focusable
- Focus indicators visible
- Logical tab order
- No keyboard traps

**Pass/Fail**: ☐

---

### Test Case A.2: Screen Reader Compatibility

**Objective**: Verify site works with screen readers

**Steps**:
1. Enable screen reader (VoiceOver, NVDA, etc.)
2. Navigate through pages
3. Verify labels announced correctly
4. Verify form fields have labels
5. Verify buttons have accessible names

**Expected Result**:
- All content readable by screen reader
- Semantic HTML used
- ARIA labels where needed
- Logical reading order

**Pass/Fail**: ☐

---

## Browser Compatibility Testing

### Test Case B.1: Cross-Browser Testing

**Objective**: Verify site works across major browsers

**Test Matrix**:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

**Expected Result**:
- Consistent functionality across browsers
- No layout breaking
- All features work

**Pass/Fail**: ☐

---

## Error Handling Testing

### Test Case E.1: Network Errors

**Objective**: Verify graceful handling of network failures

**Steps**:
1. Open DevTools > Network
2. Enable network throttling or offline mode
3. Try loading pages
4. Try submitting forms
5. Verify error messages displayed

**Expected Result**:
- User-friendly error messages
- No app crashes
- Retry functionality available

**Pass/Fail**: ☐

---

### Test Case E.2: API Errors

**Objective**: Verify API errors handled gracefully

**Steps**:
1. Trigger API call (job search, save job, etc.)
2. Simulate API error (if possible)
3. Verify error message displayed
4. Verify app remains functional

**Expected Result**:
- Errors caught and handled
- User notified clearly
- No unhandled exceptions

**Pass/Fail**: ☐

---

## Test Summary

**Total Test Cases**: 51
**Passed**: ___
**Failed**: ___
**Skipped**: ___

**Test Date**: _______________
**Tested By**: _______________
**Environment**: [ ] Local [ ] Production

**Critical Issues Found**: _______________

**Notes**:
