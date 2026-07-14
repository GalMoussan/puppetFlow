# PuppetFlow

**Visual Prompt Compiler for AI Video Pipelines**

A drag-and-drop flowchart tool that visually composes the 4-stage prompt pipeline (Image → Video START → Extend MIDDLE → Extend END) for the Shika & Shilshul "Master of Puppets" content series.

**Status:** Phases 0–4 complete · Phase 5 (Polish & Deploy) in progress

## Overview

PuppetFlow transforms the monolithic prompt-engineering workflow into a visual, modular system:

- **Stage Lanes**: Fixed, ordered lanes (`IMAGE` → `VIDEO_START` → `EXTEND_MIDDLE` → `EXTEND_END`, plus `GLOBAL`)
- **Component Blocks**: Draggable blocks (hooks, camera moves, puppet dynamics, etc.) that snap into lanes
- **Boundary Frame Handshakes**: Edges between lanes carrying the contract for clip continuity
- **Run Batch**: Compiles the graph, assigns variety, calls Claude API, validates outputs, produces 5 complete scenes
- **Export**: Download the compiled scaffold as `.md` for use in Claude Code

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router) + TypeScript strict |
| Canvas | @xyflow/react (React Flow v12) |
| Styling | Tailwind CSS 4 |
| State | Zustand |
| Database | PostgreSQL via Prisma |
| LLM | Anthropic API (claude-sonnet-4-6) |
| Validation | Zod |
| Tests | Vitest + Playwright |

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 16+ (or Supabase account)

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in:

```env
DATABASE_URL=postgres://...
DIRECT_URL=postgres://...
ANTHROPIC_API_KEY=sk-ant-...  # Optional — degrades to export-only
ANTHROPIC_MODEL=claude-sonnet-4-6
APP_USER=your-username
APP_PASSWORD=your-password
```

### 3. Set Up Database

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

### 4. Run Development Server

```bash
pnpm dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server with Turbopack |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm typecheck` | Type check with TypeScript |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run unit tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:coverage` | Run tests with coverage |
| `pnpm test:e2e` | Run Playwright E2E tests |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:migrate` | Apply database migrations |
| `pnpm db:seed` | Seed the database |
| `pnpm db:studio` | Open Prisma Studio |

## Company Multi-Agent System

This project uses the [Multi-Agent Company](https://github.com/taldim/multi-agent-company) framework for structured development.

### Setup

```bash
/company-startup "PuppetFlow"
```

This will:
- Scan your codebase
- Ask about tech stack and conventions
- Generate `Company/project/project-guidelines.md`

### Development Commands

| Command | Purpose |
|---------|---------|
| `/company-plan [task]` | Interactive planning session |
| `/company-execute [pipeline-id]` | Execute a plan |
| `/company-fast [task]` | Quick single-pass for small tasks |
| `/company-expand [task]` | Large multi-module mission planning |
| `/company-integrate [feature]` | Bring existing code into Doc-Test-Code lifecycle |

### Directory Structure

```
puppetflow/
├── .claude/
│   └── skills/              # Company pipeline commands
├── Company/
│   ├── roles/               # 8 specialized agent roles
│   ├── project/
│   │   ├── project-guidelines.md   # Project conventions (generated)
│   │   ├── learnings.md            # Accumulated lessons
│   │   ├── recommendations.md      # Architectural insights
│   │   └── pipelines/              # Execution history
│   ├── learnings.md         # Generic best practices
│   └── recommendations.md   # Generic strategic patterns
├── app/                     # Next.js App Router
├── packages/
│   └── domain/              # Pure TypeScript domain logic
├── lib/                     # Server utilities
├── prisma/                  # Database schema and migrations
└── tests/                   # Test suites
```

## The Prompt Engineering Rulebook

PuppetFlow encodes 15 rules (R1–R15) derived from best practices for Grok Imagine / image-to-video / extend-chain workflows:

- **R1**: Sequential weighting (action first, preservation last)
- **R2**: Explicit camera verb per clip
- **R3**: Word budget & strong verbs (40-90 words)
- **R4**: Beat structure with timestamps (2-3 beats per 10s)
- **R5**: Image-to-video division of labor
- **R6**: Negatives in image, positives in video
- **R7**: Boundary Frame Handshake (extend chain continuity)
- **R8**: Short extends, preservation-heavy
- **R9**: Retention pacing (visual change every 1.5-3s)
- **R10**: Loop Closure (optional, drives replays)
- **R11**: Audio direction in every video prompt
- **R12**: Drop sync (Shika! Shilshul! chant)
- **R13**: Character locks verbatim
- **R14**: Variety rules (batch + history)
- **R15**: Iteration discipline

See `puppetflow-blueprint.md` for full specification.

## Deployment

Deployed to Vercel with basic-auth protection.

```bash
# Production deployment
git push origin main  # Auto-deploys via Vercel
```

## License

Private project — Gal Moussan

---

Built with the [Multi-Agent Company](https://github.com/taldim/multi-agent-company) framework
