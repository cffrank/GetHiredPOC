import { requireAuth } from "@/app/lib/auth";
import { getEnv } from "@/app/lib/env";
import { uploadFile } from "@/app/lib/storage";

export async function handleGetProfile({ request }: { request: Request }) {
  const env = getEnv();

  if (request.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const user = await requireAuth(request, env);
    return Response.json({ profile: user }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function handleUpdateProfile({ request }: { request: Request }) {
  const env = getEnv();

  if (request.method !== "PUT" && request.method !== "PATCH") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const user = await requireAuth(request, env);
    const contentType = request.headers.get("content-type");

    let updates: any = {};

    if (contentType?.includes("multipart/form-data")) {
      const formData = await request.formData();

      if (formData.has("full_name")) updates.full_name = formData.get("full_name");
      if (formData.has("bio")) updates.bio = formData.get("bio");
      if (formData.has("location")) updates.location = formData.get("location");
      if (formData.has("skills")) updates.skills = formData.get("skills");

      const avatarFile = formData.get("avatar");
      if (avatarFile && avatarFile instanceof File) {
        const avatarUrl = await uploadFile(env, avatarFile, `avatars/${user.id}`);
        updates.avatar_url = avatarUrl;
      }
    } else {
      const body = await request.json() as any;

      if (body.full_name !== undefined) updates.full_name = body.full_name;
      if (body.bio !== undefined) updates.bio = body.bio;
      if (body.location !== undefined) updates.location = body.location;
      if (body.skills !== undefined) {
        updates.skills = Array.isArray(body.skills) ? JSON.stringify(body.skills) : body.skills;
      }
    }

    const fields: string[] = [];
    const params: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      fields.push(`${key} = ?`);
      params.push(value);
    });

    if (fields.length === 0) {
      return Response.json({ error: "No fields to update" }, { status: 400 });
    }

    fields.push("updated_at = unixepoch()");
    params.push(user.id);

    const query = `UPDATE users SET ${fields.join(", ")} WHERE id = ?`;
    await env.DB.prepare(query).bind(...params).run();

    const updatedUser = await env.DB.prepare(
      "SELECT id, email, full_name, bio, location, skills, avatar_url, created_at, updated_at FROM users WHERE id = ?"
    )
      .bind(user.id)
      .first();

    return Response.json({ profile: updatedUser }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return Response.json({ error: error.message }, { status: 500 });
  }
}
