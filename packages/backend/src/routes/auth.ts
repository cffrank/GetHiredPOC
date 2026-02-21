import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { Env } from '../services/db.service';
import {
  signup,
  login,
  deleteSession,
  getSession,
  getCookie,
  setSessionCookie,
  clearSessionCookie,
} from '../services/auth.service';
import { sendWelcomeEmail } from '../services/email.service';
import { toMessage, UnauthorizedError } from '../utils/errors';
import { signupSchema, loginSchema } from '../schemas/auth.schema';
import { validationHook } from '../schemas/validation-hook';

const auth = new Hono<{ Bindings: Env }>();

// POST /api/auth/signup
auth.post('/signup', zValidator('json', signupSchema, validationHook), async (c) => {
  try {
    const { email, password } = c.req.valid('json');

    const { user, sessionId } = await signup(c.env, email, password);
    const isProduction = c.env.FRONTEND_URL?.includes('pages.dev');

    // Send welcome email (non-blocking)
    sendWelcomeEmail(c.env, user.email, user.full_name ?? undefined).catch(err =>
      console.error('Failed to send welcome email:', err)
    );

    return c.json(
      { user },
      201,
      {
        'Set-Cookie': setSessionCookie(sessionId, isProduction),
      }
    );
  } catch (error: unknown) {
    return c.json({ error: toMessage(error) }, 400);
  }
});

// POST /api/auth/login
auth.post('/login', zValidator('json', loginSchema, validationHook), async (c) => {
  const { email, password } = c.req.valid('json');

  const { user, sessionId } = await login(c.env, email, password).catch(() => {
    throw new UnauthorizedError('Invalid credentials');
  });
  const isProduction = c.env.FRONTEND_URL?.includes('pages.dev');

  return c.json(
    { user },
    200,
    {
      'Set-Cookie': setSessionCookie(sessionId, isProduction),
    }
  );
});

// POST /api/auth/logout
auth.post('/logout', async (c) => {
  const sessionId = getCookie(c.req.raw, "session");
  const isProduction = c.env.FRONTEND_URL?.includes('pages.dev');

  if (sessionId) {
    await deleteSession(c.env, sessionId);
  }

  return c.json(
    { success: true },
    200,
    {
      'Set-Cookie': clearSessionCookie(isProduction),
    }
  );
});

// GET /api/auth/me
auth.get('/me', async (c) => {
  const sessionId = getCookie(c.req.raw, "session");

  if (!sessionId) {
    return c.json({ user: null }, 200);
  }

  const user = await getSession(c.env, sessionId);
  return c.json({ user }, 200);
});

export default auth;
