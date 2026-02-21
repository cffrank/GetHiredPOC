import { env } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../../src/index";

/**
 * Helper: make a request to the worker fetch handler.
 * Passes the real D1/KV env from cloudflare:test.
 */
async function makeRequest(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `http://localhost${path}`;
  const request = new Request(url, options);
  // Pass real env to the fetch handler (Cloudflare Workers ExecutionContext not needed for D1/KV)
  return worker.fetch(request, env as any, {} as ExecutionContext);
}

/**
 * Helper: sign up a new user and return the session cookie string (e.g. "session=abc123").
 * Uses a unique email per call to avoid duplicate email conflicts between tests.
 */
async function createSessionCookie(email: string, password: string): Promise<string> {
  const res = await makeRequest("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  expect(res.status).toBe(201);

  const setCookie = res.headers.get("Set-Cookie");
  if (!setCookie) throw new Error("No Set-Cookie header from signup");

  // Extract just the "session=xxx" part (before the first semicolon)
  const sessionPart = setCookie.split(";")[0].trim();
  return sessionPart;
}

function uniqueEmail(): string {
  return `auth-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`;
}

describe("POST /api/auth/signup", () => {
  it("returns 201 with Set-Cookie header for valid body", async () => {
    const email = uniqueEmail();
    const res = await makeRequest("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "password123" }),
    });

    expect(res.status).toBe(201);
    const body = await res.json<{ user: { email: string } }>();
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe(email);

    const setCookie = res.headers.get("Set-Cookie");
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain("session=");
  });

  it("returns 400 for duplicate email", async () => {
    const email = uniqueEmail();
    // First signup succeeds
    await makeRequest("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "password123" }),
    });

    // Second signup with same email should fail
    const res = await makeRequest("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "password123" }),
    });

    expect(res.status).toBe(400);
    const body = await res.json<{ error: string }>();
    expect(body.error).toBeTruthy();
  });

  it("returns 400 for invalid email format (Zod validation)", async () => {
    const res = await makeRequest("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "not-an-email", password: "password123" }),
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 when password is too short (Zod validation)", async () => {
    const res = await makeRequest("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: uniqueEmail(), password: "short" }),
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 when email is missing", async () => {
    const res = await makeRequest("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "password123" }),
    });

    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  it("returns 200 with session cookie for valid credentials", async () => {
    const email = uniqueEmail();
    const password = "logintest456";

    // Create user first
    await makeRequest("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const res = await makeRequest("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    expect(res.status).toBe(200);
    const body = await res.json<{ user: { email: string } }>();
    expect(body.user.email).toBe(email);

    const setCookie = res.headers.get("Set-Cookie");
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain("session=");
  });

  it("returns 401 for wrong password", async () => {
    const email = uniqueEmail();
    // Create user
    await makeRequest("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "correctpassword" }),
    });

    const res = await makeRequest("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "wrongpassword" }),
    });

    expect(res.status).toBe(401);
  });
});

describe("GET /api/auth/me", () => {
  it("returns user object with valid session cookie", async () => {
    const email = uniqueEmail();
    const sessionCookie = await createSessionCookie(email, "password123");

    const res = await makeRequest("/api/auth/me", {
      method: "GET",
      headers: { Cookie: sessionCookie },
    });

    expect(res.status).toBe(200);
    const body = await res.json<{ user: { email: string } | null }>();
    expect(body.user).toBeDefined();
    expect(body.user?.email).toBe(email);
  });

  it("returns user: null without cookie (route returns 200 with null user)", async () => {
    const res = await makeRequest("/api/auth/me", { method: "GET" });

    // The /me route returns 200 with { user: null } when no session exists
    expect(res.status).toBe(200);
    const body = await res.json<{ user: null }>();
    expect(body.user).toBeNull();
  });
});

describe("POST /api/auth/logout", () => {
  it("clears session cookie on logout", async () => {
    const email = uniqueEmail();
    const sessionCookie = await createSessionCookie(email, "password123");

    const res = await makeRequest("/api/auth/logout", {
      method: "POST",
      headers: { Cookie: sessionCookie },
    });

    expect(res.status).toBe(200);
    const body = await res.json<{ success: boolean }>();
    expect(body.success).toBe(true);

    const setCookie = res.headers.get("Set-Cookie");
    expect(setCookie).toBeTruthy();
    // Cleared cookie should have Max-Age=0
    expect(setCookie).toContain("session=");
    expect(setCookie).toContain("Max-Age=0");
  });
});
