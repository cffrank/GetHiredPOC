# Phase 3: Security + Error Handling - Research

**Researched:** 2026-02-21
**Domain:** Web security headers, XSS sanitization, file validation, session management, React error boundaries, toast notifications
**Confidence:** HIGH (most findings verified via official docs or directly inspecting codebase)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Error notifications:**
- Mix of toasts and inline messages: toasts for global actions (save, delete, status changes), inline messages for form validation errors
- Toast position: top-right
- Toast duration: 3 seconds for success, 5 seconds for errors
- Toasts include contextual action buttons where appropriate — Retry on failures, Undo on destructive actions

**Error boundary fallback UI:**
- Simple message + retry button (no illustrations)
- Friendly and casual tone — e.g., "Oops, something went wrong! Let's try that again."
- Per-section granularity — each major section (sidebar, main content, card groups) gets its own error boundary so one crash does not take out the whole page
- Console-only error logging (no external error reporting service)

**CSP strictness:**
- Strict CSP — block inline scripts and styles, whitelist specific domains
- Known external resources to whitelist: Google Fonts (fonts.googleapis.com, fonts.gstatic.com), AI/LLM API endpoints (backend only, not browser-facing)
- Claude should audit the codebase for other external resource references (CDN assets, analytics) and include them in the whitelist
- May require refactoring any inline styles to CSS classes/Tailwind

**AI output sanitization:**
- Allow safe HTML subset — basic formatting (bold, italic, lists, headings) preserved, scripts/iframes/event handlers stripped
- Sanitize at both storage time AND render time (defense in depth)
- Reasonable max length limits per resume field — Claude decides specific limits based on the schema
- AI-parsed resume fields with max length caps to prevent runaway output

### Claude's Discretion
- Handling of malformed/unexpected AI output (reject vs store-and-flag)
- Specific max length values per resume field
- Exact CSP directives after auditing external resources
- Choice of HTML sanitization library
- Toast component implementation details
- Error boundary component structure

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SEC-01 | Security headers (CSP, HSTS, X-Frame-Options) applied globally via Hono secureHeaders | Hono secureHeaders() middleware covers all three; existing rwsdk app already has partial CSP in headers.ts — needs X-Frame-Options added explicitly |
| SEC-02 | AI-parsed resume fields sanitized for XSS before database storage | js-xss is the correct library for Cloudflare Workers (no DOM required); applies to both backend resume.service.ts and rwsdk resume-parser.ts |
| SEC-03 | File uploads validated via magic byte inspection before processing | Magic byte check must happen BEFORE MIME type trust; PDF magic bytes are %PDF (0x25 0x50 0x44 0x46); implement in both resume upload paths |
| SEC-04 | Expired sessions cleaned up from D1 database periodically | D1 sessions table has expires_at column and idx_sessions_expires_at index; cleanup is a scheduled cron job on the backend Worker which already has a cron trigger |
| SEC-05 | bcryptjs CPU usage profiled in Workers; replaced with PBKDF2 if exceeding limits | bcryptjs at cost factor 10 has historically exceeded Workers CPU limit; PBKDF2 via crypto.subtle is the standard replacement; existing codebase uses bcryptjs at cost factor 10 in both auth modules |
| ERR-01 | Typed error classes (NotFoundError, ValidationError, ForbiddenError) with correct HTTP status codes | Both codebases have only toMessage() helper; need to add typed error classes in both packages/backend/src/utils/errors.ts and src/app/lib/ |
| ERR-02 | Global error handler converts typed errors to consistent JSON responses | Backend index.ts already has app.onError() but returns generic 500; needs to check instanceof typed errors and return correct status codes |
| ERR-03 | React error boundaries contain crashes per UI domain (Profile, Applications, JobDetail) | react-error-boundary v6.1.1 is the standard; both frontend apps need boundaries around Profile, Applications, JobDetail sections |
| ERR-04 | User-friendly error notifications replace alert() calls | alert() found in src/app/pages/Profile.tsx (5 instances); confirm() in src/app/pages/Applications.tsx (1 instance); alert()/confirm() also in packages/frontend/src/ (admin pages and Resume/WorkExperience/Education) |
</phase_requirements>

## Summary

This phase has two distinct sub-domains: backend security hardening and frontend error UX. They are largely independent and can be planned as separate work streams.

