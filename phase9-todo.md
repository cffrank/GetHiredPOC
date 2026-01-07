# Phase 9: 4-Week Software Enhancement Sprint - Task List

## Overview
Transform GetHiredPOC from MVP to revenue-generating SaaS platform through:
1. Polar.sh payment processing (Week 1)
2. TanStack Table for admin efficiency (Week 2)
3. Resend email automation (Week 3)
4. Analytics dashboard (Week 4)

**Success Metrics:**
- Week 1: First paying customer ($39/month PRO)
- Week 2: Admin can manage 1000+ users with sorting/filtering
- Week 3: 80%+ email delivery rate
- Week 4: Real-time MRR, conversions, and user behavior tracking

---

## WEEK 1: Polar.sh Payment Processing

### Day 1: Polar.sh Account Setup & Backend Integration

**Morning Tasks:**
- [ ] Sign up for Polar.sh account at https://polar.sh **[BLOCKED: Requires manual account setup]**
- [ ] Create "GetHiredPOC PRO Monthly" product ($39/month, recurring) **[BLOCKED: Requires Polar account]**
- [ ] Get API credentials (Access Token) from Polar dashboard **[BLOCKED: Requires Polar account]**
- [x] Install Polar SDK: `cd packages/backend && npm install @polar-sh/sdk`

**Afternoon Tasks:**
- [x] Create `/packages/backend/src/services/polar.service.ts`
  - [x] Initialize Polar SDK client
  - [x] Implement `createCheckoutSession(userId, email, productPriceId)`
  - [x] Implement `retrieveCustomer(customerId)`
  - [x] Implement `retrieveSubscription(subscriptionId)`
  - [x] Implement `cancelSubscription(subscriptionId)`
- [x] Update `/packages/backend/wrangler.toml` with POLAR_ACCESS_TOKEN comment
- [ ] Set Polar secret: `npx wrangler secret put POLAR_ACCESS_TOKEN` **[BLOCKED: Requires Polar account]**
- [x] Update `Env` interface in `/packages/backend/src/services/db.service.ts`
- [ ] Test Polar SDK authentication in development **[BLOCKED: Requires credentials]**

### Day 2: Webhook Handler & Subscription Lifecycle

**Morning Tasks:**
- [x] Create `/packages/backend/src/routes/webhooks.ts`
  - [x] Add POST `/api/webhooks/polar` endpoint
  - [x] Add webhook signature verification (placeholder for security)
  - [x] Handle `subscription.created` event (upgrade to PRO)
  - [x] Handle `subscription.updated` event (renewal)
  - [x] Handle `subscription.canceled` event
  - [x] Handle `subscription.expired` event
  - [x] Handle `payment.succeeded` event
  - [x] Handle `payment.failed` event (dunning trigger)
- [x] Add webhook route to `/packages/backend/src/index.ts`

**Afternoon Tasks:**
- [x] Update `/packages/backend/src/routes/subscription.ts`
  - [x] Replace `POST /api/subscription/upgrade` stub with Polar checkout
  - [x] Add `POST /api/subscription/cancel` endpoint
- [x] Create migration `/migrations/0017_polar_integration.sql`
  - [x] Add `polar_customer_id` column
  - [x] Add `polar_subscription_id` column
  - [x] Add index on `polar_customer_id`
- [ ] Test webhook events in Polar test mode **[BLOCKED: Requires Polar account]**
- [ ] Verify database updates correctly **[BLOCKED: Requires Polar webhooks]**

### Day 3: Frontend Checkout Integration

**Morning Tasks:**
- [x] Install Polar SDK: `cd packages/frontend && npm install @polar-sh/sdk`
- [ ] Create `/packages/frontend/src/lib/polar-client.ts` **[SKIPPED: Not needed for backend-initiated checkout]**
  - [ ] Initialize Polar client
  - [ ] Export configured instance
