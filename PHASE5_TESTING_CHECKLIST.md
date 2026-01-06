# Phase 5: Admin Dashboard UI - Testing Checklist

## Overview
This checklist verifies all Phase 5 functionality for the admin dashboard UI.

## Prerequisites
- [ ] Backend deployed with Phase 1 admin APIs
- [ ] User account with `role='admin'` in database
- [ ] User account with `role='user'` for access control testing
- [ ] Frontend deployed and accessible

---

## Test 1: Admin Authentication & Access Control

### Test 1.1: Admin User Can Access Admin Routes
1. [ ] Login with admin user credentials
2. [ ] Verify "Admin" link appears in top navigation (purple color)
3. [ ] Click "Admin" link
4. [ ] Verify redirected to `/admin` dashboard
5. [ ] Verify no "Access Denied" message appears

**Expected Result:** Admin user can access admin dashboard

### Test 1.2: Regular User Cannot Access Admin Routes
1. [ ] Login with regular user credentials (non-admin)
2. [ ] Verify "Admin" link does NOT appear in navigation
3. [ ] Manually navigate to `/admin` in browser
4. [ ] Verify "Access Denied" page appears
5. [ ] Verify message: "You do not have permission to access this area"

**Expected Result:** Regular users are blocked from admin routes

### Test 1.3: Unauthenticated Users Redirected
1. [ ] Logout (if logged in)
2. [ ] Manually navigate to `/admin`
3. [ ] Verify redirected to `/login` page

**Expected Result:** Unauthenticated users redirected to login

---

## Test 2: Admin Dashboard (Metrics Display)

### Test 2.1: Dashboard Layout
1. [ ] Navigate to `/admin`
2. [ ] Verify admin navigation header displays:
   - [ ] "JobMatch AI Admin" logo
   - [ ] Navigation tabs: Dashboard, Users, Jobs, Prompts
   - [ ] "Back to App" link
   - [ ] Admin email displayed
3. [ ] Verify "Dashboard" tab is highlighted (blue background)

**Expected Result:** Admin layout renders correctly

### Test 2.2: User Metrics Cards
1. [ ] Verify "User Metrics" section displays
2. [ ] Verify 4 metric cards show:
   - [ ] Total Users (blue card)
   - [ ] Admin Users (purple card)
   - [ ] Trial Users (orange card)
   - [ ] Paid Users (green card)
3. [ ] Verify all numbers are formatted correctly (e.g., 1,234)
4. [ ] Verify subtitles display for Trial and Paid cards

**Expected Result:** User metrics display with correct formatting

### Test 2.3: Job & Application Metrics
1. [ ] Verify "Job & Application Metrics" section displays
2. [ ] Verify 3 metric cards show:
   - [ ] Total Jobs
   - [ ] Total Applications
   - [ ] Total Saved Jobs
3. [ ] Verify all values are numbers

**Expected Result:** Job metrics display correctly

### Test 2.4: AI Usage Metrics
1. [ ] Verify "AI Usage Metrics" section displays
2. [ ] Verify 3 metric cards show:
   - [ ] AI Requests Today
   - [ ] AI Requests This Week
   - [ ] AI Requests This Month

**Expected Result:** AI metrics display correctly

### Test 2.5: System Health Metrics (if available)
1. [ ] Check if "System Health" section displays
2. [ ] If database_size_mb available, verify displays as "X.XX MB"
3. [ ] If active_sessions available, verify displays as number

**Expected Result:** System health metrics display if available

---

## Test 3: User Management Page

### Test 3.1: Navigation to Users Page
1. [ ] Click "Users" tab in admin navigation
2. [ ] Verify URL is `/admin/users`
3. [ ] Verify "Users" tab is highlighted

**Expected Result:** Navigated to users page

### Test 3.2: User List Display
1. [ ] Verify page title: "User Management"
2. [ ] Verify user table displays with columns:
   - [ ] User (name + email)
   - [ ] Role (badge)
   - [ ] Membership (badge)
   - [ ] Joined (date)
   - [ ] Actions (button)
3. [ ] Verify at least one user displays
4. [ ] Verify role badges have correct colors:
   - [ ] Admin = purple
   - [ ] User = gray
5. [ ] Verify membership badges have correct colors:
   - [ ] Paid = green
   - [ ] Trial = orange

**Expected Result:** User list displays with correct formatting

### Test 3.3: User Search
1. [ ] Enter search term in search box (e.g., email or name)
2. [ ] Click "Search" button
3. [ ] Verify filtered results display
4. [ ] Click "Clear" button
5. [ ] Verify full list returns

**Expected Result:** Search filters user list correctly

