# Phase 3: Security + Error Handling - Context

**Gathered:** 2026-02-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Close the security surface — apply security headers, sanitize AI output, validate file uploads, and clean up sessions — and replace all raw crashes and `alert()` dialogs with friendly, consistent error messages. The app should fail gracefully everywhere, with users seeing helpful messages instead of blank pages or browser alerts.

</domain>

<decisions>
## Implementation Decisions

### Error notifications
- Mix of toasts and inline messages: toasts for global actions (save, delete, status changes), inline messages for form validation errors
- Toast position: top-right
- Toast duration: 3 seconds for success, 5 seconds for errors
- Toasts include contextual action buttons where appropriate — Retry on failures, Undo on destructive actions

### Error boundary fallback UI
- Simple message + retry button (no illustrations)
- Friendly and casual tone — e.g., "Oops, something went wrong! Let's try that again."
- Per-section granularity — each major section (sidebar, main content, card groups) gets its own error boundary so one crash doesn't take out the whole page
- Console-only error logging (no external error reporting service)

### CSP strictness
- Strict CSP — block inline scripts and styles, whitelist specific domains
- Known external resources to whitelist: Google Fonts (fonts.googleapis.com, fonts.gstatic.com), AI/LLM API endpoints (backend only, not browser-facing)
- Claude should audit the codebase for other external resource references (CDN assets, analytics) and include them in the whitelist
- May require refactoring any inline styles to CSS classes/Tailwind

### AI output sanitization
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

</decisions>

<specifics>
## Specific Ideas

- Toast notifications similar to Linear or Slack — clean, non-intrusive, top-right stacking
- Error messages should feel friendly, not corporate — "Oops" over "Error 500"
- Defense in depth for AI sanitization: clean on write, clean on display

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-security-error-handling*
*Context gathered: 2026-02-21*
