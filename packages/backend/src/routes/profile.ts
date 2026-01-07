import { Hono } from 'hono';
import type { Env } from '../services/db.service';
import { getSession, getCookie } from '../services/auth.service';
import { uploadFile } from '../services/storage.service';
import type { User } from '@gethiredpoc/shared';

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

      if (formData.has("full_name")) updates.full_name = formData.get("full_name");
      if (formData.has("bio")) updates.bio = formData.get("bio");
      if (formData.has("location")) updates.location = formData.get("location");
      if (formData.has("skills")) updates.skills = formData.get("skills");
      if (formData.has("address")) updates.address = formData.get("address");
      if (formData.has("linkedin_url")) updates.linkedin_url = formData.get("linkedin_url");

      console.log('[Profile Update] FormData - address:', formData.get("address"));
      console.log('[Profile Update] FormData - linkedin_url:', formData.get("linkedin_url"));

      const avatarFile = formData.get("avatar");
      if (avatarFile && typeof avatarFile === 'object' && 'arrayBuffer' in avatarFile) {
        const avatarUrl = await uploadFile(c.env, avatarFile as File, `avatars/${user.id}`);
        updates.avatar_url = avatarUrl;
        console.log('[Profile Update] Uploaded avatar to:', avatarUrl);
      }
    } else {
      const body = await c.req.json();

      console.log('[Profile Update] JSON body:', JSON.stringify(body));

      if (body.full_name !== undefined) updates.full_name = body.full_name;
      if (body.bio !== undefined) updates.bio = body.bio;
      if (body.location !== undefined) updates.location = body.location;
      if (body.skills !== undefined) {
        updates.skills = Array.isArray(body.skills) ? JSON.stringify(body.skills) : body.skills;
      }
      if (body.address !== undefined) updates.address = body.address;
      if (body.linkedin_url !== undefined) updates.linkedin_url = body.linkedin_url;
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
      "SELECT id, email, full_name, bio, location, skills, avatar_url, address, linkedin_url, created_at, updated_at FROM users WHERE id = ?"
    )
      .bind(user.id)
      .first<User>();

    console.log('[Profile Update] Updated user data:', JSON.stringify(updatedUser));

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

// PATCH /api/profile
profile.patch('/', async (c) => {
  try {
    const user = await requireAuth(c);
    const contentType = c.req.header("content-type");

    let updates: any = {};

    if (contentType?.includes("multipart/form-data")) {
      const formData = await c.req.formData();

      if (formData.has("full_name")) updates.full_name = formData.get("full_name");
      if (formData.has("bio")) updates.bio = formData.get("bio");
      if (formData.has("location")) updates.location = formData.get("location");
      if (formData.has("skills")) updates.skills = formData.get("skills");
      if (formData.has("address")) updates.address = formData.get("address");
      if (formData.has("linkedin_url")) updates.linkedin_url = formData.get("linkedin_url");

      const avatarFile = formData.get("avatar");
      if (avatarFile && typeof avatarFile === 'object' && 'arrayBuffer' in avatarFile) {
        const avatarUrl = await uploadFile(c.env, avatarFile as File, `avatars/${user.id}`);
        updates.avatar_url = avatarUrl;
      }
    } else {
      const body = await c.req.json();

      if (body.full_name !== undefined) updates.full_name = body.full_name;
      if (body.bio !== undefined) updates.bio = body.bio;
      if (body.location !== undefined) updates.location = body.location;
      if (body.skills !== undefined) {
        updates.skills = Array.isArray(body.skills) ? JSON.stringify(body.skills) : body.skills;
      }
      if (body.address !== undefined) updates.address = body.address;
      if (body.linkedin_url !== undefined) updates.linkedin_url = body.linkedin_url;
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
      "SELECT id, email, full_name, bio, location, skills, avatar_url, address, linkedin_url, created_at, updated_at FROM users WHERE id = ?"
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
