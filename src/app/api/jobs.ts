import { requireAuth } from "@/app/lib/auth";
import { getEnv } from "@/app/lib/env";
import {
  getJobs,
  getJobById,
  getSavedJobs,
  saveJob,
  unsaveJob,
  isSaved,
} from "@/app/lib/db";
import { mockJobAnalysis } from "@/app/lib/ai-mock";
import { analyzeJobMatchV2 } from "@/app/lib/job-matching-v2";

export async function handleGetJobs({ request }: { request: Request }) {
  const env = getEnv();
  
  if (request.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const url = new URL(request.url);
    const title = url.searchParams.get("title") || undefined;
    const remote = url.searchParams.get("remote");
    const location = url.searchParams.get("location") || undefined;

    const jobs = await getJobs(env, {
      title,
      remote: remote === "true" ? true : remote === "false" ? false : undefined,
      location,
    });

    return Response.json({ jobs }, { status: 200 });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function handleGetJob({ request, params }: { request: Request; params: { id: string } }) {
  const env = getEnv();
  
  if (request.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const job = await getJobById(env, params.id);
    if (!job) {
      return Response.json({ error: "Job not found" }, { status: 404 });
    }

    let saved = false;
    try {
      const user = await requireAuth(request, env);
      saved = await isSaved(env, user.id, params.id);
    } catch {
      // Not authenticated
    }

    return Response.json({ job, saved }, { status: 200 });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function handleSaveJob({ request, params }: { request: Request; params: { id: string } }) {
  const env = getEnv();
  
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const user = await requireAuth(request, env);
    await saveJob(env, user.id, params.id);
    return Response.json({ success: true }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function handleUnsaveJob({ request, params }: { request: Request; params: { id: string } }) {
  const env = getEnv();
  
  if (request.method !== "DELETE") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const user = await requireAuth(request, env);
    await unsaveJob(env, user.id, params.id);
    return Response.json({ success: true }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function handleGetSavedJobs({ request }: { request: Request }) {
  const env = getEnv();
  
  if (request.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const user = await requireAuth(request, env);
    const jobs = await getSavedJobs(env, user.id);
    return Response.json({ jobs }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function handleAnalyzeJob({ request, params }: { request: Request; params: { id: string } }) {
  const env = getEnv();

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const user = await requireAuth(request, env);

    const cacheKey = `job-analysis-v2:${user.id}:${params.id}`;
    const cached = await env.KV_CACHE.get(cacheKey);
    if (cached) {
      return Response.json({ analysis: JSON.parse(cached), cached: true }, { status: 200 });
    }

    const job = await getJobById(env, params.id);
    if (!job) {
      return Response.json({ error: "Job not found" }, { status: 404 });
    }

    // Use enhanced matching v2 with rich profile data
    const analysis = await analyzeJobMatchV2(env.AI, env.DB, user.id, params.id);

    await env.KV_CACHE.put(cacheKey, JSON.stringify(analysis), {
      expirationTtl: 7 * 24 * 60 * 60,
    });

    return Response.json({ analysis, cached: false }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("Job analysis error:", error);
    return Response.json({ error: error.message || "Failed to analyze job" }, { status: 500 });
  }
}
