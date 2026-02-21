# Phase 4: Performance + Graceful Degradation - Research

**Researched:** 2026-02-21
**Domain:** Cloudflare D1 query optimization, KV cache invalidation, PDF parsing in Workers, LinkedIn graceful degradation, structured logging
**Confidence:** HIGH (most findings from direct codebase inspection + official Cloudflare docs)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PERF-01 | Job analysis N+1 queries consolidated from 7 to 2-3 using JOINs | JOIN pattern identified; codebase shows 5+ sequential queries in analyzeJobMatch; consolidation into 1 JOIN + 1 prompt fetch is viable |
| PERF-02 | Job listings use cursor-based pagination with appropriate DB indexes | Cursor pattern verified (keyset on `posted_date` + `id`); `idx_jobs_created_at` already exists; need `posted_date` index + API response changes |
| PERF-03 | Job analysis cache invalidation includes profile modification timestamp | Cache key `match:{userId}:{jobId}` confirmed in code; profile `updated_at` column exists; need to embed `updated_at` in cache key |
| PERF-04 | PDF resume parsing uses pdf-parse library instead of raw TextDecoder | `pdf-parse@2.4.5` already installed; has `browser` export using `OffscreenCanvas`; BUT OffscreenCanvas is NOT supported in Cloudflare Workers — use `unpdf` instead |
| GRACE-01 | LinkedIn integration handles empty API data with user notification instead of silent empty loops | `fetchLinkedInProfile` confirmed to return empty arrays (positions/educations/skills are all `[]`); `saveLinkedInProfile` loops silently over empty arrays; fix is to detect empty response and return redirect with `?warning=` param |
| GRACE-02 | AI response parsing uses structured extraction with fallback templates on malformed JSON | `parseMatchJSON` throws on bad JSON; `parseResume` already catches and returns empty struct; need fallback template for job-matching that returns a scored default |
| GRACE-03 | Structured logging with consistent prefixes replaces ad-hoc console.log | 149 `console.*` calls in backend; Cloudflare recommends JSON-structured `console.log({})` objects; create a lightweight logger utility |
</phase_requirements>

---

## Summary

Phase 4 targets three orthogonal problem areas: database query efficiency, cache correctness, and resilience to bad data. All problems are directly observable in the existing codebase without ambiguity — the code proves the bugs.

**PERF-01** is the most impactful fix. `analyzeJobMatch` in `job-matching.service.ts` fires 4 sequential DB queries per job (user SELECT, work_experience, education, prompt), and `getRecommendationsWithJobDetails` fires an additional jobs SELECT — making 5+ total per recommendation batch call with 50 jobs analyzed. This should collapse to 2-3 queries using a combined profile JOIN and prompt cache.

**PERF-04** has a critical platform mismatch: `pdf-parse@2.4.5` is installed but uses `@napi-rs/canvas` (native bindings) in its Node build and `OffscreenCanvas` in its browser/web build. Cloudflare Workers does NOT support `OffscreenCanvas`. The correct approach for Workers PDF text extraction is `unpdf`, which is explicitly recommended by Cloudflare's own R2 tutorial and uses PDF.js adapted for edge environments.

**Primary recommendation:** Implement PERF-01 (N+1 fix) and PERF-04 (switch to `unpdf`) first as they have the highest user-visible impact; GRACE-03 (structured logging) is the lowest risk and can be done independently via a simple logger utility.

---

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Cloudflare D1 | native | SQLite at the edge | Project's DB — no change |
| Cloudflare KV | native | Cache + sessions | Project's cache layer — no change |
| Hono | ^4.7.8 | HTTP routing | Already in use |

### New Addition Required
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| unpdf | latest | PDF text extraction in Workers | Cloudflare-recommended; used in official R2 tutorial; works in edge environments without OffscreenCanvas |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| unpdf | pdf-parse@2.4.5 browser build | pdf-parse web build uses `OffscreenCanvas` — NOT supported in Cloudflare Workers as of 2025 |
| unpdf | pdfjs-serverless | pdfjs-serverless is older; unpdf is the maintained successor (same author ecosystem) |
| Custom cursor token | Drizzle ORM cursor helper | No ORM in project; raw SQL keyset is straightforward |

**Installation:**
```bash
npm install unpdf --workspace=packages/backend
```

---

## Architecture Patterns

### Pattern 1: N+1 Fix — Batch Profile Data Load (PERF-01)

