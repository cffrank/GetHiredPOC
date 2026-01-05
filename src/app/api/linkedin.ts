// LinkedIn OAuth API Routes
import { getEnv } from '@/app/lib/env';
import { getUserIdFromCookie } from '@/app/lib/auth';
import {
  initiateLinkedInOAuth,
  exchangeLinkedInCode,
  fetchLinkedInProfile,
  saveLinkedInProfile
} from '@/app/lib/linkedin-oauth';

/**
 * Initiate LinkedIn OAuth flow
 * GET /api/linkedin/initiate
 */
export async function handleLinkedInInitiate({ request }: { request: Request }): Promise<Response> {
  try {
    const env = getEnv();

    // Verify user is logged in
    const userId = await getUserIdFromCookie(request);
    if (!userId) {
      return new Response(null, {
        status: 302,
        headers: {
          'Location': '/login?error=auth_required'
        }
      });
    }

    // Generate LinkedIn OAuth URL
    const authUrl = await initiateLinkedInOAuth(env);

    // Redirect to LinkedIn
    return new Response(null, {
      status: 302,
      headers: {
        'Location': authUrl
      }
    });
  } catch (error) {
    console.error('LinkedIn initiate error:', error);
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/profile?error=linkedin_init_failed'
      }
    });
  }
}

/**
 * Handle LinkedIn OAuth callback
 * GET /api/linkedin/callback
 */
export async function handleLinkedInCallback({ request }: { request: Request }): Promise<Response> {
  try {
    const env = getEnv();
    const url = new URL(request.url);

    // Verify user is logged in
    const userId = await getUserIdFromCookie(request);
    if (!userId) {
      return new Response(null, {
        status: 302,
        headers: {
          'Location': '/login?error=auth_required'
        }
      });
    }

    // Get OAuth parameters
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    if (error) {
      console.error('LinkedIn OAuth error:', error, errorDescription);
      return new Response(null, {
        status: 302,
        headers: {
          'Location': '/profile?error=linkedin_auth_failed'
        }
      });
    }

    if (!code || !state) {
      return new Response(null, {
        status: 302,
        headers: {
          'Location': '/profile?error=missing_params'
        }
      });
    }

    // Exchange code for access token
    const accessToken = await exchangeLinkedInCode(env, code, state);

    // Fetch LinkedIn profile data
    const linkedInProfile = await fetchLinkedInProfile(accessToken);

    // Save to database
    await saveLinkedInProfile(env.DB, userId, linkedInProfile);

    // Redirect back to profile with success message
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/profile?success=linkedin_imported'
      }
    });
  } catch (error) {
    console.error('LinkedIn callback error:', error);
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/profile?error=import_failed'
      }
    });
  }
}
