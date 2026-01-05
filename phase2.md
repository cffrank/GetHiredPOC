# Phase 2 Prompt: GetHiredPOC - Production Features

<promise>
You will build Phase 2 features iteratively using the Ralph Wiggum technique:

1. Implement real job search with Adzuna API (FREE)
2. Build resume upload and PDF parsing
3. Create document export (PDF/DOCX)
4. Integrate email notifications with SendGrid
5. Test each feature thoroughly after implementation
6. Fix all errors immediately
7. Loop until all Phase 2 features are production-ready

Use `/ralph-loop` for autonomous development. Continue until Phase 2 is complete and all new features are fully functional.
</promise>

## Phase 2 Objective

Expand the POC into a production-ready application with essential features:
- **Real job data** via Adzuna API (FREE, global job aggregator)
- **Resume management** with PDF upload and parsing
- **Document generation** for resumes and cover letters
- **Email notifications** for important events

**Prerequisites:** POC must be complete and deployed to Cloudflare
**Timeline:** 1-2 weeks
**Outcome:** Production-ready job application platform
**Cost:** $0 for job data (Adzuna free tier) + SendGrid free tier = **TOTAL: $0**

## New Features

### 1. Job Search with Adzuna API ✅ (FREE)

**Why Adzuna:**
- ✅ **100% FREE** - No cost, unlimited API calls
- ✅ **Legal & Safe** - Official API, no ToS violations
- ✅ **Global Coverage** - US, UK, Europe, Australia, Canada, etc.
- ✅ **Real-time Data** - Fresh job listings daily
- ✅ **No Scraping** - RESTful API, fast and reliable
- ✅ **Rich Data** - Salaries, descriptions, company info

**Functionality:**
- Fetch jobs from Adzuna's aggregated job index
- Search by keywords, location, category
- Filter by salary range, contract type, remote status
- Store jobs in D1 database
- Deduplicate jobs (avoid duplicates by external URL)
- Update existing jobs with fresh data
- Admin interface to trigger job imports
- Scheduled daily imports via Cloudflare Cron

**Job Data Available:**
- Job title
- Company name
- Location (city, state, country)
- Remote/onsite status
- Full job description
- Salary range (min/max)
- Posted date
- Application redirect URL
- Contract type (permanent, contract, part-time)
- Category (IT, Engineering, Healthcare, etc.)

**Data Sources (via Adzuna):**
- Indeed jobs
- Monster jobs
- CareerBuilder jobs
- Company career pages
- Recruitment agencies
- 100+ job boards aggregated

**Implementation:**
- Create Adzuna API integration service
- API endpoint: `POST /api/admin/import-jobs`
- Scheduled import: Daily via Cloudflare Cron Triggers
- Search parameters: Keywords (e.g., "software engineer"), location, category
- Store in D1 with deduplication by redirect URL
- Error handling: Retry on failure, log import stats

### 2. Resume Upload & PDF Parsing ✅

**Functionality:**
- Upload resume PDF files to R2
- Parse PDF content to extract:
  - Work experience
  - Education
  - Skills
  - Contact information
- Pre-fill user profile from parsed data
- Support multiple resume versions
- Delete old resumes

**File Management:**
- Max file size: 5MB
- Supported formats: PDF only (initially)
- Storage: R2 bucket with unique keys
- Naming: `resumes/{user_id}/{resume_id}.pdf`

**PDF Parsing:**
- Use `pdf-parse` library (Node.js)
- Extract text content
- Use Llama AI to structure the data:
  - Identify sections (experience, education, skills)
  - Extract dates, company names, job titles
  - Parse bullet points
  - Return structured JSON

**Database Schema:**
```sql
-- New tables
CREATE TABLE resumes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL, -- R2 URL
  file_size INTEGER NOT NULL,
  parsed_data TEXT, -- JSON: extracted content
  is_primary INTEGER DEFAULT 0, -- Primary resume flag
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE work_experience (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  resume_id TEXT, -- Optional link to source resume
  company TEXT NOT NULL,
  title TEXT NOT NULL,
  location TEXT,
  start_date TEXT, -- YYYY-MM format
  end_date TEXT, -- YYYY-MM or "Present"
  description TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL
);

CREATE TABLE education (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  resume_id TEXT,
  school TEXT NOT NULL,
  degree TEXT,
  field_of_study TEXT,
  start_date TEXT,
  end_date TEXT,
  gpa TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL
);

CREATE INDEX idx_resumes_user_id ON resumes(user_id);
CREATE INDEX idx_work_experience_user_id ON work_experience(user_id);
CREATE INDEX idx_education_user_id ON education(user_id);
```