**What:** `analyzeJobMatch` currently runs 4 sequential DB queries per job call. The user profile (including work history and education) should be loaded ONCE before the batch loop, not once per job.

**Current code path (job-recommendations.service.ts):**
1. `getTopJobRecommendations` → fetches user: 1 query
2. Fetches 50 jobs: 1 query
3. For each job, calls `analyzeJobMatch` which runs:
   - `KV_CACHE.get` (cache check — not a DB query)
   - `work_experience` SELECT: 1 query per job
   - `education` SELECT: 1 query per job
   - `getPrompt` → `KV_CACHE.get` + fallback DB: 1 query per job if uncached
4. `getRecommendationsWithJobDetails` → fetches jobs again by ID: 1 additional query

**With 50 jobs and no cache hits: 1 + 1 + (50 × 3) + 1 = 153 queries.**

**Fix approach:**
- Pre-load work_experience and education for the user ONCE before the loop
- Pass profile context into `analyzeJobMatch` instead of fetching it there
- The prompt fetch hits KV cache after first call (already works)
- The second jobs fetch in `getRecommendationsWithJobDetails` can be eliminated by reusing the original jobs result

**Target: 3 queries for a full recommendations call** (user+jobs+prompt fetch if uncached = 3, then KV for all subsequent prompt fetches).

```typescript
// Refactored pattern — pre-load profile context once
async function buildUserContext(env: Env, userId: string) {
  const [user, workHistory, education] = await Promise.all([
    env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first(),
    env.DB.prepare(`
      SELECT company, title, description FROM work_experience
      WHERE user_id = ? ORDER BY start_date DESC LIMIT 3
    `).bind(userId).all(),
    env.DB.prepare(`
      SELECT school, degree, field_of_study FROM education
      WHERE user_id = ? ORDER BY start_date DESC LIMIT 2
    `).bind(userId).all(),
  ]);
  return { user, workHistory: workHistory.results, education: education.results };
}
```

**Confidence:** HIGH — pattern is standard; D1 supports `Promise.all` for parallel queries.

---

### Pattern 2: Cursor-Based Pagination (PERF-02)

**What:** Replace `SELECT * FROM jobs ORDER BY posted_date DESC` with keyset pagination. The cursor encodes the `posted_date` and `id` of the last item seen.

**Current:** `getJobs` in `db.service.ts` returns ALL matching jobs with no limit. This will grow unbounded as jobs accumulate.

**Keyset pattern for D1/SQLite:**

```sql
-- First page (no cursor)
SELECT * FROM jobs
WHERE 1=1 -- (+ other filters)
ORDER BY posted_date DESC, id DESC
LIMIT 20

-- Next page (cursor = last row's posted_date + id)
SELECT * FROM jobs
WHERE (posted_date < ? OR (posted_date = ? AND id < ?))
ORDER BY posted_date DESC, id DESC
LIMIT 20
```

**Cursor encoding:** Base64-encode a JSON object `{ posted_date: number, id: string }`. This is opaque to the frontend.

**API response shape change:**
```typescript
// Before
return c.json({ jobs: jobsList });

// After
return c.json({
  jobs: jobsList,
  nextCursor: jobsList.length === limit ? encodeCursor(lastJob) : null,
  hasMore: jobsList.length === limit
});
```

**Existing indexes:** `idx_jobs_created_at` exists on `created_at DESC`. Need to verify `posted_date` is indexed — it is NOT currently indexed. Add:
```sql
CREATE INDEX IF NOT EXISTS idx_jobs_posted_date ON jobs(posted_date DESC, id DESC);
```

**Confidence:** HIGH — SQLite keyset pagination is well-established; D1 is SQLite.

---

### Pattern 3: Cache Invalidation on Profile Update (PERF-03)

**What:** The job match cache key `match:{userId}:{jobId}` never expires when the user profile changes (7-day TTL only). After a profile update, the next analysis request returns stale results.

**Current:** Profile updates in `profile.ts` set `updated_at = unixepoch()` but do NOT invalidate any KV cache entries.

**Fix approach — embed profile version in cache key:**

```typescript
// When reading profile for analysis, include updated_at in cache key
const cacheKey = `match:${userProfile.id}:${job.id}:${userProfile.updated_at}`;
```

