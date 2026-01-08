import { Hono } from 'hono';
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

type Variables = {
  env: Env;
};

const auth = new Hono<{ Bindings: Env; Variables: Variables }>();

// POST /api/auth/signup
auth.post('/signup', async (c) => {
  try {
    const body = await c.req.json();
    const {
      email,
      password,
      first_name,
      last_name,
      phone,
      street_address,
      city,
      state,
      zip_code
    } = body;

    // Basic validation (detailed validation happens in signup service)
    if (!email || !password || !first_name || !last_name ||
        !phone || !street_address || !city || !state || !zip_code) {
      return c.json({
        error: "All fields are required: email, password, first_name, last_name, phone, street_address, city, state, zip_code"
      }, 400);
    }

    const { user, sessionId } = await signup(c.env, {
      email,
      password,
      first_name,
      last_name,
      phone,
      street_address,
      city,
      state,
      zip_code
    });
    const isProduction = c.env.FRONTEND_URL?.includes('pages.dev');

    // Send welcome email (non-blocking)
    const fullName = `${user.first_name} ${user.last_name}`.trim();
    sendWelcomeEmail(c.env, user.email, fullName).catch(err =>
      console.error('Failed to send welcome email:', err)
    );

    return c.json(
      {
        user,
        sessionId, // Include sessionId in response for localStorage fallback
      },
      201,
      {
        'Set-Cookie': setSessionCookie(sessionId, isProduction),
      }
    );
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// POST /api/auth/login
auth.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;

    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }

    const { user, sessionId } = await login(c.env, email, password);
    const isProduction = c.env.FRONTEND_URL?.includes('pages.dev');

    return c.json(
      {
        user,
        sessionId, // Include sessionId in response for localStorage fallback
      },
      200,
      {
        'Set-Cookie': setSessionCookie(sessionId, isProduction),
      }
    );
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
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