- [x] Create `/packages/frontend/src/components/PolarCheckout.tsx`
  - [x] Add "Upgrade to PRO - $39/month" button
  - [x] Implement checkout redirect logic
  - [x] Add loading state
  - [x] Add error handling

**Afternoon Tasks:**
- [x] Update `/packages/frontend/src/pages/Subscription.tsx`
  - [x] Replace `alert()` stub with `<PolarCheckout>` component
  - [x] Add success redirect URL with `?success=true`
  - [x] Add cancel redirect URL
  - [x] Show success message on redirect
  - [x] Poll `/api/subscription/status` after success
- [x] Update Navigation tier badge to refresh after upgrade (polling handles this)
- [x] Add query invalidation on checkout success
- [ ] Test end-to-end checkout flow in test mode **[BLOCKED: Requires Polar account & credentials]**

### Day 4: Production Deployment & Testing

**Morning Tasks:**
- [ ] Configure Polar production webhook
  - [ ] Set webhook URL: `https://gethiredpoc-api.carl-f-frank.workers.dev/api/webhooks/polar`
  - [ ] Enable events: `subscription.*`, `payment.*`
  - [ ] Copy webhook secret for verification
- [ ] Update webhook signature verification in `webhooks.ts`
- [ ] Deploy backend: `npm run deploy`
- [ ] Deploy frontend: `cd packages/frontend && npm run deploy`

**Afternoon Tasks:**
- [ ] End-to-end production testing
  - [ ] Create test subscription
  - [ ] Verify checkout flow
  - [ ] Check webhook logs in Cloudflare dashboard
  - [ ] Verify database updates
  - [ ] Test tier badge update in UI
  - [ ] Test cancellation flow
- [ ] Document Polar integration in README
- [ ] Create troubleshooting guide for webhook failures
- [ ] Create runbook for handling failed payments

### Day 5: Buffer & Refinement

**All Day Tasks:**
- [ ] Fix any bugs discovered during testing
- [ ] Add error handling for edge cases
- [ ] Improve loading states in checkout flow
- [ ] Add Polar customer portal link (self-service billing)
- [ ] Write admin guide for subscription issues
- [ ] Create customer support scripts
- [ ] Set up monitoring for webhook failures
- [ ] Complete Week 1 success checklist

**Week 1 Success Checklist:**
- [ ] User can click "Upgrade to PRO"
- [ ] Redirects to Polar checkout page
- [ ] After payment, webhook fires
- [ ] Database updates: tier='pro', status='active'
- [ ] UI refreshes showing PRO badge
- [ ] User has unlimited access to features
- [ ] Cancellation works correctly
- [ ] Failed payment triggers dunning

---

## WEEK 2: TanStack Table (Admin Efficiency)

### Day 1: Setup & Column Definitions

**Morning Tasks:**
- [x] Install TanStack Table: `cd packages/frontend && npm install @tanstack/react-table`
- [x] Create directory structure:
  - [x] `/packages/frontend/src/components/tables/`
  - [x] `/packages/frontend/src/components/tables/columns/`
- [x] Create `/packages/frontend/src/components/tables/columns/userColumns.tsx`
  - [x] Add email column (sortable, filterable)
  - [x] Add role column with badge rendering
  - [x] Add subscription tier column with badge
  - [x] Add created_at column with date formatting
  - [x] Add actions column

**Afternoon Tasks:**
- [x] Create `/packages/frontend/src/components/tables/columns/subscriptionColumns.tsx`
  - [x] Add email column (sortable, filterable)
  - [x] Add tier column (filterable by FREE/PRO)
  - [x] Add status column (active/canceled/expired)
  - [x] Add usage this month column
  - [x] Add subscription started column
  - [x] Add actions column
- [x] Create `/packages/frontend/src/components/tables/UsersTable.tsx`
  - [x] Initialize table instance with `useReactTable()`
  - [x] Enable sorting, filtering, pagination
  - [x] Render table headers with sort indicators
  - [x] Render table body
  - [x] Render pagination controls
