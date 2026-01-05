# Phase 4: LinkedIn & Indeed Profile Import + Enhanced AI Matching

<promise>
You will build Phase 4 of GetHiredPOC, adding comprehensive profile import from LinkedIn and Indeed to enrich user data for better AI job matching and resume generation. You'll implement:

1. LinkedIn OAuth 2.0 Profile Import (work history, education, skills, certifications)
2. Indeed Resume Upload & Parsing
3. Enhanced User Profile Schema (certifications, projects, languages, awards)
4. Profile Data Normalization & Deduplication
5. Improved AI Matching with Richer Data
6. Skills Gap Analysis & Recommendations

Use `/ralph-loop` for autonomous development. Work incrementally, test thoroughly, and fix all issues immediately. Continue until Phase 4 is production-ready with profile imports working flawlessly.
</promise>

## Phase 4 Objective

Transform GetHiredPOC profile management by:
- **Import from LinkedIn** - Automatic profile sync via OAuth
- **Import from Indeed** - Resume upload and parse
- **Enrich user profiles** - Certifications, projects, languages, awards
- **Better AI matching** - More data points = more accurate compatibility scores
- **Enhanced resume generation** - Leverage complete work history for tailored resumes
- **Skills gap analysis** - Identify missing skills for target roles

**Cost: $0/month** (All APIs have free tiers)

---

## Why This Matters

### Current Problem:
- Users manually enter profile data (time-consuming)
- Limited data = generic AI responses
- Missing context = lower match accuracy
- Incomplete resumes = missed opportunities

### After Phase 4:
- ✅ One-click LinkedIn import (1 minute vs 30 minutes)
- ✅ Rich profile data (10+ data points per work experience)
- ✅ Accurate AI matching (90%+ vs 70% accuracy)
- ✅ Comprehensive resumes highlighting all relevant achievements
- ✅ Skills gap analysis showing what to learn

---

## Phase 4 Features

### Feature 1: LinkedIn OAuth Profile Import

**User Flow:**
1. User clicks "Import from LinkedIn" on profile page
2. Redirected to LinkedIn OAuth consent screen
3. User authorizes GetHiredPOC
4. System fetches profile data via LinkedIn API
5. Data parsed and saved to user profile
6. User reviews and confirms imported data

**LinkedIn OAuth Setup:**

```bash
# 1. Create LinkedIn App
# Go to: https://www.linkedin.com/developers/apps
# Create new app, get Client ID and Client Secret

# 2. Add to wrangler.toml
[vars]
LINKEDIN_CLIENT_ID = "your-client-id"

# 3. Add secret
wrangler secret put LINKEDIN_CLIENT_SECRET
# Paste your client secret when prompted

# 4. Configure Redirect URI in LinkedIn App Settings
# Redirect URI: https://gethiredpoc.pages.dev/auth/linkedin/callback
```

**LinkedIn API Implementation:**

