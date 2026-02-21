import { Hono } from 'hono';
import type { Env } from '../services/db.service';
import { getCurrentUser } from '../services/auth.service';
import {
  getJobSearchPreferences,
  updateJobSearchPreferences
} from '../services/job-preferences.service';
import { INDUSTRIES } from '@gethiredpoc/shared';
import { toMessage } from '../utils/errors';

const jobPreferences = new Hono<{ Bindings: Env }>();

// GET /api/job-preferences - Get user's job search preferences
jobPreferences.get('/', async (c) => {
  try {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const preferences = await getJobSearchPreferences(c.env.DB, user.id);
    return c.json(preferences);
  } catch (error: unknown) {
    console.error('Get job preferences error:', error);
    return c.json({ error: toMessage(error) }, 500);
  }
});

// PUT /api/job-preferences - Update job search preferences
jobPreferences.put('/', async (c) => {
  try {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();

    await updateJobSearchPreferences(c.env.DB, user.id, body);

    const updatedPreferences = await getJobSearchPreferences(c.env.DB, user.id);
    return c.json(updatedPreferences);
  } catch (error: unknown) {
    console.error('Update job preferences error:', error);
    return c.json({ error: toMessage(error) }, 500);
  }
});

// GET /api/job-preferences/industries - Get list of available industries
jobPreferences.get('/industries', async (c) => {
  return c.json({ industries: INDUSTRIES });
});

export default jobPreferences;
