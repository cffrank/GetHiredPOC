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

    // Check if job is saved (application exists) - REQUIRED
    const app = await c.env.DB.prepare(
      'SELECT id FROM applications WHERE user_id = ? AND job_id = ?'
    ).bind(user.id, jobId).first();

    if (!app) {
      return c.json({ error: 'Job must be saved before generating resume' }, 400);
    }

    // Get job
    const job = await c.env.DB.prepare(
      'SELECT * FROM jobs WHERE id = ?'
    ).bind(jobId).first();

    if (!job) {
      return c.json({ error: 'Job not found' }, 404);
    }

    // Generate tailored resume
    const resume = await generateTailoredResume(c.env, user, job);

    // Count existing resume versions to auto-generate version name
    const existingCount = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM generated_resumes WHERE user_id = ? AND job_id = ?'
    ).bind(user.id, jobId).first<{ count: number }>();

    const versionNumber = (existingCount?.count || 0) + 1;
    const versionName = `Version ${versionNumber}`;

    // Store in generated_resumes table
    const resumeId = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO generated_resumes (id, user_id, job_id, application_id, version_name, resume_data, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())`
    ).bind(resumeId, user.id, jobId, app.id, versionName, JSON.stringify(resume)).run();

    return c.json({ resume, version_name: versionName, id: resumeId });
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

    // Check if job is saved (application exists) - REQUIRED
    const app = await c.env.DB.prepare(
      'SELECT id FROM applications WHERE user_id = ? AND job_id = ?'
    ).bind(user.id, jobId).first();

    if (!app) {
      return c.json({ error: 'Job must be saved before generating cover letter' }, 400);
    }

    // Get job
    const job = await c.env.DB.prepare(
      'SELECT * FROM jobs WHERE id = ?'
    ).bind(jobId).first();

    if (!job) {
      return c.json({ error: 'Job not found' }, 404);
    }

    // Generate cover letter
    const coverLetter = await generateCoverLetter(c.env, user, job);

    // Count existing cover letter versions to auto-generate version name
    const existingCount = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM generated_cover_letters WHERE user_id = ? AND job_id = ?'
    ).bind(user.id, jobId).first<{ count: number }>();

    const versionNumber = (existingCount?.count || 0) + 1;
    const versionName = `Version ${versionNumber}`;

    // Store in generated_cover_letters table
    const coverLetterId = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO generated_cover_letters (id, user_id, job_id, application_id, version_name, cover_letter_text, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())`
    ).bind(coverLetterId, user.id, jobId, app.id, versionName, coverLetter).run();

    return c.json({ coverLetter, version_name: versionName, id: coverLetterId });
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

    // Create or update application with analysis
    const existingApp = await c.env.DB.prepare(
      'SELECT id FROM applications WHERE user_id = ? AND job_id = ?'
    ).bind(user.id, jobId).first();

    if (existingApp) {
      // Update existing application
      await c.env.DB.prepare(
        'UPDATE applications SET ai_match_score = ?, ai_analysis = ?, updated_at = unixepoch() WHERE id = ?'
      ).bind(match.score, JSON.stringify({ strengths: match.strengths, gaps: match.gaps, recommendation: match.recommendation, tip: match.tip }), existingApp.id).run();
    } else {
      // Create new application with analysis (not saved yet, just has analysis)
      const appId = crypto.randomUUID();
      await c.env.DB.prepare(
        `INSERT INTO applications (id, user_id, job_id, status, ai_match_score, ai_analysis, created_at, updated_at)
         VALUES (?, ?, ?, 'analyzing', ?, ?, unixepoch(), unixepoch())`
      ).bind(appId, user.id, jobId, match.score, JSON.stringify({ strengths: match.strengths, gaps: match.gaps, recommendation: match.recommendation, tip: match.tip })).run();
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