**Backend security** covers four requirements: adding security headers via Hono secureHeaders() on the backend Worker (the rwsdk app already has a partial implementation in src/app/headers.ts but is missing X-Frame-Options and has unsafe-inline in style-src); sanitizing AI-parsed resume fields with js-xss before DB storage; validating file magic bytes before processing; cleaning up expired D1 sessions via the backend cron trigger; and profiling bcryptjs CPU usage (strong evidence it must be replaced with PBKDF2 via crypto.subtle).

**Frontend error UX** covers two requirements: adding React error boundaries around the three major UI sections using react-error-boundary, and replacing all alert()/confirm() calls with toast notifications. There is no existing toast library in the project — one must be added. The user specified toast behavior in detail (top-right, 3s/5s, Retry/Undo actions). The alert() calls are concentrated in Profile.tsx (rwsdk app) and admin pages (frontend package).

**Primary recommendation:** Tackle backend security first (SEC-01 through SEC-05) as a single plan, then frontend error UX (ERR-01 through ERR-04) as a second plan. The two domains share no code and can be planned independently.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| hono/secure-headers | built-in to Hono 4.x | Security headers middleware for backend Worker | Official Hono built-in, zero deps, configurable CSP/HSTS/X-Frame-Options |
| js-xss | ^1.0.15 | HTML sanitization without DOM dependency | Only widely-used XSS sanitizer that works in Cloudflare Workers without a DOM; DOMPurify fails with window not defined |
| crypto.subtle (Web Crypto API) | built-in to Workers | PBKDF2 password hashing | Built into Workers runtime; bcryptjs at cost factor 10 exceeds CPU limits |
| react-error-boundary | ^6.1.1 | React error boundaries with functional component API | Industry standard; avoids hand-writing class components; 1,846 dependents |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | ^2.x | Toast notifications | Needed for ERR-04; no existing toast library in either codebase; matches Linear/Slack style |
| rwsdk nonce | built-in | Per-request CSP nonce for inline scripts | Already used in headers.ts; must be preserved when tightening CSP |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| js-xss | DOMPurify | DOMPurify requires a DOM (window) — throws in Cloudflare Workers; js-xss is pure JS |
| js-xss | sanitize-html | sanitize-html requires node:path which is unavailable in Cloudflare Workers |
| crypto.subtle PBKDF2 | bcryptjs | bcryptjs at cost factor 10 uses hundreds of ms CPU; Worker free plan limit is 10ms; paid plan is marginal |
| react-error-boundary | Custom class component | Custom class components work but require more boilerplate; library provides useErrorBoundary hook and retry support |
| sonner | react-hot-toast | Both work; sonner is more actively maintained and natively supports action buttons with Retry/Undo |

**Installation:**
```bash
# In packages/backend (for js-xss)
npm install xss --workspace=packages/backend

# In packages/frontend (for react-error-boundary + sonner)
npm install react-error-boundary sonner --workspace=packages/frontend

# In root src/ (rwsdk app — for react-error-boundary + sonner)
npm install react-error-boundary sonner
```

## Architecture Patterns

### Recommended Project Structure Changes

```
src/app/
├── components/
│   ├── ErrorBoundary.tsx     # NEW: reusable error boundary wrapper
│   ├── Toast.tsx             # NEW: toast provider + hook
│   └── ...
├── pages/
│   ├── Profile.tsx           # MODIFY: wrap sections in ErrorBoundary, replace alert()
│   ├── Applications.tsx      # MODIFY: wrap in ErrorBoundary, replace confirm()
│   └── JobDetail.tsx         # MODIFY: wrap in ErrorBoundary

packages/backend/src/
├── utils/
│   └── errors.ts             # MODIFY: add typed error classes
├── index.ts                  # MODIFY: update onError handler to use typed errors
└── services/
    └── auth.service.ts       # MODIFY: replace bcryptjs with PBKDF2
```

### Pattern 1: Hono secureHeaders Middleware (Backend)

**What:** Apply all security headers globally using Hono's built-in middleware
**When to use:** At the top of the Hono app before any routes

```typescript
// Source: https://hono.dev/docs/middleware/builtin/secure-headers
import { secureHeaders } from 'hono/secure-headers';

app.use(secureHeaders({
  strictTransportSecurity: 'max-age=63072000; includeSubDomains; preload',
  xFrameOptions: 'SAMEORIGIN',
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
    objectSrc: ["'none'"],
    frameAncestors: ["'none'"],
  },
}));
```