### Test 3.4: Pagination
1. [ ] If more than 20 users exist, verify pagination controls display
2. [ ] Verify page indicator shows "Page X of Y"
3. [ ] Click "Next" button
4. [ ] Verify page number increments
5. [ ] Click "Previous" button
6. [ ] Verify page number decrements

**Expected Result:** Pagination works correctly

### Test 3.5: Role Change
1. [ ] Find a user with role="user"
2. [ ] Click "Make Admin" button
3. [ ] Confirm the dialog
4. [ ] Verify role badge changes to purple "admin"
5. [ ] Click "Revoke Admin" button
6. [ ] Confirm the dialog
7. [ ] Verify role badge changes to gray "user"

**Expected Result:** Role changes work and update UI

---

## Test 4: Job Import Management Page

### Test 4.1: Navigation to Jobs Page
1. [ ] Click "Jobs" tab in admin navigation
2. [ ] Verify URL is `/admin/jobs`
3. [ ] Verify "Jobs" tab is highlighted

**Expected Result:** Navigated to jobs page

### Test 4.2: Bulk Job Import UI
1. [ ] Verify page title: "Job Import Management"
2. [ ] Verify "Bulk Job Import" section displays
3. [ ] Verify textarea has default queries pre-filled
4. [ ] Verify query counter displays (e.g., "3 queries")
5. [ ] Edit queries (add/remove lines)
6. [ ] Verify counter updates

**Expected Result:** Bulk import UI displays correctly

### Test 4.3: Bulk Import Validation
1. [ ] Clear all queries from textarea
2. [ ] Click "Start Bulk Import"
3. [ ] Verify alert: "Please enter at least one search query"

**Expected Result:** Empty queries rejected

### Test 4.4: Bulk Import Execution (Optional - creates real jobs)
1. [ ] Enter valid search queries
2. [ ] Click "Start Bulk Import"
3. [ ] Confirm dialog
4. [ ] Verify button text changes to "Importing..."
5. [ ] Wait for completion
6. [ ] Verify success message displays with stats:
   - [ ] Imported count
   - [ ] Updated count
   - [ ] Errors count
7. [ ] Click "Dismiss" to close result

**Expected Result:** Import executes and shows results

### Test 4.5: User-Specific Import UI
1. [ ] Verify "User-Specific Job Import" section displays
2. [ ] Verify User ID input field
3. [ ] Verify helper text about user preferences

**Expected Result:** User import UI displays

### Test 4.6: User Import Validation
1. [ ] Leave User ID field empty
2. [ ] Click "Import for User"
3. [ ] Verify alert: "Please enter a user ID"

**Expected Result:** Empty user ID rejected

### Test 4.7: Info Section
1. [ ] Verify blue info box at bottom displays
2. [ ] Verify "How Job Import Works" content

**Expected Result:** Info section displays

---

## Test 5: AI Prompt Management Page

### Test 5.1: Navigation to Prompts Page
1. [ ] Click "Prompts" tab in admin navigation
2. [ ] Verify URL is `/admin/prompts`
3. [ ] Verify "Prompts" tab is highlighted

**Expected Result:** Navigated to prompts page

### Test 5.2: Prompts List Display
1. [ ] Verify page title: "AI Prompt Management"
2. [ ] Verify "Create New Prompt" button displays
3. [ ] Verify "Available Prompts" section displays
4. [ ] Verify at least one prompt displays (from Phase 2)
5. [ ] For each prompt, verify displays:
   - [ ] Prompt name
   - [ ] Prompt key (in code block)
   - [ ] Description (if present)
   - [ ] Version and last updated date

**Expected Result:** Prompts list displays correctly

### Test 5.3: Prompt Selection
1. [ ] Click on a prompt in the list
2. [ ] Verify prompt details display on right side
3. [ ] Verify "Edit" and "Delete" buttons display
4. [ ] Verify template displays in formatted code block
5. [ ] Verify model configuration displays (if present)

**Expected Result:** Prompt details display correctly

### Test 5.4: Create New Prompt
1. [ ] Click "Create New Prompt" button
2. [ ] Verify form displays with fields:
   - [ ] Prompt Key (required)
   - [ ] Prompt Name (required)
   - [ ] Description
   - [ ] Prompt Template (required, large textarea)
   - [ ] Model Configuration (JSON textarea)
3. [ ] Fill in all required fields
4. [ ] Click "Save Prompt"
5. [ ] Verify success alert
6. [ ] Verify new prompt appears in list

**Expected Result:** Can create new prompts

