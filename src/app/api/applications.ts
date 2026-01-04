import { requireAuth } from "@/app/lib/auth";
import { getEnv } from "@/app/lib/env";
import {
  getApplications,
  getApplicationById,
  createApplication,
  updateApplication,
  deleteApplication,
} from "@/app/lib/db";

export async function handleGetApplications({ request }: { request: Request }) {
  const env = getEnv();

  if (request.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const user = await requireAuth(request, env);
    const applications = await getApplications(env, user.id);
    return Response.json({ applications }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function handleCreateApplication({ request }: { request: Request }) {
  const env = getEnv();

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const user = await requireAuth(request, env);
    const body = await request.json() as any;
    const { job_id, status } = body;

    if (!job_id) {
      return Response.json({ error: "job_id is required" }, { status: 400 });
    }

    const application = await createApplication(env, user.id, job_id, status);
    return Response.json({ application }, { status: 201 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function handleUpdateApplication({ request, params }: { request: Request; params: { id: string } }) {
  const env = getEnv();

  if (request.method !== "PUT" && request.method !== "PATCH") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    await requireAuth(request, env);
    const body = await request.json() as any;

    const updates: any = {};
    if (body.status !== undefined) updates.status = body.status;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.ai_match_score !== undefined) updates.ai_match_score = body.ai_match_score;
    if (body.ai_analysis !== undefined) updates.ai_analysis = body.ai_analysis;

    await updateApplication(env, params.id, updates);

    const application = await getApplicationById(env, params.id);
    return Response.json({ application }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function handleDeleteApplication({ request, params }: { request: Request; params: { id: string } }) {
  const env = getEnv();

  if (request.method !== "DELETE") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    await requireAuth(request, env);
    await deleteApplication(env, params.id);
    return Response.json({ success: true }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return Response.json({ error: error.message }, { status: 500 });
  }
}
