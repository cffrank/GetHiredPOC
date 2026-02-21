# Next Ralph Loop Iteration Plan

## Current Status
- **Iteration 1 Complete:** Week 1 code + Week 2 foundation
- **Total Progress:** 35/149 tasks (23%)
- **Blocked Tasks:** 10 (require Polar.sh account setup by user)
- **Remaining Autonomous Tasks:** ~104

---

## Priority Queue for Next Iteration

### HIGH PRIORITY - Continue Week 2 (TanStack Table)

**Estimated Time:** 2-3 hours of work

1. **Create subscriptionColumns.tsx** (15 min)
   - Email, tier, status, usage, subscription dates
   - Actions column (upgrade/downgrade/cancel buttons)
   - Similar structure to userColumns.tsx

2. **Create SubscriptionsTable.tsx** (15 min)
   - Copy UsersTable.tsx structure
   - Add subscription-specific filters
   - Add CSV export button

3. **Refactor AdminUsers.tsx** (20 min)
   - Import UsersTable and userColumns
   - Replace manual table with `<UsersTable data={users} columns={userColumns} />`
   - Remove manual filtering/pagination state

4. **Refactor AdminSubscriptions.tsx** (20 min)
   - Import SubscriptionsTable and subscriptionColumns
   - Replace manual table implementation
   - Test filtering and sorting

5. **Add column visibility toggle** (30 min)
   - Create ColumnVisibilityMenu component
   - Persist to localStorage
   - Add to both tables

6. **Add CSV export** (30 min)
   - Create exportToCSV utility function
   - Add export button to tables
   - Export filtered/sorted data

7. **Create JobsTable** (optional - 30 min)
   - For AdminJobs page
   - Columns: Title, Company, Location, Source, Posted Date
   - Filters: Source, Remote type

8. **Test and Polish** (30 min)
   - Test sorting on all columns
   - Test filtering combinations
   - Verify pagination works correctly

**Deliverables:**
- subscriptionColumns.tsx
- SubscriptionsTable.tsx
- Refactored AdminUsers.tsx
- Refactored AdminSubscriptions.tsx
- ColumnVisibilityMenu.tsx
- exportToCSV utility

---

### MEDIUM PRIORITY - Week 3 (Email Automation)

**Estimated Time:** 3-4 hours of work

1. **Install React Email** (5 min)
   ```bash
   cd packages/backend
   npm install react-email @react-email/components
   ```

2. **Create email template components** (2 hours)
   - Layout.tsx (base template)
   - Button.tsx (reusable button)
   - UsageProgressBar.tsx (visual usage indicator)
   - LimitWarningEmail.tsx (approaching limit)
   - LimitReachedEmail.tsx (hit limit)
   - PaymentSuccessEmail.tsx (receipt)
   - PaymentFailedEmail.tsx (dunning)
   - MonthlyUsageSummary.tsx (monthly digest)

3. **Update email.service.ts** (1 hour)
   - Import templates
   - Add sendLimitWarningEmail()
   - Add sendLimitReachedEmail()
   - Add sendPaymentSuccessEmail()
   - Add sendPaymentFailedEmail()
   - Add sendMonthlyUsageSummary()
   - Add shouldSendLimitWarning() helper

4. **Add email triggers** (1 hour)
   - Update admin.ts with limit warnings
   - Update applications.ts with limit warnings
   - Update export.ts with limit warnings
   - Update webhooks.ts with payment emails
   - Add cron job for monthly summaries

**Deliverables:**
- 8 email template files
- Updated email.service.ts
- Email triggers in routes
- Cron job for monthly summaries

---

### LOWER PRIORITY - Week 4 (Analytics Dashboard)

**Estimated Time:** 4-5 hours of work

1. **Install Recharts** (5 min)
   ```bash
   cd packages/frontend
   npm install recharts
   ```

2. **Create analytics.service.ts** (2 hours)
   - getMRR() - Calculate monthly recurring revenue
   - getConversionFunnel() - FREE → PRO upgrades
   - getUserActivityMetrics() - DAU/WAU/MAU
   - getChurnMetrics() - Churn rate calculation
   - getUsageBreakdown() - Usage by type
   - getTopSearches() - Most searched job titles

3. **Create analytics API routes** (1 hour)
   - analytics.ts with endpoints
   - Add to index.ts
   - Add caching with KV_CACHE

4. **Create chart components** (1.5 hours)
   - MRRChart.tsx - Line chart for revenue
   - ConversionFunnelChart.tsx - Bar chart for conversions
   - UserActivityChart.tsx - Activity metrics
   - ChurnRateCard.tsx - Churn rate display

5. **Create AdminAnalytics page** (1 hour)
   - Layout with charts
   - Add route to App.tsx
   - Add navigation link
   - Add date range selector
   - Add manual refresh button

**Deliverables:**
- analytics.service.ts
- analytics.ts routes
- 4 chart components
- AdminAnalytics.tsx page

---

## Execution Strategy

### Option 1: Complete Week 2 First (Recommended)
- Focus: Finish TanStack Table integration
- Benefit: Complete one feature fully before moving to next
- Time: 2-3 hours

### Option 2: Parallel Progress
- Do: Week 2 subscriptionColumns + Week 3 email templates
- Benefit: Make progress on multiple fronts
- Risk: May leave features half-done