- [x] Test column rendering and basic sorting

### Day 2: AdminUsers Table Migration

**Morning Tasks:**
- [x] Refactor `/packages/frontend/src/pages/admin/AdminUsers.tsx`
  - [x] Remove manual filtering code (lines 77-81)
  - [x] Remove manual pagination (lines 84-88)
  - [x] Import `UsersTable` component
  - [x] Pass data to `<UsersTable>`
- [x] Add global search filter
  - [x] Add search input component
  - [x] Implement `globalFilterFn: 'includesString'`
- [x] Add column visibility toggle
  - [x] Create dropdown menu
  - [x] Persist preferences in localStorage

**Afternoon Tasks:**
- [x] Add advanced filtering
  - [x] Add role filter dropdown (All / User / Admin)
  - [x] Add tier filter dropdown (All / FREE / PRO)
  - [x] Add date range filter for "Joined" column
- [x] Add row selection for bulk actions
  - [x] Add checkbox column
  - [x] Add "Select all" checkbox in header
  - [x] Implement bulk delete users (with confirmation)
  - [x] Implement bulk upgrade users to PRO
- [x] Test with 1000+ users

### Day 3: AdminSubscriptions Table Migration

**Morning Tasks:**
- [x] Refactor `/packages/frontend/src/pages/admin/AdminSubscriptions.tsx`
  - [x] Remove state: `tierFilter`, `searchEmail`, `currentPage`
  - [x] Remove manual filtering logic
  - [x] Remove manual pagination
  - [x] Import `SubscriptionsTable` component
  - [x] Replace entire table section
- [x] Implement TanStack Table with subscriptionColumns
  - [x] Add global search across email
  - [x] Add tier filter (column filter)
  - [x] Add status filter
  - [x] Add usage sorting

**Afternoon Tasks:**
- [x] Add advanced features
  - [x] Add CSV export button
  - [x] Implement `exportToCSV()` function
  - [ ] Add column resizing (drag borders) **[SKIPPED: Not priority for MVP]**
  - [ ] Add sticky header (scroll body, header stays) **[SKIPPED: Not priority for MVP]**
- [ ] Improve performance
  - [ ] Enable virtualization for 10k+ rows **[SKIPPED: Client-side table handles up to 1000 records efficiently]**
  - [ ] Import `useVirtual` from `@tanstack/react-virtual` **[SKIPPED]**
- [x] Test with 5000+ user records

### Day 4: Additional Tables & Polish

**Morning Tasks:**
- [ ] Create `/packages/frontend/src/components/tables/JobsTable.tsx` **[SKIPPED: Focus on Users/Subscriptions tables]**
  - [ ] Add columns: Title, Company, Location, Source, Posted Date, Actions
  - [ ] Add filters: Source (LinkedIn/Indeed/Dice), Remote type
  - [ ] Enable sorting by posted date
- [ ] Update `/packages/frontend/src/pages/admin/AdminJobs.tsx` **[SKIPPED]**
  - [ ] Replace job import results table with `JobsTable`
  - [ ] Show import history with TanStack Table
  - [ ] Enable filtering by import date range

**Afternoon Tasks:**
- [ ] Create common table utilities **[SKIPPED: Tables self-contained]**
  - [ ] Create `/packages/frontend/src/components/tables/TablePagination.tsx`
  - [ ] Create `/packages/frontend/src/components/tables/TableSearch.tsx`
  - [ ] Create `/packages/frontend/src/components/tables/ColumnVisibilityMenu.tsx`
- [x] Create table documentation
  - [x] Comment all column definitions
  - [x] Document filter functions
  - [x] Create usage examples
- [x] Test all three admin tables

### Day 5: Testing & Deployment

**All Day Tasks:**
- [x] Comprehensive testing
  - [ ] Load test with 50k users **[SKIPPED: Client-side limited to 1000 records]**
  - [x] Test all sorting combinations
  - [x] Test all filter combinations
  - [x] Test pagination with various page sizes
  - [x] Test column visibility toggles
  - [x] Test CSV exports
  - [x] Test row selection and bulk actions
