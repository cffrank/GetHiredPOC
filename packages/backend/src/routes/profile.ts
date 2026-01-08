import { Hono } from 'hono';
import type { Env } from '../services/db.service';
import { getSession, getCookie, validatePhone, validateZipCode, validateState } from '../services/auth.service';
import { uploadFile } from '../services/storage.service';
import type { User } from '@gethiredpoc/shared';
import { awardXP, checkAchievements } from '../services/gamification.service';

type Variables = {
  env: Env;
};

const profile = new Hono<{ Bindings: Env; Variables: Variables }>();

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

// GET /api/profile
profile.get('/', async (c) => {
  try {
    const user = await requireAuth(c);
    return c.json({ profile: user }, 200);
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Session expired') {
      return c.json({ error: error.message }, 401);
    }
    return c.json({ error: error.message }, 500);
  }
});

// PUT /api/profile
profile.put('/', async (c) => {
  try {
    const user = await requireAuth(c);
    const contentType = c.req.header("content-type");

    let updates: any = {};

    if (contentType?.includes("multipart/form-data")) {
      const formData = await c.req.formData();

      // New structured fields
      if (formData.has("first_name")) updates.first_name = formData.get("first_name");
      if (formData.has("last_name")) updates.last_name = formData.get("last_name");
      if (formData.has("phone")) updates.phone = formData.get("phone");
      if (formData.has("street_address")) updates.street_address = formData.get("street_address");
      if (formData.has("city")) updates.city = formData.get("city");
      if (formData.has("state")) updates.state = formData.get("state");
      if (formData.has("zip_code")) updates.zip_code = formData.get("zip_code");

      // Legacy fields (backward compatibility)
      if (formData.has("full_name")) updates.full_name = formData.get("full_name");
      if (formData.has("address")) updates.address = formData.get("address");

      // Other existing fields
      if (formData.has("bio")) updates.bio = formData.get("bio");
      if (formData.has("location")) updates.location = formData.get("location");
      if (formData.has("skills")) updates.skills = formData.get("skills");
      if (formData.has("linkedin_url")) updates.linkedin_url = formData.get("linkedin_url");

      const avatarFile = formData.get("avatar");
      if (avatarFile && typeof avatarFile === 'object' && 'arrayBuffer' in avatarFile) {
        const avatarUrl = await uploadFile(c.env, avatarFile as File, `avatars/${user.id}`);
        updates.avatar_url = avatarUrl;
        console.log('[Profile Update] Uploaded avatar to:', avatarUrl);
      }
    } else {
      const body = await c.req.json();

      console.log('[Profile Update] JSON body:', JSON.stringify(body));

      // New structured fields
      if (body.first_name !== undefined) updates.first_name = body.first_name;
      if (body.last_name !== undefined) updates.last_name = body.last_name;
      if (body.phone !== undefined) updates.phone = body.phone;
      if (body.street_address !== undefined) updates.street_address = body.street_address;
      if (body.city !== undefined) updates.city = body.city;
      if (body.state !== undefined) updates.state = body.state;
      if (body.zip_code !== undefined) updates.zip_code = body.zip_code;

      // Legacy fields (backward compatibility)
      if (body.full_name !== undefined) updates.full_name = body.full_name;
      if (body.address !== undefined) updates.address = body.address;

      // Other existing fields
      if (body.bio !== undefined) updates.bio = body.bio;
      if (body.location !== undefined) updates.location = body.location;
      if (body.skills !== undefined) {
        updates.skills = Array.isArray(body.skills) ? JSON.stringify(body.skills) : body.skills;
      }
      if (body.linkedin_url !== undefined) updates.linkedin_url = body.linkedin_url;
    }

    // Validation for new fields
    if (updates.phone && !validatePhone(updates.phone)) {
      return c.json({ error: "Invalid phone number format. Must be 10 or 11 digits." }, 400);
    }
    if (updates.zip_code && !validateZipCode(updates.zip_code)) {
      return c.json({ error: "Invalid zip code format. Must be 12345 or 12345-6789." }, 400);
    }
    if (updates.state && !validateState(updates.state)) {
      return c.json({ error: "Invalid state code. Must be a valid 2-letter US state code." }, 400);
    }

    // Compute backward compatibility fields
    if (updates.first_name || updates.last_name) {
      const firstName = updates.first_name || user.first_name || '';
      const lastName = updates.last_name || user.last_name || '';
      updates.full_name = `${firstName} ${lastName}`.trim();
    }
    if (updates.street_address || updates.city || updates.state || updates.zip_code) {
      const street = updates.street_address || user.street_address || '';
      const city = updates.city || user.city || '';
      const state = updates.state || user.state || '';
      const zip = updates.zip_code || user.zip_code || '';
      updates.address = `${street}, ${city}, ${state} ${zip}`.trim();
    }

    console.log('[Profile Update] Updates object:', JSON.stringify(updates));

    const fields: string[] = [];
    const params: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      fields.push(`${key} = ?`);
      params.push(value);
    });

    if (fields.length === 0) {
      return c.json({ error: "No fields to update" }, 400);
    }

    fields.push("updated_at = unixepoch()");
    params.push(user.id);

    const query = `UPDATE users SET ${fields.join(", ")} WHERE id = ?`;
    console.log('[Profile Update] SQL query:', query);
    console.log('[Profile Update] SQL params:', JSON.stringify(params));

    const result = await c.env.DB.prepare(query).bind(...params).run();
    console.log('[Profile Update] SQL result:', JSON.stringify(result));

    const updatedUser = await c.env.DB.prepare(
      `SELECT id, email, full_name, first_name, last_name, phone,
       street_address, city, state, zip_code, address,
       bio, location, skills, avatar_url, linkedin_url, role,
       membership_tier, membership_started_at, membership_expires_at, trial_started_at,
       is_trial, trial_expires_at,
       subscription_tier, subscription_status, subscription_started_at, subscription_expires_at,
       polar_customer_id, polar_subscription_id,
       created_at, updated_at FROM users WHERE id = ?`
    )
      .bind(user.id)
      .first<User>();

    console.log('[Profile Update] Updated user data:', JSON.stringify(updatedUser));

    // Trigger embedding update (non-blocking)
    const { invalidateUserEmbeddingCache } = await import('../services/user-embedding.service');
    await invalidateUserEmbeddingCache(c.env, user.id).catch(err => {
      console.error('[Route] Failed to invalidate embedding cache:', err);
    });

    // Award XP for profile update (varies by completeness)
    try {
      // Award 100 XP if this is a substantial update
      if (Object.keys(updates).length >= 3) {
        await awardXP(c.env.DB, user.id, 100, 'Profile updated');
      } else {
        await awardXP(c.env.DB, user.id, 25, 'Profile updated');
      }
      // Check for profile completion achievement
      await checkAchievements(c.env.DB, user.id);
    } catch (gamificationError) {
      console.error('Gamification error:', gamificationError);
      // Don't fail the request if gamification fails
    }

    return c.json({ profile: updatedUser }, 200);
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Session expired') {
      return c.json({ error: error.message }, 401);
    }
    return c.json({ error: error.message }, 500);
  }
});

