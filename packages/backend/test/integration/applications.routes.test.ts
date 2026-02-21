import { env } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";
import worker from "../../src/index";

/**
 * Helper: make a request to the worker fetch handler.
 */
async function makeRequest(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `http://localhost${path}`;
  const request = new Request(url, options);
  return worker.fetch(request, env as any, {} as ExecutionContext);
}

/**
 * Helper: sign up a new user and return the session cookie string (e.g. "session=abc123").
 */
async function createSessionCookie(email: string, password: string): Promise<string> {
  const res = await makeRequest("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (res.status !== 201) {
    // Try login in case user already exists
    const loginRes = await makeRequest("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const setCookie = loginRes.headers.get("Set-Cookie");
    if (!setCookie) throw new Error(`Login failed with status ${loginRes.status}`);
    return setCookie.split(";")[0].trim();
  }

  const setCookie = res.headers.get("Set-Cookie");
  if (!setCookie) throw new Error("No Set-Cookie header from signup");
  return setCookie.split(";")[0].trim();
}

function uniqueEmail(): string {
  return `app-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`;
}

// Seed a test job for applications to reference
const TEST_JOB_ID = "test-app-job-001";

beforeAll(async () => {
  await env.DB.prepare(`
    INSERT OR IGNORE INTO jobs (id, title, company, location, remote, description, external_url, source, created_at)
    VALUES (?, 'Test Job for Applications', 'Test Corp', 'Remote', 1, 'A test job.', 'https://example.com/testjob', 'test', unixepoch())
  `).bind(TEST_JOB_ID).run();
});

describe("GET /api/applications — auth guard", () => {
  it("returns 401 without session cookie", async () => {
    const res = await makeRequest("/api/applications");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/applications — authenticated", () => {
  it("returns 200 with empty array for new user", async () => {
    const email = uniqueEmail();
    const sessionCookie = await createSessionCookie(email, "password123");

    const res = await makeRequest("/api/applications", {
      method: "GET",
      headers: { Cookie: sessionCookie },
    });

    expect(res.status).toBe(200);
    const body = await res.json<{ applications: unknown[] }>();
    expect(Array.isArray(body.applications)).toBe(true);
    expect(body.applications).toHaveLength(0);
  });
});

describe("POST /api/applications — create application", () => {
  it("returns 401 without session cookie", async () => {
    const res = await makeRequest("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: TEST_JOB_ID, status: "saved" }),
    });
    expect(res.status).toBe(401);
  });

  it("creates an application and returns 201 with application object", async () => {
    const email = uniqueEmail();
    const sessionCookie = await createSessionCookie(email, "password123");

    const res = await makeRequest("/api/applications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({ job_id: TEST_JOB_ID, status: "saved" }),
    });

    expect(res.status).toBe(201);
    const body = await res.json<{ application: { id: string; job_id: string; status: string } }>();
    expect(body.application).toBeDefined();
    expect(body.application.job_id).toBe(TEST_JOB_ID);
    expect(body.application.status).toBe("saved");
    expect(body.application.id).toBeTruthy();
  });

  it("returns 400 with invalid status value (Zod validation)", async () => {
    const email = uniqueEmail();
    const sessionCookie = await createSessionCookie(email, "password123");

    const res = await makeRequest("/api/applications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({ job_id: TEST_JOB_ID, status: "invalid-status" }),
    });

    expect(res.status).toBe(400);
  });
});

describe("PUT /api/applications/:id — update application", () => {
  it("updates application status successfully", async () => {
    const email = uniqueEmail();
    const sessionCookie = await createSessionCookie(email, "password123");

    // Create an application first
    const createRes = await makeRequest("/api/applications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({ job_id: TEST_JOB_ID, status: "saved" }),
    });
    expect(createRes.status).toBe(201);
    const { application } = await createRes.json<{ application: { id: string } }>();

    // Update its status
    const updateRes = await makeRequest(`/api/applications/${application.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({ status: "applied" }),
    });

    expect(updateRes.status).toBe(200);
    const body = await updateRes.json<{ application: { id: string; status: string } }>();
    expect(body.application.status).toBe("applied");
  });

  it("returns 404 for non-existent application", async () => {
    const email = uniqueEmail();
    const sessionCookie = await createSessionCookie(email, "password123");

    const res = await makeRequest("/api/applications/nonexistent-id-12345", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({ status: "applied" }),
    });

    expect(res.status).toBe(404);
  });

  it("returns 403 when updating another user's application", async () => {
    const email1 = uniqueEmail();
    const email2 = uniqueEmail();
    const cookie1 = await createSessionCookie(email1, "password123");
    const cookie2 = await createSessionCookie(email2, "password123");

    // User 1 creates an application
    const createRes = await makeRequest("/api/applications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie1,
      },
      body: JSON.stringify({ job_id: TEST_JOB_ID, status: "saved" }),
    });
    expect(createRes.status).toBe(201);
    const { application } = await createRes.json<{ application: { id: string } }>();

    // User 2 tries to update user 1's application
    const updateRes = await makeRequest(`/api/applications/${application.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie2,
      },
      body: JSON.stringify({ status: "applied" }),
    });

    expect(updateRes.status).toBe(403);
  });
});

describe("PATCH /api/applications/:id — partial update", () => {
  it("updates notes field via PATCH", async () => {
    const email = uniqueEmail();
    const sessionCookie = await createSessionCookie(email, "password123");

    // Create application
    const createRes = await makeRequest("/api/applications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({ job_id: TEST_JOB_ID, status: "saved" }),
    });
    expect(createRes.status).toBe(201);
    const { application } = await createRes.json<{ application: { id: string } }>();

    // Patch notes
    const patchRes = await makeRequest(`/api/applications/${application.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({ notes: "Good opportunity" }),
    });

    expect(patchRes.status).toBe(200);
    const body = await patchRes.json<{ application: { notes: string | null } }>();
    expect(body.application.notes).toBe("Good opportunity");
  });
});