```typescript
// app/lib/linkedin-oauth.ts

export interface LinkedInProfile {
  id: string;
  firstName: string;
  lastName: string;
  headline: string;
  summary: string;
  location: {
    country: string;
    city: string;
  };
  positions: Array<{
    title: string;
    company: string;
    description: string;
    startDate: { year: number; month: number };
    endDate?: { year: number; month: number };
    location: string;
  }>;
  educations: Array<{
    schoolName: string;
    degreeName: string;
    fieldOfStudy: string;
    startDate: { year: number };
    endDate?: { year: number };
  }>;
  skills: Array<{
    name: string;
    endorsementCount?: number;
  }>;
  certifications: Array<{
    name: string;
    authority: string;
    startDate: { year: number; month: number };
    endDate?: { year: number; month: number };
    licenseNumber?: string;
    url?: string;
  }>;
  languages: Array<{
    name: string;
    proficiency: string;
  }>;
  projects: Array<{
    title: string;
    description: string;
    url?: string;
  }>;
}

export async function initiateLinkedInOAuth(env: any): Promise<string> {
  const clientId = env.LINKEDIN_CLIENT_ID;
  const redirectUri = `${env.APP_URL}/auth/linkedin/callback`;
  const state = crypto.randomUUID(); // CSRF protection

  // Store state in KV (expires in 10 minutes)
  await env.KV_SESSIONS.put(`linkedin_oauth:${state}`, 'pending', {
    expirationTtl: 600
  });

  const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('scope', 'openid profile email w_member_social r_basicprofile r_emailaddress');

  return authUrl.toString();
}

export async function exchangeLinkedInCode(
  env: any,
  code: string,
  state: string
): Promise<string> {
  // Verify state (CSRF protection)
  const storedState = await env.KV_SESSIONS.get(`linkedin_oauth:${state}`);
  if (!storedState) {
    throw new Error('Invalid or expired OAuth state');
  }

  // Delete used state
  await env.KV_SESSIONS.delete(`linkedin_oauth:${state}`);

  // Exchange code for access token
  const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: env.LINKEDIN_CLIENT_ID,
      client_secret: env.LINKEDIN_CLIENT_SECRET,
      redirect_uri: `${env.APP_URL}/auth/linkedin/callback`
    })
  });

  if (!tokenResponse.ok) {
    throw new Error('Failed to exchange LinkedIn code for token');
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

export async function fetchLinkedInProfile(accessToken: string): Promise<LinkedInProfile> {
  // Fetch basic profile
  const profileResponse = await fetch('https://api.linkedin.com/v2/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!profileResponse.ok) {
    throw new Error('Failed to fetch LinkedIn profile');
  }

  const profile = await profileResponse.json();

  // Fetch positions (work experience)
  const positionsResponse = await fetch(
    'https://api.linkedin.com/v2/positions?q=members&projection=(elements*(company,title,description,locationName,timePeriod))',
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  const positions = positionsResponse.ok ? await positionsResponse.json() : { elements: [] };

  // Fetch education
  const educationResponse = await fetch(
    'https://api.linkedin.com/v2/educations?q=members&projection=(elements*(schoolName,degreeName,fieldOfStudy,timePeriod))',
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  const education = educationResponse.ok ? await educationResponse.json() : { elements: [] };

  // Fetch skills
  const skillsResponse = await fetch(
    'https://api.linkedin.com/v2/skills?q=members&projection=(elements*(name))',
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  const skills = skillsResponse.ok ? await skillsResponse.json() : { elements: [] };

  // Fetch certifications
  const certificationsResponse = await fetch(
    'https://api.linkedin.com/v2/certifications?q=members&projection=(elements*(name,authority,timePeriod,licenseNumber,url))',
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  const certifications = certificationsResponse.ok ? await certificationsResponse.json() : { elements: [] };

  // Parse and normalize data
  return {
    id: profile.id,
    firstName: profile.localizedFirstName,
    lastName: profile.localizedLastName,
    headline: profile.headline || '',
    summary: profile.summary || '',
    location: {
      country: profile.location?.country || '',
      city: profile.location?.name || ''
    },
    positions: positions.elements.map((pos: any) => ({
      title: pos.title,
      company: pos.company?.name || '',
      description: pos.description || '',
      startDate: {
        year: pos.timePeriod?.startDate?.year || 0,
        month: pos.timePeriod?.startDate?.month || 1
      },
      endDate: pos.timePeriod?.endDate ? {
        year: pos.timePeriod.endDate.year,
        month: pos.timePeriod.endDate.month
      } : undefined,
      location: pos.locationName || ''
    })),
    educations: education.elements.map((edu: any) => ({
      schoolName: edu.schoolName || '',
      degreeName: edu.degreeName || '',
      fieldOfStudy: edu.fieldOfStudy || '',
      startDate: { year: edu.timePeriod?.startDate?.year || 0 },
      endDate: edu.timePeriod?.endDate ? { year: edu.timePeriod.endDate.year } : undefined
    })),
    skills: skills.elements.map((skill: any) => ({
      name: skill.name
    })),
    certifications: certifications.elements.map((cert: any) => ({
      name: cert.name || '',
      authority: cert.authority || '',
      startDate: {
        year: cert.timePeriod?.startDate?.year || 0,
        month: cert.timePeriod?.startDate?.month || 1
      },
      endDate: cert.timePeriod?.endDate ? {
        year: cert.timePeriod.endDate.year,
        month: cert.timePeriod.endDate.month
      } : undefined,
      licenseNumber: cert.licenseNumber,
      url: cert.url
    })),
    languages: [],
    projects: []
  };
}

export async function saveLinkedInProfile(
  env: any,
  userId: number,
  linkedInProfile: LinkedInProfile
): Promise<void> {
  // Update user basic info
  await env.DB.prepare(`
    UPDATE users
    SET
      full_name = ?,
      headline = ?,
      bio = ?,
      location = ?
    WHERE id = ?
  `).bind(
    `${linkedInProfile.firstName} ${linkedInProfile.lastName}`,
    linkedInProfile.headline,
    linkedInProfile.summary,
    `${linkedInProfile.location.city}, ${linkedInProfile.location.country}`,
    userId
  ).run();

  // Save work experience
  for (const position of linkedInProfile.positions) {
    await env.DB.prepare(`
      INSERT INTO work_experience (
        user_id, company, title, description, location, start_date, end_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      position.company,
      position.title,
      position.description,
      position.location,
      `${position.startDate.year}-${String(position.startDate.month).padStart(2, '0')}-01`,
      position.endDate ? `${position.endDate.year}-${String(position.endDate.month).padStart(2, '0')}-01` : null
    ).run();
  }

  // Save education
  for (const edu of linkedInProfile.educations) {
    await env.DB.prepare(`
      INSERT INTO education (
        user_id, school, degree, field_of_study, start_year, end_year
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      edu.schoolName,
      edu.degreeName,
      edu.fieldOfStudy,
      edu.startDate.year,
      edu.endDate?.year || null
    ).run();
  }

  // Save skills (as JSON for now, will be enhanced later)
  const skills = linkedInProfile.skills.map(s => s.name);
  await env.DB.prepare(`
    UPDATE users SET skills = ? WHERE id = ?
  `).bind(JSON.stringify(skills), userId).run();

  // Save certifications
  for (const cert of linkedInProfile.certifications) {
    await env.DB.prepare(`
      INSERT INTO certifications (
        user_id, name, authority, issue_date, expiry_date, credential_id, credential_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      cert.name,
      cert.authority,
      `${cert.startDate.year}-${String(cert.startDate.month).padStart(2, '0')}-01`,
      cert.endDate ? `${cert.endDate.year}-${String(cert.endDate.month).padStart(2, '0')}-01` : null,
      cert.licenseNumber || null,
      cert.url || null
    ).run();
  }
}
```

**API Routes:**

```typescript
// app/routes/auth/linkedin/initiate.ts

