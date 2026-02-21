import { Hono } from 'hono';
import type { Env } from '../services/db.service';
import type { User } from '@gethiredpoc/shared';
import { getCookie, getSession } from '../services/auth.service';
import { updateJobSearchPreferences } from '../services/job-preferences.service';

const testUtils = new Hono<{ Bindings: Env }>();

/**
 * Helper to get authenticated user
 * Supports both cookie and Authorization header (for E2E tests)
 */
async function requireAuth(c: any): Promise<User> {
  // Try cookie first
  let sessionId = getCookie(c.req.raw, "session");

  // Fall back to Authorization header if no cookie
  if (!sessionId) {
    const authHeader = c.req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      sessionId = authHeader.substring(7);
    }
  }

  if (!sessionId) {
    throw new Error('Unauthorized');
  }

  const user = await getSession(c.env, sessionId);
  if (!user) {
    throw new Error('Session expired');
  }

  return user;
}

/**
 * POST /api/test-utils/complete-onboarding
 * Mark the current user's onboarding as complete (TEST ONLY)
 */
testUtils.post('/complete-onboarding', async (c) => {
  try {
    const body = await c.req.json();
    const { email } = body;

    if (!email) {
      return c.json({ error: 'Email required' }, 400);
    }

    // Find user by email
    const userResult = await c.env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email).first();

    if (!userResult) {
      return c.json({ error: 'User not found' }, 404);
    }

    const userId = userResult.id as string;

    // Mark onboarding as complete
    await updateJobSearchPreferences(c.env.DB, userId, {
      onboardingCompleted: true
    });

    return c.json({ success: true, message: 'Onboarding marked as complete', userId });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/test-utils/reset-user
 * Reset user's onboarding and preferences (TEST ONLY)
 */
testUtils.post('/reset-user', async (c) => {
  try {
    const user = await requireAuth(c);

    // Reset onboarding
    await updateJobSearchPreferences(c.env.DB, user.id, {
      onboardingCompleted: false
    });

    return c.json({ success: true, message: 'User reset complete' });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Session expired') {
      return c.json({ error: error.message }, 401);
    }
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /api/test-utils/health
 * Health check endpoint for tests
 */
testUtils.get('/health', async (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

export default testUtils;