### Option 3: Most Value First
- Priority 1: Week 3 email automation (improves retention)
- Priority 2: Week 2 table improvements (admin efficiency)
- Priority 3: Week 4 analytics (insights)

**Recommendation:** Follow Option 1 - Complete Week 2, then Week 3, then Week 4

---

## Testing Plan

### After Week 2 Complete:
- [ ] Test AdminUsers table with 100+ users
- [ ] Verify sorting works on all columns
- [ ] Test tier and role filters
- [ ] Verify pagination
- [ ] Test CSV export
- [ ] Deploy frontend

### After Week 3 Complete:
- [ ] Preview email templates in browser
- [ ] Test email sending to test account
- [ ] Verify limit warnings trigger at 80%
- [ ] Test monthly summary generation
- [ ] Deploy backend

### After Week 4 Complete:
- [ ] Verify MRR calculation accuracy
- [ ] Test all charts render correctly
- [ ] Verify analytics queries are fast
- [ ] Test with production data
- [ ] Deploy backend & frontend

---

## Deployment Checklist

### Week 2 (Frontend Only)
```bash
cd packages/frontend
npm run build
npm run deploy
```

### Week 3 (Backend Only)
```bash
cd packages/backend
npm run deploy
```

### Week 4 (Both)
```bash
# Backend
cd packages/backend
npm run deploy

# Frontend
cd packages/frontend
npm run build
npm run deploy
```

---

## Known Issues to Address

1. **Webhook signature verification** - Still placeholder, needs real implementation
2. **Email preferences** - Need to check user preferences before sending
3. **Rate limiting** - Webhooks should have rate limiting
4. **Error monitoring** - Need alerts for webhook failures
5. **Testing** - Most features need real-world testing with credentials

---

## Files to Create Next Iteration

### Week 2
1. `/packages/frontend/src/components/tables/columns/subscriptionColumns.tsx`
2. `/packages/frontend/src/components/tables/SubscriptionsTable.tsx`
3. `/packages/frontend/src/components/tables/ColumnVisibilityMenu.tsx`
4. `/packages/frontend/src/utils/exportToCSV.ts`
5. Modify: `/packages/frontend/src/pages/admin/AdminUsers.tsx`
6. Modify: `/packages/frontend/src/pages/admin/AdminSubscriptions.tsx`

### Week 3
7. `/packages/backend/src/emails/components/Layout.tsx`
8. `/packages/backend/src/emails/components/Button.tsx`
9. `/packages/backend/src/emails/components/UsageProgressBar.tsx`
10. `/packages/backend/src/emails/LimitWarningEmail.tsx`
11. `/packages/backend/src/emails/LimitReachedEmail.tsx`
12. `/packages/backend/src/emails/PaymentSuccessEmail.tsx`
13. `/packages/backend/src/emails/PaymentFailedEmail.tsx`
14. `/packages/backend/src/emails/MonthlyUsageSummary.tsx`
15. Modify: `/packages/backend/src/services/email.service.ts`
16. Modify: `/packages/backend/src/routes/admin.ts`
17. Modify: `/packages/backend/src/routes/applications.ts`
18. Modify: `/packages/backend/src/routes/export.ts`

### Week 4
19. `/packages/backend/src/services/analytics.service.ts`
20. `/packages/backend/src/routes/analytics.ts`
21. `/packages/frontend/src/components/charts/MRRChart.tsx`
22. `/packages/frontend/src/components/charts/ConversionFunnelChart.tsx`
23. `/packages/frontend/src/components/charts/UserActivityChart.tsx`
24. `/packages/frontend/src/components/charts/ChurnRateCard.tsx`
25. `/packages/frontend/src/pages/admin/AdminAnalytics.tsx`
26. Modify: `/packages/backend/src/index.ts`
27. Modify: `/packages/frontend/src/App.tsx`
28. Modify: `/packages/frontend/src/components/layouts/AdminLayout.tsx`

---

## Success Criteria

**Week 2 Done When:**
- [ ] Both AdminUsers and AdminSubscriptions use TanStack Table
- [ ] Sorting works on all columns
- [ ] Filtering works (tier, role, search)
- [ ] Pagination works
- [ ] CSV export works
- [ ] Column visibility toggle works

**Week 3 Done When:**
- [ ] All 5 email templates created
- [ ] Email triggers integrated into routes
- [ ] Limit warnings send at 80% and 100%
- [ ] Payment emails send via webhooks
- [ ] Monthly summary cron job works

**Week 4 Done When:**
- [ ] MRR, churn, conversion metrics working
- [ ] All charts render correctly
- [ ] Analytics page accessible at /admin/analytics
- [ ] Data is accurate and fast
- [ ] Export functionality works

**Entire Sprint Done When:**
- [ ] All 149 tasks completed
- [ ] All code deployed to production
- [ ] All features tested and working
- [ ] Documentation complete
- [ ] User has completed Polar setup
- [ ] First PRO subscription successfully processed

---

## Estimated Timeline

- **Next Iteration (2):** Complete Week 2 (2-3 hours)
- **Iteration 3:** Complete Week 3 (3-4 hours)
- **Iteration 4:** Complete Week 4 (4-5 hours)
- **Total Remaining:** 9-12 hours of work across 3 iterations

**Status:** On track for completion in 4 total Ralph Loop iterations
