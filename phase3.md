# Phase 3: AI-Powered Job Matching & Application Generation

<promise>
You will build Phase 3 of GetHiredPOC, adding intelligent AI features that transform it from a basic job tracker into a smart career assistant. You'll implement:

1. AI Resume/Cover Letter Generation (Cloudflare Workers AI + Llama)
2. Intelligent Job Matching & Compatibility Scoring
3. Automated Job Recommendations
4. Application Tracking Dashboard with Analytics
5. Automated Daily Job Alerts via Email

Use `/ralph-loop` for autonomous development. Work incrementally, test thoroughly, and fix all issues immediately. Continue until Phase 3 is production-ready with all AI features working flawlessly.
</promise>

## Phase 3 Objective

Transform GetHiredPOC into an AI-powered career assistant that:
- Generates tailored resumes and cover letters for each job
- Analyzes job compatibility and provides match scores
- Recommends best-fit jobs daily
- Tracks application progress with insights
- Sends automated job alert digests

**Cost: $0/month** (Cloudflare Workers AI free tier + existing services)

## Prerequisites

Before starting Phase 3, verify:
- [ ] Phase 2 is deployed and working
- [ ] Adzuna API fetching real jobs
- [ ] Resume upload/parsing functional
- [ ] Document export (PDF/DOCX) working
- [ ] SendGrid email notifications configured
- [ ] Cloudflare Workers AI binding enabled in wrangler.toml

## Phase 3 Features

### Feature 1: AI Resume Generator

**User Flow:**
1. User clicks "Generate Resume" on job detail page
2. AI analyzes user profile + job requirements
3. Generates tailored resume highlighting relevant skills/experience
4. User can edit, download PDF/DOCX, or use for application

**Implementation:**

```typescript
// app/lib/ai-resume.ts

export interface ResumeSection {
  summary: string;
  experience: Array<{
    company: string;
    title: string;
    dates: string;
    achievements: string[];
  }>;
  skills: string[];
  education: Array<{
    school: string;
    degree: string;
    year: string;
  }>;
}

export async function generateTailoredResume(
  env: any,
  userProfile: any,
  job: any
): Promise<ResumeSection> {
  const cacheKey = `resume:${userProfile.id}:${job.id}`;

  // Check KV cache (7 days)
  const cached = await env.KV_CACHE.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Parse user data
  const userSkills = JSON.parse(userProfile.skills || '[]');
  const workHistory = JSON.parse(userProfile.work_experience || '[]');
  const education = JSON.parse(userProfile.education || '[]');
  const jobRequirements = JSON.parse(job.requirements || '[]');

  const prompt = `You are an expert resume writer. Create a tailored resume for this job application.

USER PROFILE:
- Name: ${userProfile.full_name}
- Location: ${userProfile.location || 'Not specified'}
- Bio: ${userProfile.bio || 'No bio provided'}
- Skills: ${userSkills.join(', ')}
- Work Experience: ${JSON.stringify(workHistory, null, 2)}
- Education: ${JSON.stringify(education, null, 2)}

JOB POSTING:
- Title: ${job.title}
- Company: ${job.company}
- Requirements: ${jobRequirements.join(', ')}
- Description: ${job.description.substring(0, 500)}

Generate a tailored resume that:
1. Highlights relevant skills from the user's profile that match job requirements
2. Rewrites work achievements to emphasize experience relevant to this role
3. Creates a compelling professional summary (2-3 sentences)
4. Prioritizes skills that match the job description

Respond ONLY with valid JSON in this exact format:
{
  "summary": "Professional summary here...",
  "experience": [
    {
      "company": "Company Name",
      "title": "Job Title",
      "dates": "2020-2023",
      "achievements": ["Achievement 1", "Achievement 2", "Achievement 3"]
    }
  ],
  "skills": ["Skill 1", "Skill 2", "Skill 3"],
  "education": [
    {
      "school": "University Name",
      "degree": "Degree Title",
      "year": "2020"
    }
  ]
}`;

  try {
    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt,
      max_tokens: 1000,
      temperature: 0.7
    });

    const result = parseResumeJSON(response.response);

    // Cache for 7 days
    await env.KV_CACHE.put(cacheKey, JSON.stringify(result), {
      expirationTtl: 7 * 24 * 60 * 60
    });

    return result;
  } catch (error) {
    console.error('AI resume generation error:', error);
    throw new Error('Failed to generate resume');
  }
}

function parseResumeJSON(text: string): ResumeSection {
  try {
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) ||
                      text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      return parsed;
    }

    throw new Error('No valid JSON found in response');
  } catch (error) {
    throw new Error('Failed to parse AI response');
  }
}
```