import { initiateLinkedInOAuth } from '~/lib/linkedin-oauth';
import { requireAuth } from '~/lib/auth';

export async function GET(request: Request, { env }) {
  await requireAuth(request, env); // Ensure user is logged in

  const authUrl = await initiateLinkedInOAuth(env);

  return Response.redirect(authUrl);
}
```

```typescript
// app/routes/auth/linkedin/callback.ts

import { exchangeLinkedInCode, fetchLinkedInProfile, saveLinkedInProfile } from '~/lib/linkedin-oauth';
import { requireAuth } from '~/lib/auth';

export async function GET(request: Request, { env }) {
  const user = await requireAuth(request, env);
  const url = new URL(request.url);

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    return Response.redirect(`${env.APP_URL}/profile?error=linkedin_auth_failed`);
  }

  if (!code || !state) {
    return Response.redirect(`${env.APP_URL}/profile?error=missing_params`);
  }

  try {
    // Exchange code for access token
    const accessToken = await exchangeLinkedInCode(env, code, state);

    // Fetch LinkedIn profile data
    const linkedInProfile = await fetchLinkedInProfile(accessToken);

    // Save to database
    await saveLinkedInProfile(env, user.id, linkedInProfile);

    return Response.redirect(`${env.APP_URL}/profile?success=linkedin_imported`);
  } catch (error) {
    console.error('LinkedIn import error:', error);
    return Response.redirect(`${env.APP_URL}/profile?error=import_failed`);
  }
}
```

---

### Feature 2: Indeed Resume Upload & Parsing

**Note:** Indeed doesn't have a public API for profile data. We'll use resume upload + parsing instead.

**User Flow:**
1. User clicks "Import from Indeed" on profile page
2. Modal opens with instructions: "Download your Indeed resume as PDF"
3. User uploads Indeed resume PDF
4. System parses PDF using AI (Llama)
5. Data extracted and saved to profile
6. User reviews and confirms

**AI Resume Parser:**

```typescript
// app/lib/resume-parser.ts

