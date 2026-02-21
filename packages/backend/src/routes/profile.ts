import { Hono } from 'hono';
import type { Env } from '../services/db.service';
import { requireAuth, type AppVariables } from '../middleware/auth.middleware';
import { uploadFile } from '../services/storage.service';
import type { User } from '@gethiredpoc/shared';
import { toMessage } from '../utils/errors';

// Allowed profile update fields (maps to DB column names)
interface ProfileUpdates {
  full_name?: string;
  bio?: string;
  location?: string;
  skills?: string;
  address?: string;
  linkedin_url?: string;
  avatar_url?: string;
}

const profile = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// Apply auth middleware to all routes
profile.use('*', requireAuth);

// GET /api/profile
profile.get('/', async (c) => {
  try {
    const user = c.get('user');
    return c.json({ profile: user }, 200);
  } catch (error: unknown) {
    return c.json({ error: toMessage(error) }, 500);
  }
});

// PUT /api/profile
profile.put('/', async (c) => {
  try {
    const user = c.get('user');
    const contentType = c.req.header("content-type");

    const updates: ProfileUpdates = {};

    if (contentType?.includes("multipart/form-data")) {
      const formData = await c.req.formData();

      if (formData.has("full_name")) updates.full_name = formData.get("full_name") as string;
      if (formData.has("bio")) updates.bio = formData.get("bio") as string;
      if (formData.has("location")) updates.location = formData.get("location") as string;
      if (formData.has("skills")) updates.skills = formData.get("skills") as string;
      if (formData.has("address")) updates.address = formData.get("address") as string;
      if (formData.has("linkedin_url")) updates.linkedin_url = formData.get("linkedin_url") as string;

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
    const params: (string | null)[] = [];

    (Object.entries(updates) as [string, string | undefined][]).forEach(([key, value]) => {
      fields.push(`${key} = ?`);
      params.push(value ?? null);
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

    return c.json({ profile: updatedUser }, 200);
  } catch (error: unknown) {
    return c.json({ error: toMessage(error) }, 500);
  }
});

// PATCH /api/profile
profile.patch('/', async (c) => {
  try {
    const user = c.get('user');
    const contentType = c.req.header("content-type");

    const updates: ProfileUpdates = {};

    if (contentType?.includes("multipart/form-data")) {
      const formData = await c.req.formData();

      if (formData.has("full_name")) updates.full_name = formData.get("full_name") as string;
      if (formData.has("bio")) updates.bio = formData.get("bio") as string;
      if (formData.has("location")) updates.location = formData.get("location") as string;
      if (formData.has("skills")) updates.skills = formData.get("skills") as string;
      if (formData.has("address")) updates.address = formData.get("address") as string;
      if (formData.has("linkedin_url")) updates.linkedin_url = formData.get("linkedin_url") as string;

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
    const params: (string | null)[] = [];

    (Object.entries(updates) as [string, string | undefined][]).forEach(([key, value]) => {
      fields.push(`${key} = ?`);
      params.push(value ?? null);
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

    return c.json({ profile: updatedUser }, 200);
  } catch (error: unknown) {
    return c.json({ error: toMessage(error) }, 500);
  }
});

export default profile;
