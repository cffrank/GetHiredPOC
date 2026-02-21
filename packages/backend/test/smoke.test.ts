import { env } from "cloudflare:test";
import { describe, it, expect } from "vitest";

describe("D1 smoke", () => {
  it("can execute SQL against the D1 binding", async () => {
    const result = await env.DB
      .prepare("SELECT COUNT(*) AS cnt FROM jobs")
      .first<{ cnt: number }>();
    expect(result?.cnt).toBeGreaterThanOrEqual(0);
  });
});
