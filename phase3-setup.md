# Phase 3 Setup: AI-Powered Features Quick Start

## What You're Building

Phase 3 adds intelligent AI features that transform GetHiredPOC into a smart career assistant:

✨ **AI Resume Generator** - Tailored resumes for each job
✨ **AI Cover Letter Writer** - Personalized cover letters
✨ **Job Match Analyzer** - Compatibility scoring (0-100%)
✨ **Smart Recommendations** - AI-ranked job suggestions
✨ **Daily Job Alerts** - Automated email digests
✨ **Analytics Dashboard** - Application tracking insights

**Total Cost: $0/month** (100% Cloudflare free tier)

---

## Prerequisites

Before starting Phase 3:

- [x] Phase 2 deployed and working
- [x] Adzuna API fetching jobs
- [x] Resume upload functional
- [x] SendGrid configured
- [x] Cloudflare Workers AI binding enabled

---

## Quick Setup Steps

### 1. Verify Workers AI Binding

Check your `wrangler.toml`:

```toml
[[ai]]
binding = "AI"
```

If missing, add it and redeploy:

```bash
npm run deploy
```

### 2. Test Workers AI

```bash
wrangler ai run @cf/meta/llama-3.1-8b-instruct --prompt "Hello, test AI generation"
```

Should return a response from Llama.

### 3. Enable Cron Triggers (Daily Alerts)

Add to `wrangler.toml`:

```toml
[triggers]
crons = ["0 9 * * *"]  # Daily at 9 AM UTC
```

Deploy to activate:

```bash
npm run deploy
```

### 4. Run Database Migration

Apply Phase 3 schema updates:

```bash
wrangler d1 execute gethiredpoc --remote --file=./migrations/0003_phase3_features.sql
```

Verify new columns:

```bash
wrangler d1 execute gethiredpoc --remote --command="PRAGMA table_info(applications)"
```

Should show `ai_match_score`, `ai_analysis`, `resume_content`, etc.

---

## Features Overview

### AI Resume Generation

**How it works:**
1. User clicks "Generate Resume" on job page
2. AI analyzes user profile + job requirements
3. Llama creates tailored resume highlighting relevant experience
4. Cached for 7 days (instant on repeat)

**API Endpoint:** `POST /api/jobs/:id/generate-resume`

**Response:**
```json
{
  "summary": "Experienced software engineer...",
  "experience": [...],
  "skills": ["JavaScript", "React", "Node.js"],
  "education": [...]
}
```

### AI Cover Letter Generation

**How it works:**
1. User clicks "Generate Cover Letter"
2. AI writes personalized 3-4 paragraph letter
3. Professional tone, company-specific
4. Ready to copy or download

**API Endpoint:** `POST /api/jobs/:id/generate-cover-letter`

**Response:** Plain text cover letter

### Job Match Analysis

**How it works:**
1. User clicks "Analyze Match"
2. AI compares user skills to job requirements
3. Returns match score (0-100%), strengths, concerns
4. Cached for 7 days

**API Endpoint:** `POST /api/jobs/:id/analyze`

**Response:**
```json
{
  "score": 85,
  "strengths": [
    "5+ years React experience matches requirement",
    "Remote location preference aligns",
    "Strong portfolio in similar projects"
  ],
  "concerns": [
    "Limited AWS experience (preferred skill)"
  ],
  "recommendation": "strong"
}
```

### Smart Job Recommendations

**How it works:**
1. Nightly cron job fetches new jobs from Adzuna
2. AI analyzes each job against user profile
3. Ranks by match score
4. Shows top 10 recommendations

**API Endpoint:** `GET /api/recommendations`

**Page:** `/recommendations`

### Daily Job Alert Emails

**How it works:**
1. Cron trigger runs daily at 9 AM UTC
2. For each user with alerts enabled
3. Get top 5 job matches
4. Send email via SendGrid
5. Email includes match scores + "View Job" links

**Cron Schedule:** `0 9 * * *`

**Email includes:**
- Job title, company, location
- Match score (%)
- Key strengths
- Direct link to job page

### Application Dashboard

**What it shows:**
- Total applications
- Interview conversion rate
- Average response time
- Offers received
- Recent applications with AI match scores

**Page:** `/dashboard`

---

## Configuration Reference

### Environment Variables (wrangler.toml)

All from previous phases:

```toml
[vars]
ADZUNA_APP_ID = "65f2bced"
ADZUNA_APP_KEY = "ca10939f5e5eb6af1c4683809fa074ca"
SENDGRID_FROM_EMAIL = "noreply@gethiredpoc.com"
SENDGRID_FROM_NAME = "GetHired POC"
NODE_ENV = "production"
APP_URL = "https://gethiredpoc.pages.dev"
```

### Bindings Required

```toml
# Database
[[d1_databases]]
binding = "DB"
database_name = "gethiredpoc"
database_id = "your-d1-id"

# Storage
[[r2_buckets]]
binding = "STORAGE"
bucket_name = "gethiredpoc-files"

# Cache
[[kv_namespaces]]
binding = "KV_CACHE"
id = "your-kv-cache-id"

[[kv_namespaces]]
binding = "KV_SESSIONS"
id = "your-kv-sessions-id"

# AI
[[ai]]
binding = "AI"

# Cron
[triggers]
crons = ["0 9 * * *"]
```

