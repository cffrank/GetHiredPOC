# Launch Phase 4 - LinkedIn & Indeed Profile Import

## Simple Launch Command

```
/ralph-loop Read phase4.md and build LinkedIn OAuth import and Indeed resume parsing. Work incrementally: 1) LinkedIn OAuth flow 2) LinkedIn API profile fetch 3) Enhanced database schema 4) Indeed resume upload and AI parsing 5) Improved AI matching with rich data 6) Skills gap analysis. Apply database migrations. Test thoroughly. Continue until production-ready.
```

---

## What Ralph Will Build

### 1. LinkedIn OAuth Integration
- OAuth 2.0 authorization flow
- LinkedIn API profile data fetching
- Automatic import of:
  - Work experience (company, title, dates, achievements)
  - Education (school, degree, field of study)
  - Skills with endorsements
  - Certifications
  - Languages
  - Projects

### 2. Indeed Resume Upload & Parsing
- Resume upload interface
- AI-powered resume parsing using Llama 3.1
- Extract structured data from PDF/text resumes
- Review and confirm flow before import

### 3. Enhanced Database Schema
- New tables:
  - `work_experience` - Detailed work history
  - `education` - Academic background
  - `certifications` - Professional certifications
  - `languages` - Language proficiencies
  - `projects` - Portfolio projects
- Indexes for performance

### 4. Improved AI Matching
- Use rich profile data for better compatibility analysis
- Match scores improved by 10-20 points
- Detailed strengths/concerns based on actual experience
- Skills match breakdown

### 5. Skills Gap Analysis
- Identify missing skills for target roles
- AI-generated learning recommendations
- Priority levels (high/medium/low)
- Free learning resources
- Time estimates for each skill

---

## Prerequisites

Before launching Ralph, complete these setup steps:

### 1. Create LinkedIn Developer App

1. Go to: https://www.linkedin.com/developers/apps
2. Create new app: "GetHiredPOC"
3. Get Client ID and Client Secret
4. Add redirect URI: `https://gethiredpoc.pages.dev/auth/linkedin/callback`
5. Request access to "Sign In with LinkedIn using OpenID Connect"

### 2. Add LinkedIn Credentials

**Update `wrangler.toml`:**
```toml
[vars]
LINKEDIN_CLIENT_ID = "your-client-id-here"
```

**Add secret:**
```bash
wrangler secret put LINKEDIN_CLIENT_SECRET
# Paste your Client Secret when prompted
```

### 3. Verify Database Ready

```bash
# Check D1 database is accessible
wrangler d1 info gethiredpoc
```

---

## Files Ralph Will Use

- `phase4.md` - Complete implementation guide (35KB)
- `phase4-setup.md` - Setup instructions and testing
- Existing codebase from Phase 3

---

## Expected Timeline

- **OAuth setup:** 15-20 minutes
- **LinkedIn API integration:** 20-25 minutes
- **Database migrations:** 5-10 minutes
- **Resume parsing:** 15-20 minutes
- **Enhanced AI matching:** 20-25 minutes
- **Skills gap analysis:** 15-20 minutes
- **Testing:** 20-30 minutes

**Total estimated time:** 90-150 minutes

Ralph will work autonomously through all steps.

---

## What Gets Imported from LinkedIn

### Profile Data
- ✅ Full name, headline, summary
- ✅ Location (city, country)
- ✅ Contact info (email)

### Work Experience
- ✅ Company name
- ✅ Job title
- ✅ Description
- ✅ Location
- ✅ Start/end dates
- ✅ Achievements (if listed)

### Education
- ✅ School name
- ✅ Degree type
- ✅ Field of study
- ✅ Start/end years
- ✅ GPA (if listed)

### Skills & Certifications
- ✅ Skill names
- ✅ Endorsement counts
- ✅ Certifications
- ✅ Issuing authorities
- ✅ Credential IDs/URLs

### Additional Data
- ✅ Languages with proficiency
- ✅ Projects with descriptions
- ✅ Publications (if available)

---

## Testing After Phase 4

### LinkedIn Import Test
1. Navigate to profile page
2. Click "Import from LinkedIn"
3. Authorize on LinkedIn
4. Verify redirect back to app
5. Check success message
6. Review imported data:
   - Name, headline, bio updated
   - Work experience entries created
   - Education entries added
   - Skills updated
   - Certifications imported

### Indeed Resume Test
1. Download Indeed resume as PDF
2. Click "Import from Indeed"
3. Upload PDF file
4. Wait for AI parsing (5-10 seconds)
5. Review parsed data
6. Confirm import
7. Verify data saved correctly

### Enhanced AI Matching Test
1. Create job application
2. Click "Analyze Match"
3. Verify higher match score (target: 85%+)
4. Check detailed strengths
5. Verify skills breakdown
6. Confirm specific concerns

### Skills Gap Analysis Test
1. Go to skills gap page
2. Enter target role: "Senior Backend Engineer"
3. Click "Analyze Gap"
4. Verify missing skills identified
5. Check learning recommendations
6. Verify resources are real URLs
7. Review time estimates

---

## Success Criteria

Phase 4 is complete when:

✅ LinkedIn OAuth flow working end-to-end
✅ Profile data imported correctly (100% accuracy)
✅ Indeed resume parsing accurate (90%+ accuracy)
✅ Enhanced database schema created
✅ AI match scores improved by 10-20 points
✅ Skills gap analysis generates useful recommendations
✅ Resume generation uses rich imported data
✅ All tests pass
✅ No errors in logs
✅ Costs remain $0/month

---

## Launch Instructions

1. **Complete LinkedIn app setup** (see prerequisites above)

2. **Navigate to project directory:**
   ```bash
   cd /home/carl/project/gethiredpoc
   ```

3. **Copy the launch command from top of this file**

4. **Paste in Claude Code and press Enter**

5. **Ralph will work autonomously until Phase 4 is complete!**

---

## After Phase 4 Completes

### Immediate Next Steps
1. Test LinkedIn import with your own profile
2. Upload a resume to test Indeed parsing
3. Generate a job match analysis
4. Run skills gap analysis for target role
5. Verify all data displays correctly in UI

### Optional Enhancements
- Add manual edit for imported data
- Bulk import multiple resumes
- LinkedIn auto-refresh (re-import on schedule)
- Export profile data (GDPR compliance)

---

## Cost Breakdown

**Phase 4 remains FREE:**

| Service | Usage | Cost |
|---------|-------|------|
| LinkedIn API | Profile imports (OAuth) | **FREE** |
| Cloudflare Workers AI | Resume parsing | **FREE** (10k/day limit) |
| KV Storage | OAuth state | **FREE** |
| D1 Database | Rich profile storage | **FREE** (5M reads/day) |

**Total: $0/month** 🎉

---

## Ready to Launch?

Make sure you've:
- ✅ Created LinkedIn Developer App
- ✅ Added credentials to wrangler.toml
- ✅ Set LINKEDIN_CLIENT_SECRET as secret
- ✅ Verified database is accessible

Then copy the command at the top and launch Ralph! 🚀
