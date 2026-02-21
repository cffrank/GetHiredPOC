# Requirements: GetHiredPOC Stabilization

**Defined:** 2026-02-20
**Core Value:** The app must not crash, lose data, or expose users to security vulnerabilities — every core flow works reliably for real users.

## v1 Requirements

Requirements for production readiness. Each maps to roadmap phases.

### Bug Fixes

- [x] **BUG-01**: JobDetail page handles invalid JSON in requirements field without crashing
- [x] **BUG-02**: Application status values are consistent between UI and database schema
- [x] **BUG-03**: Status updates wait for API confirmation before updating local state, with rollback on failure

### Type Safety

- [x] **TYPE-01**: All `any` types in API handlers replaced with proper TypeScript interfaces
- [x] **TYPE-02**: ParsedResume, JobMatch, and ApplicationUpdate types defined in shared package
- [x] **TYPE-03**: Error catch blocks use typed error handling instead of `catch (error: any)`

### Input Validation

- [x] **VALID-01**: All API endpoints validate request bodies with Zod schemas
- [x] **VALID-02**: @hono/zod-validator middleware integrated into all route handlers
- [x] **VALID-03**: Validation errors return structured field-level error details

### Security

- [x] **SEC-01**: Security headers (CSP, HSTS, X-Frame-Options) applied globally via Hono secureHeaders
- [x] **SEC-02**: AI-parsed resume fields sanitized for XSS before database storage
- [x] **SEC-03**: File uploads validated via magic byte inspection before processing
- [x] **SEC-04**: Expired sessions cleaned up from D1 database periodically
- [x] **SEC-05**: bcryptjs CPU usage profiled in Workers; replaced with PBKDF2 if exceeding limits

### Error Handling

- [x] **ERR-01**: Typed error classes (NotFoundError, ValidationError, ForbiddenError) with correct HTTP status codes
- [x] **ERR-02**: Global error handler converts typed errors to consistent JSON responses
- [x] **ERR-03**: React error boundaries contain crashes per UI domain (Profile, Applications, JobDetail)
- [x] **ERR-04**: User-friendly error notifications replace alert() calls

### Performance

- [x] **PERF-01**: Job analysis N+1 queries consolidated from 7 to 2-3 using JOINs
- [ ] **PERF-02**: Job listings use cursor-based pagination with appropriate DB indexes
- [x] **PERF-03**: Job analysis cache invalidation includes profile modification timestamp
- [x] **PERF-04**: PDF resume parsing uses pdf-parse library instead of raw TextDecoder

### Graceful Degradation

- [x] **GRACE-01**: LinkedIn integration handles empty API data with user notification instead of silent empty loops
- [x] **GRACE-02**: AI response parsing uses structured extraction with fallback templates on malformed JSON
- [x] **GRACE-03**: Structured logging with consistent prefixes replaces ad-hoc console.log

### Testing

- [x] **TEST-01**: Backend test infrastructure set up with vitest-pool-workers and D1 bindings
- [ ] **TEST-02**: Unit tests for auth, resume parsing, and job matching services
- [ ] **TEST-03**: Integration tests for all API route handlers
- [ ] **TEST-04**: Frontend component tests for Profile, Applications, and JobDetail pages
- [ ] **TEST-05**: E2E tests covering signup → profile → job search → apply flow

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### LinkedIn

- **LINK-01**: Full LinkedIn profile import via Partner Program API access
- **LINK-02**: LinkedIn skills mapping to job requirements

### Advanced Features

- **ADV-01**: Offline support for saved jobs browsing
- **ADV-02**: Real-time chat via WebSocket
- **ADV-03**: Performance monitoring dashboard
- **ADV-04**: Automated CI/CD deployment pipeline
- **ADV-05**: Feature flags infrastructure

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| New user-facing features | This milestone is fixes only |
| Mobile app | Web-first strategy unchanged |
| Infrastructure migration | Cloudflare ecosystem is correct |
| AI provider swap | Fix parsing, not the model |
| LinkedIn Partner Program integration | Requires external approval we don't have |
| Feature flags | Overkill for stabilization; just fix the code |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| BUG-01 | Phase 1 | Complete |
| BUG-02 | Phase 1 | Complete |
| BUG-03 | Phase 1 | Complete |
| TEST-01 | Phase 1 | Complete |
| TYPE-01 | Phase 2 | Complete |
| TYPE-02 | Phase 2 | Complete |
| TYPE-03 | Phase 2 | Complete |
| VALID-01 | Phase 2 | Complete |
| VALID-02 | Phase 2 | Complete |
| VALID-03 | Phase 2 | Complete |
| SEC-01 | Phase 3 | Complete |
| SEC-02 | Phase 3 | Complete |
| SEC-03 | Phase 3 | Complete |
| SEC-04 | Phase 3 | Complete |
| SEC-05 | Phase 3 | Complete |
| ERR-01 | Phase 3 | Complete |
| ERR-02 | Phase 3 | Complete |
| ERR-03 | Phase 3 | Complete |
| ERR-04 | Phase 3 | Complete |
| PERF-01 | Phase 4 | Complete |
| PERF-02 | Phase 4 | Pending |
| PERF-03 | Phase 4 | Complete |
| PERF-04 | Phase 4 | Complete |
| GRACE-01 | Phase 4 | Complete |
| GRACE-02 | Phase 4 | Complete |
| GRACE-03 | Phase 4 | Complete |
| TEST-02 | Phase 5 | Pending |
| TEST-03 | Phase 5 | Pending |
| TEST-04 | Phase 5 | Pending |
| TEST-05 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 30 total
- Mapped to phases: 30
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-20*
*Last updated: 2026-02-20 after 01-03-PLAN.md — BUG-02 complete; Phase 1 all requirements done*