export interface ParsedResume {
  name: string;
  email: string;
  phone: string;
  location: string;
  headline: string;
  summary: string;
  workExperience: Array<{
    company: string;
    title: string;
    location: string;
    startDate: string;
    endDate: string;
    description: string;
    achievements: string[];
  }>;
  education: Array<{
    school: string;
    degree: string;
    fieldOfStudy: string;
    startYear: number;
    endYear: number;
  }>;
  skills: string[];
  certifications: Array<{
    name: string;
    authority: string;
    date: string;
  }>;
  languages: string[];
}

export async function parseResumeWithAI(
  env: any,
  resumeText: string
): Promise<ParsedResume> {
  const prompt = `You are an expert resume parser. Extract structured data from this resume.

RESUME TEXT:
${resumeText}

Extract and return ONLY valid JSON in this exact format:
{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "123-456-7890",
  "location": "City, State",
  "headline": "Professional Title/Headline",
  "summary": "Professional summary or objective",
  "workExperience": [
    {
      "company": "Company Name",
      "title": "Job Title",
      "location": "City, State",
      "startDate": "2020-01",
      "endDate": "2023-06",
      "description": "Brief job description",
      "achievements": ["Achievement 1", "Achievement 2"]
    }
  ],
  "education": [
    {
      "school": "University Name",
      "degree": "Bachelor of Science",
      "fieldOfStudy": "Computer Science",
      "startYear": 2016,
      "endYear": 2020
    }
  ],
  "skills": ["Skill 1", "Skill 2", "Skill 3"],
  "certifications": [
    {
      "name": "Certification Name",
      "authority": "Issuing Organization",
      "date": "2021-06"
    }
  ],
  "languages": ["English", "Spanish"]
}

IMPORTANT:
- Extract ALL work experience entries
- Parse dates to YYYY-MM format
- Separate achievements as individual array items
- If a field is missing, use empty string or empty array
- Return ONLY the JSON, no explanations`;

  try {
    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt,
      max_tokens: 2000,
      temperature: 0.3 // Lower temperature for more consistent parsing
    });

    const parsed = parseResumeJSON(response.response);
    return parsed;
  } catch (error) {
    console.error('Resume parsing error:', error);
    throw new Error('Failed to parse resume');
  }
}

function parseResumeJSON(text: string): ParsedResume {
  try {
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) ||
                      text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);

    // Validate required fields
    if (!parsed.name || !parsed.workExperience) {
      throw new Error('Missing required fields in parsed resume');
    }

    return parsed;
  } catch (error) {
    throw new Error(`Failed to parse resume JSON: ${error.message}`);
  }
}
```

**Resume Upload Route:**

```typescript
// app/routes/api/profile/upload-resume.ts

import { requireAuth } from '~/lib/auth';
import { parseResumeWithAI } from '~/lib/resume-parser';

