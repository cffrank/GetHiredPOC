-- Migration 0011: AI Prompts Configuration System
-- Purpose: Move AI prompts from hardcoded strings to database-stored templates
-- This enables dynamic prompt updates without redeployment

-- Create ai_prompts table for storing configurable AI prompt templates
CREATE TABLE IF NOT EXISTS ai_prompts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  prompt_key TEXT UNIQUE NOT NULL,           -- Unique identifier: 'cover_letter', 'job_match', etc.
  prompt_name TEXT NOT NULL,                 -- Human-readable name for admin UI
  prompt_template TEXT NOT NULL,             -- Template with {{variable}} placeholders
  description TEXT,                          -- Description of what this prompt does
  model_config TEXT,                         -- JSON: { temperature, max_tokens, model, gateway }
  version INTEGER DEFAULT 1,                 -- Version tracking for prompt iterations
  is_active INTEGER DEFAULT 1,               -- Soft delete flag (0 = deleted, 1 = active)
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Indexes for efficient prompt retrieval
CREATE INDEX idx_ai_prompts_key ON ai_prompts(prompt_key);
CREATE INDEX idx_ai_prompts_active ON ai_prompts(is_active);
CREATE INDEX idx_ai_prompts_updated ON ai_prompts(updated_at DESC);

-- Seed initial prompts from existing hardcoded implementations
-- These prompts are extracted from the 4 AI service files

-- 1. COVER LETTER GENERATION PROMPT
INSERT INTO ai_prompts (prompt_key, prompt_name, prompt_template, description, model_config) VALUES (
  'cover_letter',
  'Cover Letter Generator',
  'You are an expert cover letter writer. Write a compelling cover letter for this job application.

USER PROFILE:
- Name: {{user_name}}
- Location: {{user_location}}
- Bio: {{user_bio}}
- Skills: {{user_skills}}

JOB:
- Title: {{job_title}}
- Company: {{job_company}}
- Location: {{job_location}}
- Description: {{job_description}}

Write a professional cover letter (3-4 paragraphs, approximately 250-350 words) that:
1. Opens with enthusiasm for the specific role at {{job_company}}
2. Highlights 2-3 relevant skills/experiences that directly match the job requirements
3. Explains why this candidate is uniquely qualified for this role
4. Closes with a confident call to action

IMPORTANT REQUIREMENTS:
- Write in first person (I, my, me)
- Use a professional but warm and genuine tone
- Do NOT include placeholder text like [Your Name], [Date], [Company Address]
- Do NOT include a salutation like "Dear Hiring Manager" - start directly with the letter body
- Do NOT include a closing signature - end with the last paragraph
- Be specific about the role and company
- Make it feel personal and authentic, not generic
- Reference specific aspects of the job description

Return ONLY the cover letter text. No JSON, no code blocks, no formatting markers.',
  'Generates personalized cover letters tailored to specific job applications',
  '{"model": "@cf/meta/llama-3.1-8b-instruct", "temperature": 0.8, "max_tokens": 900, "gateway": "jobmatch-ai-gateway-dev"}'
);

-- 2. JOB MATCHING ANALYSIS PROMPT
INSERT INTO ai_prompts (prompt_key, prompt_name, prompt_template, description, model_config) VALUES (
  'job_match',
  'Job Match Analyzer',
  'You are a job matching expert. Analyze how well this candidate matches this job opening.

CANDIDATE PROFILE:
- Skills: {{user_skills}}
- Location: {{user_location}}
- Bio: {{user_bio}}

Recent Work Experience:
{{work_experience}}

Education:
{{education}}

JOB OPENING:
- Title: {{job_title}}
- Company: {{job_company}}
- Location: {{job_location}}
- Remote: {{job_remote}}
- Description: {{job_description}}

Analyze the match and provide:
1. Overall match score (0-100) - be realistic and honest
2. 3-5 key strengths (specific reasons why candidate is a good fit)
3. 1-3 concerns or gaps (areas where candidate may not fully meet requirements)
4. Recommendation level: "strong" (80-100%), "good" (60-79%), "fair" (40-59%), or "weak" (0-39%)

Consider:
- Skills alignment with job requirements
- Experience relevance to the role
- Location compatibility (remote vs on-site)
- Education requirements vs candidate''s education
- Career progression and growth potential

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "score": 75,
  "strengths": ["Specific strength 1", "Specific strength 2", "Specific strength 3"],
  "concerns": ["Specific concern 1", "Specific concern 2"],
  "recommendation": "good"
}',
  'Analyzes candidate-job fit and provides match score with strengths and concerns',
  '{"model": "@cf/meta/llama-3.1-8b-instruct", "temperature": 0.7, "max_tokens": 600, "gateway": "jobmatch-ai-gateway-dev"}'
);

