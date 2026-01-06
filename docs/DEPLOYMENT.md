# GetHiredPOC - Deployment Guide

This guide provides step-by-step instructions for deploying the GetHiredPOC application to production using Cloudflare's infrastructure.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Backend Deployment (Cloudflare Workers)](#backend-deployment)
5. [Frontend Deployment (Cloudflare Pages)](#frontend-deployment)
6. [Secrets Management](#secrets-management)
7. [Post-Deployment Verification](#post-deployment-verification)
8. [Rollback Procedures](#rollback-procedures)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts

- **Cloudflare Account**: Sign up at [dash.cloudflare.com](https://dash.cloudflare.com)
- **GitHub Account**: For source code management and Pages deployment
- **Anthropic Account**: For Claude AI API key ([console.anthropic.com](https://console.anthropic.com))
- **OpenAI Account** (optional): For GPT models ([platform.openai.com](https://platform.openai.com))
- **Adzuna Account**: For job data API ([developer.adzuna.com](https://developer.adzuna.com))
- **Resend Account**: For transactional emails ([resend.com](https://resend.com))
- **LinkedIn Developer Account**: For OAuth ([developer.linkedin.com](https://developer.linkedin.com))

### Required Tools

Install the following tools on your local machine:

```bash
# Node.js 18+ and npm
node --version  # Should be 18.0.0 or higher
npm --version

# Wrangler CLI (Cloudflare Workers CLI)
npm install -g wrangler

# Git
git --version
```

### Verify Wrangler Installation

```bash
wrangler --version
wrangler login  # Authenticate with Cloudflare
```

---

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/gethiredpoc.git
cd gethiredpoc
npm install
```

### 2. Configure Cloudflare Account

Get your Cloudflare Account ID:

```bash
wrangler whoami
```

Update `/packages/backend/wrangler.toml` with your account ID:

```toml
[vars]
CLOUDFLARE_ACCOUNT_ID = "your-account-id-here"
FRONTEND_URL = "https://your-production-domain.pages.dev"
BACKEND_URL = "https://your-worker-name.workers.dev"
```

---

## Database Setup

### 1. Create Production D1 Database

```bash
cd packages/backend

# Create D1 database
wrangler d1 create gethiredpoc-db

# Note the database_id from output, update wrangler.toml
```

Update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "gethiredpoc-db"
database_id = "your-database-id-here"  # From create command output
migrations_dir = "../../migrations"
```

### 2. Apply Database Migrations

Apply migrations in order (critical for data integrity):

```bash
# Apply migrations to production database
wrangler d1 execute gethiredpoc-db --remote --file=../../migrations/0001_initial_schema.sql
wrangler d1 execute gethiredpoc-db --remote --file=../../migrations/0002_seed_jobs.sql
wrangler d1 execute gethiredpoc-db --remote --file=../../migrations/0003_phase2_schema.sql
wrangler d1 execute gethiredpoc-db --remote --file=../../migrations/0004_phase3_ai_features.sql
wrangler d1 execute gethiredpoc-db --remote --file=../../migrations/0005_hidden_jobs.sql
wrangler d1 execute gethiredpoc-db --remote --file=../../migrations/0006_enhanced_profile_schema_v2.sql
wrangler d1 execute gethiredpoc-db --remote --file=../../migrations/0007_add_linkedin_url_and_address.sql
wrangler d1 execute gethiredpoc-db --remote --file=../../migrations/0008_job_search_preferences.sql
wrangler d1 execute gethiredpoc-db --remote --file=../../migrations/0009_enhanced_job_data.sql
wrangler d1 execute gethiredpoc-db --remote --file=../../migrations/0010_admin_and_membership_remote.sql
wrangler d1 execute gethiredpoc-db --remote --file=../../migrations/0011_ai_prompts.sql
wrangler d1 execute gethiredpoc-db --remote --file=../../migrations/0012_hybrid_jobs.sql
wrangler d1 execute gethiredpoc-db --remote --file=../../migrations/0013_add_state_field.sql
wrangler d1 execute gethiredpoc-db --remote --file=../../migrations/0014_chat_system.sql
```

### 3. Verify Database Schema

```bash
# List all tables
wrangler d1 execute gethiredpoc-db --remote --command="SELECT name FROM sqlite_master WHERE type='table'"

# Verify specific tables exist
wrangler d1 execute gethiredpoc-db --remote --command="SELECT COUNT(*) FROM users"
wrangler d1 execute gethiredpoc-db --remote --command="SELECT COUNT(*) FROM ai_prompts"
```

### 4. Seed Initial Data (Optional)

If you want to add sample jobs or test data:

```bash
wrangler d1 execute gethiredpoc-db --remote --file=../../migrations/0002_seed_jobs.sql
```

---

## KV Namespace Setup

### 1. Create KV Namespaces

```bash
# Create KV namespace for caching
wrangler kv:namespace create "KV_CACHE"

# Create KV namespace for sessions
wrangler kv:namespace create "KV_SESSIONS"
```

### 2. Update wrangler.toml

Update the namespace IDs in `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "KV_CACHE"
id = "your-kv-cache-id-here"

[[kv_namespaces]]
binding = "KV_SESSIONS"
id = "your-kv-sessions-id-here"
```

---

## R2 Storage Setup

### 1. Create R2 Bucket

```bash
# Create R2 bucket for file storage (resumes, etc.)
wrangler r2 bucket create gethiredpoc-storage
```

### 2. Update wrangler.toml

Verify R2 configuration:

```toml
[[r2_buckets]]
binding = "STORAGE"
bucket_name = "gethiredpoc-storage"
```

---

## AI Gateway Setup

### 1. Create AI Gateway

```bash
# Navigate to Cloudflare Dashboard > AI > AI Gateway
# Create new gateway named "jobmatch-ai-gateway-prod"
```

### 2. Update wrangler.toml

```toml
[ai]
binding = "AI"
gateway_id = "jobmatch-ai-gateway-prod"  # Your gateway ID
```

---

## Secrets Management

### Environment Variables vs Secrets

**Environment Variables** (stored in `wrangler.toml` [vars] section):
- Non-sensitive configuration
- Frontend URLs, public IDs
- Can be committed to git

**Secrets** (encrypted, managed via Wrangler CLI):
- API keys, passwords, tokens
- Never committed to git
- Accessed via `env` in workers

### Set Production Secrets

```bash
cd packages/backend

# Admin email addresses (comma-separated)
wrangler secret put ADMIN_EMAILS
# Enter: your-admin@example.com,another-admin@example.com

# Anthropic API Key (for Claude AI chat)
wrangler secret put ANTHROPIC_API_KEY
# Get from: https://console.anthropic.com/settings/keys

# Adzuna API Key (for job data)
wrangler secret put ADZUNA_APP_KEY
# Get from: https://developer.adzuna.com/dashboard

# Resend API Key (for emails)
wrangler secret put RESEND_API_KEY
# Get from: https://resend.com/api-keys

# LinkedIn OAuth Secret (for profile import)
wrangler secret put LINKEDIN_CLIENT_SECRET
# Get from: https://www.linkedin.com/developers/apps
```

### Verify Secrets

```bash
# List all secrets (doesn't show values, just names)
wrangler secret list
```

### Update Secrets

```bash
# To update a secret, use the same put command
wrangler secret put ANTHROPIC_API_KEY
# Enter new value
```

### Delete Secrets

```bash
# Remove a secret
wrangler secret delete SECRET_NAME
```

---

## Backend Deployment

### 1. Build Backend

```bash
cd packages/backend
npm run build
```

### 2. Deploy to Cloudflare Workers

```bash
# Deploy to production
npm run deploy

# Or use wrangler directly
wrangler deploy
```

### 3. Verify Deployment

```bash
# Check deployment status
wrangler deployments list

# View worker logs
wrangler tail

# Test health endpoint
curl https://gethiredpoc-api.your-username.workers.dev/health
```

### 4. Set Custom Domain (Optional)

```bash
# Add custom domain to worker
wrangler domains add api.yourdomain.com

# Update BACKEND_URL in wrangler.toml
BACKEND_URL = "https://api.yourdomain.com"
```

---

## Frontend Deployment

### 1. Configure Pages Project

#### Option A: Deploy via Wrangler

```bash
cd packages/frontend

# Build frontend
npm run build

# Deploy to Cloudflare Pages
wrangler pages deploy dist --project-name=gethiredpoc
```

#### Option B: Deploy via GitHub Integration (Recommended)

1. Go to Cloudflare Dashboard > Pages
2. Click "Create a project"
3. Connect to GitHub repository
4. Configure build settings:
   - **Build command**: `npm run build:frontend`
   - **Build output directory**: `packages/frontend/dist`
   - **Root directory**: `/`
   - **Node version**: `18`

### 2. Set Environment Variables

In Cloudflare Pages dashboard:

1. Go to your Pages project
2. Settings > Environment variables
3. Add the following (production):

```
VITE_API_URL=https://gethiredpoc-api.your-username.workers.dev
VITE_LINKEDIN_CLIENT_ID=your-linkedin-client-id
```

### 3. Configure Build Settings

Ensure package.json has correct build scripts:

```json
{
  "scripts": {
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

### 4. Deploy Frontend

If using GitHub integration:
- Push to main branch
- Pages automatically deploys

If using Wrangler:
```bash
npm run build
wrangler pages deploy dist --project-name=gethiredpoc
```

### 5. Set Custom Domain (Optional)

1. Go to Pages project > Custom domains
2. Click "Set up a custom domain"
3. Enter your domain (e.g., app.yourdomain.com)
4. Follow DNS configuration instructions
5. Update `FRONTEND_URL` in backend wrangler.toml

---

## Post-Deployment Verification

### 1. Health Checks

```bash
# Backend health check
curl https://gethiredpoc-api.your-username.workers.dev/api/health

# Expected response:
# {"status":"ok","timestamp":1234567890}
```

### 2. Database Connectivity

```bash
# Test database query
curl https://gethiredpoc-api.your-username.workers.dev/api/jobs

# Should return job listings
```

### 3. Authentication Flow

1. Navigate to frontend URL
2. Click "Sign Up"
3. Create test account
4. Verify login works
5. Check session persistence

### 4. Admin Access

1. Log in with admin email (from ADMIN_EMAILS)
2. Navigate to `/admin`
3. Verify dashboard loads
4. Check system metrics display

### 5. AI Features

1. Navigate to a job detail page
2. Click "Get AI Match Analysis"
3. Verify match score appears
4. Generate a cover letter
5. Verify cover letter generated

### 6. Chat Functionality

1. Open chat sidebar
2. Send a test message
3. Verify AI responds
4. Test tool calling (e.g., "Find me jobs in Wisconsin")

---

## Monitoring & Logging

### 1. View Worker Logs

```bash
# Real-time log streaming
wrangler tail

# Filter by status
wrangler tail --status error

# Filter by method
wrangler tail --method POST
```

### 2. Analytics

View analytics in Cloudflare Dashboard:
- Workers > Analytics
- Pages > Analytics

### 3. Set Up Alerts (Optional)

Configure alerts for:
- Error rate threshold
- Response time threshold
- Request volume spike

---

## Database Migrations

### Running New Migrations

When adding new migrations:

```bash
# Test locally first
wrangler d1 execute gethiredpoc-db --local --file=../../migrations/0015_new_migration.sql

# Apply to production
wrangler d1 execute gethiredpoc-db --remote --file=../../migrations/0015_new_migration.sql
```

### Migration Best Practices

1. Always test migrations locally first
2. Backup database before major migrations (export data)
3. Use transactions when possible
4. Add rollback scripts for complex migrations
5. Version migrations sequentially

### Database Backup

```bash
# Export all data (for backup)
wrangler d1 export gethiredpoc-db --remote --output=backup-$(date +%Y%m%d).sql

# Import backup (if needed)
wrangler d1 execute gethiredpoc-db --remote --file=backup-20250105.sql
```

---

## Rollback Procedures

### Backend Rollback

```bash
# List recent deployments
wrangler deployments list

# Rollback to specific deployment
wrangler rollback --message "Rollback due to issue X"

# Verify rollback
wrangler deployments list
```

### Frontend Rollback

In Cloudflare Pages dashboard:
1. Go to project > Deployments
2. Find previous working deployment
3. Click "..." > "Rollback to this deployment"

Or via CLI:
```bash
wrangler pages deployment rollback <deployment-id>
```

### Database Rollback

For database changes, you need a rollback migration:

```sql
-- Example rollback migration
-- Reverses changes from migration 0015

-- If migration added column:
ALTER TABLE table_name DROP COLUMN column_name;

-- If migration created table:
DROP TABLE table_name;

-- If migration inserted data:
DELETE FROM table_name WHERE condition;
```

Apply rollback:
```bash
wrangler d1 execute gethiredpoc-db --remote --file=../../migrations/0015_rollback.sql
```

---

## Troubleshooting

### Issue: "Module not found" errors after deployment

**Solution**:
```bash
# Clear build cache
rm -rf node_modules/.cache
rm -rf dist

# Rebuild
npm install
npm run build

# Redeploy
wrangler deploy
```

### Issue: Database queries failing with "table not found"

**Solution**:
```bash
# Verify migrations applied
wrangler d1 execute gethiredpoc-db --remote --command="SELECT name FROM sqlite_master WHERE type='table'"

# Reapply missing migration
wrangler d1 execute gethiredpoc-db --remote --file=../../migrations/XXXX_missing.sql
```

### Issue: "Unauthorized" errors for admin routes

**Solution**:
```bash
# Verify ADMIN_EMAILS secret is set
wrangler secret list

# If not set, add it
wrangler secret put ADMIN_EMAILS

# Verify user email matches admin list
wrangler d1 execute gethiredpoc-db --remote --command="SELECT email, role FROM users WHERE email='admin@example.com'"
```

### Issue: AI features returning errors

**Solution**:
```bash
# Verify API keys are set
wrangler secret list

# Check for ANTHROPIC_API_KEY
# If missing, add it
wrangler secret put ANTHROPIC_API_KEY

# Verify AI prompts exist in database
wrangler d1 execute gethiredpoc-db --remote --command="SELECT prompt_key, prompt_name FROM ai_prompts WHERE is_active=1"
```

### Issue: CORS errors in frontend

**Solution**:
Update `FRONTEND_URL` in backend `wrangler.toml`:
```toml
[vars]
FRONTEND_URL = "https://your-actual-pages-url.pages.dev"
```

Redeploy backend:
```bash
cd packages/backend
wrangler deploy
```

### Issue: Session/authentication not persisting

**Solution**:
1. Verify KV_SESSIONS namespace is bound correctly
2. Check cookie settings in backend (SameSite, Secure)
3. Ensure frontend and backend on same domain or proper CORS configured

### Issue: LinkedIn OAuth not working

**Solution**:
1. Verify LinkedIn app redirect URIs include your production URL
2. Update `LINKEDIN_CLIENT_ID` in frontend environment variables
3. Ensure `LINKEDIN_CLIENT_SECRET` is set in backend secrets
4. Check LinkedIn app is in production mode (not testing)

### Issue: High latency or timeouts

**Solutions**:
- Check KV cache is working (prompts cached for 24h)
- Verify AI Gateway is configured (provides caching and rate limiting)
- Consider upgrading Cloudflare Workers plan (paid plans have better limits)
- Add database indexes for slow queries

### Issue: "Too Many Requests" errors

**Solution**:
- Implement request throttling in frontend
- Add rate limiting in backend
- Upgrade API plans (Anthropic, Adzuna) if hitting limits
- Use AI Gateway for caching and request management

---

## Performance Optimization

### 1. Enable Cloudflare Caching

Configure cache rules in Cloudflare Dashboard:
- Static assets: Cache for 1 year
- API responses: Cache based on endpoint (jobs: 1 hour, profiles: no cache)

### 2. Optimize Database Queries

```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_jobs_title ON jobs(title);
CREATE INDEX idx_jobs_location ON jobs(location);
CREATE INDEX idx_jobs_remote ON jobs(remote);

-- Verify indexes exist
SELECT name FROM sqlite_master WHERE type='index';
```

### 3. Enable Compression

Cloudflare automatically compresses responses. Verify in response headers:
- `content-encoding: br` (Brotli) or `gzip`

### 4. Minimize Bundle Size

```bash
# Analyze frontend bundle
cd packages/frontend
npm run build -- --analyze

# Remove unused dependencies
npm prune

# Use code splitting for large routes
```

---

## Security Checklist

Before going live, verify:

- [ ] All secrets stored securely (not in git)
- [ ] ADMIN_EMAILS configured correctly
- [ ] CORS configured properly (FRONTEND_URL)
- [ ] HTTPS enforced (Cloudflare does this automatically)
- [ ] SQL injection prevention (using prepared statements)
- [ ] XSS prevention (React escapes by default, but verify user input handling)
- [ ] Rate limiting configured
- [ ] Session expiration set appropriately (7 days default)
- [ ] Password hashing working (bcrypt, 10 rounds)
- [ ] Admin routes protected (requireAdmin middleware)
- [ ] Environment variables not exposed to frontend (except VITE_ prefixed)

---

## Scaling Considerations

### Database Limits

D1 limits (as of 2025):
- 10 GB database size (free plan)
- 5 million reads/day (free plan)
- 100k writes/day (free plan)

If you exceed limits:
- Upgrade to paid plan
- Implement aggressive caching
- Archive old data

### Workers Limits

Workers limits:
- 100k requests/day (free plan)
- 10ms CPU time per request (free plan)
- 128 MB memory

If you exceed limits:
- Upgrade to Workers Paid plan ($5/month)
- Optimize cold start time
- Use Durable Objects for stateful operations

### KV Limits

KV limits:
- 1 GB storage (free plan)
- 100k reads/day (free plan)
- 1k writes/day (free plan)

If you exceed limits:
- Upgrade to paid plan
- Implement cache eviction strategies
- Use D1 for less frequently accessed data

---

## CI/CD Setup (Optional)

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Deploy Backend
        run: |
          cd packages/backend
          npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

      - name: Deploy Frontend
        run: |
          cd packages/frontend
          npm run build
          npx wrangler pages deploy dist --project-name=gethiredpoc
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

Add `CLOUDFLARE_API_TOKEN` to GitHub repository secrets.

---

## Support & Resources

### Documentation
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [D1 Database Docs](https://developers.cloudflare.com/d1/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)

### Community
- [Cloudflare Discord](https://discord.gg/cloudflaredev)
- [Cloudflare Community](https://community.cloudflare.com/)

### Status Pages
- [Cloudflare Status](https://www.cloudflarestatus.com/)

---

## Maintenance Schedule

### Daily
- Monitor error logs
- Check API rate limits
- Review user signups

### Weekly
- Review system metrics
- Check database size
- Update job listings (if manual)

### Monthly
- Security updates (dependencies)
- Database backup
- Performance review
- Cost analysis

### Quarterly
- Major feature releases
- Infrastructure review
- Security audit

---

**Last Updated**: 2025-01-05
**Version**: 1.0