**API Route:**

```typescript
// app/routes/api/jobs/[id]/generate-resume.ts

import { requireAuth } from '~/lib/auth';
import { generateTailoredResume } from '~/lib/ai-resume';

export async function POST(request: Request, { env, params }) {
  const user = await requireAuth(request, env);
  const jobId = params.id;

  // Get job
  const job = await env.DB.prepare(
    'SELECT * FROM jobs WHERE id = ?'
  ).bind(jobId).first();

  if (!job) {
    return Response.json({ error: 'Job not found' }, { status: 404 });
  }

  // Generate tailored resume
  const resume = await generateTailoredResume(env, user, job);

  // Save to applications if one exists
  const app = await env.DB.prepare(
    'SELECT id FROM applications WHERE user_id = ? AND job_id = ?'
  ).bind(user.id, jobId).first();

  if (app) {
    await env.DB.prepare(
      'UPDATE applications SET resume_content = ?, updated_at = unixepoch() WHERE id = ?'
    ).bind(JSON.stringify(resume), app.id).run();
  }

  return Response.json(resume);
}
```

### Feature 2: AI Cover Letter Generator

```typescript
// app/lib/ai-cover-letter.ts

export async function generateCoverLetter(
  env: any,
  userProfile: any,
  job: any
): Promise<string> {
  const cacheKey = `cover:${userProfile.id}:${job.id}`;

  const cached = await env.KV_CACHE.get(cacheKey);
  if (cached) {
    return cached;
  }

  const userSkills = JSON.parse(userProfile.skills || '[]');

  const prompt = `You are an expert cover letter writer. Write a compelling cover letter for this job application.

USER PROFILE:
- Name: ${userProfile.full_name}
- Location: ${userProfile.location}
- Bio: ${userProfile.bio}
- Skills: ${userSkills.join(', ')}

JOB:
- Title: ${job.title}
- Company: ${job.company}
- Description: ${job.description.substring(0, 600)}

Write a professional cover letter (3-4 paragraphs) that:
1. Opens with enthusiasm for the specific role and company
2. Highlights 2-3 relevant skills/experiences that match the job
3. Explains why you're a great fit
4. Closes with a call to action

Use a professional but warm tone. Do NOT include placeholder text like [Your Name] or [Date].
Write as if the user is writing directly to the hiring manager.

Return ONLY the cover letter text, no JSON, no code blocks.`;

  try {
    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt,
      max_tokens: 800,
      temperature: 0.8
    });

    const coverLetter = response.response.trim();

    // Cache for 7 days
    await env.KV_CACHE.put(cacheKey, coverLetter, {
      expirationTtl: 7 * 24 * 60 * 60
    });

    return coverLetter;
  } catch (error) {
    console.error('Cover letter generation error:', error);
    throw new Error('Failed to generate cover letter');
  }
}
```

### Feature 3: Intelligent Job Matching

```typescript
// app/lib/job-matching.ts

export interface JobMatch {
  jobId: number;
  score: number; // 0-100
  strengths: string[];
  concerns: string[];
  recommendation: 'strong' | 'good' | 'fair' | 'weak';
}

export async function analyzeJobMatch(
  env: any,
  userProfile: any,
  job: any
): Promise<JobMatch> {
  const cacheKey = `match:${userProfile.id}:${job.id}`;

  const cached = await env.KV_CACHE.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const userSkills = JSON.parse(userProfile.skills || '[]');
  const jobRequirements = JSON.parse(job.requirements || '[]');

  const prompt = `You are a job matching expert. Analyze how well this candidate matches this job.

CANDIDATE:
- Skills: ${userSkills.join(', ') || 'No skills listed'}
- Location: ${userProfile.location || 'Not specified'}
- Bio: ${userProfile.bio || 'No bio'}

JOB:
- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location}
- Remote: ${job.remote ? 'Yes' : 'No'}
- Requirements: ${jobRequirements.join(', ')}
- Description: ${job.description.substring(0, 500)}

Provide:
1. Overall match score (0-100)
2. 3-5 key strengths
3. 1-3 concerns or gaps
4. Recommendation level (strong/good/fair/weak)

