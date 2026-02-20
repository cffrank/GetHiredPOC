# Technology Stack

**Analysis Date:** 2026-02-20

## Languages

**Primary:**
- TypeScript 5.9.3 - Used across all packages (backend, frontend, shared)

**Secondary:**
- JavaScript (JSX/TSX) - React components and application code

## Runtime

**Environment:**
- Node.js (via Cloudflare Workers) - Backend execution
- Browser (modern) - Frontend execution

**Package Manager:**
- npm (workspace-based monorepo)
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Hono 4.7.8 - Lightweight web framework for backend API (`packages/backend/src/index.ts`)
- React 19.0.0 - Frontend UI framework
- React Router DOM 7.1.1 - Client-side routing (`packages/frontend/src`)

**Build/Dev:**
- Vite 6.0.7 - Frontend build tool and dev server (`packages/frontend/vite.config.ts`)
- TypeScript 5.9.3 - Compiler for all packages
- Wrangler 3.100.0 - Cloudflare Workers CLI for backend deployment

**Cloudflare Integration:**
- Cloudflare Workers - Serverless execution platform
- Cloudflare D1 - SQLite database (binding: `DB`)
- Cloudflare R2 - Object storage (binding: `STORAGE`)
- Cloudflare KV - Key-value cache (bindings: `KV_CACHE`, `KV_SESSIONS`)
- Cloudflare Pages - Frontend hosting
- Cloudflare AI - AI model inference (binding: `AI`)
- Cloudflare AI Gateway - API gateway with token usage management

**Styling:**
- Tailwind CSS 3.4.17 - Utility-first CSS framework
- PostCSS 8.4.49 - CSS processor with autoprefixer
- Autoprefixer 10.4.20 - Browser vendor prefix handling
- Tailwind-merge 2.6.0/3.4.0 - Merge Tailwind classes without conflicts

**UI Components:**
- Lucide React 0.469.0 - Icon library
- clsx 2.1.1 - Conditional class composition

## Key Dependencies

**Critical:**
- bcryptjs 2.4.3/3.0.3 - Password hashing for authentication
- openai 6.15.0 - OpenAI API client for GPT-4o-mini chat integration (`packages/backend/src/services/chat.service.ts`)
- resend 6.6.0 - Email service for notifications (`packages/backend/src/services/email.service.ts`)
- @tanstack/react-query 5.62.11 - Data fetching and caching for frontend

**Document Processing:**
- pdf-lib 1.17.1 - PDF generation (`packages/backend/src/services/document-export.service.ts`)
- pdf-parse 2.4.5 - PDF parsing (for resume uploads)
- docxtemplater 3.67.6 - Word document generation from templates
- pizzip 3.2.0 - ZIP file manipulation for docx files

**Drag-and-Drop:**
- @dnd-kit/core 6.3.1 - Drag and drop library
- @dnd-kit/sortable 9.0.0 - Sortable list functionality

**Utilities:**
- rwsdk 1.0.0-beta.46 - Redwood SDK for framework integrations (`vite.config.mts`)
- @cloudflare/workers-types 4.20250110.0 - Type definitions for Cloudflare Workers API

## Configuration

**Environment:**
All configurations are loaded via `wrangler.toml` files:
- Root: `/home/carl/project/gethiredpoc/wrangler.toml` - Frontend/worker configuration
- Backend: `/home/carl/project/gethiredpoc/packages/backend/wrangler.toml` - API configuration

**Key configured services:**
- D1 Database: `gethiredpoc-db` (ID: `a927d1e6-cf48-4b67-82f6-472964063676`)
- R2 Bucket: `gethiredpoc-storage`
- KV Namespaces: `KV_CACHE`, `KV_SESSIONS`
- AI Gateway: `jobmatch-ai-gateway-dev`

**Build:**
- TypeScript configuration: `tsconfig.json` (root and per-package)
- Frontend Vite config: `packages/frontend/vite.config.ts` - Port 5173 with `/api` proxy to backend (8787)
- Proxy target: `http://localhost:8787` (backend in dev)

## Platform Requirements

**Development:**
- Node.js environment with npm workspaces
- TypeScript compiler available
- Wrangler CLI for local Worker development
- POSIX shell for scripts

**Production:**
- Cloudflare Workers platform (Wrangler deployment)
- Cloudflare Pages (frontend hosting)
- D1 database (SQLite)
- R2 storage
- KV namespaces
- AI Gateway access for OpenAI API routing

---

*Stack analysis: 2026-02-20*
