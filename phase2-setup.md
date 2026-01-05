# Phase 2 Setup: Adzuna API Configuration

## Adzuna API Credentials (From Screenshot)

**Application:** JobmatchAI's App
**Application ID:** 65f2bced
**Application Key:** ca10939f5e5eb6af1c4683809fa074ca
**Plan:** Trial Access
**Status:** Live

---

## Step 1: Update wrangler.toml

Add these lines to your `wrangler.toml`:

```toml
[vars]
# Adzuna API credentials
ADZUNA_APP_ID = "65f2bced"
ADZUNA_APP_KEY = "ca10939f5e5eb6af1c4683809fa074ca"

# SendGrid config (if not already added)
SENDGRID_FROM_EMAIL = "noreply@gethiredpoc.com"
SENDGRID_FROM_NAME = "GetHired POC"

# Environment
NODE_ENV = "production"
```

---

## Step 2: Set SendGrid Secret

```bash
wrangler secret put SENDGRID_API_KEY
# Paste your SendGrid API key when prompted
```

---

## Step 3: Test Adzuna API

```bash
# Test the API works
curl "https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=65f2bced&app_key=ca10939f5e5eb6af1c4683809fa074ca&what=software+engineer&where=remote&results_per_page=5"
```

You should see JSON with job listings.

---

## Step 4: Deploy Configuration

```bash
# Deploy updated wrangler.toml to Cloudflare
wrangler pages deploy
```

---

## Configuration Complete ✅

You now have:
- ✅ Adzuna API configured (FREE)
- ✅ SendGrid ready for emails (FREE tier)
- ✅ All credentials in wrangler.toml
- ✅ Ready for Phase 2 development

**Total Cost: $0/month** 🎉

---

## Quick Reference

**Adzuna API Base URL:**
```
https://api.adzuna.com/v1/api/jobs/{country}/search/{page}
```

**Countries Available:**
- `us` - United States
- `gb` - United Kingdom
- `ca` - Canada
- `au` - Australia
- `de` - Germany
- `fr` - France
- And 20+ more...

**Example Request:**
```javascript
const url = `https://api.adzuna.com/v1/api/jobs/us/search/1?` +
  `app_id=65f2bced&` +
  `app_key=ca10939f5e5eb6af1c4683809fa074ca&` +
  `what=software+engineer&` +
  `where=remote&` +
  `results_per_page=50`;

const response = await fetch(url);
const data = await response.json();
```

**Response Fields:**
- `results[]` - Array of job objects
- `results[].title` - Job title
- `results[].company.display_name` - Company name
- `results[].location.display_name` - Location
- `results[].description` - Full description
- `results[].salary_min` - Minimum salary
- `results[].salary_max` - Maximum salary
- `results[].redirect_url` - Application URL
- `results[].created` - Posted date (ISO)
- `count` - Total jobs matching query

---

## Next: Start Phase 2 Development

Once configuration is complete, use the Ralph command below to start building Phase 2.
