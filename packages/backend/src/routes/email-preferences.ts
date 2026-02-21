import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { Env } from '../services/db.service';
import { getCurrentUser } from '../services/auth.service';
import { getEmailPreferences, updateEmailPreferences } from '../services/email.service';
import { toMessage } from '../utils/errors';
import { updateEmailPreferencesSchema } from '../schemas/email-preferences.schema';
import { validationHook } from '../schemas/validation-hook';

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
  } catch (error: unknown) {
    console.error('Get email preferences error:', error);
    return c.json({ error: toMessage(error) }, 500);
  }
});

// PUT /api/email-preferences - Update user's email preferences
emailPreferences.put('/', zValidator('json', updateEmailPreferencesSchema, validationHook), async (c) => {
  try {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { digestEnabled, statusUpdatesEnabled, remindersEnabled, digestFrequency } = c.req.valid('json');

    await updateEmailPreferences(c.env.DB, user.id, {
      digestEnabled,
      statusUpdatesEnabled,
      remindersEnabled,
      digestFrequency
    });

    const updatedPreferences = await getEmailPreferences(c.env.DB, user.id);
    return c.json(updatedPreferences);
  } catch (error: unknown) {
    console.error('Update email preferences error:', error);
    return c.json({ error: toMessage(error) }, 500);
  }
});

export default emailPreferences;
