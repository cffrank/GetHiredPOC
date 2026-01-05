# Phase 4 Local Testing Guide

## ✅ Prerequisites Completed

- ✅ Dev server running
  - Frontend: http://localhost:5175/
  - Backend: http://localhost:44103
- ✅ `.dev.vars` file created
- ✅ `.dev.vars` gitignored

---

## Step 1: Add Your LinkedIn Secret

Edit `.dev.vars` and add your actual LinkedIn Client Secret:

```bash
nano .dev.vars
```

Replace `your-linkedin-client-secret-here` with your actual secret from LinkedIn Developer Portal.

**Restart the backend** after editing:
```bash
# Kill current process and restart
pkill -f "wrangler dev"
npm run dev
```

---

## Step 2: Configure LinkedIn App for Local Testing

1. **Go to LinkedIn Developer Portal:**
   https://www.linkedin.com/developers/apps

2. **Select your app** (or create one if you haven't)

3. **Add Local Redirect URI:**
   - Navigate to "Auth" tab → "OAuth 2.0 settings"
   - Add redirect URL: `http://localhost:5175/api/linkedin/callback`
   - Save changes

---

## Step 3: Test LinkedIn Import

### 3.1 Navigate to Profile Page
```
http://localhost:5175/profile
```

### 3.2 Click "Import from LinkedIn"
- Should redirect to LinkedIn authorization page
- Authorize the app
- Should redirect back to `http://localhost:5175/api/linkedin/callback`
- Should then redirect to profile page with success message

### 3.3 Verify Imported Data
Check that the following were imported:
- [ ] Full name updated
- [ ] Headline/bio populated
- [ ] Location set
- [ ] Work experience entries created
- [ ] Education entries created
- [ ] Skills array updated
- [ ] Certifications imported (if any)

**Check Database:**
```bash
npx wrangler d1 execute gethiredpoc-db --local --command="SELECT * FROM work_experience LIMIT 5"
npx wrangler d1 execute gethiredpoc-db --local --command="SELECT * FROM education LIMIT 5"
npx wrangler d1 execute gethiredpoc-db --local --command="SELECT * FROM certifications LIMIT 5"
```

---

## Step 4: Test Resume Upload & AI Parsing

### 4.1 Prepare Test Resume
Create a sample resume or download one from Indeed as PDF.

### 4.2 Upload Resume
1. Navigate to profile page: `http://localhost:5175/profile`
2. Click "Import Resume" button
3. Upload modal should open
4. Select your resume file (PDF, TXT, DOC, DOCX)
5. Click "Upload"

### 4.3 Verify AI Parsing
- Wait 5-10 seconds for AI to parse
- Review screen should show:
  - [ ] Name extracted correctly
  - [ ] Email/phone extracted (if in resume)
  - [ ] Work experience entries
  - [ ] Education entries
  - [ ] Skills list
  - [ ] Dates parsed correctly

### 4.4 Confirm Import
- Click "Confirm Import"
- Success message should appear
- Data should be saved to database

**Check Database:**
```bash
npx wrangler d1 execute gethiredpoc-db --local --command="SELECT company, title FROM work_experience ORDER BY id DESC LIMIT 3"
```

---

## Step 5: Test Enhanced AI Job Matching

### 5.1 Create a Test Job Application
1. Navigate to jobs page: `http://localhost:5175/jobs`
2. Find a job (or create one manually in DB)
3. Click on job to view details
4. Click "Apply" to create application

### 5.2 Analyze Match
1. Click "Analyze Match" button on job detail page
2. Wait 8-15 seconds for AI analysis (using rich profile data)
3. Verify match results include:
   - [ ] Match score (0-100%)
   - [ ] Detailed strengths list (5+ items)
   - [ ] Specific concerns (references actual gaps)
   - [ ] Skills match breakdown
   - [ ] Experience years mentioned
   - [ ] Education match status
   - [ ] Recommendation level

### 5.3 Compare to Before
If you have old match scores from Phase 3:
- **Expected improvement:** +10-20 points
- **Expected detail:** 3x more specific strengths/concerns

---

## Step 6: Test Skills Gap Analysis

### 6.1 Navigate to Skills Gap Page
```
http://localhost:5175/skills-gap
```

### 6.2 Enter Target Role
- Enter a job title (e.g., "Senior Backend Engineer")
- Click "Analyze Gap"

### 6.3 Verify Results
Wait 8-12 seconds for AI to generate recommendations.

Check that output includes:
- [ ] Missing skills identified
- [ ] Learning recommendations for each skill
- [ ] Priority levels (high/medium/low)
- [ ] Reasons for each skill
- [ ] Time estimates realistic
- [ ] Learning resources are real URLs
- [ ] Overall time estimate provided

**Test Resource Links:**
Click 2-3 resource URLs to verify they're real, working links (not hallucinated).

---

## Step 7: Test Enhanced Resume Generation

### 7.1 Generate Resume with Rich Data
1. Go to job detail page
2. Click "Generate Resume"
3. Wait for AI to generate (should use imported LinkedIn data)

### 7.2 Verify Resume Quality
Resume should now include:
- [ ] All work experience from LinkedIn (not just summary)
- [ ] Detailed achievements for each role
- [ ] All education entries
- [ ] Certifications listed
- [ ] Projects mentioned (if imported)
- [ ] Languages listed (if imported)
- [ ] Tailored to specific job

### 7.3 Compare to Phase 3 Resume
If you have old generated resume:
- **Expected improvement:** 50%+ more detailed
- **More specific achievements**
- **Complete work history instead of generic**

---

## Step 8: Performance Testing

### 8.1 Test Caching
1. Analyze job match for a job
2. Immediately analyze same job again
3. **Second request should be instant** (<100ms vs 8-15 seconds)

### 8.2 Test with Multiple Jobs
- Analyze 3-5 different jobs
- Verify each gets unique match analysis
- Check that cache works per job

---

## Common Local Testing Issues

### Issue: LinkedIn OAuth Redirect Fails

**Symptoms:**
- After authorizing on LinkedIn, redirect fails
- Error: "redirect_uri_mismatch"

**Solution:**
1. Verify redirect URI in LinkedIn app settings exactly matches:
   ```
   http://localhost:5175/api/linkedin/callback
   ```
2. No trailing slash
3. Use HTTP (not HTTPS) for localhost
4. Port must match (5175 in this case)

---

### Issue: Resume Parsing Returns Empty/Incorrect Data

**Symptoms:**
- AI parsing completes but data is wrong
- Missing fields or gibberish

**Solutions:**
1. **Check resume format:**
   - PDF works best
   - Plain text second best
   - Avoid scanned PDFs (images)

2. **Check AI response in console:**
   - Open browser DevTools → Console
   - Look for parse errors

3. **Try simpler resume:**
   - Use a basic text resume first
   - Gradually test more complex formats

---

### Issue: "LINKEDIN_CLIENT_SECRET not found"

**Symptoms:**
- LinkedIn OAuth fails with secret error
- Backend logs show missing secret

**Solution:**
1. Verify `.dev.vars` file exists
2. Check it contains `LINKEDIN_CLIENT_SECRET=...`
3. **Restart wrangler dev** (it only reads .dev.vars on startup)

---

### Issue: Database Not Found

**Symptoms:**
- Queries fail with "no such table"
- New tables missing

**Solution:**
Apply migration to local database:
```bash
npx wrangler d1 execute gethiredpoc-db --local --file=migrations/0006_enhanced_profile_schema_v2.sql
```

Verify tables exist:
```bash
npx wrangler d1 execute gethiredpoc-db --local --command="SELECT name FROM sqlite_master WHERE type='table'"
```

---

### Issue: AI Matching Takes Too Long (20+ seconds)

**Symptoms:**
- Match analysis never completes
- Times out

**Possible Causes:**
1. **Too much data in prompt**
   - Check work_experience entries count
   - Limit to last 5-10 years if needed

2. **AI service slow/down**
   - Check Cloudflare Workers AI status
   - Wait a few minutes and retry

---

## Database Inspection Commands

**View imported LinkedIn data:**
```bash
# Work experience
npx wrangler d1 execute gethiredpoc-db --local --command="SELECT id, company, title, start_date, end_date FROM work_experience"

# Education
npx wrangler d1 execute gethiredpoc-db --local --command="SELECT id, school, degree, field_of_study FROM education"

# Certifications
npx wrangler d1 execute gethiredpoc-db --local --command="SELECT id, name, authority, issue_date FROM certifications"

# User profile
npx wrangler d1 execute gethiredpoc-db --local --command="SELECT id, full_name, headline, skills FROM users"
```

**Check table schemas:**
```bash
npx wrangler d1 execute gethiredpoc-db --local --command="PRAGMA table_info(work_experience)"
```

---

## Testing Checklist Summary

Before deploying to production, verify:

**LinkedIn Import:**
- [ ] OAuth flow works end-to-end
- [ ] Profile data imported correctly
- [ ] Work experience saved to DB
- [ ] Education saved to DB
- [ ] Skills updated
- [ ] Certifications imported

**Resume Upload:**
- [ ] File upload works
- [ ] AI parsing accurate (90%+)
- [ ] Review screen functional
- [ ] Confirm import saves data

**Enhanced Matching:**
- [ ] Match scores improved (10-20 points)
- [ ] Detailed analysis with 5+ strengths
- [ ] Skills breakdown included
- [ ] Concerns are specific
- [ ] Caching works (instant 2nd request)

**Skills Gap:**
- [ ] Missing skills identified
- [ ] Recommendations generated
- [ ] Resources are real URLs
- [ ] Time estimates reasonable

**Resume Generation:**
- [ ] Uses imported work history
- [ ] Includes certifications
- [ ] Shows achievements
- [ ] Tailored to job

**Performance:**
- [ ] All features complete in <15 seconds
- [ ] Caching reduces to <100ms
- [ ] No console errors
- [ ] No database errors

---

## Next Steps After Testing

Once all tests pass:

1. **Fix any issues found**
2. **Deploy to production:**
   ```bash
   npx wrangler secret put LINKEDIN_CLIENT_SECRET --remote
   npx wrangler deploy
   ```
3. **Update LinkedIn app redirect URI** to production URL
4. **Test in production**
5. **Monitor for errors**

---

## Quick Start Testing (5-Minute Test)

Don't have time for full testing? Do this quick 5-minute test:

1. **Start dev server** (already running)
2. **Add LinkedIn secret** to `.dev.vars`
3. **Restart backend:** `pkill -f "wrangler dev" && npm run dev`
4. **Test LinkedIn import:**
   - Go to http://localhost:5175/profile
   - Click "Import from LinkedIn"
   - Authorize and verify redirect works
5. **Check one work experience entry:**
   ```bash
   npx wrangler d1 execute gethiredpoc-db --local --command="SELECT * FROM work_experience LIMIT 1"
   ```

If that works, Phase 4 is good! 🎉