**Note for rwsdk app:** The rwsdk setCommonHeaders() middleware in src/app/headers.ts already sets HSTS, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy. It also sets a CSP but with 'unsafe-eval' (for rwsdk dev needs) and 'unsafe-inline' style-src. Phase 3 must audit what can be removed and add X-Frame-Options. The nonce (rw.nonce) must be preserved.

**Critical finding — current rwsdk CSP state:**
- Has: 'unsafe-eval' in script-src (may be required by rwsdk for module loading)
- Has: 'unsafe-inline' in style-src (should be removed or replaced with nonce)
- Missing: X-Frame-Options header entirely

### Pattern 2: js-xss Sanitization (Backend)

**What:** Strip dangerous HTML from AI-parsed resume fields before storage
**When to use:** In resume.service.ts and resume-upload.ts after AI parsing, before DB insert

```typescript
// Source: https://github.com/leizongmin/js-xss
import xss from 'xss';

const sanitizeOptions = {
  whiteList: {
    b: [], strong: [], i: [], em: [], u: [], s: [],
    h1: [], h2: [], h3: [], h4: [],
    p: [], br: [],
    ul: [], ol: [], li: [],
    // NOT included: script, iframe, form, input, a (with href), img
  },
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style', 'iframe'],
};

function sanitizeField(value: string, maxLength: number): string {
  if (!value) return '';
  const sanitized = xss(value, sanitizeOptions);
  return sanitized.substring(0, maxLength);
}
```

**Recommended max lengths per ParsedResume field:**

| Field | Max Length | Rationale |
|-------|-----------|-----------|
| name | 200 | Reasonable name length |
| email | 255 | Email RFC max |
| phone | 50 | International formats |
| location | 200 | City, State, Country |
| headline | 500 | LinkedIn-style headline |
| summary | 5000 | Professional summary paragraph |
| workExperience[].company | 300 | Company name |
| workExperience[].title | 300 | Job title |
| workExperience[].description | 3000 | Role description |
| workExperience[].achievements[] | 1000 each | Single achievement bullet |
| education[].school | 300 | School name |
| skills[] | 100 each | Single skill name |
| certifications[].name | 300 | Cert name |
| languages[] | 100 each | Language name |

Sanitize HTML-capable fields (summary, description, achievements) with xss(). Sanitize structured string fields (name, email, phone, location) with trim() and maxLength only — no HTML expected there.

### Pattern 3: Magic Byte File Validation (Backend)

**What:** Inspect first bytes of uploaded file to verify actual format before trusting MIME type
**When to use:** In resume upload handlers before any parsing

```typescript
// PDF magic bytes: %PDF (0x25 0x50 0x44 0x46)
async function validateFileMagicBytes(
  buffer: ArrayBuffer,
  declaredType: string
): Promise<boolean> {
  const bytes = new Uint8Array(buffer.slice(0, 8));

  if (declaredType === 'application/pdf') {
    return bytes[0] === 0x25 && bytes[1] === 0x50 &&
           bytes[2] === 0x44 && bytes[3] === 0x46;
  }
  if (declaredType === 'text/plain') {
    try {
      new TextDecoder('utf-8', { fatal: true }).decode(buffer.slice(0, 1024));
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

// Usage — read header bytes first, then full buffer only if valid:
const headerBuffer = await file.slice(0, 8).arrayBuffer();
const magicValid = await validateFileMagicBytes(headerBuffer, file.type);
if (!magicValid) {
  return Response.json({ error: 'File content does not match declared type' }, { status: 400 });
}
const arrayBuffer = await file.arrayBuffer();
```

**Note:** Both the rwsdk resume-upload.ts and the backend resumes.ts route check file.type (MIME from browser) but never inspect actual bytes. Both paths need this check.

### Pattern 4: PBKDF2 Password Hashing (Backend)

**What:** Replace bcryptjs with Web Crypto API PBKDF2
**When to use:** For all password hash and verify operations

