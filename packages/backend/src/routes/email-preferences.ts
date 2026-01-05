import { Hono } from 'hono';
import type { Env } from '../services/db.service';
import { getCurrentUser } from '../services/auth.service';
import { getEmailPreferences, updateEmailPreferences } from '../services/email.service';

const emailPreferences = new Hono<{ Bindings: Env }>();

// GET /api/email-preferences - Get user's email preferences
emailPreferences.get('/', async (c) => {
  try {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const preferences = await getEmailPreferences(c.env.DB, user.id);
    return c.json(preferences);
  } catch (error: any) {
    console.error('Get email preferences error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// PUT /api/email-preferences - Update user's email preferences
emailPreferences.put('/', async (c) => {
  try {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { digestEnabled, statusUpdatesEnabled, remindersEnabled, digestFrequency } = body;

    await updateEmailPreferences(c.env.DB, user.id, {
      digestEnabled,
      statusUpdatesEnabled,
      remindersEnabled,
      digestFrequency
    });

    const updatedPreferences = await getEmailPreferences(c.env.DB, user.id);
    return c.json(updatedPreferences);
  } catch (error: any) {
    console.error('Update email preferences error:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default emailPreferences;