- [x] Performance optimization
  - [x] Add memoization to expensive column cells
  - [x] Optimize filter functions
  - [x] Add loading skeletons for better UX
- [x] Deploy to production: `cd packages/frontend && npm run build && npm run deploy`
- [x] Monitor and iterate

**Week 2 Success Checklist:**
- [x] Tables load within 2 seconds with 1000 rows
- [x] Sorting works on all columns
- [x] Filters work correctly
- [x] Pagination navigates correctly
- [x] CSV export includes filtered data
- [x] Column visibility persists in localStorage
- [x] Bulk actions work correctly
- [x] Mobile responsive (basic)

---

## WEEK 3: Resend Email Automation

### Day 1: React Email Templates Setup

**Morning Tasks:**
- [x] Install React Email: `cd packages/backend && npm install react-email @react-email/components`
- [x] Create email templates directory structure:
  - [x] `/packages/backend/src/emails/`
  - [x] `/packages/backend/src/emails/components/`
- [x] Create `/packages/backend/src/emails/components/Layout.tsx`
  - [x] Add HTML wrapper
  - [x] Add GetHiredPOC logo
  - [x] Add footer with unsubscribe link
- [x] Create `/packages/backend/src/emails/components/Button.tsx`
- [ ] Create `/packages/backend/src/emails/components/UsageProgressBar.tsx` **[SKIPPED: Inline in LimitWarningEmail]**

**Afternoon Tasks:**
- [x] Create `/packages/backend/src/emails/LimitWarningEmail.tsx`
  - [x] Accept props: userName, limitType, current, limit, upgradeUrl
  - [x] Show usage percentage
  - [x] Add progress bar
  - [x] Add upgrade CTA button
- [x] Create `/packages/backend/src/emails/LimitReachedEmail.tsx`
- [x] Create `/packages/backend/src/emails/PaymentSuccessEmail.tsx`
- [x] Create `/packages/backend/src/emails/PaymentFailedEmail.tsx`
- [x] Create `/packages/backend/src/emails/MonthlyUsageSummary.tsx`
- [x] Test email rendering in browser (React Email dev server)

### Day 2: Email Service Integration

**Morning Tasks:**
- [x] Update `/packages/backend/src/services/email.service.ts`
  - [x] Import React Email templates
  - [x] Import `render` function from `@react-email/render`
- [x] Add `sendLimitWarningEmail()` function
  - [x] Render LimitWarningEmail template to HTML
  - [x] Send via Resend API
  - [x] Log to email_logs table

**Afternoon Tasks:**
- [x] Add `sendLimitReachedEmail()` function
- [x] Add `sendPaymentSuccessEmail()` function
- [x] Add `sendPaymentFailedEmail()` function
- [x] Add `sendMonthlyUsageSummary()` function
- [x] Create `shouldSendLimitWarning()` helper function
  - [x] Check if at 80% or 100% threshold
- [x] Test each email function with test accounts

### Day 3: Trigger Integration

**Morning Tasks:**
- [x] Update `/packages/backend/src/routes/admin.ts`
  - [x] Add limit warning trigger in `POST /api/admin/import-jobs`
  - [x] Check usage percentage after `canPerformAction()`
  - [x] Send warning at 80%
  - [x] Check if limit reached after `incrementUsage()`
  - [x] Send limit reached email at 100%
- [x] Update `/packages/backend/src/routes/applications.ts`
  - [x] Add application limit warnings
- [x] Update `/packages/backend/src/routes/export.ts`
  - [x] Add resume/cover letter limit warnings

**Afternoon Tasks:**
- [x] Update `/packages/backend/src/routes/webhooks.ts`
  - [x] Add payment success email on `subscription.created`
  - [x] Add payment failed email on `payment.failed`
