import { Hono } from 'hono';
import type { Env } from '../services/db.service';
import { getSession, getCookie } from '../services/auth.service';
import {
  getApplications,
  getApplicationById,
  createApplication,
  updateApplication,
  deleteApplication,
} from '../services/db.service';
import {
  sendStatusUpdateEmail,
  sendLimitWarningEmail,
  sendLimitReachedEmail,
  shouldSendLimitWarning,
} from '../services/email.service';
import type { User } from '@gethiredpoc/shared';
import {
  canPerformAction,
  incrementUsage,
} from '../services/subscription.service';

type Variables = {
  env: Env;
};

const applications = new Hono<{ Bindings: Env; Variables: Variables }>();

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

// GET /api/applications
applications.get('/', async (c) => {
  try {
    const user = await requireAuth(c);
    const applicationsList = await getApplications(c.env, user.id);
    return c.json({ applications: applicationsList }, 200);
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Session expired') {
      return c.json({ error: error.message }, 401);
    }
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/applications
applications.post('/', async (c) => {
  try {
    const user = await requireAuth(c);
    const body = await c.req.json();
    const { job_id, status } = body;

    if (!job_id) {
      return c.json({ error: "job_id is required" }, 400);
    }

    // Check subscription tier and application limits
    const tierCheck = await canPerformAction(c.env.DB, user.id, 'application');
    if (!tierCheck.allowed) {
      return c.json({
        error: 'Subscription limit reached',
        message: tierCheck.reason,
        current: tierCheck.current,
        limit: tierCheck.limit,
        upgradeUrl: '/subscription/upgrade',
      }, 402); // 402 Payment Required
    }

    const application = await createApplication(c.env, user.id, job_id, status);

    // Increment application counter after successful creation
    await incrementUsage(c.env.DB, user.id, 'application', 1);

    // Check if limit warning or limit reached email should be sent
    if (tierCheck.current !== undefined && tierCheck.limit) {
      const newCurrent = tierCheck.current + 1;

      if (shouldSendLimitWarning(newCurrent, tierCheck.limit)) {
        // Send warning at 80%
        await sendLimitWarningEmail(
          c.env,
          user,
          'applications',
          newCurrent,
          tierCheck.limit
        ).catch(err => console.error('Failed to send limit warning email:', err));
      } else if (newCurrent >= tierCheck.limit) {
        // Send limit reached at 100%
        await sendLimitReachedEmail(
          c.env,
          user,
          'applications',
          tierCheck.limit
        ).catch(err => console.error('Failed to send limit reached email:', err));
      }
    }

    return c.json({
      application,
      usage: {
        current: (tierCheck.current || 0) + 1,
        limit: tierCheck.limit,
        remaining: tierCheck.limit ? tierCheck.limit - (tierCheck.current || 0) - 1 : undefined,
      }
    }, 201);
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Session expired') {
      return c.json({ error: error.message }, 401);
    }
    return c.json({ error: error.message }, 500);
  }
});

// PUT /api/applications/:id
applications.put('/:id', async (c) => {
  try {
    const user = await requireAuth(c);
    const applicationId = c.req.param('id');
    const body = await c.req.json();

    const updates: any = {};
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
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Session expired') {
      return c.json({ error: error.message }, 401);
    }
    return c.json({ error: error.message }, 500);
  }
});

// PATCH /api/applications/:id
applications.patch('/:id', async (c) => {
  try {
    const user = await requireAuth(c);
    const applicationId = c.req.param('id');
    const body = await c.req.json();

    const updates: any = {};
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
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Session expired') {
      return c.json({ error: error.message }, 401);
    }
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /api/applications/:id
applications.delete('/:id', async (c) => {
  try {
    await requireAuth(c);
    const applicationId = c.req.param('id');

    await deleteApplication(c.env, applicationId);
    return c.json({ success: true }, 200);
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Session expired') {
      return c.json({ error: error.message }, 401);
    }
    return c.json({ error: error.message }, 500);
  }
});

export default applications;