This is a cache-bust-by-key approach: old cache entries become unreachable and expire naturally via TTL. No need to enumerate and delete existing keys (KV doesn't support efficient prefix scanning anyway).

**Why this is better than manual invalidation:** Cloudflare KV does not support listing/deleting keys by prefix efficiently. The cache-bust-by-key approach avoids the "delete all match:userId:* keys" problem entirely.

**Additional cache key to fix:** The `/api/jobs/:id/analyze` route uses `job-analysis:{userId}:{jobId}` — same fix applies.

**Confidence:** HIGH — straightforward key versioning pattern; users table `updated_at` is already maintained.

---

### Pattern 4: PDF Parsing with unpdf (PERF-04)

**What:** Replace `extractTextFromPDF` in `resume.service.ts` with `unpdf`. The current implementation uses `TextDecoder` which produces garbled binary artifacts because PDF is a binary format with compression.

**Current (broken):**
```typescript
// resume.service.ts extractTextFromPDF
const decoder = new TextDecoder('utf-8', { fatal: false });
let text = decoder.decode(uint8Array);
text = text.replace(/[^\x20-\x7E\n\r]/g, ' '); // strips most of PDF content
```

**Fix with unpdf:**
```typescript
import { extractText, getDocumentProxy } from 'unpdf';

async function extractTextFromPDF(pdfBuffer: ArrayBuffer): Promise<string> {
  try {
    const pdf = await getDocumentProxy(new Uint8Array(pdfBuffer));
    const { text } = await extractText(pdf, { mergePages: true });
    return text;
  } catch (error) {
    console.error('PDF text extraction error:', error);
    return '';
  }
}
```

**Why unpdf and not pdf-parse@2.4.5 browser build:**
- `pdf-parse@2.4.5` browser build uses `OffscreenCanvas` (confirmed in source code)
- `OffscreenCanvas` is NOT supported in Cloudflare Workers (confirmed: GitHub cloudflare/workerd issue #54, community forum)
- `unpdf` is explicitly recommended by Cloudflare's own R2 + Workers AI PDF tutorial
- `unpdf` bundles a workers-compatible PDF.js build

**Confidence:** HIGH — Cloudflare official docs use unpdf; OffscreenCanvas limitation is officially documented.

---

### Pattern 5: LinkedIn Empty Data Detection (GRACE-01)

**What:** When LinkedIn's basic OpenID Connect API returns a profile with no positions/education/skills (which is ALWAYS the case without Partner API access), `saveLinkedInProfile` silently loops over empty arrays. The user sees a success redirect but no data is imported.

**Current (linkedin.service.ts):**
```typescript
// fetchLinkedInProfile always returns:
positions: [],   // "Requires partner access"
educations: [],  // "Requires partner access"
skills: [],      // "Requires partner access"
```

**Fix:** After fetching the profile, check if meaningful data was returned. If only name/email came back, redirect with a warning instead of false success:

```typescript
// In linkedin.ts callback route
const linkedInProfile = await fetchLinkedInProfile(accessToken);

// Detect empty profile (no work history, education, or skills)
const hasUsefulData = linkedInProfile.positions.length > 0
  || linkedInProfile.educations.length > 0
  || linkedInProfile.skills.length > 0;

if (!hasUsefulData) {
  // Still save name/email if available, but notify user
  await saveLinkedInProfile(c.env.DB, userId, linkedInProfile);
  return c.redirect(`${frontendUrl}/profile?warning=linkedin_limited_data`);
}

await saveLinkedInProfile(c.env.DB, userId, linkedInProfile);
return c.redirect(`${frontendUrl}/profile?success=linkedin_imported`);
```

**Frontend:** The profile page already reads query params for error handling. Add handling for `warning=linkedin_limited_data` to show an informative toast explaining that LinkedIn's API only provides basic info (name + email) without Partner Program access.

**Confidence:** HIGH — the LinkedIn service code explicitly comments "Requires partner access" on empty arrays.

---

### Pattern 6: AI Response Fallback Templates (GRACE-02)

**What:** `parseMatchJSON` in `job-matching.service.ts` throws an error on malformed JSON. `parseResume` already has a fallback (returns empty struct), but job matching does not — this causes the entire recommendation flow to fail for that job.

**Current:** `parseMatchJSON` throws `'Failed to parse match analysis'` → caught in the loop → job silently dropped.

**Fix:** Return a default template when JSON parsing fails, rather than throwing:

```typescript
function parseMatchJSON(text: string): JobMatchResult {
  try {
    // ... existing extraction logic ...
    const parsed = JSON.parse(jsonText);
    if (typeof parsed.score !== 'number' || !parsed.strengths || !parsed.concerns || !parsed.recommendation) {
      throw new Error('Missing required fields');
    }
    return parsed;
  } catch (error) {
    console.error('[Job Match] Parse error, using fallback template:', error);
    // Return a neutral fallback — don't surface as error to user
    return {
      score: 50,
      strengths: ['Unable to analyze at this time'],
      concerns: ['Analysis temporarily unavailable'],
      recommendation: 'fair',
      summary: 'Analysis could not be completed. Please try again.'
    };
  }
}
```

**The fallback prevents:** total recommendation failure when AI returns non-JSON output (markdown, truncated response, rate limit error text).

**Confidence:** HIGH — existing pattern in `parseResume` already does this; matching the same defensive approach.

---

### Pattern 7: Structured Logger Utility (GRACE-03)

**What:** 149 `console.*` calls across backend services use ad-hoc string formatting. Cloudflare Workers Logs indexes structured JSON objects automatically — string concatenation produces single opaque fields.

**Recommended pattern (Cloudflare docs):**

```typescript
// src/utils/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export function createLogger(module: string) {
  return {
    info: (message: string, data?: Record<string, unknown>) =>
      console.log(JSON.stringify({ level: 'info', module, message, ...data })),
    warn: (message: string, data?: Record<string, unknown>) =>
      console.warn(JSON.stringify({ level: 'warn', module, message, ...data })),
    error: (message: string, data?: Record<string, unknown>) =>
      console.error(JSON.stringify({ level: 'error', module, message, ...data })),
    debug: (message: string, data?: Record<string, unknown>) =>
      console.log(JSON.stringify({ level: 'debug', module, message, ...data })),
  };
}

// Usage in service:
const logger = createLogger('job-matching');
logger.info('Cache hit', { cacheKey });
logger.error('Analysis failed', { jobId: job.id, error: String(err) });
```

**Scope:** Replace `console.*` calls in the high-traffic services first: `job-matching.service.ts`, `job-recommendations.service.ts`, `resume.service.ts`, `linkedin-parser.service.ts`. The remaining files (admin, email) can be done opportunistically.

**Do NOT replace all 149 at once** — focus on services touched by other Phase 4 tasks to avoid scope creep.

**Confidence:** HIGH — pattern is from Cloudflare official docs; no new dependencies.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF text extraction | Custom TextDecoder heuristics | unpdf | PDF binary format is too complex for regex stripping; unpdf uses proper PDF.js renderer |
| Cache prefix invalidation | KV key scanning + delete loop | Cache-bust-by-key (embed `updated_at` in key) | KV doesn't support efficient prefix listing; old keys expire naturally via TTL |
| Cursor encoding | Custom serialization | `btoa(JSON.stringify({posted_date, id}))` | Simple, no external library needed |
| Structured logging | winston, pino | Simple `console.log(JSON.stringify({}))` wrapper | Workers has no file system; third-party loggers add bundle size for no benefit |

**Key insight:** In Cloudflare Workers, everything runs in a constrained runtime. Prefer thin wrappers over heavy libraries, and prefer Workers-native patterns (KV TTL, structured console.log) over importing Node.js ecosystem solutions.

---

## Common Pitfalls

### Pitfall 1: Using pdf-parse browser build in Workers
**What goes wrong:** `pdf-parse@2.4.5` web build uses `OffscreenCanvas`. Workers throws `ReferenceError: OffscreenCanvas is not defined` at runtime.
**Why it happens:** The package has a browser export condition, but Workers does not implement the full browser API surface.
**How to avoid:** Import from `unpdf` instead. Remove pdf-parse from backend dependencies or keep only for Node.js builds.
**Warning signs:** Worker deploy succeeds but resume upload returns 500 with OffscreenCanvas error in logs.

### Pitfall 2: KV Prefix Deletion for Cache Invalidation
**What goes wrong:** Attempting to list/delete all `match:{userId}:*` keys from KV on profile update.
**Why it happens:** KV `list()` has limits and requires multiple pagination calls; delete-by-prefix is not atomic.
**How to avoid:** Use cache-bust-by-key (embed `updated_at` timestamp in the key). Old entries expire via TTL (7 days).
**Warning signs:** Profile update invalidation logic is slow or returns stale data intermittently.

### Pitfall 3: Breaking the jobs API response shape
**What goes wrong:** Changing `{ jobs: [] }` to `{ jobs: [], nextCursor, hasMore }` breaks frontend components that destructure the response.
**Why it happens:** Frontend's `api-client.ts` will have typed response expectations.
**How to avoid:** Check all callers of the jobs API before adding new response fields. The new fields are additive (not breaking) but TypeScript types must be updated.
**Warning signs:** TypeScript compile errors in frontend after route change.

### Pitfall 4: N+1 Re-Introduction in analyzeJobMatch Signature Change
**What goes wrong:** Changing `analyzeJobMatch` to accept pre-loaded context breaks its KV cache check — the cache still works on `userId:jobId` but the function signature changes.
**Why it happens:** Refactoring the function to accept context externally may leave callers that still call it directly (e.g., `/api/jobs/:id/analyze` route).
**How to avoid:** Keep `analyzeJobMatch` signature backward-compatible or update all callers. The `/api/jobs/:id/analyze` route calls it for single-job analysis and can keep loading profile inline (it's a single analysis, not a loop).

### Pitfall 5: Cursor Pagination Breaking Filter Combinations
**What goes wrong:** Adding a cursor filter (`WHERE posted_date < ? OR (posted_date = ? AND id < ?)`) combined with LIKE filters for title/location produces unexpected results.
**Why it happens:** The compound cursor WHERE clause interacts with other AND conditions in complex ways.
**How to avoid:** Structure the query as: `WHERE (cursor_condition) AND (other_filters)` — wrap the cursor condition in parentheses.

---

## Code Examples

### PDF Text Extraction with unpdf
```typescript
// Source: https://developers.cloudflare.com/r2/tutorials/summarize-pdf/
import { extractText, getDocumentProxy } from 'unpdf';

async function extractTextFromPDF(pdfBuffer: ArrayBuffer): Promise<string> {
  try {
    const pdf = await getDocumentProxy(new Uint8Array(pdfBuffer));
    const { totalPages, text } = await extractText(pdf, { mergePages: true });
    console.log(`[Resume Parser] Extracted ${text.length} chars from ${totalPages} pages`);
    return text;
  } catch (error) {
    console.error('[Resume Parser] PDF extraction failed:', error);
    return '';
  }
}
```

### Cursor-Based Pagination for D1
```typescript
// Source: Verified pattern from Drizzle ORM docs + D1 SQLite semantics
function encodeCursor(job: { posted_date: number; id: string }): string {
  return btoa(JSON.stringify({ posted_date: job.posted_date, id: job.id }));
}

function decodeCursor(cursor: string): { posted_date: number; id: string } | null {
  try {
    return JSON.parse(atob(cursor));
  } catch {
    return null;
  }
}

// In getJobs():
const PAGE_SIZE = 20;
let query = cursor
  ? `SELECT * FROM jobs WHERE (posted_date < ? OR (posted_date = ? AND id < ?)) ORDER BY posted_date DESC, id DESC LIMIT ?`
  : `SELECT * FROM jobs WHERE 1=1 ORDER BY posted_date DESC, id DESC LIMIT ?`;
```

### Cache-Bust-by-Key for Profile Updates
```typescript
// In analyzeJobMatch — include user's updated_at in key
const profileVersion = userProfile.updated_at || 0;
const cacheKey = `match:${userProfile.id}:${job.id}:v${profileVersion}`;
const cached = await env.KV_CACHE.get(cacheKey);
// Old keys (with old updated_at) become orphaned and expire via 7-day TTL
```

### Structured Logger
```typescript
// Source: https://developers.cloudflare.com/workers/observability/logs/workers-logs/
export function createLogger(module: string) {
  return {
    info: (message: string, data?: Record<string, unknown>) =>
      console.log(JSON.stringify({ level: 'info', module, message, ...data })),
    error: (message: string, data?: Record<string, unknown>) =>
      console.error(JSON.stringify({ level: 'error', module, message, ...data })),
    warn: (message: string, data?: Record<string, unknown>) =>
      console.warn(JSON.stringify({ level: 'warn', module, message, ...data })),
  };
}
```

### LinkedIn Empty Data Detection
```typescript
// Detect whether LinkedIn returned anything useful
function hasLinkedInData(profile: LinkedInProfile): boolean {
  return profile.positions.length > 0
    || profile.educations.length > 0
    || profile.skills.length > 0;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| TextDecoder for PDF | unpdf (PDF.js edge build) | 2023-present | Correct text extraction vs garbled binary output |
| OFFSET pagination | Keyset/cursor pagination | Standard practice | No row duplication on concurrent inserts; stable page boundaries |
| String log messages | JSON structured logs | Cloudflare Workers Logs GA (2024) | Queryable, indexable log fields |

**Deprecated/outdated:**
- `TextDecoder` for PDF parsing: Only works for pure-text formats; PDFs are binary with compression — never appropriate.
- Offset-based pagination with COUNT(*): Expensive full-table scan; unstable across inserts/deletes.

---

## Open Questions

1. **Does unpdf bundle size affect Worker CPU limits?**
   - What we know: unpdf bundles PDF.js (~2MB uncompressed). Cloudflare Workers have a 1MB compressed bundle limit on free tier, 10MB on paid.
   - What's unclear: Whether this project's Worker is on free or paid tier; current bundle size.
   - Recommendation: Check `wrangler deploy --dry-run` output for bundle size before committing. If over limit, consider using Cloudflare AI's `ai.toMarkdown()` function which accepts PDF buffers natively (seen in Hacker News discussion as of 2025, but not yet in official docs as stable API).

2. **Does the frontend handle the new paginated jobs response?**
   - What we know: The frontend calls `/api/jobs` and destructures `{ jobs }`. The new response adds `nextCursor` and `hasMore` fields.
   - What's unclear: Whether any frontend component will break on unexpected fields (TypeScript strict mode would catch this if types are updated).
   - Recommendation: Update the TypeScript response type in `api-client.ts` alongside the route change. Verify that the jobs list page currently renders all returned jobs (not paginated) — adding pagination UI is out of scope for this phase.

3. **Is the `/api/jobs/:id/analyze` route's cache key also affected by PERF-03?**
   - What we know: Uses key `job-analysis:{userId}:{jobId}` with 7-day TTL; caches `mockJobAnalysis` result.
   - What's unclear: `mockJobAnalysis` doesn't use user profile data — it only uses `userSkills` (from parsed user.skills JSON) and `jobRequirements`. So the cache should ALSO include the user's `updated_at` since skills change on profile update.
   - Recommendation: Apply the same `v${updated_at}` suffix to this cache key too.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `packages/backend/src/services/resume.service.ts` — confirmed TextDecoder implementation
- Direct codebase inspection: `packages/backend/src/services/job-matching.service.ts` — confirmed 4 sequential queries per job call
- Direct codebase inspection: `packages/backend/src/services/linkedin.service.ts` — confirmed all arrays empty with "Requires partner access" comments
- Direct codebase inspection: `packages/backend/src/routes/jobs.ts` — confirmed cache key pattern and KV cache usage
- `packages/backend/package.json` — confirmed `pdf-parse@2.4.5` installed; has `browser` export using OffscreenCanvas
- `migrations/0004_phase3_ai_features.sql` — confirmed `idx_jobs_created_at` index exists
- `migrations/0001_initial_schema.sql` — confirmed `posted_date` column exists; no index on it
- [Cloudflare R2 + Workers AI PDF Tutorial](https://developers.cloudflare.com/r2/tutorials/summarize-pdf/) — official Cloudflare recommendation of `unpdf`
- [Cloudflare Workers Logs docs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/) — structured JSON logging pattern

### Secondary (MEDIUM confidence)
- [unpdf GitHub README](https://github.com/unjs/unpdf) — `extractText(pdf, { mergePages: true })` API confirmed
- [Drizzle ORM cursor pagination guide](https://orm.drizzle.team/docs/guides/cursor-based-pagination) — keyset WHERE clause pattern verified
- [Cloudflare workerd issue #54](https://github.com/cloudflare/workerd/issues/54) — OffscreenCanvas not supported in Workers confirmed

### Tertiary (LOW confidence)
- WebSearch: Cloudflare D1 cursor pagination blog posts — general confirmation of keyset approach, no D1-specific syntax verified
- HN discussion about `ai.toMarkdown()` for PDF parsing — mentioned as alternative but not in stable official docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — unpdf confirmed from official Cloudflare docs; all other tools already in project
- Architecture: HIGH — all patterns verified against actual code in the codebase
- Pitfalls: HIGH — OffscreenCanvas limitation confirmed from official GitHub issues; other pitfalls from direct code analysis

**Research date:** 2026-02-21
**Valid until:** 2026-03-21 (stable APIs; Cloudflare compatibility flags rarely change)