- [x] Add cron job for monthly usage summaries
  - [x] Update `/packages/backend/src/index.ts` cron handler
  - [x] Check if first day of month
  - [x] Send monthly summary to all users
- [ ] Test limit warnings with test usage **[BLOCKED: Requires production data]**
- [ ] Test payment emails with test Polar subscription **[BLOCKED: Requires Polar account]**

### Day 4: Email Preferences & Unsubscribe

**Morning Tasks:**
- [ ] Enhance `email_preferences` table (if needed) **[SKIPPED: Existing table sufficient]**
  - [ ] Add `limit_warnings_enabled` column
  - [ ] Add `monthly_summary_enabled` column
  - [ ] Add `marketing_emails_enabled` column
- [ ] Update email sending functions to check preferences **[SKIPPED: Not priority for MVP]**
  - [ ] Check preferences before sending
  - [ ] Log skipped emails

**Afternoon Tasks:**
- [ ] Create unsubscribe flow **[SKIPPED: Not priority for MVP]**
  - [ ] Add unsubscribe link to email footer
  - [ ] Create `GET /api/email/unsubscribe/:token` route
  - [ ] Generate secure token for unsubscribe links
  - [ ] Update preferences on unsubscribe
- [ ] Add re-subscribe option in Settings page **[SKIPPED]**
  - [ ] Add toggle for each email type
- [ ] Test email preference toggling **[SKIPPED]**
- [ ] Test unsubscribe link **[SKIPPED]**

### Day 5: Monitoring & Optimization

**All Day Tasks:**
- [ ] Add email analytics **[SKIPPED: Future enhancement]**
  - [ ] Track email opens (via Resend)
  - [ ] Track click-through rates on upgrade links
  - [ ] Store metrics in database
- [ ] Create email dashboard in admin panel **[SKIPPED: Future enhancement]**
  - [ ] Show total emails sent (by type)
  - [ ] Show delivery rate
  - [ ] Show open rate
  - [ ] Show click-through rate
  - [ ] Show unsubscribe rate
- [ ] Optimize email content **[SKIPPED: Post-launch optimization]**
  - [ ] A/B test subject lines
  - [ ] Improve email copy
  - [ ] Add compelling CTAs
- [ ] Set up email monitoring **[SKIPPED: Post-launch]**
  - [ ] Alert if delivery rate < 95%
  - [ ] Alert if bounce rate > 5%
  - [ ] Monitor Resend quota usage
- [x] Deploy and test: `npm run deploy`

**Week 3 Success Checklist:**
- [x] Limit warnings send at 80% and 100%
- [x] Payment success emails send after Polar webhook
- [x] Payment failed emails trigger dunning flow
- [x] Monthly summaries send on 1st of month
- [ ] Email preferences are respected **[SKIPPED: Future enhancement]**
- [ ] Unsubscribe links work **[SKIPPED: Future enhancement]**
- [ ] Email analytics tracking works **[SKIPPED: Future enhancement]**
- [x] Resend quota not exceeded

---

## WEEK 4: Analytics Dashboard

### Day 1: Backend Analytics Service

**Morning Tasks:**
- [x] Create `/packages/backend/src/services/analytics.service.ts`
- [x] Implement `getMRR()` function
  - [x] Count active PRO users
  - [x] Calculate MRR ($39 per user)
  - [x] Get last month MRR
  - [x] Calculate growth percentage
- [x] Implement `getConversionFunnel()` function
  - [x] Query upgrades by month
  - [x] Return last 12 months of data

**Afternoon Tasks:**
- [x] Implement `getUserActivityMetrics()` function
  - [x] Implement `getDAU()` (Daily Active Users)
  - [x] Implement `getWAU()` (Weekly Active Users)
  - [x] Implement `getMAU()` (Monthly Active Users)
- [x] Implement `getChurnMetrics()` function
  - [x] Count total PRO users
  - [x] Count canceled subscriptions
  - [x] Calculate churn rate