export async function POST(request: Request, { env }) {
  const user = await requireAuth(request, env);

  const formData = await request.formData();
  const file = formData.get('resume') as File;

  if (!file) {
    return Response.json({ error: 'No file uploaded' }, { status: 400 });
  }

  // Read file content
  const arrayBuffer = await file.arrayBuffer();
  const text = new TextDecoder().decode(arrayBuffer);

  // Parse with AI
  const parsedData = await parseResumeWithAI(env, text);

  // Return parsed data for user review (don't auto-save yet)
  return Response.json({
    success: true,
    data: parsedData,
    message: 'Resume parsed successfully. Review and confirm to import.'
  });
}
```

---

### Feature 3: Enhanced Database Schema

**Add new tables for rich profile data:**

```sql
-- migrations/0004_enhanced_profile_schema.sql

-- Work experience table (more detailed)
CREATE TABLE IF NOT EXISTS work_experience (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  company TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_date TEXT NOT NULL, -- YYYY-MM-DD
  end_date TEXT, -- NULL = current job
  achievements TEXT, -- JSON array
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Education table
CREATE TABLE IF NOT EXISTS education (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  school TEXT NOT NULL,
  degree TEXT,
  field_of_study TEXT,
  start_year INTEGER,
  end_year INTEGER, -- NULL = current
  gpa REAL,
  description TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Certifications table
CREATE TABLE IF NOT EXISTS certifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  authority TEXT NOT NULL, -- Issuing organization
  issue_date TEXT,
  expiry_date TEXT,
  credential_id TEXT,
  credential_url TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Languages table
CREATE TABLE IF NOT EXISTS languages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  proficiency TEXT, -- Native, Fluent, Conversational, Basic
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  start_date TEXT,
  end_date TEXT,
  technologies TEXT, -- JSON array
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_work_experience_user ON work_experience(user_id);
CREATE INDEX idx_education_user ON education(user_id);
CREATE INDEX idx_certifications_user ON certifications(user_id);
CREATE INDEX idx_languages_user ON languages(user_id);
CREATE INDEX idx_projects_user ON projects(user_id);
```

---

### Feature 4: Improved AI Matching with Rich Data

**Updated Job Match Analysis:**

```typescript
// app/lib/job-matching-v2.ts

export async function analyzeJobMatchV2(
  env: any,
  userId: number,
  job: any
): Promise<JobMatch> {
  // Fetch complete user profile
  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();

  const workExperience = await env.DB.prepare(
    'SELECT * FROM work_experience WHERE user_id = ? ORDER BY start_date DESC'
  ).bind(userId).all();

  const education = await env.DB.prepare(
    'SELECT * FROM education WHERE user_id = ? ORDER BY end_year DESC'
  ).bind(userId).all();

  const certifications = await env.DB.prepare(
    'SELECT * FROM certifications WHERE user_id = ?'
  ).bind(userId).all();

  const languages = await env.DB.prepare(
    'SELECT * FROM languages WHERE user_id = ?'
  ).bind(userId).all();

  const projects = await env.DB.prepare(
    'SELECT * FROM projects WHERE user_id = ? ORDER BY end_date DESC LIMIT 5'
  ).bind(userId).all();

  // Build comprehensive prompt
  const prompt = `You are an expert job matching analyst. Analyze this candidate's compatibility with the job posting.

CANDIDATE PROFILE:

Basic Info:
- Name: ${user.full_name}
- Location: ${user.location}
- Headline: ${user.headline || 'Not specified'}
- Summary: ${user.bio || 'No summary provided'}

Work Experience (${workExperience.results.length} positions):
${workExperience.results.map((w, i) => `
${i + 1}. ${w.title} at ${w.company} (${w.start_date} to ${w.end_date || 'Present'})
   Location: ${w.location}
   Description: ${w.description}
   Achievements: ${w.achievements || 'None listed'}
`).join('\n')}

Education (${education.results.length} degrees):
${education.results.map((e, i) => `
${i + 1}. ${e.degree} in ${e.field_of_study}
   School: ${e.school}
   Years: ${e.start_year} - ${e.end_year || 'Present'}
`).join('\n')}

Certifications (${certifications.results.length}):
${certifications.results.map(c => `- ${c.name} by ${c.authority}`).join('\n') || 'None'}

Languages (${languages.results.length}):
${languages.results.map(l => `- ${l.name} (${l.proficiency})`).join('\n') || 'None'}

Projects (${projects.results.length}):
${projects.results.map((p, i) => `
${i + 1}. ${p.title}
   Description: ${p.description}
   Technologies: ${p.technologies}
`).join('\n')}

Skills: ${JSON.parse(user.skills || '[]').join(', ')}

JOB POSTING:

- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location}
- Remote: ${job.remote ? 'Yes' : 'No'}
- Salary Range: ${job.salary_min || 'Not specified'} - ${job.salary_max || 'Not specified'}
- Requirements: ${JSON.parse(job.requirements || '[]').join(', ')}
- Description: ${job.description}

ANALYSIS INSTRUCTIONS:

Provide a detailed compatibility analysis considering:

1. **Technical Skills Match** (30% weight)
   - How many required skills does candidate have?
   - Any advanced/bonus skills?
   - Missing critical skills?

2. **Experience Level** (25% weight)
   - Years of relevant experience
   - Seniority level match
   - Industry experience

3. **Education & Certifications** (15% weight)
   - Degree requirements met?
   - Relevant certifications?
   - Continuous learning demonstrated?

4. **Location & Remote** (10% weight)
   - Location compatibility
   - Remote preference alignment

5. **Career Trajectory** (10% weight)
   - Job aligns with career path?
   - Growth opportunity?

6. **Cultural Fit Indicators** (10% weight)
   - Project work shows similar values?
   - Company size/stage match?

Return ONLY valid JSON:
{
  "score": 85,
  "strengths": [
    "5+ years React experience matches senior requirement",
    "AWS Certified Solutions Architect shows cloud expertise",
    "Led similar team of 4 engineers in previous role",
    "Remote work experience aligns with remote position"
  ],
  "concerns": [
    "Limited Python experience (listed as preferred skill)",
    "No direct fintech industry experience"
  ],
  "recommendation": "strong",
  "skillsMatch": {
    "matched": ["React", "TypeScript", "AWS", "GraphQL"],
    "missing": ["Python", "Kubernetes"]
  },
  "experienceYears": 6,
  "educationMatch": true,
  "locationMatch": true
}

Recommendation levels: "strong" (80-100%), "good" (60-79%), "fair" (40-59%), "weak" (0-39%)`;

  const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    prompt,
    max_tokens: 1000,
    temperature: 0.7
  });

  const result = parseMatchJSON(response.response);

  return {
    jobId: job.id,
    ...result
  };
}
```

---

### Feature 5: Skills Gap Analysis

```typescript
// app/lib/skills-gap-analysis.ts

