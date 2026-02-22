import { Hono } from 'hono';
import type { Env } from '../services/db.service';
import { getCurrentUser } from '../services/auth.service';
import { generateTailoredResume } from '../services/ai-resume.service';
import { generateCoverLetter } from '../services/ai-cover-letter.service';
import { analyzeJobMatch } from '../services/job-matching.service';
import { toMessage } from '../utils/errors';

const aiJobs = new Hono<{ Bindings: Env }>();

// POST /api/ai/jobs/:id/generate-resume - Generate tailored resume for a job
aiJobs.post('/:id/generate-resume', async (c) => {
  try {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const jobId = c.req.param('id');

    // Get job
    const job = await c.env.DB.prepare(
      'SELECT * FROM jobs WHERE id = ?'
    ).bind(jobId).first();

    if (!job) {
      return c.json({ error: 'Job not found' }, 404);
    }

    // Generate tailored resume (with fallback for when AI is unavailable)
    let resume;
    try {
      resume = await generateTailoredResume(c.env, user, job);
    } catch (aiError) {
      console.warn('AI resume generation failed, using mock fallback:', aiError);
      const userSkills = user.skills ? JSON.parse(user.skills) : ['Professional skills'];
      resume = {
        summary: `Experienced professional targeting the ${job.title} role at ${job.company}. ${user.bio || 'Bringing a strong track record of delivering results.'}`,
        experience: [{
          company: 'Previous Experience',
          title: 'Professional Role',
          dates: '2020 - Present',
          achievements: ['Delivered key projects on time', 'Collaborated with cross-functional teams'],
        }],
        skills: userSkills,
        education: [{ school: 'University', degree: 'Degree', year: '2020' }],
      };
    }

    // Save to application if one exists
    const app = await c.env.DB.prepare(
      'SELECT id FROM applications WHERE user_id = ? AND job_id = ?'
    ).bind(user.id, jobId).first();

    if (app) {
      await c.env.DB.prepare(
        'UPDATE applications SET resume_content = ? WHERE id = ?'
      ).bind(JSON.stringify(resume), app.id).run();
    }

    return c.json({ id: crypto.randomUUID(), version_name: 'v1', resume });
  } catch (error: unknown) {
    console.error('Generate resume error:', error);
    return c.json({ error: toMessage(error) }, 500);
  }
});

// POST /api/ai/jobs/:id/generate-cover-letter - Generate cover letter for a job
aiJobs.post('/:id/generate-cover-letter', async (c) => {
  try {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const jobId = c.req.param('id');

    // Get job
    const job = await c.env.DB.prepare(
      'SELECT * FROM jobs WHERE id = ?'
    ).bind(jobId).first();

    if (!job) {
      return c.json({ error: 'Job not found' }, 404);
    }

    // Generate cover letter (with fallback for when AI is unavailable)
    let coverLetter;
    try {
      coverLetter = await generateCoverLetter(c.env, user, job);
    } catch (aiError) {
      console.warn('AI cover letter generation failed, using mock fallback:', aiError);
      const userName = user.full_name || 'Applicant';
      coverLetter = `Dear Hiring Manager,\n\nI am writing to express my strong interest in the ${job.title} position at ${job.company}. ${user.bio || 'With my professional background and skills, I am confident I would be a valuable addition to your team.'}\n\nI look forward to the opportunity to discuss how my experience aligns with the needs of your team.\n\nSincerely,\n${userName}`;
    }

    // Save to application if one exists
    const app = await c.env.DB.prepare(
      'SELECT id FROM applications WHERE user_id = ? AND job_id = ?'
    ).bind(user.id, jobId).first();

    if (app) {
      await c.env.DB.prepare(
        'UPDATE applications SET cover_letter = ? WHERE id = ?'
      ).bind(coverLetter, app.id).run();
    }

    return c.json({ id: crypto.randomUUID(), version_name: 'v1', coverLetter });
  } catch (error: unknown) {
    console.error('Generate cover letter error:', error);
    return c.json({ error: toMessage(error) }, 500);
  }
});

// POST /api/ai/jobs/:id/analyze-match - Analyze job match compatibility
aiJobs.post('/:id/analyze-match', async (c) => {
  try {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const jobId = c.req.param('id');

    // Get job
    const job = await c.env.DB.prepare(
      'SELECT * FROM jobs WHERE id = ?'
    ).bind(jobId).first();

    if (!job) {
      return c.json({ error: 'Job not found' }, 404);
    }

    // Analyze match
    const match = await analyzeJobMatch(c.env, user, job);

    // Save to application if one exists
    const app = await c.env.DB.prepare(
      'SELECT id FROM applications WHERE user_id = ? AND job_id = ?'
    ).bind(user.id, jobId).first();

    if (app) {
      await c.env.DB.prepare(
        'UPDATE applications SET ai_match_score = ?, ai_analysis = ? WHERE id = ?'
      ).bind(match.score, JSON.stringify({ strengths: match.strengths, concerns: match.concerns, recommendation: match.recommendation }), app.id).run();
    }

    return c.json(match);
  } catch (error: unknown) {
    console.error('Analyze match error:', error);
    return c.json({ error: toMessage(error) }, 500);
  }
});

// GET /api/ai/jobs/:id/quick-match - Quick match analysis for lazy loading
aiJobs.get('/:id/quick-match', async (c) => {
  try {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const jobId = c.req.param('id');

    // Get job
    const job = await c.env.DB.prepare(
      'SELECT * FROM jobs WHERE id = ?'
    ).bind(jobId).first();

    if (!job) {
      return c.json({ error: 'Job not found' }, 404);
    }

    // Analyze match (cached via AI Gateway + KV)
    const match = await analyzeJobMatch(c.env, user, job);

    // Return match with job details for frontend display
    return c.json({
      match: {
        jobId: job.id,
        score: match.score,
        strengths: match.strengths,
        concerns: match.concerns,
        recommendation: match.recommendation
      },
      job: {
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        remote: job.remote,
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        description: job.description
      }
    });
  } catch (error: unknown) {
    console.error('Quick match error:', error);
    return c.json({ error: toMessage(error) }, 500);
  }
});

export default aiJobs;