**UI Components:**
- Resume upload dropzone
- Resume list with preview
- Set primary resume
- Delete resume with confirmation
- Work experience CRUD interface
- Education CRUD interface

### 3. Document Export (PDF/DOCX) ✅

**Functionality:**
- Generate resume as PDF
- Generate resume as DOCX
- Generate cover letter as PDF
- Generate cover letter as DOCX
- Multiple template styles
- Download or email export

**Document Types:**

**A. Resume Export:**
- Pull data from user profile + work experience + education
- Format in professional template
- Include contact info, summary, experience, education, skills
- Support multiple templates (modern, classic, minimal)

**B. Cover Letter Export:**
- AI-generated content based on job + user profile
- Professional formatting
- Include date, company address, salutation
- 3-4 paragraph structure
- Signature block

**PDF Generation:**
- Use `@cloudflare/workers-pdf` or similar
- Or use Puppeteer in a Worker (with browser rendering)
- Alternatively: Use a third-party API like DocRaptor

**DOCX Generation:**
- Use `docxtemplater` library
- Template-based generation
- Editable output (user can modify in Word)

**Export Endpoint:**
```
POST /api/exports/resume
POST /api/exports/cover-letter
```

**Request Body:**
```json
{
  "format": "pdf", // or "docx"
  "template": "modern", // or "classic", "minimal"
  "jobId": "job-123" // For cover letters
}
```

**Response:**
- Stream file directly to browser
- Or return R2 presigned URL (expires in 1 hour)

### 4. Email Notifications with SendGrid ✅

**Functionality:**
- Send email when application status changes
- Send weekly digest of new matching jobs
- Send reminder emails for follow-ups
- Welcome email on signup
- Password reset email (if implemented)

**Email Types:**

**A. Transactional Emails:**
- **Welcome Email:** Sent on signup
- **Application Created:** Confirmation when application submitted
- **Status Update:** Notify when application status changes
- **Interview Scheduled:** Reminder before interview

**B. Digest Emails:**
- **Weekly Job Matches:** Summary of new jobs matching user skills
- Send every Monday at 9 AM user's local time

**C. Reminder Emails:**
- **Follow-up Reminders:** Remind to follow up on applications
- Configurable reminder dates

**SendGrid Integration:**
- API key stored as Cloudflare secret
- Use SendGrid API v3
- Dynamic templates in SendGrid dashboard
- Track email opens/clicks (optional)

**Database Schema:**
```sql
-- Email preferences
CREATE TABLE email_preferences (
  user_id TEXT PRIMARY KEY,
  digest_enabled INTEGER DEFAULT 1,
  status_updates_enabled INTEGER DEFAULT 1,
  reminders_enabled INTEGER DEFAULT 1,
  digest_frequency TEXT DEFAULT 'weekly', -- daily, weekly, never
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Email log (track sent emails)
CREATE TABLE email_log (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  email_type TEXT NOT NULL, -- welcome, status_update, digest, etc.
  subject TEXT,
  sent_at INTEGER DEFAULT (unixepoch()),
  sendgrid_message_id TEXT,
  status TEXT, -- sent, failed, bounced
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_email_log_user_id ON email_log(user_id);
CREATE INDEX idx_email_log_sent_at ON email_log(sent_at);
```

**Email Service:**
```typescript
// app/lib/email.ts

export async function sendWelcomeEmail(user: User) {
  await sendEmail({
    to: user.email,
    templateId: 'd-welcome123',
    dynamicData: {
      name: user.full_name || 'there',
      loginUrl: 'https://gethiredpoc.pages.dev/login'
    }
  });
}

export async function sendStatusUpdateEmail(user: User, application: Application, job: Job) {
  await sendEmail({
    to: user.email,
    templateId: 'd-status123',
    dynamicData: {
      name: user.full_name,
      jobTitle: job.title,
      company: job.company,
      newStatus: application.status,
      applicationUrl: `https://gethiredpoc.pages.dev/applications/${application.id}`
    }
  });
}