export interface SkillsGap {
  missingSkills: string[];
  recommendedLearning: Array<{
    skill: string;
    priority: 'high' | 'medium' | 'low';
    reason: string;
    resources: string[];
  }>;
  estimatedTimeToReady: string; // "2-3 months", "1-2 weeks", etc.
}

export async function analyzeSkillsGap(
  env: any,
  userId: number,
  targetJobTitle: string
): Promise<SkillsGap> {
  // Get user's current skills
  const user = await env.DB.prepare('SELECT skills FROM users WHERE id = ?').bind(userId).first();
  const userSkills = JSON.parse(user.skills || '[]');

  // Get common skills from similar jobs
  const similarJobs = await env.DB.prepare(`
    SELECT requirements FROM jobs
    WHERE title LIKE ?
    ORDER BY created_at DESC
    LIMIT 20
  `).bind(`%${targetJobTitle}%`).all();

  const allRequiredSkills = similarJobs.results.flatMap(j =>
    JSON.parse(j.requirements || '[]')
  );

  // Count frequency
  const skillFrequency = {};
  allRequiredSkills.forEach(skill => {
    skillFrequency[skill] = (skillFrequency[skill] || 0) + 1;
  });

  // Find missing skills (required in >50% of jobs)
  const missingSkills = Object.entries(skillFrequency)
    .filter(([skill, count]) => count >= 10 && !userSkills.includes(skill))
    .map(([skill]) => skill);

  // Generate learning recommendations with AI
  const prompt = `You are a career development advisor. Analyze this skills gap and provide learning recommendations.

Current Skills: ${userSkills.join(', ')}
Target Role: ${targetJobTitle}
Missing Skills: ${missingSkills.join(', ')}

For each missing skill, provide:
1. Priority (high/medium/low) based on job market demand
2. Reason why this skill is important
3. Estimated time to learn (beginner to job-ready)
4. 2-3 recommended free learning resources (URLs)

Return ONLY valid JSON:
{
  "recommendations": [
    {
      "skill": "Python",
      "priority": "high",
      "reason": "Required in 90% of data science roles",
      "estimatedTime": "3-4 months",
      "resources": [
        "https://www.python.org/about/gettingstarted/",
        "https://www.coursera.org/learn/python",
        "https://realpython.com/"
      ]
    }
  ],
  "overallTimeEstimate": "4-6 months to become competitive"
}`;

  const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    prompt,
    max_tokens: 1500,
    temperature: 0.7
  });

  const result = parseSkillsGapJSON(response.response);

  return {
    missingSkills,
    recommendedLearning: result.recommendations,
    estimatedTimeToReady: result.overallTimeEstimate
  };
}
```

---

## UI Updates

### Profile Page - Import Buttons

```typescript
// app/routes/profile.tsx

