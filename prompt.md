
  ---
  POC Prompt: JobMatch AI - 100% Local Development with RW SDK

  1. Run type checking (npm run build or tsc --noEmit)
  2. Test in local dev browser
  3. Fix any errors immediately
  4. Verify feature works correctly
  5. Move to next feature

  Use /ralph-loop to enter autonomous development mode. Build everything locally using Miniflare with mock AI responses. Continue until POC is complete and demonstrates RW SDK viability.


  POC Objective

  Build a 100% local minimal JobMatch AI using RW SDK to evaluate:
  - RW SDK developer experience
  - Built-in auth with bcrypt + sessions
  - Miniflare local development (D1, R2, KV)
  - Mock AI responses (swap for real Llama later)
  - Performance and iteration speed

  Timeline: 1-2 days
  Cost: $0 (everything local)
  No Cloudflare account needed yet

  Tech Stack (All Local)

  Framework:
  - RW SDK (RedwoodSDK) - Server-first React
  - TypeScript
  - React Server Components + Client Components
  - Vite

  Local Development (Miniflare):
  - D1 → Local SQLite file
  - R2 → Local filesystem
  - KV → Local storage
  - No external APIs

  Auth:
  - bcryptjs for password hashing
  - KV-based session storage
  - HttpOnly cookies

  UI:
  - Tailwind CSS
  - shadcn/ui (new-york style)
  - Lucide icons

  POC Features

  1. Authentication ✅

  - Signup with email/password
  - Login with email/password
  - Logout
  - Session persistence (KV + cookies)
  - Protected routes (redirect to /login if not authenticated)
  - Simple auth state in header

  2. User Profile ✅

  - Create/edit profile form
    - Full name
    - Bio (textarea)
    - Location
    - Skills (comma-separated input, stored as JSON array)
  - Profile photo upload to R2
  - View own profile page

  3. Job Discovery ✅

  - List view of mock jobs (15+ jobs seeded in migration)
  - Filter by:
    - Title (search box)
    - Remote only (checkbox)
    - Location (dropdown)
  - Job card showing:
    - Title, company, location
    - Remote badge
    - Salary range
    - "Save" button
    - "View Details" link
  - Job detail page with full description

  4. Saved Jobs ✅

  - Save/unsave jobs
  - View saved jobs page
  - Show saved count in navigation

  5. Application Tracking ✅

  - Create application from job detail page
  - Application list grouped by status:
    - Saved
    - Applied
    - Interview
    - Offer
    - Rejected
  - Update application status (dropdown)
  - Add notes to application (textarea)
  - Delete application
  - Show application count in navigation

  6. Mock AI Feature ✅

  - Job Match Analysis button on job detail page
  - Mock AI generates:
    - Match score (70-95, randomized)
    - 3-5 strength bullets
    - 1-2 concern bullets
    - Recommendation text
  - Cache results in KV (7 days)
  - Display loading state during "analysis"
  - Show results in card on job detail page

  7. UI/UX ✅

  - Responsive layout (mobile + desktop)
  - Navigation header:
    - Logo/app name
    - Links: Jobs, My Applications, Saved Jobs, Profile
    - User email + Logout button (when authenticated)
  - Loading states (spinners)
  - Error boundaries
  - Toast notifications for actions (saved job, created application, etc.)
  - Empty states (no jobs saved, no applications, etc.)

  Out of Scope (Add Later)

  ❌ Real AI (Llama) - using mocks for now
  ❌ OAuth (LinkedIn) - just email/password
  ❌ Job scraping - using seed data
  ❌ Resume upload/parsing
  ❌ Cover letter generation
  ❌ Document export
  ❌ Email notifications
  ❌ Password reset
  ❌ Account lockout
  ❌ Advanced rate limiting
  ❌ Vector embeddings
  ❌ CI/CD
  ❌ Production deployment
  ❌ Comprehensive tests (just TypeScript validation)

  Project Structure

  jobmatch-poc/
  ├── app/
  │   ├── routes/
  │   │   ├── _index.tsx                 # Landing → redirect to /jobs if auth, else /login
  │   │   ├── login.tsx                  # Login page
  │   │   ├── signup.tsx                 # Signup page
  │   │   ├── jobs/
  │   │   │   ├── index.tsx              # Job list with filters (SSR)
  │   │   │   ├── [id].tsx               # Job detail + AI analysis (SSR)
  │   │   │   └── saved.tsx              # Saved jobs list
  │   │   ├── applications/
  │   │   │   ├── index.tsx              # Application tracker
  │   │   │   └── [id].tsx               # Application detail
  │   │   ├── profile/
  │   │   │   ├── index.tsx              # View profile
  │   │   │   └── edit.tsx               # Edit profile
  │   │   └── api/
  │   │       ├── auth/
  │   │       │   ├── signup.ts          # POST /api/auth/signup
  │   │       │   ├── login.ts           # POST /api/auth/login
  │   │       │   ├── logout.ts          # POST /api/auth/logout
  │   │       │   └── me.ts              # GET /api/auth/me
  │   │       ├── profile.ts             # GET/PUT /api/profile
  │   │       ├── jobs.ts                # GET /api/jobs?filter=...
  │   │       ├── jobs/[id]/save.ts      # POST /api/jobs/:id/save
  │   │       ├── jobs/[id]/analyze.ts   # POST /api/jobs/:id/analyze (mock AI)
  │   │       └── applications.ts        # GET/POST/PUT/DELETE /api/applications
  │   ├── components/
  │   │   ├── ui/                        # shadcn components
  │   │   ├── Navigation.tsx             # Header nav
  │   │   ├── JobCard.tsx                # Job card component
  │   │   ├── ApplicationCard.tsx        # Application card
  │   │   ├── ProfileForm.tsx            # Profile edit form
  │   │   ├── JobFilters.tsx             # Filter sidebar/section
  │   │   └── AIAnalysisCard.tsx         # AI match results display
  │   ├── lib/
  │   │   ├── auth.ts                    # Auth helpers (signup, login, requireAuth)
  │   │   ├── db.ts                      # D1 query helpers
  │   │   ├── storage.ts                 # R2 upload helpers
  │   │   ├── ai-mock.ts                 # Mock AI responses
  │   │   └── utils.ts                   # General utilities
  │   └── styles/
  │       └── globals.css                # Tailwind imports
  ├── migrations/
  │   ├── 0001_initial_schema.sql
  │   └── 0002_seed_jobs.sql
  ├── public/
  │   └── placeholder-avatar.png
  ├── wrangler.toml
  ├── package.json
  ├── tsconfig.json
  └── README.md

  Database Schema

  -- migrations/0001_initial_schema.sql

  -- Users (auth + profile)
  CREATE TABLE users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    bio TEXT,
    location TEXT,
    skills TEXT, -- JSON: ["React", "TypeScript"]
    avatar_url TEXT,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
  );

  -- Sessions
  CREATE TABLE sessions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX idx_sessions_user_id ON sessions(user_id);
  CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

  -- Jobs
  CREATE TABLE jobs (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT,
    remote INTEGER DEFAULT 0,
    description TEXT,
    requirements TEXT, -- JSON: ["3+ years", "React"]
    salary_min INTEGER,
    salary_max INTEGER,
    posted_date INTEGER DEFAULT (unixepoch()),
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE INDEX idx_jobs_remote ON jobs(remote);
  CREATE INDEX idx_jobs_title ON jobs(title);

  -- Applications
  CREATE TABLE applications (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    job_id TEXT NOT NULL,
    status TEXT DEFAULT 'saved', -- saved|applied|interview|offer|rejected
    notes TEXT,
    ai_match_score INTEGER, -- 0-100
    ai_analysis TEXT, -- JSON: cached AI response
    applied_date INTEGER,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
  );

  CREATE INDEX idx_applications_user_id ON applications(user_id);
  CREATE INDEX idx_applications_status ON applications(status);

  -- Saved jobs
  CREATE TABLE saved_jobs (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    job_id TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    UNIQUE(user_id, job_id)
  );

  CREATE INDEX idx_saved_jobs_user_id ON saved_jobs(user_id);

  Mock Jobs Seed Data

  -- migrations/0002_seed_jobs.sql

  INSERT INTO jobs (id, title, company, location, remote, description, requirements, salary_min, salary_max) VALUES
  ('job-1', 'Senior Frontend Engineer', 'TechCorp', 'San Francisco, CA', 1,
    'Build amazing user interfaces with React and TypeScript. Work with a talented team on cutting-edge products. We offer competitive salary, equity, and full benefits.',
    '["5+ years experience", "React", "TypeScript", "Tailwind CSS", "Leadership skills"]',
    140000, 180000),

  ('job-2', 'Full Stack Developer', 'StartupXYZ', 'Remote', 1,
    'Join our fast-growing startup. Build features end-to-end from database to UI. We move fast and ship daily.',
    '["3+ years experience", "Node.js", "React", "PostgreSQL", "API design"]',
    120000, 160000),

  ('job-3', 'Backend Engineer', 'DataCo', 'New York, NY', 0,
    'Build scalable APIs and data pipelines. Work with large-scale distributed systems processing millions of events per day.',
    '["Python", "Go", "Kubernetes", "AWS", "Microservices"]',
    130000, 170000),

  ('job-4', 'DevOps Engineer', 'CloudSoft', 'Austin, TX', 1,
    'Manage infrastructure and CI/CD pipelines. Cloudflare Workers and Terraform experience highly valued.',
    '["Docker", "Kubernetes", "Terraform", "CI/CD", "Monitoring"]',
    125000, 165000),

  ('job-5', 'Product Designer', 'DesignHub', 'Los Angeles, CA', 1,
    'Design beautiful, user-centered products. Collaborate closely with engineers and product managers to ship delightful experiences.',
    '["Figma", "UI/UX", "User Research", "Prototyping", "Design systems"]',
    110000, 150000),

  ('job-6', 'Mobile Engineer (React Native)', 'AppWorks', 'Remote', 1,
    'Build cross-platform mobile apps used by millions. Experience with iOS and Android deployment required.',
    '["React Native", "TypeScript", "Mobile UI", "App Store deployment"]',
    115000, 155000),

  ('job-7', 'Data Engineer', 'Analytics Inc', 'Seattle, WA', 0,
    'Build data pipelines and warehouses. Experience with Snowflake, dbt, and Airflow preferred.',
    '["SQL", "Python", "dbt", "Airflow", "Data modeling"]',
    135000, 175000),

  ('job-8', 'Security Engineer', 'SecureTech', 'Boston, MA', 1,
    'Implement security best practices across our infrastructure. Conduct security audits and vulnerability assessments.',
    '["Security", "Penetration testing", "OWASP", "Cloud security"]',
    140000, 185000),

  ('job-9', 'Machine Learning Engineer', 'AI Labs', 'Remote', 1,
    'Train and deploy ML models at scale. Experience with PyTorch and production ML pipelines required.',
    '["Python", "PyTorch", "ML Ops", "Model deployment", "Statistics"]',
    145000, 190000),

  ('job-10', 'Frontend Engineer', 'E-commerce Co', 'Chicago, IL', 0,
    'Build lightning-fast e-commerce experiences. Performance optimization and A/B testing experience valued.',
    '["React", "Next.js", "Performance optimization", "E-commerce"]',
    110000, 145000),

  ('job-11', 'Platform Engineer', 'InfraCo', 'Denver, CO', 1,
    'Build internal developer platforms and tools. Make engineering teams more productive.',
    '["Kubernetes", "Go", "Platform engineering", "Developer tools"]',
    130000, 170000),

  ('job-12', 'QA Engineer', 'QualityFirst', 'Portland, OR', 1,
    'Build automated test suites. Work closely with developers to ensure quality releases.',
    '["Playwright", "Test automation", "CI/CD", "Quality processes"]',
    95000, 130000),

  ('job-13', 'Solutions Architect', 'EnterpriseTech', 'Atlanta, GA', 0,
    'Design technical solutions for enterprise clients. Strong communication and system design skills required.',
    '["System design", "AWS", "Enterprise architecture", "Client facing"]',
    150000, 195000),

  ('job-14', 'API Developer', 'APIFirst', 'Remote', 1,
    'Design and build RESTful and GraphQL APIs. Focus on developer experience and documentation.',
    '["Node.js", "GraphQL", "API design", "Documentation", "OpenAPI"]',
    115000, 150000),

  ('job-15', 'Engineering Manager', 'GrowthCo', 'San Diego, CA', 1,
    'Lead a team of 5-8 engineers. Balance technical excellence with team development and delivery.',
    '["Leadership", "Team management", "Technical background", "Agile"]',
    160000, 210000);

  Mock AI Service

  // app/lib/ai-mock.ts

  export interface AIAnalysis {
    score: number;
    strengths: string[];
    concerns: string[];
    recommendation: string;
  }

  export async function mockJobAnalysis(
    userSkills: string[],
    jobRequirements: string[]
  ): Promise<AIAnalysis> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Generate realistic mock score based on skill overlap
    const overlap = userSkills.filter(skill =>
      jobRequirements.some(req =>
        req.toLowerCase().includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(req.toLowerCase())
      )
    );

    const baseScore = 70;
    const overlapBonus = Math.min(25, overlap.length * 5);
    const randomBonus = Math.floor(Math.random() * 10);
    const score = Math.min(95, baseScore + overlapBonus + randomBonus);

    // Generate strengths
    const strengths = [
      "Strong technical skills align well with job requirements",
      "Experience level appears appropriate for this role",
      "Your background shows relevant domain expertise"
    ];

    if (overlap.length > 0) {
      strengths.push(`Direct experience with ${overlap.slice(0, 2).join(' and ')}`);
    }

    // Generate concerns
    const concerns = [];
    if (score < 80) {
      concerns.push("Some required skills may need development");
    }
    if (jobRequirements.length - overlap.length > 3) {
      concerns.push("Several job requirements not explicitly listed in your profile");
    }

    // Recommendation
    let recommendation = "Strong match";
    if (score >= 85) {
      recommendation = "Excellent match - highly recommend applying";
    } else if (score >= 75) {
      recommendation = "Good match - recommend applying";
    } else {
      recommendation = "Reasonable match - consider highlighting relevant experience";
    }

    return {
      score,
      strengths: strengths.slice(0, 4),
      concerns: concerns.length > 0 ? concerns : ["No major concerns identified"],
      recommendation
    };
  }

  Key Implementation Points

  Auth Flow

  // app/lib/auth.ts
  import bcrypt from 'bcryptjs';

  export async function signup(env: any, email: string, password: string) {
    const hash = await bcrypt.hash(password, 10);

    const result = await env.DB.prepare(
      'INSERT INTO users (email, password_hash) VALUES (?, ?) RETURNING id, email'
    ).bind(email, hash).first();

    return createSession(env, result.id);
  }

  export async function login(env: any, email: string, password: string) {
    const user = await env.DB.prepare(
      'SELECT id, password_hash FROM users WHERE email = ?'
    ).bind(email).first();

    if (!user || !await bcrypt.compare(password, user.password_hash)) {
      throw new Error('Invalid credentials');
    }

    return createSession(env, user.id);
  }

  async function createSession(env: any, userId: string) {
    const sessionId = crypto.randomUUID();
    const expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days

    await env.DB.prepare(
      'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)'
    ).bind(sessionId, userId, expiresAt).run();

    await env.KV_SESSIONS.put(sessionId, userId, {
      expirationTtl: 7 * 24 * 60 * 60
    });

    return sessionId;
  }

  export async function requireAuth(request: Request, env: any) {
    const sessionId = getCookie(request, 'session');
    if (!sessionId) throw new Response('Unauthorized', { status: 401 });

    const userId = await env.KV_SESSIONS.get(sessionId);
    if (!userId) throw new Response('Session expired', { status: 401 });

    const user = await env.DB.prepare(
      'SELECT id, email, full_name, bio, location, skills, avatar_url FROM users WHERE id = ?'
    ).bind(userId).first();

    return user;
  }

  function getCookie(request: Request, name: string): string | null {
    const cookies = request.headers.get('Cookie');
    const match = cookies?.match(new RegExp(`${name}=([^;]+)`));
    return match?.[1] || null;
  }

  wrangler.toml (Local Only)

  name = "jobmatch-poc"
  main = "src/index.ts"
  compatibility_date = "2024-01-01"
  node_compat = true

  # All bindings work locally without IDs
  [[d1_databases]]
  binding = "DB"
  database_name = "jobmatch-poc"

  [[r2_buckets]]
  binding = "STORAGE"
  bucket_name = "jobmatch-poc-files"

  [[kv_namespaces]]
  binding = "KV_CACHE"

  [[kv_namespaces]]
  binding = "KV_SESSIONS"

  # No AI binding yet (using mocks)

  Success Criteria

  Functional Requirements:

  - User can sign up with email/password
  - User can log in and session persists across page refreshes
  - User can edit profile with avatar upload
  - User can browse 15 mock jobs
  - User can filter jobs by title, remote, location
  - User can save/unsave jobs
  - User can create applications from job details
  - User can view applications grouped by status
  - User can update application status and notes
  - Mock AI generates match scores for jobs
  - AI results are cached (second analysis instant)
  - UI is responsive on mobile and desktop
  - Loading states show during async operations

  Technical Validation:

  - All code typechecks (npm run build)
  - No console errors in browser
  - D1 queries work in Miniflare
  - R2 uploads work locally
  - KV caching works (verify in dev tools)
  - Sessions persist in KV
  - Passwords never stored in plaintext

  Development Commands



  # Install UI
  npx shadcn@latest init
  npx shadcn@latest add button card input label form avatar badge select textarea

  # Dev server
  npm run dev

  # Type check
  npm run build

  # Local D1 shell (inspect data)
  npx wrangler d1 execute jobmatch-poc --local --command="SELECT * FROM users"

  Deliverables

  1. Working local app at http://localhost:5173
  2. All features functional (auth, profile, jobs, applications, mock AI)
  3. Clean code (TypeScript, no console errors)
  4. README.md with setup instructions
  5. Evaluation notes:
    - RW SDK developer experience
    - Local development speed
    - Mock AI quality (good enough placeholder?)
    - Blockers or pain points



