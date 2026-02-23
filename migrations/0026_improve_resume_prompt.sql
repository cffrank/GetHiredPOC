-- Improve resume_tailor prompt: select top positions, richer achievements, bump max_tokens
UPDATE ai_prompts
SET prompt_template = 'You are an expert resume writer. Create a tailored resume for this job application.

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

Instructions:
1. Write a compelling 2-3 sentence professional summary positioning the candidate for this specific role.
2. Select the 3-4 most relevant positions from their work history. For each, write 3-4 achievement bullets that emphasize relevance to the target job. Use the candidate''s REAL companies and titles — never invent positions.
3. Pick the 6-8 most relevant skills from their profile that match the job requirements.
4. Include their real education entries.

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "summary": "Professional summary here...",
  "experience": [
    {
      "company": "Real Company Name",
      "title": "Real Job Title",
      "dates": "Jan 2020 - Present",
      "achievements": ["Achievement tailored to job", "Another achievement", "Third achievement"]
    }
  ],
  "skills": ["Skill 1", "Skill 2", "Skill 3"],
  "education": [
    {
      "school": "Real University Name",
      "degree": "Real Degree Title",
      "year": "2020"
    }
  ]
}',
    model_config = '{"model": "@cf/meta/llama-3.1-8b-instruct", "temperature": 0.7, "max_tokens": 2000, "gateway": "jobmatch-ai-gateway-dev"}'
WHERE prompt_key = 'resume_tailor';