-- 3. RESUME TAILORING PROMPT
INSERT INTO ai_prompts (prompt_key, prompt_name, prompt_template, description, model_config) VALUES (
  'resume_tailor',
  'Resume Tailoring Assistant',
  'You are an expert resume writer. Create a tailored resume for this job application.

USER PROFILE:
- Name: {{user_name}}
- Location: {{user_location}}
- Bio: {{user_bio}}
- Skills: {{user_skills}}

WORK EXPERIENCE:
{{work_experience}}

EDUCATION:
{{education}}

JOB POSTING:
- Title: {{job_title}}
- Company: {{job_company}}
- Location: {{job_location}}
- Description: {{job_description}}

Generate a tailored resume that:
1. Highlights relevant skills from the user''s profile that match job requirements
2. Rewrites work achievements to emphasize experience relevant to this role
3. Creates a compelling professional summary (2-3 sentences)
4. Prioritizes skills that match the job description

Respond ONLY with valid JSON in this exact format (no markdown, no code blocks):
{
  "summary": "Professional summary here...",
  "experience": [
    {
      "company": "Company Name",
      "title": "Job Title",
      "dates": "2020-2023",
      "achievements": ["Achievement 1 tailored to the job", "Achievement 2 tailored to the job", "Achievement 3 tailored to the job"]
    }
  ],
  "skills": ["Most Relevant Skill 1", "Most Relevant Skill 2", "Most Relevant Skill 3", "Skill 4", "Skill 5"],
  "education": [
    {
      "school": "University Name",
      "degree": "Degree Title",
      "year": "2020"
    }
  ]
}',
  'Generates job-specific tailored resumes highlighting relevant experience and skills',
  '{"model": "@cf/meta/llama-3.1-8b-instruct", "temperature": 0.7, "max_tokens": 1200, "gateway": "jobmatch-ai-gateway-dev"}'
);

-- 4. LINKEDIN PROFILE PARSER PROMPT
INSERT INTO ai_prompts (prompt_key, prompt_name, prompt_template, description, model_config) VALUES (
  'linkedin_parse',
  'LinkedIn Profile Parser',
  'Extract structured data from this LinkedIn profile text. Return a JSON object with this exact structure:
{
  "fullName": "string",
  "headline": "string",
  "location": "string",
  "summary": "string",
  "workExperience": [
    {
      "company": "string",
      "title": "string",
      "location": "string",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM or null if current",
      "description": "string"
    }
  ],
  "education": [
    {
      "school": "string",
      "degree": "string",
      "fieldOfStudy": "string",
      "startDate": "YYYY",
      "endDate": "YYYY or null if current"
    }
  ],
  "skills": ["skill1", "skill2", "skill3"]
}

Important:
- Extract ALL work experience entries
- Extract ALL education entries
- Extract ALL skills mentioned
- Use null for missing endDate if currently employed/studying
- Return ONLY valid JSON, no markdown or explanations

LinkedIn Profile Text:
{{profile_text}}',
  'Extracts structured data from pasted LinkedIn profile text',
  '{"model": "@cf/meta/llama-3.1-8b-instruct", "temperature": 0.3, "max_tokens": 2048, "gateway": "jobmatch-ai-gateway-dev"}'
);

-- Migration complete
-- Next steps:
-- 1. Apply this migration locally: npx wrangler d1 execute gethiredpoc-db --local --file=./migrations/0011_ai_prompts.sql
-- 2. Create ai-prompt.service.ts for prompt management
-- 3. Update AI services to use getPrompt() instead of hardcoded strings