export async function sendWeeklyDigest(user: User, matchingJobs: Job[]) {
  if (!matchingJobs.length) return;

  await sendEmail({
    to: user.email,
    templateId: 'd-digest123',
    dynamicData: {
      name: user.full_name,
      jobCount: matchingJobs.length,
      jobs: matchingJobs.slice(0, 5).map(job => ({
        title: job.title,
        company: job.company,
        url: `https://gethiredpoc.pages.dev/jobs/${job.id}`
      }))
    }
  });
}
```

**Scheduled Digest:**
- Use Cloudflare Cron Triggers
- Run every Monday at 9 AM UTC
- Query jobs created in last 7 days
- Match against user skills/preferences
- Send digest to users with digest_enabled = 1

**Cron Configuration (wrangler.toml):**
```toml
[triggers]
crons = ["0 9 * * 1"] # Every Monday at 9 AM UTC
```

## Technical Implementation

### New Dependencies

```bash
# NO job scraping library needed - using fetch API

# PDF parsing
npm install pdf-parse

# Document generation
npm install docxtemplater pizzip
npm install @cloudflare/workers-pdf

# Email
npm install @sendgrid/mail

# Utilities
npm install date-fns
```

### Environment Variables

**Cloudflare Secrets:**
```bash
# Only SendGrid needs a secret
wrangler secret put SENDGRID_API_KEY
```

**wrangler.toml:**
```toml
[vars]
# Adzuna API credentials (public, not secret)
ADZUNA_APP_ID = "your-app-id-here"
ADZUNA_APP_KEY = "your-app-key-here"

# SendGrid config
SENDGRID_FROM_EMAIL = "noreply@gethiredpoc.com"
SENDGRID_FROM_NAME = "GetHired POC"
```

**Get Adzuna API Keys (FREE):**
1. Go to: https://developer.adzuna.com/
2. Click "Get API Key" or "Sign Up"
3. Register with email
4. Get your App ID and App Key instantly
5. Add to `wrangler.toml` (not secrets, they're public)

### New API Routes

```
POST   /api/admin/import-jobs           # Trigger Adzuna job import
GET    /api/jobs/recent                 # Get recently imported jobs
GET    /api/jobs/search                 # Search Adzuna API directly (optional)

POST   /api/resumes                     # Upload resume
GET    /api/resumes                     # List user's resumes
GET    /api/resumes/:id                 # Get resume details
DELETE /api/resumes/:id                 # Delete resume
POST   /api/resumes/:id/parse           # Parse uploaded resume
PUT    /api/resumes/:id/primary         # Set as primary resume

POST   /api/work-experience             # Create work experience
PUT    /api/work-experience/:id         # Update work experience
DELETE /api/work-experience/:id         # Delete work experience

POST   /api/education                   # Create education
PUT    /api/education/:id               # Update education
DELETE /api/education/:id               # Delete education

POST   /api/exports/resume              # Export resume (PDF/DOCX)
POST   /api/exports/cover-letter        # Export cover letter

GET    /api/email-preferences           # Get email preferences
PUT    /api/email-preferences           # Update email preferences
POST   /api/emails/test                 # Send test email (dev only)
```

### New UI Pages/Components

```
app/routes/
├── resumes/
│   ├── index.tsx                # List resumes
│   ├── upload.tsx               # Upload new resume
│   └── [id].tsx                 # Resume detail/preview
├── profile/
│   ├── work-experience.tsx      # Manage work experience
│   ├── education.tsx            # Manage education
│   └── email-settings.tsx       # Email preferences
├── admin/
│   └── import-jobs.tsx          # Admin: trigger Adzuna import

app/components/
├── ResumeUploader.tsx           # Drag-and-drop upload
├── ResumeCard.tsx               # Resume list item
├── WorkExperienceForm.tsx       # Work experience CRUD
├── EducationForm.tsx            # Education CRUD
├── ExportButton.tsx             # Export resume/cover letter
└── EmailPreferences.tsx         # Email settings form
```

## Feature-Specific Details

### Job Search Service (Adzuna API)

```typescript
// app/lib/adzuna.ts

export interface AdzunaJob {
  id: string;
  title: string;
  company: { display_name: string };
  location: { area: string[]; display_name: string };
  description: string;
  redirect_url: string;
  salary_min?: number;
  salary_max?: number;
  created: string; // ISO date
  contract_type?: string;
  category?: { label: string };
}

