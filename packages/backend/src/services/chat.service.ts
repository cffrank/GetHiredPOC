import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import type { Env } from './db.service';
import type {
  ChatMessage,
  ChatConversation,
  ChatConversationWithMessages,
  ToolCall,
  ToolResult
} from '@gethiredpoc/shared';
import {
  getJobs,
  saveJob,
  unsaveJob,
  getJobById,
  getSavedJobs,
  createApplication,
  getApplications,
  updateApplication
} from './db.service';
import { generateTailoredResume } from './ai-resume.service';
import { generateCoverLetter } from './ai-cover-letter.service';
import { analyzeJobMatch } from './job-matching.service';

// AI Provider types
type AIProvider = 'openai' | 'anthropic';

// OpenAI API message types
interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  tool_calls?: OpenAIToolCall[];
}

interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

interface OpenAIToolMessage {
  role: 'tool';
  tool_call_id: string;
  content: string;
}

// OpenAI Chat Completions API response format
interface OpenAIResponse {
  choices: Array<{
    message: {
      role: string;
      content: string | null;
      tool_calls?: OpenAIToolCall[];
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Tool definitions in OpenAI function calling format
const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'search_jobs',
      description: 'Search for job openings by title, location, or remote status. Returns a list of matching jobs.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Job title or keywords to search for'
          },
          location: {
            type: 'string',
            description: 'Location to search in (e.g., "San Francisco", "Remote")'
          },
          remote: {
            type: 'boolean',
            description: 'Filter for remote jobs only'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'save_job',
      description: 'Bookmark/save a job posting for later review. Requires the job_id from search results.',
      parameters: {
        type: 'object',
        properties: {
          job_id: {
            type: 'string',
            description: 'The unique identifier of the job to save'
          }
        },
        required: ['job_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_user_profile',
      description: 'Fetch the current user\'s profile information including name, location, bio, and skills.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_user_profile',
      description: 'Update the user\'s profile information. Can update name, bio, location, or skills.',
      parameters: {
        type: 'object',
        properties: {
          full_name: {
            type: 'string',
            description: 'User\'s full name'
          },
          bio: {
            type: 'string',
            description: 'Professional bio or summary'
          },
          location: {
            type: 'string',
            description: 'User\'s location (city, state, or country)'
          },
          skills: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of professional skills'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_job_preferences',
      description: 'Fetch the user\'s job search preferences including desired roles, locations, salary range.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_job_preferences',
      description: 'Update the user\'s job search preferences and criteria.',
      parameters: {
        type: 'object',
        properties: {
          desired_roles: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of desired job titles or roles'
          },
          desired_locations: {
            type: 'array',
            items: { type: 'string' },
            description: 'Preferred work locations'
          },
          min_salary: {
            type: 'number',
            description: 'Minimum acceptable salary'
          },
          remote_preference: {
            type: 'string',
            enum: ['remote_only', 'hybrid', 'on_site', 'no_preference'],
            description: 'Remote work preference'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_application',
      description: 'Apply to a job posting. Creates an application record for tracking.',
      parameters: {
        type: 'object',
        properties: {
          job_id: {
            type: 'string',
            description: 'Job to apply to'
          },
          status: {
            type: 'string',
            enum: ['saved', 'applied', 'interviewing', 'offered', 'rejected'],
            description: 'Application status (default: saved)'
          }
        },
        required: ['job_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'parse_job_posting',
      description: 'Extract structured data from pasted job posting text. Returns job title, company, requirements, etc.',
      parameters: {
        type: 'object',
        properties: {
          job_text: {
            type: 'string',
            description: 'The full text of the job posting to parse'
          }
        },
        required: ['job_text']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'generate_resume',
      description: 'Generate a tailored resume optimized for a specific job posting. Uses AI to highlight relevant skills and experience.',
      parameters: {
        type: 'object',
        properties: {
          job_id: {
            type: 'string',
            description: 'The job ID to tailor the resume for'
          }
        },
        required: ['job_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'generate_cover_letter',
      description: 'Generate a personalized cover letter for a specific job posting.',
      parameters: {
        type: 'object',
        properties: {
          job_id: {
            type: 'string',
            description: 'The job ID to write the cover letter for'
          }
        },
        required: ['job_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'analyze_job_match',
      description: 'Analyze how well the user\'s profile matches a job posting. Returns match score, strengths, and gaps/areas to improve.',
      parameters: {
        type: 'object',
        properties: {
          job_id: {
            type: 'string',
            description: 'The job ID to analyze match for'
          }
        },
        required: ['job_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_saved_jobs',
      description: 'Get all jobs the user has bookmarked/saved for later review.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'unsave_job',
      description: 'Remove a job from the user\'s saved/bookmarked jobs.',
      parameters: {
        type: 'object',
        properties: {
          job_id: {
            type: 'string',
            description: 'The job ID to unsave'
          }
        },
        required: ['job_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_applications',
      description: 'Get all job applications the user has submitted or is tracking.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['saved', 'applied', 'interviewing', 'offered', 'rejected'],
            description: 'Filter by application status (optional)'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_application_status',
      description: 'Update the status of a job application (e.g., mark as applied, interviewing, offered, rejected).',
      parameters: {
        type: 'object',
        properties: {
          application_id: {
            type: 'string',
            description: 'The application ID to update'
          },
          status: {
            type: 'string',
            enum: ['saved', 'applied', 'interviewing', 'offered', 'rejected'],
            description: 'The new status'
          },
          notes: {
            type: 'string',
            description: 'Optional notes about the application'
          }
        },
        required: ['application_id', 'status']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_job_details',
      description: 'Get full details about a specific job posting including description, requirements, salary, etc.',
      parameters: {
        type: 'object',
        properties: {
          job_id: {
            type: 'string',
            description: 'The job ID to get details for'
          }
        },
        required: ['job_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_work_experience',
      description: 'Get the user\'s work experience history.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_work_experience',
      description: 'Add a new work experience entry to the user\'s profile.',
      parameters: {
        type: 'object',
        properties: {
          company: {
            type: 'string',
            description: 'Company name'
          },
          title: {
            type: 'string',
            description: 'Job title'
          },
          location: {
            type: 'string',
            description: 'Work location'
          },
          start_date: {
            type: 'string',
            description: 'Start date (YYYY-MM-DD format)'
          },
          end_date: {
            type: 'string',
            description: 'End date (YYYY-MM-DD format, or null if current job)'
          },
          description: {
            type: 'string',
            description: 'Description of responsibilities and achievements'
          }
        },
        required: ['company', 'title', 'start_date']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_work_experience',
      description: 'Update an existing work experience entry.',
      parameters: {
        type: 'object',
        properties: {
          experience_id: {
            type: 'string',
            description: 'The work experience ID to update'
          },
          company: {
            type: 'string',
            description: 'Company name'
          },
          title: {
            type: 'string',
            description: 'Job title'
          },
          location: {
            type: 'string',
            description: 'Work location'
          },
          start_date: {
            type: 'string',
            description: 'Start date (YYYY-MM-DD format)'
          },
          end_date: {
            type: 'string',
            description: 'End date (YYYY-MM-DD format, or null if current job)'
          },
          description: {
            type: 'string',
            description: 'Description of responsibilities and achievements'
          }
        },
        required: ['experience_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'delete_work_experience',
      description: 'Delete a work experience entry from the user\'s profile.',
      parameters: {
        type: 'object',
        properties: {
          experience_id: {
            type: 'string',
            description: 'The work experience ID to delete'
          }
        },
        required: ['experience_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_education',
      description: 'Get the user\'s education history.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_education',
      description: 'Add a new education entry to the user\'s profile.',
      parameters: {
        type: 'object',
        properties: {
          school: {
            type: 'string',
            description: 'School/University name'
          },
          degree: {
            type: 'string',
            description: 'Degree type (e.g., Bachelor\'s, Master\'s, PhD)'
          },
          field_of_study: {
            type: 'string',
            description: 'Field of study/major'
          },
          start_date: {
            type: 'string',
            description: 'Start date (YYYY-MM-DD format)'
          },
          end_date: {
            type: 'string',
            description: 'End/graduation date (YYYY-MM-DD format)'
          },
          gpa: {
            type: 'number',
            description: 'GPA (optional)'
          }
        },
        required: ['school', 'degree', 'field_of_study']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_education',
      description: 'Update an existing education entry.',
      parameters: {
        type: 'object',
        properties: {
          education_id: {
            type: 'string',
            description: 'The education ID to update'
          },
          school: {
            type: 'string',
            description: 'School/University name'
          },
          degree: {
            type: 'string',
            description: 'Degree type'
          },
          field_of_study: {
            type: 'string',
            description: 'Field of study/major'
          },
          start_date: {
            type: 'string',
            description: 'Start date (YYYY-MM-DD format)'
          },
          end_date: {
            type: 'string',
            description: 'End/graduation date (YYYY-MM-DD format)'
          },
          gpa: {
            type: 'number',
            description: 'GPA (optional)'
          }
        },
        required: ['education_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'delete_education',
      description: 'Delete an education entry from the user\'s profile.',
      parameters: {
        type: 'object',
        properties: {
          education_id: {
            type: 'string',
            description: 'The education ID to delete'
          }
        },
        required: ['education_id']
      }
    }
  }
];

// Enhanced system prompt for chat-first experience
const SYSTEM_PROMPT = `You are GetHired AI, an intelligent job search assistant. You are the primary interface for users to interact with the GetHired platform. You can help with ALL job search activities:

**Job Search & Discovery:**
- Search for jobs by title, location, or keywords
- Get detailed information about specific jobs
- Save/bookmark jobs for later review
- Remove saved jobs

**Profile & Experience Management:**
- View and update user profile (name, bio, location, skills)
- Manage work experience (add, update, delete entries)
- Manage education history (add, update, delete entries)
- Set and update job search preferences

**Application Management:**
- Create job applications
- Track application status (saved, applied, interviewing, offered, rejected)
- View all applications and their current status
- Add notes to applications

**AI-Powered Features:**
- Generate tailored resumes optimized for specific jobs
- Write personalized cover letters
- Analyze job match scores with strengths and gaps
- Parse job posting text to extract key information

**Guidelines:**
- Be conversational, helpful, and proactive in offering assistance
- When showing job results, always include the job ID so users can reference it
- When a user asks about their qualifications for a job, use analyze_job_match to provide detailed insights
- Suggest next steps after completing actions (e.g., after saving a job, offer to generate a resume or cover letter)
- If a user's profile is incomplete, gently suggest they add work experience or skills to get better job matches
- Present information clearly with key details highlighted

When you receive tool results, summarize them clearly for the user. If showing multiple items (like jobs or applications), format them as a numbered list for easy reference.`;

// Execute a tool call
async function executeTool(
  env: Env,
  userId: string,
  toolName: string,
  toolInput: any
): Promise<string> {
  try {
    switch (toolName) {
      case 'search_jobs': {
        const jobs = await getJobs(env, {
          title: toolInput.query,
          location: toolInput.location,
          remote: toolInput.remote,
          userId
        });

        // Return top 10 results with key info
        const results = jobs.slice(0, 10).map(job => ({
          id: job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          remote: job.remote,
          salary: job.salary_min && job.salary_max
            ? `$${job.salary_min.toLocaleString()} - $${job.salary_max.toLocaleString()}`
            : 'Not specified',
          posted_date: job.posted_date
        }));

        return JSON.stringify({
          count: jobs.length,
          results
        });
      }

      case 'save_job': {
        await saveJob(env, userId, toolInput.job_id);
        const job = await getJobById(env, toolInput.job_id);
        return JSON.stringify({
          success: true,
          message: `Saved job: ${job?.title} at ${job?.company}`
        });
      }

      case 'get_user_profile': {
        const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?')
          .bind(userId)
          .first();

        if (!user) {
          return JSON.stringify({ error: 'User not found' });
        }

        return JSON.stringify({
          full_name: user.full_name,
          email: user.email,
          bio: user.bio,
          location: user.location,
          skills: user.skills ? JSON.parse(user.skills as string) : [],
          linkedin_url: user.linkedin_url,
          address: user.address
        });
      }

      case 'update_user_profile': {
        const fields: string[] = [];
        const params: any[] = [];

        if (toolInput.full_name) {
          fields.push('full_name = ?');
          params.push(toolInput.full_name);
        }
        if (toolInput.bio) {
          fields.push('bio = ?');
          params.push(toolInput.bio);
        }
        if (toolInput.location) {
          fields.push('location = ?');
          params.push(toolInput.location);
        }
        if (toolInput.skills) {
          fields.push('skills = ?');
          params.push(JSON.stringify(toolInput.skills));
        }

        if (fields.length === 0) {
          return JSON.stringify({ error: 'No fields to update' });
        }

        fields.push('updated_at = unixepoch()');
        params.push(userId);

        await env.DB.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`)
          .bind(...params)
          .run();

        return JSON.stringify({ success: true, message: 'Profile updated successfully' });
      }

      case 'get_job_preferences': {
        const prefs = await env.DB.prepare('SELECT * FROM job_search_preferences WHERE user_id = ?')
          .bind(userId)
          .first();

        if (!prefs) {
          return JSON.stringify({ message: 'No preferences set yet' });
        }

        return JSON.stringify({
          desired_roles: prefs.desired_roles ? JSON.parse(prefs.desired_roles as string) : [],
          desired_locations: prefs.desired_locations ? JSON.parse(prefs.desired_locations as string) : [],
          min_salary: prefs.min_salary,
          max_salary: prefs.max_salary,
          remote_preference: prefs.remote_preference,
          employment_status: prefs.employment_status
        });
      }

      case 'update_job_preferences': {
        const existing = await env.DB.prepare('SELECT id FROM job_search_preferences WHERE user_id = ?')
          .bind(userId)
          .first();

        if (!existing) {
          // Create new preferences
          const fields = ['user_id'];
          const placeholders = ['?'];
          const params = [userId];

          if (toolInput.desired_roles) {
            fields.push('desired_roles');
            placeholders.push('?');
            params.push(JSON.stringify(toolInput.desired_roles));
          }
          if (toolInput.desired_locations) {
            fields.push('desired_locations');
            placeholders.push('?');
            params.push(JSON.stringify(toolInput.desired_locations));
          }
          if (toolInput.min_salary) {
            fields.push('min_salary');
            placeholders.push('?');
            params.push(toolInput.min_salary);
          }
          if (toolInput.remote_preference) {
            fields.push('remote_preference');
            placeholders.push('?');
            params.push(toolInput.remote_preference);
          }

          await env.DB.prepare(
            `INSERT INTO job_search_preferences (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`
          ).bind(...params).run();
        } else {
          // Update existing preferences
          const fields: string[] = [];
          const params: any[] = [];

          if (toolInput.desired_roles) {
            fields.push('desired_roles = ?');
            params.push(JSON.stringify(toolInput.desired_roles));
          }
          if (toolInput.desired_locations) {
            fields.push('desired_locations = ?');
            params.push(JSON.stringify(toolInput.desired_locations));
          }
          if (toolInput.min_salary !== undefined) {
            fields.push('min_salary = ?');
            params.push(toolInput.min_salary);
          }
          if (toolInput.remote_preference) {
            fields.push('remote_preference = ?');
            params.push(toolInput.remote_preference);
          }

          if (fields.length > 0) {
            fields.push('updated_at = unixepoch()');
            params.push(userId);

            await env.DB.prepare(
              `UPDATE job_search_preferences SET ${fields.join(', ')} WHERE user_id = ?`
            ).bind(...params).run();
          }
        }

        return JSON.stringify({ success: true, message: 'Preferences updated successfully' });
      }

      case 'create_application': {
        const application = await createApplication(
          env,
          userId,
          toolInput.job_id,
          toolInput.status || 'saved'
        );

        const job = await getJobById(env, toolInput.job_id);

        return JSON.stringify({
          success: true,
          message: `Application created for ${job?.title} at ${job?.company}`,
          application_id: application.id
        });
      }

      case 'parse_job_posting': {
        // Use AI to parse job posting text
        const prompt = `Extract structured data from this job posting. Return ONLY valid JSON with this structure:
{
  "title": "job title",
  "company": "company name",
  "location": "location",
  "remote": true/false,
  "description": "brief description",
  "requirements": ["requirement 1", "requirement 2"],
  "salary_min": number or null,
  "salary_max": number or null
}

Job posting:
${toolInput.job_text}`;

        const aiResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
          prompt,
          temperature: 0.3,
          max_tokens: 800
        });

        return aiResponse.response || JSON.stringify({ error: 'Failed to parse job posting' });
      }

      case 'generate_resume': {
        const job = await getJobById(env, toolInput.job_id);
        if (!job) {
          return JSON.stringify({ error: 'Job not found' });
        }

        const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?')
          .bind(userId)
          .first();

        if (!user) {
          return JSON.stringify({ error: 'User not found' });
        }

        const resume = await generateTailoredResume(env, user, job);

        return JSON.stringify({
          success: true,
          message: `Generated tailored resume for ${job.title} at ${job.company}`,
          resume: {
            summary: resume.summary,
            experience: resume.experience,
            skills: resume.skills,
            education: resume.education
          }
        });
      }

      case 'generate_cover_letter': {
        const job = await getJobById(env, toolInput.job_id);
        if (!job) {
          return JSON.stringify({ error: 'Job not found' });
        }

        const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?')
          .bind(userId)
          .first();

        if (!user) {
          return JSON.stringify({ error: 'User not found' });
        }

        const coverLetter = await generateCoverLetter(env, user, job);

        return JSON.stringify({
          success: true,
          message: `Generated cover letter for ${job.title} at ${job.company}`,
          cover_letter: coverLetter
        });
      }

      case 'analyze_job_match': {
        const job = await getJobById(env, toolInput.job_id);
        if (!job) {
          return JSON.stringify({ error: 'Job not found' });
        }

        const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?')
          .bind(userId)
          .first();

        if (!user) {
          return JSON.stringify({ error: 'User not found' });
        }

        const match = await analyzeJobMatch(env, user, job);

        return JSON.stringify({
          success: true,
          job_title: job.title,
          company: job.company,
          match_score: match.score,
          recommendation: match.recommendation,
          strengths: match.strengths,
          gaps: match.gaps,
          tip: match.tip
        });
      }

      case 'get_saved_jobs': {
        const savedJobs = await getSavedJobs(env, userId);

        const results = savedJobs.map(job => ({
          id: job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          remote: job.remote,
          salary: job.salary_min && job.salary_max
            ? `$${job.salary_min.toLocaleString()} - $${job.salary_max.toLocaleString()}`
            : 'Not specified',
          posted_date: job.posted_date
        }));

        return JSON.stringify({
          count: savedJobs.length,
          saved_jobs: results
        });
      }

      case 'unsave_job': {
        const job = await getJobById(env, toolInput.job_id);
        await unsaveJob(env, userId, toolInput.job_id);

        return JSON.stringify({
          success: true,
          message: `Removed ${job?.title} at ${job?.company} from saved jobs`
        });
      }

      case 'get_applications': {
        const applications = await getApplications(env, userId);

        // Filter by status if provided
        let filtered = applications;
        if (toolInput.status) {
          filtered = applications.filter(app => app.status === toolInput.status);
        }

        const results = filtered.map(app => ({
          id: app.id,
          job_id: app.job_id,
          job_title: app.job?.title,
          company: app.job?.company,
          status: app.status,
          notes: app.notes,
          ai_match_score: app.ai_match_score,
          applied_date: app.applied_date,
          created_at: app.created_at
        }));

        return JSON.stringify({
          count: results.length,
          applications: results
        });
      }

      case 'update_application_status': {
        await updateApplication(env, toolInput.application_id, {
          status: toolInput.status,
          notes: toolInput.notes
        });

        return JSON.stringify({
          success: true,
          message: `Application status updated to "${toolInput.status}"`
        });
      }

      case 'get_job_details': {
        const job = await getJobById(env, toolInput.job_id);
        if (!job) {
          return JSON.stringify({ error: 'Job not found' });
        }

        return JSON.stringify({
          id: job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          remote: job.remote,
          description: job.description,
          requirements: job.requirements,
          salary_min: job.salary_min,
          salary_max: job.salary_max,
          salary: job.salary_min && job.salary_max
            ? `$${job.salary_min.toLocaleString()} - $${job.salary_max.toLocaleString()}`
            : 'Not specified',
          posted_date: job.posted_date,
          url: job.url,
          source: job.source
        });
      }

      case 'get_work_experience': {
        const experience = await env.DB.prepare(`
          SELECT id, company, title, location, start_date, end_date, description
          FROM work_experience
          WHERE user_id = ?
          ORDER BY start_date DESC
        `).bind(userId).all();

        return JSON.stringify({
          count: experience.results?.length || 0,
          work_experience: experience.results || []
        });
      }

      case 'add_work_experience': {
        const result = await env.DB.prepare(`
          INSERT INTO work_experience (user_id, company, title, location, start_date, end_date, description)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          RETURNING *
        `).bind(
          userId,
          toolInput.company,
          toolInput.title,
          toolInput.location || null,
          toolInput.start_date,
          toolInput.end_date || null,
          toolInput.description || null
        ).first();

        return JSON.stringify({
          success: true,
          message: `Added work experience: ${toolInput.title} at ${toolInput.company}`,
          experience_id: result?.id
        });
      }

      case 'update_work_experience': {
        const fields: string[] = [];
        const params: any[] = [];

        if (toolInput.company) {
          fields.push('company = ?');
          params.push(toolInput.company);
        }
        if (toolInput.title) {
          fields.push('title = ?');
          params.push(toolInput.title);
        }
        if (toolInput.location !== undefined) {
          fields.push('location = ?');
          params.push(toolInput.location);
        }
        if (toolInput.start_date) {
          fields.push('start_date = ?');
          params.push(toolInput.start_date);
        }
        if (toolInput.end_date !== undefined) {
          fields.push('end_date = ?');
          params.push(toolInput.end_date);
        }
        if (toolInput.description !== undefined) {
          fields.push('description = ?');
          params.push(toolInput.description);
        }

        if (fields.length === 0) {
          return JSON.stringify({ error: 'No fields to update' });
        }

        fields.push('updated_at = unixepoch()');
        params.push(toolInput.experience_id, userId);

        await env.DB.prepare(
          `UPDATE work_experience SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`
        ).bind(...params).run();

        return JSON.stringify({
          success: true,
          message: 'Work experience updated successfully'
        });
      }

      case 'delete_work_experience': {
        await env.DB.prepare(
          'DELETE FROM work_experience WHERE id = ? AND user_id = ?'
        ).bind(toolInput.experience_id, userId).run();

        return JSON.stringify({
          success: true,
          message: 'Work experience deleted successfully'
        });
      }

      case 'get_education': {
        const education = await env.DB.prepare(`
          SELECT id, school, degree, field_of_study, start_date, end_date, gpa
          FROM education
          WHERE user_id = ?
          ORDER BY start_date DESC
        `).bind(userId).all();

        return JSON.stringify({
          count: education.results?.length || 0,
          education: education.results || []
        });
      }

      case 'add_education': {
        const result = await env.DB.prepare(`
          INSERT INTO education (user_id, school, degree, field_of_study, start_date, end_date, gpa)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          RETURNING *
        `).bind(
          userId,
          toolInput.school,
          toolInput.degree,
          toolInput.field_of_study,
          toolInput.start_date || null,
          toolInput.end_date || null,
          toolInput.gpa || null
        ).first();

        return JSON.stringify({
          success: true,
          message: `Added education: ${toolInput.degree} in ${toolInput.field_of_study} from ${toolInput.school}`,
          education_id: result?.id
        });
      }

      case 'update_education': {
        const fields: string[] = [];
        const params: any[] = [];

        if (toolInput.school) {
          fields.push('school = ?');
          params.push(toolInput.school);
        }
        if (toolInput.degree) {
          fields.push('degree = ?');
          params.push(toolInput.degree);
        }
        if (toolInput.field_of_study) {
          fields.push('field_of_study = ?');
          params.push(toolInput.field_of_study);
        }
        if (toolInput.start_date !== undefined) {
          fields.push('start_date = ?');
          params.push(toolInput.start_date);
        }
        if (toolInput.end_date !== undefined) {
          fields.push('end_date = ?');
          params.push(toolInput.end_date);
        }
        if (toolInput.gpa !== undefined) {
          fields.push('gpa = ?');
          params.push(toolInput.gpa);
        }

        if (fields.length === 0) {
          return JSON.stringify({ error: 'No fields to update' });
        }

        fields.push('updated_at = unixepoch()');
        params.push(toolInput.education_id, userId);

        await env.DB.prepare(
          `UPDATE education SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`
        ).bind(...params).run();

        return JSON.stringify({
          success: true,
          message: 'Education updated successfully'
        });
      }

      case 'delete_education': {
        await env.DB.prepare(
          'DELETE FROM education WHERE id = ? AND user_id = ?'
        ).bind(toolInput.education_id, userId).run();

        return JSON.stringify({
          success: true,
          message: 'Education deleted successfully'
        });
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  } catch (error: any) {
    console.error(`Error executing tool ${toolName}:`, error);
    return JSON.stringify({ error: error.message || 'Tool execution failed' });
  }
}

// Convert OpenAI tool definitions to Anthropic format
function convertToAnthropicTools(openaiTools: typeof TOOL_DEFINITIONS): Anthropic.Tool[] {
  return openaiTools.map(tool => ({
    name: tool.function.name,
    description: tool.function.description,
    input_schema: tool.function.parameters as Anthropic.Tool.InputSchema
  }));
}

// OpenAI-specific chat completion
async function chatWithOpenAI(
  env: Env,
  messages: OpenAIMessage[],
  userId: string
): Promise<{ content: string; toolCalls: ToolCall[] }> {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const gatewayId = 'jobmatch-ai-gateway-dev';
  const modelName = 'openai/gpt-4o-mini';

  const openai = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    baseURL: `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayId}/compat`,
    defaultHeaders: {
      'cf-aig-authorization': `Bearer ${env.AI_GATEWAY_TOKEN}`,
    },
  });

  let toolCalls: ToolCall[] = [];
  let finalContent = '';
  let iterations = 0;
  const MAX_ITERATIONS = 5;

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    console.log(`[Chat-OpenAI] Iteration ${iterations}`);

    const response = await openai.chat.completions.create({
      model: modelName,
      messages: messages as any,
      tools: TOOL_DEFINITIONS as any,
      max_tokens: 2048,
      temperature: 0.7,
    });

    const aiMessage = response.choices[0].message;
    const aiContent = aiMessage.content || '';
    const aiToolCalls = aiMessage.tool_calls || [];

    if (aiToolCalls && aiToolCalls.length > 0) {
      console.log(`[Chat-OpenAI] Detected ${aiToolCalls.length} tool calls`);

      messages.push({
        role: 'assistant',
        content: aiContent,
        tool_calls: aiToolCalls
      });

      for (const toolCall of aiToolCalls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);

        console.log(`[Chat-OpenAI] Executing tool: ${toolName}`);

        const result = await executeTool(env, userId, toolName, toolArgs);

        toolCalls.push({
          id: toolCall.id,
          type: 'function',
          function: {
            name: toolName,
            arguments: toolCall.function.arguments
          }
        });

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: result
        } as any);
      }

      continue;
    }

    finalContent = aiContent.trim();
    break;
  }

  return { content: finalContent, toolCalls };
}

// Anthropic (Claude)-specific chat completion
async function chatWithAnthropic(
  env: Env,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  userId: string
): Promise<{ content: string; toolCalls: ToolCall[] }> {
  const anthropic = new Anthropic({
    apiKey: env.ANTHROPIC_API_KEY,
  });

  let toolCalls: ToolCall[] = [];
  let finalContent = '';
  let iterations = 0;
  const MAX_ITERATIONS = 5;

  // Convert to Anthropic message format
  const messages: Anthropic.MessageParam[] = conversationHistory.map(msg => ({
    role: msg.role,
    content: msg.content
  }));

  const anthropicTools = convertToAnthropicTools(TOOL_DEFINITIONS);

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    console.log(`[Chat-Anthropic] Iteration ${iterations}`);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools: anthropicTools,
      messages: messages,
    });

    console.log(`[Chat-Anthropic] Stop reason: ${response.stop_reason}`);

    // Process response content
    let textContent = '';
    const toolUseBlocks: Array<{ id: string; name: string; input: any }> = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        textContent += block.text;
      } else if (block.type === 'tool_use') {
        toolUseBlocks.push({
          id: block.id,
          name: block.name,
          input: block.input
        });
      }
    }

    // If there are tool calls, execute them
    if (toolUseBlocks.length > 0) {
      console.log(`[Chat-Anthropic] Detected ${toolUseBlocks.length} tool calls`);

      // Add assistant message with tool use
      messages.push({
        role: 'assistant',
        content: response.content
      });

      // Execute tools and build tool results
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolUse of toolUseBlocks) {
        console.log(`[Chat-Anthropic] Executing tool: ${toolUse.name}`);

        const result = await executeTool(env, userId, toolUse.name, toolUse.input);

        toolCalls.push({
          id: toolUse.id,
          type: 'function',
          function: {
            name: toolUse.name,
            arguments: JSON.stringify(toolUse.input)
          }
        });

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: result
        });
      }

      // Add tool results as user message
      messages.push({
        role: 'user',
        content: toolResults
      });

      continue;
    }

    // No tool calls, we have the final response
    finalContent = textContent.trim();
    break;
  }

  return { content: finalContent, toolCalls };
}

// Send a chat message and get AI response
export async function sendChatMessage(
  env: Env,
  userId: string,
  conversationId: string | undefined,
  userMessage: string
): Promise<{
  conversationId: string;
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
}> {
  // Create or get conversation
  let convId = conversationId;
  if (!convId) {
    const result = await env.DB.prepare(
      'INSERT INTO chat_conversations (user_id, title) VALUES (?, ?) RETURNING id'
    )
      .bind(userId, 'New Conversation')
      .first<{ id: string }>();

    convId = result!.id;
  }

  // Save user message
  const userMsgResult = await env.DB.prepare(
    'INSERT INTO chat_messages (conversation_id, role, content) VALUES (?, ?, ?) RETURNING *'
  )
    .bind(convId, 'user', userMessage)
    .first<ChatMessage>();

  if (!userMsgResult) {
    throw new Error('Failed to save user message');
  }

  // Get conversation history (last 20 messages for better context)
  const history = await env.DB.prepare(
    'SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 20'
  )
    .bind(convId)
    .all<ChatMessage>();

  // Determine which AI provider to use
  const provider: AIProvider = (env.AI_PROVIDER as AIProvider) || 'openai';
  console.log(`[Chat] Using AI provider: ${provider}`);

  // Validate environment variables based on provider
  if (provider === 'anthropic') {
    if (!env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not configured. Please run: npx wrangler secret put ANTHROPIC_API_KEY');
    }
  } else {
    // OpenAI provider
    if (!env.CLOUDFLARE_ACCOUNT_ID) {
      throw new Error('CLOUDFLARE_ACCOUNT_ID not configured');
    }
    if (!env.AI_GATEWAY_TOKEN) {
      throw new Error('AI_GATEWAY_TOKEN not configured. Please run: npx wrangler secret put AI_GATEWAY_TOKEN');
    }
    if (!env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured. Please run: npx wrangler secret put OPENAI_API_KEY');
    }
  }

  // Build conversation history
  const reversedHistory = (history.results || []).reverse();
  const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  for (const msg of reversedHistory) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      conversationHistory.push({
        role: msg.role,
        content: msg.content
      });
    }
  }

  let toolCalls: ToolCall[] = [];
  let finalContent = '';

  try {
    if (provider === 'anthropic') {
      const result = await chatWithAnthropic(env, conversationHistory, userId);
      finalContent = result.content;
      toolCalls = result.toolCalls;
    } else {
      // OpenAI (default)
      const messages: OpenAIMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...conversationHistory.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }))
      ];
      const result = await chatWithOpenAI(env, messages, userId);
      finalContent = result.content;
      toolCalls = result.toolCalls;
    }
  } catch (error: any) {
    console.error(`[Chat] ${provider} API error:`, error);
    finalContent = 'I apologize, but I encountered an error processing your request. Please try again.';
  }

  if (!finalContent) {
    finalContent = 'I apologize, but I had trouble completing your request. Please try rephrasing or breaking it into smaller steps.';
  }

  // Save assistant message
  const assistantMsgResult = await env.DB.prepare(
    'INSERT INTO chat_messages (conversation_id, role, content, tool_calls, tool_results) VALUES (?, ?, ?, ?, ?) RETURNING *'
  )
    .bind(
      convId,
      'assistant',
      finalContent,
      toolCalls.length > 0 ? JSON.stringify(toolCalls) : null,
      null // Tool results are temporary, we don't need to store them
    )
    .first<ChatMessage>();

  if (!assistantMsgResult) {
    throw new Error('Failed to save assistant message');
  }

  // Update conversation updated_at
  await env.DB.prepare('UPDATE chat_conversations SET updated_at = unixepoch() WHERE id = ?')
    .bind(convId)
    .run();

  // Parse tool_calls from JSON if needed
  const finalAssistantMsg = {
    ...assistantMsgResult,
    tool_calls: assistantMsgResult.tool_calls
      ? JSON.parse(assistantMsgResult.tool_calls as any)
      : undefined
  };

  return {
    conversationId: convId,
    userMessage: userMsgResult,
    assistantMessage: finalAssistantMsg
  };
}

// Get all conversations for a user
export async function getConversations(
  env: Env,
  userId: string
): Promise<ChatConversation[]> {
  const result = await env.DB.prepare(
    'SELECT * FROM chat_conversations WHERE user_id = ? ORDER BY updated_at DESC'
  )
    .bind(userId)
    .all<ChatConversation>();

  return result.results || [];
}

// Get a conversation with its messages
export async function getConversationWithMessages(
  env: Env,
  conversationId: string,
  userId: string
): Promise<ChatConversationWithMessages | null> {
  const conversation = await env.DB.prepare(
    'SELECT * FROM chat_conversations WHERE id = ? AND user_id = ?'
  )
    .bind(conversationId, userId)
    .first<ChatConversation>();

  if (!conversation) {
    return null;
  }

  const messages = await env.DB.prepare(
    'SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY created_at ASC'
  )
    .bind(conversationId)
    .all<ChatMessage>();

  // Parse tool_calls from JSON strings
  const parsedMessages = (messages.results || []).map(msg => ({
    ...msg,
    tool_calls: msg.tool_calls ? JSON.parse(msg.tool_calls as any) : undefined,
    tool_results: msg.tool_results ? JSON.parse(msg.tool_results as any) : undefined
  }));

  return {
    ...conversation,
    messages: parsedMessages
  };
}

// Create a new conversation
export async function createConversation(
  env: Env,
  userId: string,
  title?: string
): Promise<ChatConversation> {
  const result = await env.DB.prepare(
    'INSERT INTO chat_conversations (user_id, title) VALUES (?, ?) RETURNING *'
  )
    .bind(userId, title || 'New Conversation')
    .first<ChatConversation>();

  if (!result) {
    throw new Error('Failed to create conversation');
  }

  return result;
}

// Delete a conversation
export async function deleteConversation(
  env: Env,
  conversationId: string,
  userId: string
): Promise<void> {
  await env.DB.prepare(
    'DELETE FROM chat_conversations WHERE id = ? AND user_id = ?'
  )
    .bind(conversationId, userId)
    .run();
}