---

## Testing Phase 3

### Manual Testing Workflow

1. **Test AI Resume Generation:**
   ```bash
   # Login to app
   # Navigate to any job detail page
   # Click "Generate Resume"
   # Verify tailored resume appears in ~5 seconds
   # Click again - should be instant (cached)
   ```

2. **Test Cover Letter:**
   ```bash
   # On job page, click "Generate Cover Letter"
   # Verify personalized letter (no placeholders)
   # Check professional tone
   # Verify company name mentioned
   ```

3. **Test Job Match:**
   ```bash
   # Click "Analyze Match"
   # Verify score (0-100%)
   # Check strengths list makes sense
   # Verify concerns are valid gaps
   # Click again - instant cached response
   ```

4. **Test Recommendations:**
   ```bash
   # Navigate to /recommendations
   # Verify jobs sorted by match score
   # Check top job has highest score
   # Verify scores displayed correctly
   ```

5. **Test Daily Alerts (Manual Trigger):**
   ```bash
   # Create test endpoint to trigger alert manually
   # Or wait for next 9 AM UTC
   # Check inbox for email
   # Verify jobs included with match scores
   # Test "View Job" links
   ```

6. **Test Dashboard:**
   ```bash
   # Create multiple applications
   # Navigate to /dashboard
   # Verify stats: total, interviews, avg response time
   # Check recent applications show match scores
   # Verify status badges display correctly
   ```

### Automated Testing

```bash
# Run unit tests (if you add them)
npm run test

# Check Workers AI locally
wrangler ai run @cf/meta/llama-3.1-8b-instruct --prompt "Test generation"

# Verify KV cache
wrangler kv:key list --namespace-id=your-kv-cache-id

# Check cron schedule
wrangler pages deployment list
# Look for "Cron Triggers" section in Cloudflare dashboard
```

---

## Performance Expectations

| Feature | First Request | Cached Request | Cache TTL |
|---------|---------------|----------------|-----------|
| Resume Generation | 3-8 seconds | <100ms | 7 days |
| Cover Letter | 3-8 seconds | <100ms | 7 days |
| Job Match | 3-5 seconds | <100ms | 7 days |
| Recommendations | 1-2 seconds | <100ms | 1 day |
| Dashboard | <500ms | N/A | N/A |
| Daily Alert Email | 30-60s (batch) | N/A | N/A |

---

## Free Tier Limits

All Phase 3 features stay within Cloudflare free tier:

| Service | Free Tier | Typical Phase 3 Usage |
|---------|-----------|------------------------|
| Workers AI | 10,000 requests/day | 50-200/day ✅ |
| KV Reads | 100,000/day | 1,000-5,000/day ✅ |
| KV Writes | 1,000/day | 50-200/day ✅ |
| D1 Reads | 5M/day | 10k-50k/day ✅ |
| Cron Triggers | Unlimited | 1/day ✅ |
| SendGrid | 100 emails/day | 10-50/day ✅ |

**No costs until you scale significantly!**

---

## Troubleshooting

### AI responses are generic

**Fix:**
- Review prompt templates in `app/lib/ai-resume.ts`, `ai-cover-letter.ts`
- Add more user context to prompts
- Increase `max_tokens` if truncated
- Lower `temperature` for more focused output

### JSON parsing errors

**Fix:**
- Check AI response in logs
- Improve regex patterns in parse functions
- Add retry logic
- Return fallback if parsing fails

### Cron jobs not running

**Fix:**
- Verify cron syntax in wrangler.toml: `crons = ["0 9 * * *"]`
- Check Cloudflare dashboard: Workers & Pages → your-project → Triggers
- Manually test scheduled function via API endpoint
- Check production logs for execution

### KV cache not working

**Fix:**
- Verify binding: `[[kv_namespaces]]` in wrangler.toml
- Check cache keys are strings
- Confirm TTL set: `expirationTtl: 7 * 24 * 60 * 60`
- Test: `wrangler kv:key get --namespace-id=xxx "resume:1:123"`

### Emails not sending

**Fix:**
- Verify SendGrid secret: `wrangler secret list`
- Check SendGrid API key is valid
- Verify `SENDGRID_FROM_EMAIL` in vars
- Test SendGrid directly with curl
- Check daily limit (100 emails/day free tier)

### Dashboard stats wrong

**Fix:**
- Verify migration applied: `PRAGMA table_info(applications)`
- Check SQL queries in dashboard route
- Ensure `ai_match_score` populated
- Test with sample data

---

## Success Indicators

Phase 3 is working when:

✅ AI generates unique, tailored resumes for different jobs
✅ Cover letters mention specific company/role details
✅ Match scores reflect actual skill alignment
✅ Recommendations ranked by relevance
✅ Daily emails arrive on schedule
✅ Dashboard shows accurate stats
✅ Cached responses are instant (<100ms)
✅ No errors in production logs
✅ Costs remain $0/month

---

## Next: Launch Phase 3

Once you've reviewed this setup guide, use the Ralph command below to build Phase 3!