export async function searchAdzunaJobs(
  env: any,
  query: string = 'software engineer',
  location: string = 'remote',
  page: number = 1
): Promise<{ jobs: AdzunaJob[]; count: number }> {
  const country = 'us'; // or 'uk', 'ca', 'au', etc.
  const appId = env.ADZUNA_APP_ID;
  const appKey = env.ADZUNA_APP_KEY;

  // Build Adzuna API URL
  const url = new URL(`https://api.adzuna.com/v1/api/jobs/${country}/search/${page}`);
  url.searchParams.append('app_id', appId);
  url.searchParams.append('app_key', appKey);
  url.searchParams.append('what', query);
  url.searchParams.append('where', location);
  url.searchParams.append('results_per_page', '50');
  url.searchParams.append('content-type', 'application/json');

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Adzuna API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  return {
    jobs: data.results || [],
    count: data.count || 0
  };
}

export async function importJobsFromAdzuna(
  env: any,
  searchQueries: string[] = ['software engineer', 'web developer', 'data scientist']
): Promise<{ imported: number; updated: number; errors: number }> {
  let imported = 0;
  let updated = 0;
  let errors = 0;

  for (const query of searchQueries) {
    try {
      const { jobs } = await searchAdzunaJobs(env, query, 'remote', 1);

      for (const job of jobs) {
        try {
          const result = await saveOrUpdateJob(env.DB, {
            title: job.title,
            company: job.company.display_name,
            location: job.location.display_name,
            remote: job.location.display_name.toLowerCase().includes('remote') ? 1 : 0,
            description: job.description,
            requirements: JSON.stringify([]), // Adzuna doesn't provide structured requirements
            salary_min: job.salary_min || null,
            salary_max: job.salary_max || null,
            posted_date: Math.floor(new Date(job.created).getTime() / 1000),
            source: 'adzuna',
            external_url: job.redirect_url
          });

          if (result === 'inserted') {
            imported++;
          } else {
            updated++;
          }
        } catch (error) {
          console.error('Error saving job:', error);
          errors++;
        }
      }
    } catch (error) {
      console.error(`Error searching for "${query}":`, error);
      errors++;
    }
  }

  return { imported, updated, errors };
}

