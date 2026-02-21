import { Hono } from 'hono';
import type { Env } from '../services/db.service';
import { requireAuth, type AppVariables } from '../middleware/auth.middleware';
import {
  getApplications,
  getApplicationById,
  createApplication,
  updateApplication,
  deleteApplication,
} from '../services/db.service';
import { sendStatusUpdateEmail } from '../services/email.service';
import type { ApplicationUpdate } from '@gethiredpoc/shared';
import { toMessage } from '../utils/errors';

const applications = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// Apply auth middleware to all routes
applications.use('*', requireAuth);

// GET /api/applications
applications.get('/', async (c) => {
  try {
    const user = c.get('user');
    const applicationsList = await getApplications(c.env, user.id);
    return c.json({ applications: applicationsList }, 200);
  } catch (error: unknown) {
    return c.json({ error: toMessage(error) }, 500);
  }
});

// POST /api/applications
applications.post('/', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    const { job_id, status } = body;

    if (!job_id) {
      return c.json({ error: "job_id is required" }, 400);
    }

    const application = await createApplication(c.env, user.id, job_id, status);
    return c.json({ application }, 201);
  } catch (error: unknown) {
    return c.json({ error: toMessage(error) }, 500);
  }
});

// PUT /api/applications/:id
applications.put('/:id', async (c) => {
  try {
    const user = c.get('user');
    const applicationId = c.req.param('id');
    const body = await c.req.json();

    const updates: ApplicationUpdate = {};
    if (body.status !== undefined) updates.status = body.status;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.ai_match_score !== undefined) updates.ai_match_score = body.ai_match_score;
    if (body.ai_analysis !== undefined) updates.ai_analysis = body.ai_analysis;

    await updateApplication(c.env, applicationId, updates);

    const application = await getApplicationById(c.env, applicationId);

    // Send status update email if status changed
    if (updates.status && application) {
      const job = await c.env.DB.prepare('SELECT title, company FROM jobs WHERE id = ?')
        .bind(application.job_id)
        .first<{ title: string; company: string }>();

      if (job) {
        sendStatusUpdateEmail(c.env, user.email, job.title, job.company, updates.status).catch(err =>
          console.error('Failed to send status update email:', err)
        );
      }
    }

    return c.json({ application }, 200);
  } catch (error: unknown) {
    return c.json({ error: toMessage(error) }, 500);
  }
});

// PATCH /api/applications/:id
applications.patch('/:id', async (c) => {
  try {
    const user = c.get('user');
    const applicationId = c.req.param('id');
    const body = await c.req.json();

    const updates: ApplicationUpdate = {};
    if (body.status !== undefined) updates.status = body.status;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.ai_match_score !== undefined) updates.ai_match_score = body.ai_match_score;
    if (body.ai_analysis !== undefined) updates.ai_analysis = body.ai_analysis;

    await updateApplication(c.env, applicationId, updates);

    const application = await getApplicationById(c.env, applicationId);

    // Send status update email if status changed
    if (updates.status && application) {
      const job = await c.env.DB.prepare('SELECT title, company FROM jobs WHERE id = ?')
        .bind(application.job_id)
        .first<{ title: string; company: string }>();

      if (job) {
        sendStatusUpdateEmail(c.env, user.email, job.title, job.company, updates.status).catch(err =>
          console.error('Failed to send status update email:', err)
        );
      }
    }

    return c.json({ application }, 200);
  } catch (error: unknown) {
    return c.json({ error: toMessage(error) }, 500);
  }
});

// DELETE /api/applications/:id
applications.delete('/:id', async (c) => {
  try {
    const applicationId = c.req.param('id');
    await deleteApplication(c.env, applicationId);
    return c.json({ success: true }, 200);
  } catch (error: unknown) {
    return c.json({ error: toMessage(error) }, 500);
  }
});

export default applications;
