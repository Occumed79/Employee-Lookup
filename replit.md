# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod, `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: OpenAI via Replit AI Integrations (env: AI_INTEGRATIONS_OPENAI_BASE_URL, AI_INTEGRATIONS_OPENAI_API_KEY)

## App: Nuclear Employee LinkedIn Finder (N.E.L.F.)

A powerful OSINT tool for finding employees at companies by job title. Uses multi-layer free search APIs + AI to extract names and generate LinkedIn URL / email variations.

### Features
- Multi-source search: DuckDuckGo, Jina, GitHub, Serper (optional key), Brave (optional key), Tavily (optional key), company team page scraper
- AI name extraction via OpenAI (Replit-provided, free)
- LinkedIn URL variation generation (6 patterns)
- Email pattern generation (7 patterns, if domain found)
- Confidence scoring (0-100)
- Search history with full profile replay
- CSV export per search
- Stats dashboard (total searches, profiles, top companies, source breakdown)
- Optional API keys panel (Serper, Groq, Exa, Firecrawl, Brave, Jina, Tavily)

### Architecture
- **Frontend**: React + Vite at `/` (`artifacts/employee-finder`)
- **Backend**: Express 5 API at `/api` (`artifacts/api-server`)
- **Database table**: `searches` (company, job_title, profiles JSONB, sources_used JSONB, created_at)

### Key Files
- `artifacts/api-server/src/routes/search.ts` — main search route, history CRUD, stats, CSV export
- `artifacts/api-server/src/lib/searchEngines.ts` — DuckDuckGo, Jina, GitHub, Serper, Brave, Tavily, company site scrapers
- `artifacts/api-server/src/lib/profileExtractor.ts` — OpenAI-based name extraction + LinkedIn/email URL generators
- `artifacts/api-server/src/lib/openaiClient.ts` — OpenAI client using Replit AI Integration
- `lib/db/src/schema/searches.ts` — Drizzle schema for searches table

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