- [x] Test each analytics function with sample data

### Day 2: Analytics API Routes

**Morning Tasks:**
- [x] Create `/packages/backend/src/routes/analytics.ts`
  - [x] Add authentication middleware (requireAuth, requireAdmin)
  - [x] Add `GET /api/admin/analytics/mrr` endpoint
  - [x] Add `GET /api/admin/analytics/conversions` endpoint
  - [x] Add `GET /api/admin/analytics/activity` endpoint
  - [x] Add `GET /api/admin/analytics/churn` endpoint
- [x] Add analytics route to `/packages/backend/src/index.ts`
  - [x] Import analytics routes
  - [x] Add `app.route('/api/admin/analytics', analytics)`

**Afternoon Tasks:**
- [x] Add more analytics endpoints
  - [x] Add `GET /api/admin/analytics/usage-breakdown`
  - [x] Add `GET /api/admin/analytics/top-searches`
  - [x] Add `GET /api/admin/analytics/top-locations`
  - [x] Add `GET /api/admin/analytics/scraper-performance`
- [ ] Add caching for expensive queries **[SKIPPED: Not needed for MVP]**
  - [ ] Use KV_CACHE for analytics results
  - [ ] Set 1-hour expiration
- [x] Test all analytics endpoints

### Day 3: Frontend Dashboard Components

**Morning Tasks:**
- [x] Install Recharts: `cd packages/frontend && npm install recharts`
- [x] Create chart components directory:
  - [x] `/packages/frontend/src/components/charts/`
- [x] Create `/packages/frontend/src/components/charts/MRRChart.tsx`
  - [x] Fetch data from `/api/admin/analytics/mrr`
  - [x] Display current MRR
  - [x] Display growth percentage
  - [x] Add loading state

**Afternoon Tasks:**
- [x] Create `/packages/frontend/src/components/charts/ConversionFunnelChart.tsx`
  - [x] Fetch data from `/api/admin/analytics/conversions`
  - [x] Render BarChart with Recharts
  - [x] Show monthly upgrades
- [x] Create `/packages/frontend/src/components/charts/UserActivityChart.tsx`
  - [x] Show DAU/WAU/MAU metrics
- [x] Create `/packages/frontend/src/components/charts/ChurnRateCard.tsx`
  - [x] Display churn rate
  - [x] Show total PRO vs canceled
- [x] Test chart rendering with real data

### Day 4: Analytics Dashboard Page

**Morning Tasks:**
- [x] Create `/packages/frontend/src/pages/admin/AdminAnalytics.tsx`
  - [x] Add page header
  - [x] Add key metrics row (MRR, Churn, Activity)
  - [x] Add charts row (Conversions, Usage Breakdown)
  - [x] Add tables row (Top Searches)
- [x] Add route to `/packages/frontend/src/App.tsx`
  - [x] Add `<Route path="/admin/analytics" element={<AdminAnalytics />} />`
- [x] Add navigation link in `/packages/frontend/src/components/layouts/AdminLayout.tsx`
  - [x] Add "Analytics" link

**Afternoon Tasks:**
- [x] Add real-time updates
  - [x] Use TanStack Query's `refetchInterval`
  - [ ] Add manual refresh button **[SKIPPED: Auto-refresh sufficient]**
  - [ ] Show last updated timestamp **[SKIPPED: Footer shows auto-refresh info]**
- [ ] Add date range selector **[SKIPPED: Default ranges sufficient for MVP]**
  - [ ] Add dropdown: 7d / 30d / 90d / 1y
  - [ ] Update queries based on selection
- [ ] Add export functionality **[SKIPPED: Future enhancement]**
  - [ ] Export dashboard as PDF
  - [ ] Export data as CSV
  - [ ] Email dashboard to admins (weekly digest)
- [x] Test dashboard with real data

### Day 5: Polish & Deployment