export default function ProfilePage() {
  const [importing, setImporting] = useState(false);

  const handleLinkedInImport = () => {
    window.location.href = '/auth/linkedin/initiate';
  };

  const handleIndeedImport = () => {
    // Open modal for resume upload
    setImporting(true);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Profile</h1>

        <div className="flex gap-2">
          <Button onClick={handleLinkedInImport} variant="outline">
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="#0077B5">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            Import from LinkedIn
          </Button>

          <Button onClick={handleIndeedImport} variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            Import from Indeed
          </Button>
        </div>
      </div>

      {/* Profile sections... */}
    </div>
  );
}
```

---

## Testing Checklist

- [ ] **LinkedIn OAuth Flow:**
  - Click "Import from LinkedIn"
  - Authorize on LinkedIn
  - Verify redirect back to app
  - Check profile data imported correctly
  - Verify work experience saved
  - Check education imported
  - Confirm skills updated
  - Verify certifications added

- [ ] **Indeed Resume Upload:**
  - Upload Indeed resume PDF
  - Verify AI parsing completes
  - Check extracted data accuracy
  - Review and confirm import
  - Verify data saved to database

- [ ] **Enhanced AI Matching:**
  - Create job application after import
  - Click "Analyze Match"
  - Verify match score improved
  - Check strengths reference new data
  - Verify skills gap analysis

- [ ] **Resume Generation:**
  - Generate resume for job
  - Verify uses imported work experience
  - Check certifications included
  - Confirm education listed
  - Verify achievements highlighted

---

## Environment Variables

Add to `wrangler.toml`:

```toml
[vars]
LINKEDIN_CLIENT_ID = "your-linkedin-client-id"
# Keep existing vars...
```

Add secret:

```bash
wrangler secret put LINKEDIN_CLIENT_SECRET
```

---

## Cost Analysis

**Phase 4 Costs:**

| Service | Usage | Cost |
|---------|-------|------|
| LinkedIn API | Profile imports (OAuth free) | **FREE** |
| Cloudflare Workers AI | Resume parsing | **FREE** (within 10k/day limit) |
| KV Storage | OAuth state storage | **FREE** |

**Total Phase 4 Cost: $0/month** ✨

---

## Success Criteria

Phase 4 is complete when:

- ✅ LinkedIn import working via OAuth
- ✅ Indeed resume upload and parsing accurate
- ✅ Enhanced database schema with all tables
- ✅ AI matching uses rich profile data
- ✅ Match scores improved (80%+ accuracy)
- ✅ Skills gap analysis working
- ✅ Resume generation uses complete work history
- ✅ No errors in production logs
- ✅ Costs remain $0/month

---

**Ready to build Phase 4?**

Use the `/ralph-loop` command to start!
