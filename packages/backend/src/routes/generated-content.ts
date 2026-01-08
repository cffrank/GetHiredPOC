import { Hono } from 'hono';
import type { Env } from '../services/db.service';
import { getSession, getCookie } from '../services/auth.service';
import type { User, GeneratedResume, GeneratedCoverLetter } from '@gethiredpoc/shared';

type Variables = {
  env: Env;
  userId?: string;
};

const generatedContent = new Hono<{ Bindings: Env; Variables: Variables }>();

// Middleware to require auth
async function requireAuth(c: any): Promise<User> {
  const sessionId = getCookie(c.req.raw, "session");
  if (!sessionId) {
    throw new Error('Unauthorized');
  }

  const user = await getSession(c.env, sessionId);
  if (!user) {
    throw new Error('Session expired');
  }

  return user;
}

// GET /api/applications/job/:jobId/generated-content
// Get all generated content for a job (analysis, resumes, cover letters)
generatedContent.get('/job/:jobId/generated-content', async (c) => {
  try {
    const user = await requireAuth(c);
    const jobId = c.req.param('jobId');

    // Get application (for analysis)
    const application = await c.env.DB.prepare(
      'SELECT * FROM applications WHERE user_id = ? AND job_id = ?'
    )
      .bind(user.id, jobId)
      .first();

    // Get all resume versions
    const resumes = await c.env.DB.prepare(
      'SELECT * FROM generated_resumes WHERE user_id = ? AND job_id = ? ORDER BY created_at DESC'
    )
      .bind(user.id, jobId)
      .all();

    // Get all cover letter versions
    const coverLetters = await c.env.DB.prepare(
      'SELECT * FROM generated_cover_letters WHERE user_id = ? AND job_id = ? ORDER BY created_at DESC'
    )
      .bind(user.id, jobId)
      .all();

    return c.json({
      analysis: application?.ai_analysis ? JSON.parse(application.ai_analysis) : null,
      resumes: resumes.results || [],
      coverLetters: coverLetters.results || []
    }, 200);
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Session expired') {
      return c.json({ error: error.message }, 401);
    }
    return c.json({ error: error.message }, 500);
  }
});

// GET /api/applications/job/:jobId/resumes
// Get all resume versions for a job
generatedContent.get('/job/:jobId/resumes', async (c) => {
  try {
    const user = await requireAuth(c);
    const jobId = c.req.param('jobId');

    const resumes = await c.env.DB.prepare(
      'SELECT * FROM generated_resumes WHERE user_id = ? AND job_id = ? ORDER BY created_at DESC'
    )
      .bind(user.id, jobId)
      .all();

    return c.json({ resumes: resumes.results || [] }, 200);
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Session expired') {
      return c.json({ error: error.message }, 401);
    }
    return c.json({ error: error.message }, 500);
  }
});

// GET /api/applications/job/:jobId/cover-letters
// Get all cover letter versions for a job
generatedContent.get('/job/:jobId/cover-letters', async (c) => {
  try {
    const user = await requireAuth(c);
    const jobId = c.req.param('jobId');

    const coverLetters = await c.env.DB.prepare(
      'SELECT * FROM generated_cover_letters WHERE user_id = ? AND job_id = ? ORDER BY created_at DESC'
    )
      .bind(user.id, jobId)
      .all();

    return c.json({ coverLetters: coverLetters.results || [] }, 200);
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Session expired') {
      return c.json({ error: error.message }, 401);
    }
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /api/applications/generated-resumes/:id
// Delete a specific resume version
generatedContent.delete('/generated-resumes/:id', async (c) => {
  try {
    const user = await requireAuth(c);
    const id = c.req.param('id');

    // Verify ownership
    const resume = await c.env.DB.prepare(
      'SELECT * FROM generated_resumes WHERE id = ? AND user_id = ?'
    )
      .bind(id, user.id)
      .first<GeneratedResume>();

    if (!resume) {
      return c.json({ error: 'Resume not found' }, 404);
    }

    await c.env.DB.prepare('DELETE FROM generated_resumes WHERE id = ?')
      .bind(id)
      .run();

    return c.json({ success: true }, 200);
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Session expired') {
      return c.json({ error: error.message }, 401);
    }
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /api/applications/generated-cover-letters/:id
// Delete a specific cover letter version
generatedContent.delete('/generated-cover-letters/:id', async (c) => {
  try {
    const user = await requireAuth(c);
    const id = c.req.param('id');

    // Verify ownership
    const coverLetter = await c.env.DB.prepare(
      'SELECT * FROM generated_cover_letters WHERE id = ? AND user_id = ?'
    )
      .bind(id, user.id)
      .first<GeneratedCoverLetter>();

    if (!coverLetter) {
      return c.json({ error: 'Cover letter not found' }, 404);
    }

    await c.env.DB.prepare('DELETE FROM generated_cover_letters WHERE id = ?')
      .bind(id)
      .run();

    return c.json({ success: true }, 200);
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Session expired') {
      return c.json({ error: error.message }, 401);
    }
    return c.json({ error: error.message }, 500);
  }
});

// PATCH /api/applications/generated-resumes/:id
// Rename a resume version
generatedContent.patch('/generated-resumes/:id', async (c) => {
  try {
    const user = await requireAuth(c);
    const id = c.req.param('id');
    const body = await c.req.json();

    // Verify ownership
    const resume = await c.env.DB.prepare(
      'SELECT * FROM generated_resumes WHERE id = ? AND user_id = ?'
    )
      .bind(id, user.id)
      .first<GeneratedResume>();

    if (!resume) {
      return c.json({ error: 'Resume not found' }, 404);
    }

    if (body.version_name) {
      await c.env.DB.prepare(
        'UPDATE generated_resumes SET version_name = ?, updated_at = unixepoch() WHERE id = ?'
      )
        .bind(body.version_name, id)
        .run();
    }

    const updated = await c.env.DB.prepare('SELECT * FROM generated_resumes WHERE id = ?')
      .bind(id)
      .first<GeneratedResume>();

    return c.json({ resume: updated }, 200);
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Session expired') {
      return c.json({ error: error.message }, 401);
    }
    return c.json({ error: error.message }, 500);
  }
});

// PATCH /api/applications/generated-cover-letters/:id
// Rename a cover letter version
generatedContent.patch('/generated-cover-letters/:id', async (c) => {
  try {
    const user = await requireAuth(c);
    const id = c.req.param('id');
    const body = await c.req.json();

    // Verify ownership
    const coverLetter = await c.env.DB.prepare(
      'SELECT * FROM generated_cover_letters WHERE id = ? AND user_id = ?'
    )
      .bind(id, user.id)
      .first<GeneratedCoverLetter>();

    if (!coverLetter) {
      return c.json({ error: 'Cover letter not found' }, 404);
    }

    if (body.version_name) {
      await c.env.DB.prepare(
        'UPDATE generated_cover_letters SET version_name = ?, updated_at = unixepoch() WHERE id = ?'
      )
        .bind(body.version_name, id)
        .run();
    }

    const updated = await c.env.DB.prepare('SELECT * FROM generated_cover_letters WHERE id = ?')
      .bind(id)
      .first<GeneratedCoverLetter>();

    return c.json({ coverLetter: updated }, 200);
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Session expired') {
      return c.json({ error: error.message }, 401);
    }
    return c.json({ error: error.message }, 500);
  }
});

export default generatedContent;
