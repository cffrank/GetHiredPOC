import { Hono } from 'hono';
import type { Env } from '../services/db.service';
import { getCurrentUser } from '../services/auth.service';
import {
  initiateLinkedInOAuth,
  exchangeLinkedInCode,
  fetchLinkedInProfile,
  saveLinkedInProfile
} from '../services/linkedin.service';
import {
  parseLinkedInProfileText,
  saveLinkedInProfileData
} from '../services/linkedin-parser.service';
import { toMessage } from '../utils/errors';

const linkedin = new Hono<{ Bindings: Env }>();

// GET /api/linkedin/initiate - Start LinkedIn OAuth flow
linkedin.get('/initiate', async (c) => {
  try {
    const user = await getCurrentUser(c);
    if (!user) {
      // Redirect to login
      return c.redirect(`${c.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=auth_required`);
    }

    // Check if LinkedIn OAuth is configured
    if (!c.env.LINKEDIN_CLIENT_ID || !c.env.LINKEDIN_CLIENT_SECRET) {
      console.error('LinkedIn OAuth not configured');
      return c.redirect(`${c.env.FRONTEND_URL || 'http://localhost:5173'}/profile?error=linkedin_not_configured`);
    }

    // Generate state for CSRF protection
    const state = crypto.randomUUID();

    // Store both user ID and OAuth state flag in KV
    await c.env.KV_SESSIONS.put(`linkedin_user:${state}`, user.id, {
      expirationTtl: 600 // 10 minutes
    });
    await c.env.KV_SESSIONS.put(`linkedin_oauth:${state}`, 'pending', {
      expirationTtl: 600 // 10 minutes
    });

    // Build LinkedIn OAuth URL
    const clientId = c.env.LINKEDIN_CLIENT_ID;
    const redirectUri = `${c.env.BACKEND_URL || 'http://localhost:8787'}/api/linkedin/callback`;

    const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('scope', 'openid profile email');

    // Redirect to LinkedIn
    return c.redirect(authUrl.toString());
  } catch (error: unknown) {
    console.error('LinkedIn initiate error:', error);
    return c.redirect(`${c.env.FRONTEND_URL || 'http://localhost:5173'}/profile?error=linkedin_init_failed`);
  }
});

// GET /api/linkedin/callback - Handle LinkedIn OAuth callback
linkedin.get('/callback', async (c) => {
  try {
    const code = c.req.query('code');
    const state = c.req.query('state');
    const error = c.req.query('error');
    const errorDescription = c.req.query('error_description');

    const frontendUrl = c.env.FRONTEND_URL || 'http://localhost:5173';

    if (error) {
      console.error('LinkedIn OAuth error:', error, errorDescription);
      return c.redirect(`${frontendUrl}/profile?error=linkedin_auth_failed`);
    }

    if (!code || !state) {
      return c.redirect(`${frontendUrl}/profile?error=missing_params`);
    }

    // Get user ID from state
    const userId = await c.env.KV_SESSIONS.get(`linkedin_user:${state}`);
    if (!userId) {
      return c.redirect(`${frontendUrl}/login?error=session_expired`);
    }

    // Delete used state
    await c.env.KV_SESSIONS.delete(`linkedin_user:${state}`);

    // Exchange code for access token
    const accessToken = await exchangeLinkedInCode(c.env, code, state);

    // Fetch LinkedIn profile data
    const linkedInProfile = await fetchLinkedInProfile(accessToken);

    // Save to database
    await saveLinkedInProfile(c.env.DB, userId, linkedInProfile);

    // Redirect back to profile with success message
    return c.redirect(`${frontendUrl}/profile?success=linkedin_imported`);
  } catch (error: unknown) {
    console.error('LinkedIn callback error:', error);
    const frontendUrl = c.env.FRONTEND_URL || 'http://localhost:5173';
    return c.redirect(`${frontendUrl}/profile?error=import_failed&message=${encodeURIComponent(toMessage(error))}`);
  }
});

// POST /api/linkedin/parse - Parse pasted LinkedIn profile text
linkedin.post('/parse', async (c) => {
  try {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { profileText } = body;

    if (!profileText || typeof profileText !== 'string' || profileText.trim().length === 0) {
      return c.json({ error: 'Profile text is required' }, 400);
    }

    if (profileText.length > 50000) {
      return c.json({ error: 'Profile text is too long (max 50,000 characters)' }, 400);
    }

    // Parse the LinkedIn profile text using AI
    const parsedProfile = await parseLinkedInProfileText(c.env, profileText);

    // Save to database
    await saveLinkedInProfileData(c.env.DB, user.id, parsedProfile);

    return c.json({
      success: true,
      data: parsedProfile
    });
  } catch (error: unknown) {
    console.error('LinkedIn parse error:', error);
    return c.json({ error: toMessage(error) || 'Failed to parse LinkedIn profile' }, 500);
  }
});

export default linkedin;