// PATCH /api/profile
profile.patch('/', async (c) => {
  try {
    const user = await requireAuth(c);
    const contentType = c.req.header("content-type");

    let updates: any = {};

    if (contentType?.includes("multipart/form-data")) {
      const formData = await c.req.formData();

      // New structured fields
      if (formData.has("first_name")) updates.first_name = formData.get("first_name");
      if (formData.has("last_name")) updates.last_name = formData.get("last_name");
      if (formData.has("phone")) updates.phone = formData.get("phone");
      if (formData.has("street_address")) updates.street_address = formData.get("street_address");
      if (formData.has("city")) updates.city = formData.get("city");
      if (formData.has("state")) updates.state = formData.get("state");
      if (formData.has("zip_code")) updates.zip_code = formData.get("zip_code");

      // Legacy fields (backward compatibility)
      if (formData.has("full_name")) updates.full_name = formData.get("full_name");
      if (formData.has("address")) updates.address = formData.get("address");

      // Other existing fields
      if (formData.has("bio")) updates.bio = formData.get("bio");
      if (formData.has("location")) updates.location = formData.get("location");
      if (formData.has("skills")) updates.skills = formData.get("skills");
      if (formData.has("linkedin_url")) updates.linkedin_url = formData.get("linkedin_url");

      const avatarFile = formData.get("avatar");
      if (avatarFile && typeof avatarFile === 'object' && 'arrayBuffer' in avatarFile) {
        const avatarUrl = await uploadFile(c.env, avatarFile as File, `avatars/${user.id}`);
        updates.avatar_url = avatarUrl;
      }
    } else {
      const body = await c.req.json();

      // New structured fields
      if (body.first_name !== undefined) updates.first_name = body.first_name;
      if (body.last_name !== undefined) updates.last_name = body.last_name;
      if (body.phone !== undefined) updates.phone = body.phone;
      if (body.street_address !== undefined) updates.street_address = body.street_address;
      if (body.city !== undefined) updates.city = body.city;
      if (body.state !== undefined) updates.state = body.state;
      if (body.zip_code !== undefined) updates.zip_code = body.zip_code;

      // Legacy fields (backward compatibility)
      if (body.full_name !== undefined) updates.full_name = body.full_name;
      if (body.address !== undefined) updates.address = body.address;

      // Other existing fields
      if (body.bio !== undefined) updates.bio = body.bio;
      if (body.location !== undefined) updates.location = body.location;
      if (body.skills !== undefined) {
        updates.skills = Array.isArray(body.skills) ? JSON.stringify(body.skills) : body.skills;
      }
      if (body.linkedin_url !== undefined) updates.linkedin_url = body.linkedin_url;
    }

    // Validation for new fields
    if (updates.phone && !validatePhone(updates.phone)) {
      return c.json({ error: "Invalid phone number format. Must be 10 or 11 digits." }, 400);
    }
    if (updates.zip_code && !validateZipCode(updates.zip_code)) {
      return c.json({ error: "Invalid zip code format. Must be 12345 or 12345-6789." }, 400);
    }
    if (updates.state && !validateState(updates.state)) {
      return c.json({ error: "Invalid state code. Must be a valid 2-letter US state code." }, 400);
    }

    // Compute backward compatibility fields
    if (updates.first_name || updates.last_name) {
      const firstName = updates.first_name || user.first_name || '';
      const lastName = updates.last_name || user.last_name || '';
      updates.full_name = `${firstName} ${lastName}`.trim();
    }
    if (updates.street_address || updates.city || updates.state || updates.zip_code) {
      const street = updates.street_address || user.street_address || '';
      const city = updates.city || user.city || '';
      const state = updates.state || user.state || '';
      const zip = updates.zip_code || user.zip_code || '';
      updates.address = `${street}, ${city}, ${state} ${zip}`.trim();
    }

    const fields: string[] = [];
    const params: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      fields.push(`${key} = ?`);
      params.push(value);
    });

    if (fields.length === 0) {
      return c.json({ error: "No fields to update" }, 400);
    }

    fields.push("updated_at = unixepoch()");
    params.push(user.id);

    const query = `UPDATE users SET ${fields.join(", ")} WHERE id = ?`;
    await c.env.DB.prepare(query).bind(...params).run();

    const updatedUser = await c.env.DB.prepare(
      `SELECT id, email, full_name, first_name, last_name, phone,
       street_address, city, state, zip_code, address,
       bio, location, skills, avatar_url, linkedin_url, role,
       membership_tier, membership_started_at, membership_expires_at, trial_started_at,
       is_trial, trial_expires_at,
       subscription_tier, subscription_status, subscription_started_at, subscription_expires_at,
       polar_customer_id, polar_subscription_id,
       created_at, updated_at FROM users WHERE id = ?`
    )
      .bind(user.id)
      .first<User>();

    // Trigger embedding update (non-blocking)
    const { invalidateUserEmbeddingCache } = await import('../services/user-embedding.service');
    await invalidateUserEmbeddingCache(c.env, user.id).catch(err => {
      console.error('[Route] Failed to invalidate embedding cache:', err);
    });

    return c.json({ profile: updatedUser }, 200);
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Session expired') {
      return c.json({ error: error.message }, 401);
    }
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/profile/refresh-embedding
profile.post('/refresh-embedding', async (c) => {
  try {
    const sessionId = getCookie(c.req.raw, 'session');
    if (!sessionId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const user = await getSession(c.env, sessionId);
    if (!user) {
      return c.json({ error: 'Session expired' }, 401);
    }

    // Import from user-embedding.service
    const { updateUserEmbedding } = await import('../services/user-embedding.service');

    await updateUserEmbedding(c.env, user.id);

    return c.json({
      success: true,
      message: 'User embedding refreshed successfully',
      updated_at: Date.now()
    }, 200);
  } catch (error: any) {
    console.error('[Profile] Error refreshing embedding:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default profile;