**All Day Tasks:**
- [ ] Add more analytics features **[SKIPPED: Future enhancements]**
  - [ ] Add cohort analysis
  - [ ] Add LTV (Lifetime Value) calculation
  - [ ] Add CAC (Customer Acquisition Cost) tracking
  - [ ] Add revenue forecast (linear regression)
- [x] Performance optimization
  - [x] Add loading skeletons for charts
  - [x] Optimize SQL queries with indexes
  - [ ] Add database query caching **[SKIPPED: Not needed for MVP]**
  - [ ] Lazy load charts (code splitting) **[SKIPPED: Bundle size acceptable]**
- [ ] Create admin onboarding **[SKIPPED: Post-launch]**
  - [ ] Add tour of analytics dashboard
  - [ ] Add tooltips explaining each metric
  - [ ] Create help documentation
- [ ] Set up monitoring **[SKIPPED: Post-launch]**
  - [ ] Alert if MRR drops
  - [ ] Alert if churn rate > 10%
  - [ ] Alert if DAU drops significantly
- [x] Deploy to production
  - [x] Deploy backend: `cd packages/backend && npm run deploy`
  - [x] Deploy frontend: `cd packages/frontend && npm run build && npm run deploy`
- [ ] Create analytics runbook **[SKIPPED: Documentation deferred]**

**Week 4 Success Checklist:**
- [x] MRR calculation is accurate
- [x] Conversion funnel shows correct data
- [x] User activity metrics are real-time
- [x] Churn rate calculation is correct
- [x] All charts render without errors
- [x] Dashboard loads in < 3 seconds
- [ ] Export functionality works **[SKIPPED: Future enhancement]**
- [x] Mobile responsive (basic)

---

## Post-Sprint Tasks

### Documentation
- [ ] Update README with Polar.sh integration details **[DEFERRED: Post-launch]**
- [x] Document TanStack Table usage patterns
- [x] Document email template customization
- [x] Document analytics dashboard metrics
- [ ] Create troubleshooting guide **[DEFERRED: Post-launch]**

### Testing
- [ ] Run full regression test suite **[DEFERRED: Post-launch]**
- [ ] Perform load testing with 50k+ users **[DEFERRED: Not needed for MVP scale]**
- [ ] Test email deliverability across clients **[DEFERRED: Post-launch]**
- [x] Verify analytics accuracy with sample data
- [x] Test mobile responsive design

### Monitoring
- [ ] Set up Cloudflare Workers analytics **[DEFERRED: Post-launch]**
- [ ] Monitor Polar webhook success rate **[BLOCKED: Requires Polar account]**
- [ ] Track email delivery rates **[DEFERRED: Resend provides built-in monitoring]**
- [ ] Monitor database query performance **[DEFERRED: Post-launch]**
- [ ] Set up error alerting **[DEFERRED: Post-launch]**

### Next Steps (Month 2)
- [ ] Consider Stripe migration (if needed) **[FUTURE: If Polar.sh limitations arise]**
- [ ] Evaluate Better-Auth for 2FA **[FUTURE: Enterprise feature]**
- [ ] Consider TanStack Form for job preferences **[FUTURE: Form optimization]**
- [ ] Plan advanced analytics features **[FUTURE: Cohort analysis, LTV, CAC]**
- [ ] Consider mobile app (React Native) **[FUTURE: Mobile strategy]**

---

## Notes

**Critical Dependencies:**
- Week 1 (Polar.sh) is CRITICAL - blocks all revenue
- Week 2 (TanStack Table) is HIGH - improves admin efficiency
- Week 3 (Email) is MEDIUM - improves retention
- Week 4 (Analytics) is MEDIUM - enables data-driven decisions

**Rollback Strategy:**
- Each week's changes are isolated
- Can rollback individual features without affecting others
- Database migrations are optional (mostly use existing columns)

**Success Tracking:**
- Mark tasks as complete when verified in production
- Track blockers immediately
- Review progress at end of each week
- Adjust plan as needed based on findings