Respond ONLY with valid JSON:
{
  "score": 85,
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "concerns": ["concern 1", "concern 2"],
  "recommendation": "strong"
}`;

  try {
    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt,
      max_tokens: 500,
      temperature: 0.7
    });

    const result = parseMatchJSON(response.response);
    const match: JobMatch = {
      jobId: job.id,
      ...result
    };

    // Cache for 7 days
    await env.KV_CACHE.put(cacheKey, JSON.stringify(match), {
      expirationTtl: 7 * 24 * 60 * 60
    });

    return match;
  } catch (error) {
    console.error('Job matching error:', error);
    throw new Error('Failed to analyze job match');
  }
}

function parseMatchJSON(text: string): any {
  try {
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) ||
                      text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      return JSON.parse(jsonMatch[1] || jsonMatch[0]);
    }

    throw new Error('No valid JSON in response');
  } catch (error) {
    throw new Error('Failed to parse match analysis');
  }
}
```

### Feature 4: Automated Job Recommendations

```typescript
// app/lib/job-recommendations.ts

export async function getTopJobRecommendations(
  env: any,
  userId: number,
  limit: number = 10
): Promise<JobMatch[]> {
  // Get user profile
  const user = await env.DB.prepare(
    'SELECT * FROM users WHERE id = ?'
  ).bind(userId).first();

  if (!user) {
    throw new Error('User not found');
  }

  // Get recent jobs (last 7 days)
  const jobs = await env.DB.prepare(`
    SELECT * FROM jobs
    WHERE created_at > unixepoch() - (7 * 24 * 60 * 60)
    ORDER BY created_at DESC
    LIMIT 50
  `).all();

  // Analyze each job
  const matches: JobMatch[] = [];

  for (const job of jobs.results) {
    try {
      const match = await analyzeJobMatch(env, user, job);
      matches.push(match);
    } catch (error) {
      console.error(`Failed to analyze job ${job.id}:`, error);
    }
  }

  // Sort by score and return top N
  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, limit);
}
```

### Feature 5: Daily Job Alert Email

```typescript
// app/lib/job-alerts.ts

import { sendEmail } from '~/lib/sendgrid';

export async function sendDailyJobAlert(env: any, userId: number) {
  const user = await env.DB.prepare(
    'SELECT * FROM users WHERE id = ?'
  ).bind(userId).first();

  if (!user || !user.email) {
    return;
  }

  // Get top 5 recommendations
  const recommendations = await getTopJobRecommendations(env, userId, 5);

  if (recommendations.length === 0) {
    return; // No new jobs to recommend
  }

  // Get full job details
  const jobIds = recommendations.map(r => r.jobId);
  const jobs = await env.DB.prepare(`
    SELECT * FROM jobs WHERE id IN (${jobIds.join(',')})
  `).all();

  const jobsMap = new Map(jobs.results.map(j => [j.id, j]));

  // Build email HTML
  const jobsHtml = recommendations.map(match => {
    const job = jobsMap.get(match.jobId);
    if (!job) return '';

    return `
      <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <h3 style="margin: 0 0 8px 0; color: #1f2937;">${job.title}</h3>
        <p style="margin: 0 0 4px 0; color: #6b7280;">${job.company} • ${job.location}</p>
        <p style="margin: 8px 0; color: #374151;">Match Score: <strong>${match.score}%</strong></p>
        <p style="margin: 8px 0; color: #059669;"><strong>Why it's a good fit:</strong></p>
        <ul style="margin: 4px 0; padding-left: 20px; color: #374151;">
          ${match.strengths.map(s => `<li>${s}</li>`).join('')}
        </ul>
        <a href="${env.APP_URL}/jobs/${job.id}"
           style="display: inline-block; margin-top: 12px; padding: 8px 16px; background: #10b981; color: white; text-decoration: none; border-radius: 6px;">
          View Job
        </a>
      </div>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f9fafb;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h1 style="margin: 0 0 16px 0; color: #1f2937;">Your Daily Job Recommendations</h1>
        <p style="margin: 0 0 24px 0; color: #6b7280;">
          Hi ${user.full_name}, we found ${recommendations.length} great job matches for you today!
        </p>
        ${jobsHtml}
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
        <p style="margin: 0; color: #9ca3af; font-size: 14px; text-align: center;">
          GetHiredPOC •
          <a href="${env.APP_URL}/settings" style="color: #6b7280;">Unsubscribe</a>
        </p>
      </div>
    </body>
    </html>
  `;

  await sendEmail(env, {
    to: user.email,
    subject: `${recommendations.length} New Job Matches for You`,
    html
  });
}
```

