import { Hono } from 'hono';
import type { Env } from '../services/db.service';
import { getCurrentUser } from '../services/auth.service';
import { generateTailoredResume } from '../services/ai-resume.service';
import { generateCoverLetter } from '../services/ai-cover-letter.service';
import { analyzeJobMatch } from '../services/job-matching.service';

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

    // Generate tailored resume
    const resume = await generateTailoredResume(c.env, user, job);

    // Save to application if one exists
    const app = await c.env.DB.prepare(
      'SELECT id FROM applications WHERE user_id = ? AND job_id = ?'
    ).bind(user.id, jobId).first();

    if (app) {
      await c.env.DB.prepare(
        'UPDATE applications SET resume_content = ? WHERE id = ?'
      ).bind(JSON.stringify(resume), app.id).run();
    }

    return c.json(resume);
  } catch (error: any) {
    console.error('Generate resume error:', error);
    return c.json({ error: error.message }, 500);
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

    // Generate cover letter
    const coverLetter = await generateCoverLetter(c.env, user, job);

    // Save to application if one exists
    const app = await c.env.DB.prepare(
      'SELECT id FROM applications WHERE user_id = ? AND job_id = ?'
    ).bind(user.id, jobId).first();

    if (app) {
      await c.env.DB.prepare(
        'UPDATE applications SET cover_letter = ? WHERE id = ?'
      ).bind(coverLetter, app.id).run();
    }

    return c.json({ coverLetter });
  } catch (error: any) {
    console.error('Generate cover letter error:', error);
    return c.json({ error: error.message }, 500);
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
  } catch (error: any) {
    console.error('Analyze match error:', error);
    return c.json({ error: error.message }, 500);
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
  } catch (error: any) {
    console.error('Quick match error:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default aiJobs;