### Test 5.5: Edit Existing Prompt
1. [ ] Select a prompt from list
2. [ ] Click "Edit" button
3. [ ] Verify form pre-fills with current values
4. [ ] Verify Prompt Key field is disabled
5. [ ] Modify Prompt Name or Template
6. [ ] Click "Save Prompt"
7. [ ] Verify success alert
8. [ ] Verify changes reflected in list

**Expected Result:** Can edit existing prompts

### Test 5.6: Prompt Validation
1. [ ] Click "Create New Prompt"
2. [ ] Leave required fields empty
3. [ ] Click "Save Prompt"
4. [ ] Verify alert: "Please fill in all required fields"

**Expected Result:** Required field validation works

### Test 5.7: JSON Validation
1. [ ] Click "Create New Prompt"
2. [ ] Fill required fields
3. [ ] In Model Configuration, enter invalid JSON: `{invalid}`
4. [ ] Click "Save Prompt"
5. [ ] Verify alert: "Invalid JSON in model configuration"

**Expected Result:** JSON validation works

### Test 5.8: Delete Prompt
1. [ ] Select a prompt
2. [ ] Click "Delete" button
3. [ ] Confirm dialog
4. [ ] Verify success alert
5. [ ] Verify prompt marked as "Inactive" in list (grayed out)

**Expected Result:** Can soft-delete prompts

### Test 5.9: Cancel Editing
1. [ ] Click "Create New Prompt" or "Edit"
2. [ ] Modify some fields
3. [ ] Click "Cancel" button
4. [ ] Verify form closes
5. [ ] Verify no changes saved

**Expected Result:** Cancel works without saving

### Test 5.10: Info Section
1. [ ] Scroll to bottom
2. [ ] Verify blue info box displays
3. [ ] Verify "About AI Prompts" content

**Expected Result:** Info section displays

---

## Test 6: Admin Layout & Navigation

### Test 6.1: Navigation Between Admin Pages
1. [ ] Navigate between all 4 admin pages using tabs
2. [ ] Verify each page loads correctly
3. [ ] Verify active tab highlights correctly

**Expected Result:** All admin pages accessible via navigation

### Test 6.2: Back to App Link
1. [ ] Click "Back to App" link in header
2. [ ] Verify redirected to `/jobs` page
3. [ ] Verify regular user navigation displays

**Expected Result:** Can return to main app from admin

### Test 6.3: Direct URL Access
1. [ ] Manually navigate to each admin URL:
   - [ ] `/admin`
   - [ ] `/admin/users`
   - [ ] `/admin/jobs`
   - [ ] `/admin/prompts`
2. [ ] Verify each page loads correctly

**Expected Result:** All admin URLs accessible directly

---

## Test 7: Responsive Design (Mobile)

### Test 7.1: Mobile Layout (Optional)
1. [ ] Open admin dashboard on mobile device or resize browser to mobile width
2. [ ] Verify admin navigation remains usable
3. [ ] Verify metric cards stack vertically
4. [ ] Verify tables are scrollable
5. [ ] Verify forms are usable

**Expected Result:** Admin UI works on mobile

---

## Test 8: Error Handling

### Test 8.1: API Error Display
1. [ ] Stop backend or cause API error
2. [ ] Navigate to admin dashboard
3. [ ] Verify error message displays instead of metrics
4. [ ] Verify error message is user-friendly

**Expected Result:** API errors handled gracefully

### Test 8.2: Network Error Recovery
1. [ ] Disconnect internet
2. [ ] Try to perform action (e.g., save prompt)
3. [ ] Reconnect internet
4. [ ] Retry action
5. [ ] Verify works after reconnection

**Expected Result:** Recovers from network errors

---

## Summary

**Total Tests:** ~80 individual checks

**Completion Checklist:**
- [ ] All Test 1 items passed (Authentication & Access Control)
- [ ] All Test 2 items passed (Admin Dashboard)
- [ ] All Test 3 items passed (User Management)
- [ ] All Test 4 items passed (Job Import)
- [ ] All Test 5 items passed (AI Prompts)
- [ ] All Test 6 items passed (Layout & Navigation)
- [ ] Test 7 passed (Responsive - optional)
- [ ] Test 8 passed (Error Handling)

**Sign-off:**
- Date: __________________
- Tested By: __________________
- Issues Found: __________________
- Status: ☐ PASS ☐ FAIL ☐ PARTIAL

---

## Known Limitations

1. Role changes require page refresh to update navigation (by design)
2. Job imports may timeout for very large query sets
3. Prompt editing doesn't have live preview (future enhancement)
4. User search is simple text match (not fuzzy search)

---

## Next Steps After Testing

1. If tests pass: Mark Phase 5 as complete
2. If tests fail: Document issues and create fix tasks
3. Deploy to production if all critical tests pass
4. Monitor admin activity in production
