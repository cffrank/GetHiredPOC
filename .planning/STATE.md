# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-20)

**Core value:** The app must not crash, lose data, or expose users to security vulnerabilities — every core flow works reliably for real users.
**Current focus:** Phase 1 — Critical Bugs + Test Infrastructure

## Current Position

Phase: 1 of 5 (Critical Bugs + Test Infrastructure)
Plan: 1 of 3 in current phase
Status: In progress
Last activity: 2026-02-20 — Completed 01-01: Backend test infrastructure (TEST-01)

Progress: [█░░░░░░░░░] 10%

## Performance Metrics

**Velocity:**
- Total plans completed: 1
- Average duration: ~3 min
- Total execution time: ~3 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-critical-bugs-test-infrastructure | 1 | ~3 min | ~3 min |

**Recent Trend:**
- Last 5 plans: 01-01 (backend test infrastructure)
- Trend: On track

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Fix by severity order (bugs → types → security → performance → tests) — dependency chain confirmed by research
- [Roadmap]: Test infrastructure bootstrapped in Phase 1 alongside bug fixes — prevents fixing without tests
- [01-01]: Removed rootDir from tsconfig.json to allow test/ files to be included outside src/
- [01-01]: Renamed 0010_admin_and_membership_remote.sql to .disabled — duplicate migration caused SQLITE_ERROR in fresh in-memory D1
- [01-01]: Do NOT set environment in vitest wrangler options — wrangler.toml has no named environments

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 1]: Audit `SELECT DISTINCT status FROM applications` in live D1 before touching status enum — existing data may have values that differ from schema expectations
- [Phase 2]: Audit actual frontend request shapes before writing Zod schemas — prevents rejecting traffic that was previously valid
- [Phase 3]: Benchmark bcryptjs CPU usage in the actual Workers environment before deciding whether to replace with PBKDF2
- [Phase 3]: Identify exactly which AI-parsed resume fields are user-influenced and need XSS sanitization vs safe structured fields

## Session Continuity

Last session: 2026-02-20
Stopped at: Completed 01-01-PLAN.md — Backend test infrastructure (vitest-pool-workers + D1 smoke test)
Resume file: None