```typescript
// Source: https://lord.technology/2024/02/21/hashing-passwords-on-cloudflare-workers.html

const PBKDF2_ITERATIONS = 100000;
const HASH_ALG = 'SHA-256';

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: HASH_ALG },
    keyMaterial,
    256
  );
  const hashArr = new Uint8Array(bits);
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(hashArr).map(b => b.toString(16).padStart(2, '0')).join('');
  return `pbkdf2:${PBKDF2_ITERATIONS}:${saltHex}:${hashHex}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  // Support both old bcryptjs hashes and new PBKDF2 hashes
  if (stored.startsWith('$2b$') || stored.startsWith('$2a$')) {
    // Legacy bcryptjs hash — use bcryptjs for verification only
    const bcrypt = await import('bcryptjs');
    return bcrypt.compare(password, stored);
  }
  const [, iterStr, saltHex, storedHashHex] = stored.split(':');
  const iterations = parseInt(iterStr);
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(h => parseInt(h, 16)));
  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: HASH_ALG },
    keyMaterial, 256
  );
  const attemptHex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
  return attemptHex === storedHashHex;
}
```

**Migration strategy:** On successful login with a legacy bcryptjs hash, re-hash with PBKDF2 and update the stored hash. This handles all existing users over time without a forced password reset.

### Pattern 5: Session Cleanup Cron (Backend)

**What:** Periodically delete rows from sessions table where expires_at < now
**When to use:** In the backend Worker's scheduled() handler (cron already configured)

```typescript
// In packages/backend/src/index.ts scheduled() handler
// Already has: crons = ["0 1 * * *"] in wrangler.toml

async function cleanupExpiredSessions(env: Env): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const result = await env.DB.prepare(
    'DELETE FROM sessions WHERE expires_at < ?'
  ).bind(now).run();
  console.log(`[SessionCleanup] Deleted ${result.meta.changes} expired sessions`);
}

// Add to scheduled() handler alongside importJobsForAllUsers
ctx.waitUntil(cleanupExpiredSessions(env));
```

**Note:** KV sessions auto-expire via TTL (configured in createSession). Only D1 rows need explicit cleanup. The index idx_sessions_expires_at exists and makes this query fast. The rwsdk app (src/) has no cron handler — session cleanup belongs to the backend package only.

### Pattern 6: Typed Error Classes (Backend)

**What:** Error classes that carry HTTP status codes, consumed by global error handler
**When to use:** Throw from service and route handlers instead of generic Error

```typescript
// packages/backend/src/utils/errors.ts — extend existing file

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') { super(404, message); }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed') { super(400, message); }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') { super(403, message); }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') { super(401, message); }
}

// Updated global error handler in index.ts
app.onError((err, c) => {
  console.error(err);
  if (err instanceof AppError) {
    return c.json({ error: err.message }, err.statusCode as any);
  }
  return c.json({ error: 'Internal server error' }, 500);
});
```

### Pattern 7: React Error Boundaries (Frontend)

**What:** Wrap UI sections to catch render errors and show fallback instead of blank page
**When to use:** Around Profile, Applications, and JobDetail page sections

```tsx
// Source: https://github.com/bvaughn/react-error-boundary
import { ErrorBoundary } from 'react-error-boundary';
import type { FallbackProps } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  console.error('[ErrorBoundary]', error);
  return (
    <div className="p-6 rounded-lg border text-center">
      <p className="text-muted-foreground mb-4">
        Oops, something went wrong! Let's try that again.
      </p>
      <button onClick={resetErrorBoundary} className="btn">
        Retry
      </button>
    </div>
  );
}

// Usage: wrap each major section separately, not the navigation
<ErrorBoundary FallbackComponent={ErrorFallback}>
  <ProfileContent />
</ErrorBoundary>
```

**Boundary placement for rwsdk app:**
- Profile.tsx: wrap the profile Card content and the Resume Modal separately
- Applications.tsx: wrap the kanban board (not the outer navigation)
- JobDetail.tsx: wrap the job content card and the analysis section

### Pattern 8: Toast Notifications (Frontend)

**What:** Replace alert() and confirm() with non-blocking notifications
**Library:** sonner — matches Linear/Slack style, top-right, stacking, action buttons

```tsx
// Source: https://sonner.emilkowal.ski/
import { Toaster, toast } from 'sonner';

// Add <Toaster /> once in the root Document component
<Toaster position="top-right" richColors />

// Success toast (3 second default)
toast.success('Resume imported successfully!');