async function saveOrUpdateJob(db: any, jobData: any): Promise<'inserted' | 'updated'> {
  // Check if job exists (by external_url to avoid duplicates)
  const existing = await db.prepare(
    'SELECT id FROM jobs WHERE external_url = ?'
  ).bind(jobData.external_url).first();

  if (existing) {
    // Update existing job
    await db.prepare(`
      UPDATE jobs SET
        title = ?, company = ?, location = ?, remote = ?,
        description = ?, requirements = ?, salary_min = ?, salary_max = ?,
        posted_date = ?, updated_at = unixepoch()
      WHERE id = ?
    `).bind(
      jobData.title, jobData.company, jobData.location, jobData.remote,
      jobData.description, jobData.requirements, jobData.salary_min, jobData.salary_max,
      jobData.posted_date, existing.id
    ).run();

    return 'updated';
  } else {
    // Insert new job
    await db.prepare(`
      INSERT INTO jobs (title, company, location, remote, description, requirements, salary_min, salary_max, posted_date, source, external_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      jobData.title, jobData.company, jobData.location, jobData.remote,
      jobData.description, jobData.requirements, jobData.salary_min, jobData.salary_max,
      jobData.posted_date, jobData.source, jobData.external_url
    ).run();

    return 'inserted';
  }
}

// API Route: POST /api/admin/import-jobs
export async function POST(request: Request, { env }) {
  const { queries } = await request.json();

  const searchQueries = queries || [
    'software engineer remote',
    'web developer remote',
    'frontend engineer remote',
    'backend engineer remote',
    'full stack developer remote'
  ];

  const result = await importJobsFromAdzuna(env, searchQueries);

  return Response.json({
    success: true,
    ...result,
    message: `Imported ${result.imported} new jobs, updated ${result.updated} existing jobs. ${result.errors} errors.`
  });
}
```

### Resume Parsing Service

```typescript
// app/lib/resume-parser.ts
import pdf from 'pdf-parse';

export async function parseResumeWithAI(
  env: any,
  pdfBuffer: ArrayBuffer
): Promise<ParsedResume> {
  // Extract text from PDF
  const data = await pdf(pdfBuffer);
  const text = data.text;

  // Use Llama to structure the data
  const prompt = `Extract structured information from this resume text. Return ONLY valid JSON.

RESUME TEXT:
${text}

Extract:
1. Work experience (company, title, dates, description for each)
2. Education (school, degree, field, dates for each)
3. Skills (list of skills)
4. Contact info (email, phone if available)

Return JSON in this format:
{
  "workExperience": [
    {
      "company": "Company Name",
      "title": "Job Title",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM" or "Present",
      "description": "Job description"
    }
  ],
  "education": [
    {
      "school": "School Name",
      "degree": "Degree",
      "fieldOfStudy": "Field",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM"
    }
  ],
  "skills": ["skill1", "skill2"],
  "contact": {
    "email": "email@example.com",
    "phone": "123-456-7890"
  }
}`;

  const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    prompt,
    max_tokens: 2000,
    temperature: 0.3 // Lower temperature for factual extraction
  });

  // Parse and validate
  const parsed = parseAIResponse(response.response);

  return {
    workExperience: parsed.workExperience || [],
    education: parsed.education || [],
    skills: parsed.skills || [],
    contact: parsed.contact || {}
  };
}

interface ParsedResume {
  workExperience: WorkExperience[];
  education: Education[];
  skills: string[];
  contact: {
    email?: string;
    phone?: string;
  };
}
```

### Document Export Service

```typescript
// app/lib/export.ts
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';

export async function generateResumeDocx(
  user: User,
  workExperience: WorkExperience[],
  education: Education[],
  template: 'modern' | 'classic' | 'minimal' = 'modern'
): Promise<ArrayBuffer> {
  // Load template
  const templateBuffer = await loadTemplate(template);

  const zip = new PizZip(templateBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true
  });

  // Set data
  doc.setData({
    name: user.full_name,
    email: user.email,
    location: user.location,
    bio: user.bio,
    skills: JSON.parse(user.skills || '[]'),
    workExperience: workExperience.map(exp => ({
      company: exp.company,
      title: exp.title,
      dates: `${exp.start_date} - ${exp.end_date}`,
      description: exp.description
    })),
    education: education.map(edu => ({
      school: edu.school,
      degree: edu.degree,
      field: edu.field_of_study,
      dates: `${edu.start_date} - ${edu.end_date}`
    }))
  });

  doc.render();

  return doc.getZip().generate({ type: 'arraybuffer' });
}

async function loadTemplate(template: string): Promise<ArrayBuffer> {
  // Templates stored in R2 or embedded in code
  // For now, return a basic template
  // In production, fetch from R2: await env.STORAGE.get(`templates/resume-${template}.docx`)
  return new ArrayBuffer(0); // Placeholder
}
```

## Migration from Phase 1

### Database Migration

Create `migrations/0003_phase2_schema.sql`:

```sql
-- Resumes
CREATE TABLE IF NOT EXISTS resumes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  parsed_data TEXT,
  is_primary INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Work Experience
CREATE TABLE IF NOT EXISTS work_experience (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  resume_id TEXT,
  company TEXT NOT NULL,
  title TEXT NOT NULL,
  location TEXT,
  start_date TEXT,
  end_date TEXT,
  description TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL
);

-- Education
CREATE TABLE IF NOT EXISTS education (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  resume_id TEXT,
  school TEXT NOT NULL,
  degree TEXT,
  field_of_study TEXT,
  start_date TEXT,
  end_date TEXT,
  gpa TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL
);

-- Email Preferences
CREATE TABLE IF NOT EXISTS email_preferences (
  user_id TEXT PRIMARY KEY,
  digest_enabled INTEGER DEFAULT 1,
  status_updates_enabled INTEGER DEFAULT 1,
  reminders_enabled INTEGER DEFAULT 1,
  digest_frequency TEXT DEFAULT 'weekly',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Email Log
CREATE TABLE IF NOT EXISTS email_log (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  email_type TEXT NOT NULL,
  subject TEXT,
  sent_at INTEGER DEFAULT (unixepoch()),
  sendgrid_message_id TEXT,
  status TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add new columns to jobs table
ALTER TABLE jobs ADD COLUMN source TEXT; -- 'adzuna', 'manual', 'user-created'
ALTER TABLE jobs ADD COLUMN external_url TEXT UNIQUE; -- Adzuna redirect URL for deduplication

-- Indexes
CREATE INDEX idx_resumes_user_id ON resumes(user_id);
CREATE INDEX idx_work_experience_user_id ON work_experience(user_id);
CREATE INDEX idx_education_user_id ON education(user_id);
CREATE INDEX idx_email_log_user_id ON email_log(user_id);
CREATE INDEX idx_email_log_sent_at ON email_log(sent_at);
CREATE INDEX idx_jobs_source ON jobs(source);
CREATE INDEX idx_jobs_external_url ON jobs(external_url);
```

Apply migration:
```bash
wrangler d1 execute gethiredpoc --remote --file=./migrations/0003_phase2_schema.sql
```

## Testing Checklist

### Job Importing (Adzuna API)
- [ ] Fetch jobs from Adzuna API successfully
- [ ] Jobs saved to D1 with all fields
- [ ] Duplicate jobs not created (by external_url)
- [ ] Existing jobs updated correctly
- [ ] Multiple search queries work
- [ ] Import can be triggered via API
- [ ] Cron trigger runs daily
- [ ] Salary data imported when available
- [ ] Remote jobs flagged correctly

### Resume Management
- [ ] Upload PDF resume to R2
- [ ] Resume appears in list
- [ ] Set primary resume works
- [ ] Delete resume removes from R2 and D1
- [ ] PDF parsing extracts text
- [ ] AI structures data correctly
- [ ] Work experience pre-fills from resume
- [ ] Education pre-fills from resume
- [ ] Manual CRUD for work experience works
- [ ] Manual CRUD for education works

### Document Export
- [ ] Export resume as PDF
- [ ] Export resume as DOCX
- [ ] Export cover letter as PDF
- [ ] Export cover letter as DOCX
- [ ] Different templates produce different styles
- [ ] Download works in browser
- [ ] Generated documents look professional

### Email Notifications
- [ ] Welcome email sent on signup
- [ ] Status update email sent when status changes
- [ ] Weekly digest email sent to opted-in users
- [ ] Email preferences can be updated
- [ ] Unsubscribe works
- [ ] Emails render correctly in Gmail/Outlook
- [ ] Email log records all sent emails

## Success Criteria

Phase 2 is complete when:

- ✅ Real jobs imported from Adzuna API daily
- ✅ Jobs include salary data, descriptions, application URLs
- ✅ Users can upload and parse resumes
- ✅ Users can export resumes and cover letters
- ✅ Email notifications working for all event types
- ✅ All new features have error handling
- ✅ All new features work on mobile
- ✅ No console errors
- ✅ Production deployment successful
- ✅ Cloudflare free tier limits respected

## Cost Considerations

**New Costs:**
- Adzuna API: **$0** (FREE unlimited)
- SendGrid: **$0** (Free tier: 100 emails/day)

**Keep Free:**
- Cloudflare D1, R2, KV, Workers AI (within free tier)

**Total Phase 2 Cost: $0/month** 🎉

**If you need more emails:**
- SendGrid: $19.95/month for 40K emails (only if free tier exhausted)

## Timeline

**Week 1:**
- Days 1-2: Adzuna API integration and job importing
- Days 3-4: Resume upload and PDF parsing
- Day 5: Work experience and education CRUD

**Week 2:**
- Days 1-2: Document export (PDF/DOCX)
- Days 3-4: Email notifications with SendGrid
- Day 5: Testing, bug fixes, deployment

## Next Steps After Phase 2

If Phase 2 succeeds, Phase 3 priorities:
1. LinkedIn OAuth
2. Vector embeddings for semantic job search
3. Cover letter AI generation
4. Advanced application tracking (kanban, timeline)
5. CI/CD pipeline
6. Comprehensive test suite

---

**Use this with `/ralph-loop` to build Phase 2:**

```
/ralph-loop

Read phase2.md and implement all Phase 2 features for GetHiredPOC.

External services configured:
- Adzuna API (FREE) - App ID and Key in wrangler.toml
- SendGrid API key set as Cloudflare secret

Build incrementally:
1. Adzuna API integration (fetch real jobs - FREE)
2. Resume upload and PDF parsing
3. Document export (PDF/DOCX)
4. Email notifications (SendGrid)

Test each feature thoroughly. Fix all errors immediately. Continue until Phase 2 is production-ready.

Total cost: $0/month 🎉
```