**Scheduled Job (runs daily):**

```typescript
// app/jobs/daily-alerts.ts

import { sendDailyJobAlert } from '~/lib/job-alerts';

export async function runDailyAlerts(env: any) {
  // Get all users who want daily alerts
  const users = await env.DB.prepare(`
    SELECT id FROM users
    WHERE email_notifications = 1
  `).all();

  console.log(`Sending daily alerts to ${users.results.length} users`);

  for (const user of users.results) {
    try {
      await sendDailyJobAlert(env, user.id);
      console.log(`Sent alert to user ${user.id}`);
    } catch (error) {
      console.error(`Failed to send alert to user ${user.id}:`, error);
    }
  }
}

// Cloudflare Cron Trigger (add to wrangler.toml)
// [triggers]
// crons = ["0 9 * * *"]  # Daily at 9 AM UTC

export default {
  async scheduled(event: ScheduledEvent, env: any, ctx: ExecutionContext) {
    ctx.waitUntil(runDailyAlerts(env));
  }
};
```

### Feature 6: Application Tracking Dashboard

**Database Updates:**

```sql
-- Add analytics fields to applications table
ALTER TABLE applications ADD COLUMN ai_match_score INTEGER;
ALTER TABLE applications ADD COLUMN ai_analysis TEXT;
ALTER TABLE applications ADD COLUMN response_time INTEGER; -- Days to hear back
ALTER TABLE applications ADD COLUMN notes TEXT;
```

**Dashboard Component:**

```typescript
// app/sections/dashboard/ApplicationsDashboard.tsx

import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { BarChart, TrendingUp, Clock, CheckCircle } from 'lucide-react';

export default function ApplicationsDashboard({ stats, recentApps }) {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Interviews</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.interviews}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((stats.interviews / stats.total) * 100)}% conversion
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgResponseDays}d</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Offers</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.offers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Applications with AI Scores */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Applications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentApps.map(app => (
              <div key={app.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium">{app.job_title}</h4>
                  <p className="text-sm text-muted-foreground">{app.company}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {app.ai_match_score}%
                    </div>
                    <div className="text-xs text-muted-foreground">Match</div>
                  </div>
                  <Badge variant={getStatusVariant(app.status)}>
                    {app.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getStatusVariant(status: string) {
  switch (status) {
    case 'offer': return 'default';
    case 'interview': return 'secondary';
    case 'applied': return 'outline';
    case 'rejected': return 'destructive';
    default: return 'outline';
  }
}
```

**Dashboard API Route:**

```typescript
// app/routes/dashboard.tsx

import { useLoaderData } from '@remix-run/react';
import ApplicationsDashboard from '~/sections/dashboard/ApplicationsDashboard';
import { requireAuth } from '~/lib/auth';

export async function loader({ request, context }) {
  const user = await requireAuth(request, context.env);

  // Get application stats
  const stats = await context.env.DB.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'interview' THEN 1 ELSE 0 END) as interviews,
      SUM(CASE WHEN status = 'offer' THEN 1 ELSE 0 END) as offers,
      AVG(response_time) as avgResponseDays
    FROM applications
    WHERE user_id = ?
  `).bind(user.id).first();

  // Get recent applications with job details
  const recentApps = await context.env.DB.prepare(`
    SELECT
      a.*,
      j.title as job_title,
      j.company
    FROM applications a
    JOIN jobs j ON a.job_id = j.id
    WHERE a.user_id = ?
    ORDER BY a.created_at DESC
    LIMIT 10
  `).bind(user.id).all();

  return { stats, recentApps: recentApps.results };
}

export default function Dashboard() {
  const { stats, recentApps } = useLoaderData();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      <ApplicationsDashboard stats={stats} recentApps={recentApps} />
    </div>
  );
}
```

## Database Schema Updates

```sql
-- migrations/0003_phase3_features.sql

-- Add AI fields to applications
ALTER TABLE applications ADD COLUMN ai_match_score INTEGER DEFAULT 0;
ALTER TABLE applications ADD COLUMN ai_analysis TEXT;
ALTER TABLE applications ADD COLUMN resume_content TEXT; -- Generated resume JSON
ALTER TABLE applications ADD COLUMN cover_letter TEXT;
ALTER TABLE applications ADD COLUMN response_time INTEGER; -- Days to response
ALTER TABLE applications ADD COLUMN notes TEXT;