// Error toast with Retry action (5 seconds)
toast.error('Failed to upload resume', {
  duration: 5000,
  action: {
    label: 'Retry',
    onClick: () => handleResumeUpload()
  }
});
```

**Replacing confirm() calls:** The user specified replacing alert() calls. The confirm() calls (Applications delete, admin pages, Resume/WorkExperience/Education delete) must also be replaced. Best pattern: toggle a confirmation state inline — show the delete button, on click show "Really delete? [Confirm] [Cancel]" inline, no blocking dialog.

### Anti-Patterns to Avoid

- **Trusting MIME type alone for file validation:** file.type comes from the browser and can be spoofed. Always check magic bytes.
- **Using DOMPurify in Cloudflare Workers:** Throws window is not defined because there is no DOM in the Workers runtime.
- **Using sanitize-html in Cloudflare Workers:** Requires node:path which causes issues even with nodejs_compat.
- **Keeping bcryptjs at cost factor 10:** Historically causes CPU limit violations on Workers free tier; on paid tier it is marginal and unpredictable.
- **Calling alert() from async error handlers:** Blocks the UI thread; terrible UX.
- **One global error boundary:** If the entire app is wrapped in one boundary, a crash in any section takes down everything including navigation. Use per-section boundaries.
- **Omitting X-Frame-Options on the rwsdk app:** The current headers.ts sets CSP frame-ancestors 'self' but not the X-Frame-Options header — older browsers ignore CSP frame-ancestors and need the header.
- **Removing 'unsafe-eval' from script-src without testing:** rwsdk may require it for module loading in production.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| XSS sanitization | Custom regex-based tag stripper | js-xss | Regex-based sanitization misses nested escaping, unicode tricks, encoded attacks — all known to bypass naive implementations |
| Error boundaries | Class component manually | react-error-boundary | Library provides resetKeys, onReset, useErrorBoundary hook — all non-trivial to implement correctly |
| Toast system | Custom CSS animation plus state | sonner | Handles stacking, exit animations, action buttons, accessibility, and portal rendering correctly |
| PBKDF2 hashing | Custom crypto loop | crypto.subtle | Built into Workers runtime; zero dependencies; uses hardware-accelerated crypto |

**Key insight:** XSS sanitization is a known hard problem with a long history of bypasses. The safe HTML subset (bold, italic, lists, headings) that the user wants preserved is exactly what js-xss's whitelist approach handles correctly. Do not hand-roll it.

## Common Pitfalls

### Pitfall 1: Inline Styles vs CSP style-src

**What goes wrong:** Developers assume React style={{...}} props are blocked by CSP style-src restrictions and convert them all to Tailwind.
**Why it happens:** Confusion between HTML style="..." attributes (blocked by strict CSP) and React's inline style prop (applied via JavaScript, not HTML).
**How to avoid:** React JSX style={{...}} applies styles programmatically via the DOM API and is NOT blocked by CSP style-src. The Applications.tsx style={{ opacity }} and style={{ backgroundColor }} inline style props are safe and do not need conversion to Tailwind to satisfy CSP requirements. The CSP audit should focus on actual HTML style attributes and link/style tags.
**Warning signs:** If you find style={{}} usage in the audit, verify it is genuinely problematic before changing it.

### Pitfall 2: Two Separate Codebases

**What goes wrong:** Implementing SEC-01 (security headers) only on the backend Worker and forgetting the rwsdk frontend/API app, or vice versa.
**Why it happens:** The project has two separate Hono/Worker apps: packages/backend/ (the API) and src/ (the rwsdk app that serves the frontend and some API routes).
**How to avoid:** SEC-01 must be applied to BOTH:
- packages/backend/src/index.ts — the API Worker (currently has NO security headers at all)
- src/app/headers.ts — the rwsdk app (already has partial headers, needs X-Frame-Options and CSP tightening)

### Pitfall 3: Double bcryptjs Implementations

**What goes wrong:** Only replacing bcryptjs in one auth module while leaving the other intact.
**Why it happens:** The project has bcryptjs usage in TWO places:
- src/app/lib/auth.ts (rwsdk app)
- packages/backend/src/services/auth.service.ts (backend package)
**How to avoid:** Both must be migrated to PBKDF2. Both must handle the migration path for existing bcryptjs hashes.

### Pitfall 4: AI Sanitization Only at Write Time

**What goes wrong:** Sanitizing AI output before DB storage but then rendering raw DB values without escaping on the frontend.
**Why it happens:** Defense in depth requires sanitization at both layers — an old record stored before sanitization was added, or direct DB manipulation, would still reach users unsanitized.
**How to avoid:** Sanitize at write (backend with js-xss) AND escape at render (frontend). React's JSX escapes strings by default when rendering as text nodes. The concern is specifically if any component renders resume content with dangerouslySetInnerHTML — audit all resume display components and either confirm they render as text or add client-side sanitization.

### Pitfall 5: Magic Byte Check After Full File Read

**What goes wrong:** Reading the entire file into memory first, then checking magic bytes — wastes memory and CPU for rejected files.
**Why it happens:** Code typically reads the full arrayBuffer() before any validation.
**How to avoid:** Read only the first 8 bytes for magic byte check using file.slice(0, 8).arrayBuffer(), reject early, then read the full file only for valid files.

### Pitfall 6: bcryptjs Migration Without Backward Compatibility

**What goes wrong:** Replacing bcryptjs with PBKDF2 breaks login for all existing users whose passwords are stored as bcryptjs hashes.
**Why it happens:** The hash format changes from $2b$10$... to pbkdf2:100000:....
**How to avoid:** Detect hash format at login time. If stored hash starts with $2b$, use bcryptjs to verify (verification-only, not hashing), then re-hash with PBKDF2 and update the stored hash. This lazy migration handles all users over time without a forced password reset.

### Pitfall 7: Error Boundary Placement Too Coarse

**What goes wrong:** Wrapping an entire page in one error boundary causes Navigation to disappear when an error occurs.
**Why it happens:** Developers wrap the outermost component.
**How to avoid:** Place boundaries around content sections, not navigation. The Navigation component should always be outside any ErrorBoundary.

## Code Examples

### Alert/Confirm Inventory — Complete List

**In src/ (rwsdk app):**
- src/app/pages/Profile.tsx line 104: alert(error.error or "Failed to parse resume") -> error toast with Retry
- src/app/pages/Profile.tsx line 107: alert("Failed to upload resume") -> error toast
- src/app/pages/Profile.tsx line 128: alert("Resume data imported successfully!") -> success toast
- src/app/pages/Profile.tsx line 131: alert(error.error or "Failed to save resume data") -> error toast
- src/app/pages/Profile.tsx line 134: alert("Failed to save resume data") -> error toast
- src/app/pages/Applications.tsx line 39: confirm("Are you sure you want to delete this application?") -> inline confirmation UI

**In packages/frontend/ (frontend package):**
- packages/frontend/src/pages/admin/AdminPrompts.tsx lines 46, 58, 98, 107: 4x alert() -> toasts
- packages/frontend/src/pages/admin/AdminJobs.tsx lines 42, 52, 63: 3x alert() -> validation toasts
- packages/frontend/src/pages/admin/AdminUsers.tsx line 52: confirm() -> inline confirm
- packages/frontend/src/pages/Resume.tsx line 205: confirm() -> inline confirm
- packages/frontend/src/components/WorkExperience.tsx line 238: confirm() -> inline confirm
- packages/frontend/src/components/Education.tsx line 240: confirm() -> inline confirm

### Where AI Resume Sanitization Belongs

The AI-parsed resume flow has two code paths — both must sanitize:

**Path A (rwsdk app):**
1. src/app/api/resume-upload.ts calls parseResumeWithAI() which returns ParsedResume
2. Sanitize the returned ParsedResume fields BEFORE returning to client in handleResumeUpload
3. handleResumeConfirm receives parsedResume from client — sanitize AGAIN before calling saveParsedResumeToProfile() since the client could have modified the data

**Path B (backend package):**
1. packages/backend/src/routes/resumes.ts calls parseResume() which returns ParsedResume
2. packages/backend/src/services/resume.service.ts calls saveResume() to DB — sanitize the ParsedResume before saveResume() is called in the route handler

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| bcryptjs in Cloudflare Workers | crypto.subtle PBKDF2 | 2023-2024 | Workers CPU limit makes bcryptjs unsafe; PBKDF2 uses hardware crypto |
| DOMPurify for all environments | js-xss for Workers, DOMPurify for browser | 2023+ | DOMPurify DOM dependency breaks Workers runtime |
| Custom class ErrorBoundary | react-error-boundary library | 2022+ | Library provides hooks API, retry support, HOC patterns |
| alert() and confirm() dialogs | Toast notifications plus inline confirmations | Ongoing | Blocking dialogs are hostile UX; toasts are non-blocking |
| X-Powered-By header exposed | Removed by secureHeaders default | Hono 4.x | Information disclosure reduction |

**Deprecated/outdated:**
- sanitize-html in Cloudflare Workers: requires node:path, breaks without nodejs_compat
- isomorphic-dompurify in Workers: still fails — the window polyfill does not satisfy DOMPurify in workerd
- bcryptjs with cost factor 10 in Workers: breaks CPU limits; community consensus is to not use it

## Open Questions

1. **Does 'unsafe-eval' in script-src need to stay for rwsdk?**
   - What we know: rwsdk uses it in the existing CSP; present since project started
   - What is unclear: whether rwsdk's production build still needs it, or if it is a development-only requirement
   - Recommendation: Test removing 'unsafe-eval' in production CSP — if the app breaks, restore it and document why

2. **Are there CDN or analytics resources being loaded at runtime?**
   - What we know: Current CSP whitelists Google Fonts and Cloudflare challenges only; no analytics imports found in static analysis
   - What is unclear: Whether any third-party resources load at runtime that were missed in static analysis
   - Recommendation: Run the app and check browser console for CSP violation reports before locking down the final directive list

3. **bcryptjs CPU time on paid Workers plan**
   - What we know: Cost factor 10 has historically exceeded the free tier 10ms limit; paid plan has 30s default; 2025 V8 optimizations gave ~25% performance boost per Cloudflare benchmarks
   - What is unclear: Whether bcryptjs at cost factor 8 or lower would reliably stay under the CPU wall on the paid plan
   - Recommendation: Replace with PBKDF2 as the primary implementation; keep bcryptjs as a verification-only fallback for migrating existing hashes. Do not attempt to find a safe cost factor for bcryptjs in Workers.

4. **Sonner compatibility with rwsdk RSC rendering**
   - What we know: packages/frontend/ uses standard React/Vite; src/ uses rwsdk with React Server Components
   - What is unclear: Whether Sonner's Toaster portal works correctly with rwsdk's RSC rendering model
   - Recommendation: Add "use client" directive to the Toast wrapper component in rwsdk, place Toaster in the client-side Document wrapper. This is the standard pattern for client-only components in RSC apps.

## Sources

### Primary (HIGH confidence)
- Official Hono secureHeaders docs at https://hono.dev/docs/middleware/builtin/secure-headers — defaults, CSP directives, nonce, X-Frame-Options
- Cloudflare Workers limits at https://developers.cloudflare.com/workers/platform/limits/ — CPU time limits (10ms free, 30s paid default, 5min max)
- RedwoodSDK security docs at https://docs.rwsdk.com/core/security/ — nonce pattern, rw.nonce usage
- Direct codebase inspection — all file locations, alert() inventory, existing header implementations

### Secondary (MEDIUM confidence)
- https://lord.technology/2024/02/21/hashing-passwords-on-cloudflare-workers.html — PBKDF2 implementation with 100,000 iterations on Workers
- https://github.com/leizongmin/js-xss — js-xss Node.js/server-side compatibility, whitelist configuration
- https://github.com/bvaughn/react-error-boundary — react-error-boundary v6.1.1, FallbackComponent pattern
- Cloudflare community at https://community.cloudflare.com/t/options-for-password-hashing/138077 — bcryptjs CPU failure confirmed by multiple practitioners

### Tertiary (LOW confidence)
- Multiple community reports that sanitize-html fails in Workers due to node:path — consistent across sources but not verified against current version with nodejs_compat
- isomorphic-dompurify workerd issue at https://github.com/cloudflare/workerd/issues/5752 — confirms DOMPurify approach is broken in Workers

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Hono docs are official; js-xss server-side compatibility verified via README; PBKDF2 verified via official Workers limits + practitioner blog; react-error-boundary verified via npm/GitHub
- Architecture: HIGH — patterns derived directly from codebase inspection + official docs
- Pitfalls: HIGH — inline styles vs CSP is a known React behavior; two-codebase issue verified by inspection; bcryptjs migration path is standard practice

**Research date:** 2026-02-21
**Valid until:** 2026-03-21 (stable domain; libraries change slowly)
