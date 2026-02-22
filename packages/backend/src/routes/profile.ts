import { Hono } from 'hono';
import type { Env } from '../services/db.service';
import { requireAuth, type AppVariables } from '../middleware/auth.middleware';
import { uploadFile } from '../services/storage.service';
import type { User } from '@gethiredpoc/shared';
import { toMessage } from '../utils/errors';
import { updateProfileSchema } from '../schemas/profile.schema';
import { validationHook } from '../schemas/validation-hook';

// Allowed profile update fields (maps to DB column names)
interface ProfileUpdates {
  full_name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
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
// Dual content-type: JSON (validated with Zod) and multipart/form-data (for avatar uploads)
// Option A: Check content-type and apply Zod validation only to the JSON branch
profile.put('/', async (c) => {
  try {
    const user = c.get('user');
    const contentType = c.req.header("content-type");

    const updates: ProfileUpdates = {};

    if (contentType?.includes("multipart/form-data")) {
      const formData = await c.req.formData();

      if (formData.has("full_name")) updates.full_name = formData.get("full_name") as string;
      if (formData.has("first_name")) updates.first_name = formData.get("first_name") as string;
      if (formData.has("last_name")) updates.last_name = formData.get("last_name") as string;
      if (formData.has("phone")) updates.phone = formData.get("phone") as string;
      if (formData.has("street_address")) updates.street_address = formData.get("street_address") as string;
      if (formData.has("city")) updates.city = formData.get("city") as string;
      if (formData.has("state")) updates.state = formData.get("state") as string;
      if (formData.has("zip_code")) updates.zip_code = formData.get("zip_code") as string;
      if (formData.has("bio")) updates.bio = formData.get("bio") as string;
      if (formData.has("location")) updates.location = formData.get("location") as string;
      if (formData.has("skills")) updates.skills = formData.get("skills") as string;
      if (formData.has("address")) updates.address = formData.get("address") as string;
      if (formData.has("linkedin_url")) updates.linkedin_url = formData.get("linkedin_url") as string;

      const avatarFile = formData.get("avatar");
      if (avatarFile && typeof avatarFile === 'object' && 'arrayBuffer' in avatarFile) {
        const avatarUrl = await uploadFile(c.env, avatarFile as File, `avatars/${user.id}`);
        updates.avatar_url = avatarUrl;
        console.log('[Profile Update] Uploaded avatar to:', avatarUrl);
      }
    } else {
      // JSON branch — validate with Zod
      const rawBody = await c.req.json();
      const parseResult = updateProfileSchema.safeParse(rawBody);

      if (!parseResult.success) {
        // Invoke shared validation hook for consistent error format
        const fakeContext = c;
        return fakeContext.json({
          error: 'Validation failed',
          issues: parseResult.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        }, 400);
      }

      const body = parseResult.data;
      console.log('[Profile Update] JSON body:', JSON.stringify(body));

      if (body.full_name !== undefined) updates.full_name = body.full_name;
      if (body.first_name !== undefined) updates.first_name = body.first_name;
      if (body.last_name !== undefined) updates.last_name = body.last_name;
      if (body.phone !== undefined) updates.phone = body.phone;
      if (body.street_address !== undefined) updates.street_address = body.street_address;
      if (body.city !== undefined) updates.city = body.city;
      if (body.state !== undefined) updates.state = body.state;
      if (body.zip_code !== undefined) updates.zip_code = body.zip_code;
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
      "SELECT * FROM users WHERE id = ?"
    )
      .bind(user.id)
      .first<User>();

    return c.json({ profile: updatedUser }, 200);
  } catch (error: unknown) {
    return c.json({ error: toMessage(error) }, 500);
  }
});

// PATCH /api/profile
// Same dual content-type handling as PUT
profile.patch('/', async (c) => {
  try {
    const user = c.get('user');
    const contentType = c.req.header("content-type");

    const updates: ProfileUpdates = {};

    if (contentType?.includes("multipart/form-data")) {
      const formData = await c.req.formData();

      if (formData.has("full_name")) updates.full_name = formData.get("full_name") as string;
      if (formData.has("first_name")) updates.first_name = formData.get("first_name") as string;
      if (formData.has("last_name")) updates.last_name = formData.get("last_name") as string;
      if (formData.has("phone")) updates.phone = formData.get("phone") as string;
      if (formData.has("street_address")) updates.street_address = formData.get("street_address") as string;
      if (formData.has("city")) updates.city = formData.get("city") as string;
      if (formData.has("state")) updates.state = formData.get("state") as string;
      if (formData.has("zip_code")) updates.zip_code = formData.get("zip_code") as string;
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
      // JSON branch — validate with Zod
      const rawBody = await c.req.json();
      const parseResult = updateProfileSchema.safeParse(rawBody);

      if (!parseResult.success) {
        return c.json({
          error: 'Validation failed',
          issues: parseResult.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        }, 400);
      }

      const body = parseResult.data;

      if (body.full_name !== undefined) updates.full_name = body.full_name;
      if (body.first_name !== undefined) updates.first_name = body.first_name;
      if (body.last_name !== undefined) updates.last_name = body.last_name;
      if (body.phone !== undefined) updates.phone = body.phone;
      if (body.street_address !== undefined) updates.street_address = body.street_address;
      if (body.city !== undefined) updates.city = body.city;
      if (body.state !== undefined) updates.state = body.state;
      if (body.zip_code !== undefined) updates.zip_code = body.zip_code;
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
      "SELECT * FROM users WHERE id = ?"
    )
      .bind(user.id)
      .first<User>();

    return c.json({ profile: updatedUser }, 200);
  } catch (error: unknown) {
    return c.json({ error: toMessage(error) }, 500);
  }
});

export default profile;