-- Add notification preferences to users
ALTER TABLE users ADD COLUMN email_notifications INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN daily_job_alerts INTEGER DEFAULT 1;

-- Create index for efficient job recommendations
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX idx_applications_user_status ON applications(user_id, status);
```

## wrangler.toml Updates

```toml
# Add cron trigger for daily job alerts
[triggers]
crons = ["0 9 * * *"]  # Daily at 9 AM UTC

# Ensure Workers AI binding exists
[[ai]]
binding = "AI"
```

## UI Updates

### Job Detail Page - Add AI Actions

```typescript
// app/routes/jobs/[id].tsx

import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Sparkles, FileText, Mail } from 'lucide-react';

export default function JobDetail() {
  const [generating, setGenerating] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [matchScore, setMatchScore] = useState(null);

  const handleAnalyzeMatch = async () => {
    setAnalyzing(true);
    const res = await fetch(`/api/jobs/${jobId}/analyze`, {
      method: 'POST',
      credentials: 'include'
    });
    const data = await res.json();
    setMatchScore(data);
    setAnalyzing(false);
  };

  const handleGenerateResume = async () => {
    setGenerating(true);
    const res = await fetch(`/api/jobs/${jobId}/generate-resume`, {
      method: 'POST',
      credentials: 'include'
    });
    const resume = await res.json();
    // Show resume modal or redirect to edit page
    setGenerating(false);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Job Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{job.title}</h1>
        <p className="text-lg text-muted-foreground">{job.company}</p>
      </div>

      {/* AI Actions */}
      <div className="flex gap-4 mb-8">
        <Button onClick={handleAnalyzeMatch} disabled={analyzing}>
          <Sparkles className="mr-2 h-4 w-4" />
          {analyzing ? 'Analyzing...' : 'Analyze Match'}
        </Button>

        <Button onClick={handleGenerateResume} disabled={generating} variant="secondary">
          <FileText className="mr-2 h-4 w-4" />
          {generating ? 'Generating...' : 'Generate Resume'}
        </Button>

        <Button variant="secondary">
          <Mail className="mr-2 h-4 w-4" />
          Generate Cover Letter
        </Button>
      </div>

      {/* Match Score Display */}
      {matchScore && (
        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Match Analysis</h3>
            <Badge variant="default" className="text-2xl px-4 py-2">
              {matchScore.score}% Match
            </Badge>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2 text-green-900 dark:text-green-100">Strengths</h4>
              <ul className="list-disc list-inside space-y-1">
                {matchScore.strengths.map((s, i) => (
                  <li key={i} className="text-green-800 dark:text-green-200">{s}</li>
                ))}
              </ul>
            </div>

            {matchScore.concerns.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 text-amber-900 dark:text-amber-100">Areas to Address</h4>
                <ul className="list-disc list-inside space-y-1">
                  {matchScore.concerns.map((c, i) => (
                    <li key={i} className="text-amber-800 dark:text-amber-200">{c}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-sm font-medium pt-2">
              Recommendation: <span className="text-green-600">{matchScore.recommendation}</span>
            </p>
          </div>
        </div>
      )}

      {/* Rest of job details... */}
    </div>
  );
}
```

## Testing Checklist

After implementing Phase 3, verify:

- [ ] **AI Resume Generation:**
  - Click "Generate Resume" on job page
  - Verify AI creates tailored resume with relevant skills
  - Check resume highlights match job requirements
  - Confirm resume can be downloaded as PDF/DOCX

- [ ] **AI Cover Letter:**
  - Generate cover letter for multiple jobs
  - Verify each letter is personalized to the company/role
  - Check tone is professional and engaging
  - Confirm no placeholder text like [Your Name]

- [ ] **Job Match Analysis:**
  - Click "Analyze Match" on job page
  - Verify match score (0-100) displays
  - Check strengths list is relevant
  - Verify concerns list identifies real gaps
  - Confirm recommendation level is appropriate

- [ ] **Job Recommendations:**
  - Navigate to recommendations page
  - Verify top 10 jobs sorted by match score
  - Check each job shows match percentage
  - Verify strengths/concerns for each recommendation

- [ ] **Daily Job Alerts:**
  - Wait for cron trigger (or manually run scheduled job)
  - Verify email arrives with job recommendations
  - Check email HTML renders correctly
  - Verify "View Job" links work
  - Test unsubscribe link

- [ ] **Application Dashboard:**
  - View dashboard with multiple applications
  - Verify stats: total, interviews, avg response time, offers
  - Check conversion percentage calculation
  - Verify recent applications show AI match scores
  - Test filtering by status

- [ ] **Caching:**
  - Generate resume twice for same job
  - Verify second request is instant (cached)
  - Analyze match twice
  - Confirm cached response used
  - Check KV storage has cached data

- [ ] **Performance:**
  - AI responses should return in 3-8 seconds
  - Cached responses should be instant (<100ms)
  - Dashboard should load in <500ms
  - Email sending should be async (non-blocking)

## Cost Analysis

**Phase 3 Costs (Monthly):**

| Service | Usage | Cost |
|---------|-------|------|
| Cloudflare Workers AI | 50-100 AI generations/day | **FREE** (10k/day free tier) |
| KV Storage | 10k cached AI responses | **FREE** (100k reads/day free) |
| SendGrid Emails | 100-300 daily alerts/month | **FREE** (100/day free tier) |
| Adzuna API | Unlimited job fetching | **FREE** |
| D1 Database | 1M reads/month | **FREE** (5M free tier) |

**Total Phase 3 Cost: $0/month** ✨

All services stay within free tiers for a POC/small user base.

## Performance Optimizations

1. **Aggressive KV Caching:**
   - Resume/cover letter: 7 days
   - Job match analysis: 7 days
   - Job recommendations: 1 day

2. **Batch Processing:**
   - Daily alerts process all users sequentially
   - Rate limit SendGrid to avoid 429 errors
   - Add 100ms delay between emails

3. **Lazy Loading:**
   - Dashboard loads stats first, then recent apps
   - Job match analysis on-demand (click to analyze)
   - Resume generation only when requested

4. **Database Indexes:**
   - Index on `applications.user_id` + `applications.status`
   - Index on `jobs.created_at` for recent jobs query
   - Index on `users.email_notifications` for alert queries

## Common Issues & Solutions

### Issue: AI responses are generic/irrelevant

**Solution:**
- Improve prompts with more specific instructions
- Include more user context in prompts
- Increase `max_tokens` if responses are truncated
- Try adjusting `temperature` (lower = more focused, higher = more creative)

### Issue: JSON parsing fails

**Solution:**
- Add retry logic with exponential backoff
- Improve regex patterns to handle variations
- Add fallback responses if parsing fails
- Log full AI response for debugging

### Issue: Daily alerts sending to all users

**Solution:**
- Add WHERE clause: `email_notifications = 1`
- Respect user preferences in settings
- Add unsubscribe link that updates DB
- Test with single user first

### Issue: KV cache not working

**Solution:**
- Verify KV binding in wrangler.toml
- Check cache key format (must be strings)
- Confirm expirationTtl is set correctly
- Test with `wrangler kv:key get`

### Issue: Cron jobs not running

**Solution:**
- Verify cron syntax in wrangler.toml
- Check Cloudflare dashboard: Workers & Pages → Triggers
- Test scheduled job manually via API endpoint
- Add logging to verify execution

## Success Criteria

Phase 3 is complete when:

- ✅ AI generates realistic, tailored resumes
- ✅ Cover letters are personalized and professional
- ✅ Job match analysis provides accurate scores
- ✅ Recommendations sorted by relevance
- ✅ Daily email alerts working reliably
- ✅ Dashboard shows meaningful analytics
- ✅ All AI responses cached (instant on repeat)
- ✅ No errors in production logs
- ✅ Costs remain $0/month

## Next Steps After Phase 3

Once Phase 3 is production-ready:

1. **User Testing:**
   - Share with 5-10 beta testers
   - Gather feedback on AI quality
   - Monitor usage patterns

2. **AI Improvements:**
   - Fine-tune prompts based on user feedback
   - Add more AI features (interview prep, salary negotiation)
   - Experiment with different Llama models

3. **Analytics:**
   - Track AI generation usage
   - Monitor match score accuracy
   - Measure email open/click rates

4. **Scalability:**
   - If usage grows beyond free tiers, optimize caching
   - Consider paid tiers for heavy users
   - Add rate limiting per user if needed

---

**Ready to build Phase 3?**

Use the `/ralph-loop` command below to start autonomous development!
