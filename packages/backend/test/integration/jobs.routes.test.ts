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
 * Seed test jobs into the D1 database before running tests.
 * The jobs table uses: id, title, company, location, remote, description,
 * external_url (from 0003_phase2_schema), source (from 0003), created_at
 */
beforeAll(async () => {
  await env.DB.prepare(`
    INSERT OR IGNORE INTO jobs (id, title, company, location, remote, description, external_url, source, created_at)
    VALUES
      ('test-job-001', 'Software Engineer', 'Acme Corp', 'San Francisco, CA', 0, 'Build great software.', 'https://example.com/job1', 'test', unixepoch()),
      ('test-job-002', 'Senior Engineer', 'Beta Inc', 'Remote', 1, 'Lead engineering efforts.', 'https://example.com/job2', 'test', unixepoch()),
      ('test-job-003', 'Product Manager', 'Gamma Ltd', 'New York, NY', 0, 'Drive product vision.', 'https://example.com/job3', 'test', unixepoch()),
      ('test-job-004', 'Data Scientist', 'Delta Co', 'Austin, TX', 1, 'Analyze data at scale.', 'https://example.com/job4', 'test', unixepoch()),
      ('test-job-005', 'DevOps Engineer', 'Epsilon LLC', 'Seattle, WA', 2, 'Build CI/CD pipelines.', 'https://example.com/job5', 'test', unixepoch()),
      ('test-job-006', 'Frontend Developer', 'Zeta Startup', 'Remote', 1, 'Build beautiful UIs.', 'https://example.com/job6', 'test', unixepoch()),
      ('test-job-007', 'Backend Developer', 'Eta Systems', 'Chicago, IL', 0, 'Build scalable APIs.', 'https://example.com/job7', 'test', unixepoch())
  `).run();
});

describe("GET /api/jobs", () => {
  it("returns 200 with paginated jobs response shape", async () => {
    const res = await makeRequest("/api/jobs");

    expect(res.status).toBe(200);

    const body = await res.json<{ jobs: unknown[]; nextCursor: string | null; hasMore: boolean }>();
    expect(Array.isArray(body.jobs)).toBe(true);
    expect(typeof body.hasMore).toBe("boolean");
    // nextCursor can be string or null
    expect(body.nextCursor === null || typeof body.nextCursor === "string").toBe(true);
  });

  it("returns jobs array with expected fields", async () => {
    const res = await makeRequest("/api/jobs");
    expect(res.status).toBe(200);

    const body = await res.json<{
      jobs: Array<{ id: string; title: string; company: string }>;
      nextCursor: string | null;
      hasMore: boolean;
    }>();
    expect(body.jobs.length).toBeGreaterThan(0);

    const job = body.jobs[0];
    expect(job).toHaveProperty("id");
    expect(job).toHaveProperty("title");
    expect(job).toHaveProperty("company");
  });

  it("respects limit parameter — returns at most limit jobs", async () => {
    const res = await makeRequest("/api/jobs?limit=3");
    expect(res.status).toBe(200);

    const body = await res.json<{ jobs: unknown[]; nextCursor: string | null; hasMore: boolean }>();
    expect(body.jobs.length).toBeLessThanOrEqual(3);
  });

  it("returns correct pagination shape with limit=5", async () => {
    const res = await makeRequest("/api/jobs?limit=5");
    expect(res.status).toBe(200);

    const body = await res.json<{ jobs: unknown[]; nextCursor: string | null; hasMore: boolean }>();
    expect(body.jobs.length).toBeLessThanOrEqual(5);
    expect(typeof body.hasMore).toBe("boolean");
    expect(body.nextCursor === null || typeof body.nextCursor === "string").toBe(true);
  });

  it("supports cursor-based pagination — second page differs from first", async () => {
    // Get first page with limit=3
    const page1Res = await makeRequest("/api/jobs?limit=3");
    expect(page1Res.status).toBe(200);

    const page1 = await page1Res.json<{
      jobs: Array<{ id: string }>;
      nextCursor: string | null;
      hasMore: boolean;
    }>();

    // Only test cursor pagination if there are more pages
    if (page1.hasMore && page1.nextCursor) {
      const page2Res = await makeRequest(
        `/api/jobs?limit=3&cursor=${encodeURIComponent(page1.nextCursor)}`
      );
      expect(page2Res.status).toBe(200);

      const page2 = await page2Res.json<{
        jobs: Array<{ id: string }>;
        nextCursor: string | null;
        hasMore: boolean;
      }>();
      expect(Array.isArray(page2.jobs)).toBe(true);

      // Page 2 jobs should not include page 1 job IDs
      const page1Ids = new Set(page1.jobs.map(j => j.id));
      for (const job of page2.jobs) {
        expect(page1Ids.has(job.id)).toBe(false);
      }
    }
  });

  it("title filter returns only matching jobs", async () => {
    const res = await makeRequest("/api/jobs?title=Engineer");
    expect(res.status).toBe(200);

    const body = await res.json<{
      jobs: Array<{ title: string }>;
      nextCursor: string | null;
      hasMore: boolean;
    }>();
    // All returned jobs should have Engineer in the title
    for (const job of body.jobs) {
      expect(job.title.toLowerCase()).toContain("engineer");
    }
  });
});
