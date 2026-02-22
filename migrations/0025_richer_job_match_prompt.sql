-- Update the job_match prompt to produce richer, more detailed analysis
-- similar to LinkedIn's qualification matching (matched qualifications, areas to evaluate)
UPDATE ai_prompts
SET prompt_template = 'You are a job matching expert. Analyze how well this candidate matches this job opening.

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

Analyze the match thoroughly and provide:
1. Overall match score (0-100) - be realistic and honest
2. 3-5 key strengths - each should be a detailed sentence explaining WHY the candidate is a good fit, referencing specific experience, skills, or qualifications from their profile that match the job requirements
3. 1-3 concerns or gaps - each should be a specific, actionable sentence about what the candidate may be missing or should address
4. Recommendation level: "strong" (80-100%), "good" (60-79%), "fair" (40-59%), or "weak" (0-39%)
5. A brief 2-3 sentence summary explaining the overall match assessment

Consider:
- Skills alignment with specific job requirements
- Experience relevance to the role and seniority level
- Location compatibility (remote vs on-site)
- Education requirements vs candidate''s education
- Career progression and growth potential
- Industry and domain experience

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "score": 75,
  "strengths": ["Detailed strength with specific evidence from profile..."],
  "concerns": ["Specific gap or area to address..."],
  "recommendation": "good",
  "summary": "2-3 sentence overall assessment..."
}',
    model_config = '{"model": "@cf/meta/llama-3.1-8b-instruct", "temperature": 0.7, "max_tokens": 1024, "gateway": "jobmatch-ai-gateway-dev"}'
WHERE prompt_key = 'job_match';
