import { env } from "cloudflare:test";
import { describe, it, expect } from "vitest";
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
    throw new Error(`Signup failed with status ${res.status}`);
  }

  const setCookie = res.headers.get("Set-Cookie");
  if (!setCookie) throw new Error("No Set-Cookie header from signup");
  return setCookie.split(";")[0].trim();
}

function uniqueEmail(): string {
  return `profile-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`;
}

describe("GET /api/profile — auth guard", () => {
  it("returns 401 without session cookie", async () => {
    const res = await makeRequest("/api/profile");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/profile — authenticated", () => {
  it("returns user profile after signup", async () => {
    const email = uniqueEmail();
    const sessionCookie = await createSessionCookie(email, "password123");

    const res = await makeRequest("/api/profile", {
      method: "GET",
      headers: { Cookie: sessionCookie },
    });

    expect(res.status).toBe(200);
    const body = await res.json<{ profile: { email: string; id: string } }>();
    expect(body.profile).toBeDefined();
    expect(body.profile.email).toBe(email);
    expect(body.profile.id).toBeTruthy();
  });

  it("returns profile with expected fields", async () => {
    const email = uniqueEmail();
    const sessionCookie = await createSessionCookie(email, "password123");

    const res = await makeRequest("/api/profile", {
      method: "GET",
      headers: { Cookie: sessionCookie },
    });

    expect(res.status).toBe(200);
    const body = await res.json<{
      profile: {
        id: string;
        email: string;
        full_name: string | null;
        bio: string | null;
        location: string | null;
        skills: string | null;
      };
    }>();
    expect(body.profile).toHaveProperty("id");
    expect(body.profile).toHaveProperty("email");
    expect(body.profile).toHaveProperty("full_name");
    expect(body.profile).toHaveProperty("bio");
    expect(body.profile).toHaveProperty("location");
  });
});

describe("PUT /api/profile — update profile", () => {
  it("returns 401 without session cookie", async () => {
    const res = await makeRequest("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: "Test User" }),
    });
    expect(res.status).toBe(401);
  });

  it("updates full_name field", async () => {
    const email = uniqueEmail();
    const sessionCookie = await createSessionCookie(email, "password123");

    const res = await makeRequest("/api/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({ full_name: "Jane Doe" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json<{ profile: { full_name: string } }>();
    expect(body.profile.full_name).toBe("Jane Doe");
  });

  it("updates multiple profile fields at once", async () => {
    const email = uniqueEmail();
    const sessionCookie = await createSessionCookie(email, "password123");

    const res = await makeRequest("/api/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        full_name: "John Smith",
        bio: "Software engineer with 5 years experience",
        location: "San Francisco, CA",
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json<{
      profile: { full_name: string; bio: string; location: string };
    }>();
    expect(body.profile.full_name).toBe("John Smith");
    expect(body.profile.bio).toBe("Software engineer with 5 years experience");
    expect(body.profile.location).toBe("San Francisco, CA");
  });

  it("returns 400 with invalid linkedin_url (Zod validation)", async () => {
    const email = uniqueEmail();
    const sessionCookie = await createSessionCookie(email, "password123");

    const res = await makeRequest("/api/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({ linkedin_url: "not-a-valid-url" }),
    });

    expect(res.status).toBe(400);
    const body = await res.json<{ error: string; issues?: unknown[] }>();
    expect(body.error).toBeTruthy();
  });

  it("returns 400 when no fields provided", async () => {
    const email = uniqueEmail();
    const sessionCookie = await createSessionCookie(email, "password123");

    const res = await makeRequest("/api/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({}),
    });

    // Empty object means no fields to update
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/profile — partial update", () => {
  it("updates bio field via PATCH", async () => {
    const email = uniqueEmail();
    const sessionCookie = await createSessionCookie(email, "password123");

    const res = await makeRequest("/api/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({ bio: "Passionate developer" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json<{ profile: { bio: string } }>();
    expect(body.profile.bio).toBe("Passionate developer");
  });
});
