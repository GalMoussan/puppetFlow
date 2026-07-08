# PuppetFlow — Visual Prompt Compiler for AI Video Pipelines
### End-to-End Build Blueprint (for Claude Code `/company-org` execution, TDD, sub-agents)

**Owner:** Gal Moussan · **Deployment:** GitHub → Vercel (personal, password-gated)
**Purpose:** A drag-and-drop flowchart tool that visually composes the 4-stage prompt pipeline (Image → Video START → Extend MIDDLE → Extend END) for the Shika & Shilshul "Master of Puppets" content series. One run = a full daily batch of 5 scenes with variety rules enforced. The agent (Claude API) walks the composed flow and outputs finalized, situation-tailored prompts. Themes/movements are swappable every few days by swapping blocks — no prompt-file rewriting.

---

## 1. PRODUCT DEFINITION

### 1.1 The problem
The daily scene-generation prompt is a monolithic markdown file. Changing themes, camera languages, puppet dynamics, or scene movement every few days means manually rewriting a 400-line prompt. There is no visual model of the pipeline's structure (image gen → video gen → extend ×2 with frame handshakes), and no enforcement of the prompt-engineering rules each stage requires.

### 1.2 The solution
A node-based canvas where:
- **Stage Lanes** (fixed, ordered): `IMAGE` → `VIDEO_START` → `EXTEND_MIDDLE` → `EXTEND_END`, plus a `GLOBAL` lane whose blocks apply to all stages.
- **Component Blocks** (draggable, snap into lanes): Hook, Camera Move, Puppet Dynamic, Physical Gag, Chaos Thread, Payoff Type, Song Section, Character Lock, Style Lock, Loop Closure, Theme Pack, Custom Fragment.
- **Edges between lanes** carry the **Boundary Frame Handshake** contract (end-frame of clip N = opening state of clip N+1).
- **Run** → server compiles the graph into a deterministic scaffold, calls the Claude API, and returns **5 complete scenes** (song lyrics + 4 prompts each), validated by a rule linter, with variety rules enforced across the batch and against historical runs.
- **Export** → the compiled scaffold ("mega-prompt") downloads as `.md` for pasting into Claude Code / scheduled tasks when API credits are exhausted.

### 1.3 One run (the core loop)
1. User opens a Flow Template on the canvas (or edits blocks).
2. Clicks **Run Batch** → picks date, batch size (default 5), loop mode on/off, language weights (Hindi/Japanese).
3. Server: `compile(graph) → scaffold` → `varietyEngine.assign(5)` → Claude API (streaming) → `lint(outputs)` → auto-repair pass if lint fails → persist.
4. UI shows 5 scene cards, each with copy buttons per prompt (Image / START / MIDDLE / END / Lyrics) and a "boundary frame" chip between video prompts.
5. Optional: **Export batch as `scenes/[YYYY-MM-DD].md`** in the exact format the existing scheduled task writes, so both systems stay compatible.

### 1.4 Out of scope (v1)
- No direct calls to Grok Imagine or Lyria (prompts are copy-paste; the tool is a compiler, not a generator client).
- No Notion sync (v2 candidate — the data model reserves fields for it).
- No multi-user auth; single-owner password gate only.
- No video preview/rendering.

---

## 2. THE PROMPT-ENGINEERING RULEBOOK (Compiler's Brain)

These rules are derived from current Grok Imagine / image-to-video / extend-chain / short-form-retention best practices. They are **encoded as code** in the linter and compiler — every one of these is a testable assertion. This section is the spec for `packages/domain/rules.ts`.

### R1 — Sequential weighting (video prompts)
The generation engine renders sequentially; the first sentence carries the most weight.
- **Rule:** Every video prompt must open with `[subject] + [primary action]` in sentence 1. Camera move in sentence 1 or 2. Preservation language ("keep same lighting, same character appearance…") must appear in the FINAL 25% of the prompt.
- **Lint:** fail if the first sentence contains no action verb; fail if preservation phrases appear in the first half.

### R2 — Explicit camera verb, every clip
- **Rule:** Each video prompt names exactly one primary camera move from the controlled vocabulary: `dolly, push-in, orbit, circular dolly, pan, whip pan, handheld tracking, crane up, crane down, tilt-up, tilt-down, macro push-in, dolly zoom, crash-zoom, snap-zoom, static wide, tracking shot`.
- **Lint:** fail if zero or 2+ primary camera verbs detected; fail if "cinematic" appears as the only camera direction.

### R3 — Word budget & strong verbs
- **Rule:** Video prompt body: 40–90 words for the action core (locks/preservation excluded). Prefer intensity verbs (`surges, snaps, unfurls, detonates, whips, freezes`) over generic (`moves, goes, is`).
- **Lint:** warn outside budget; fail if >2 generic motion verbs.

### R4 — Beat structure with timestamps
For 10-second clips, 2–3 action beats maximum, anchored with timestamp markers.
- **Rule:** Each video prompt structures action as `[00:00] beat one … [00:04] beat two … [00:08] beat three`. Never more than 3 beats.
- **Lint:** fail if >3 timestamp beats or 0 timestamps.

### R5 — Image-to-video division of labor
The model already has visual context from the source image; video prompts must not re-describe the scene.
- **Rule:** `VIDEO_START` prompt may reference the image ("the scene from the source image") but must not repeat environment description >15 words. All heavy scene description lives ONLY in the `IMAGE` prompt.
- **Lint:** fail on >25% token overlap between IMAGE environment section and any video prompt.

### R6 — Negatives in image, positives in video
Negative prompts do not reliably work in the video engine.
- **Rule:** The `IMAGE` prompt carries the full negative-constraint block ("no cartoon, no extra dogs, no distorted anatomy…"). Video prompts use only POSITIVE preservation language ("keep Shika identical to the reference image, keep the same UV lighting").
- **Lint:** fail if any video prompt contains "no ", "avoid ", "never " constraint phrasing (allow-list: "no dialogue").

### R7 — Boundary Frame Handshake (extend chain)
Extension quality depends on how close the continuation stays to what the boundary frames imply — same lighting, positions, motion direction — and clips ending mid-blur break prediction.
- **Rule:** Every video prompt ends with an `ENDING FRAME [EXACT]:` paragraph: character positions, expressions, string/prop positions, camera angle+distance, lighting state, exactly one element frozen mid-motion (clean, not blurred). The NEXT prompt opens with `Continue directly from the final frame of the previous clip: [verbatim restatement]`.
- **Lint:** fail if ENDING FRAME missing; fail if next clip's opening restatement has <80% similarity to the previous ENDING FRAME text; fail if lighting descriptor changes across a handshake.

### R8 — Short extends, preservation-heavy
Drift accumulates across extension steps; shorter, conservative extends stay consistent.
- **Rule:** `EXTEND` prompts are the shortest of the batch (40–70 words core): next action + camera + explicit preservation. No new characters, no new locations, no lighting changes mid-scene (weather-moment scenes declare the change as a beat, not a reset).
- **Lint:** fail if an EXTEND prompt introduces a noun (character/prop) absent from all prior stage prompts of the same scene, unless tagged as that scene's Chaos Thread payoff element.

### R9 — Retention pacing
A visual change every 1.5–3 seconds; static shots over 4 seconds lose viewers; hook lands inside the first 1.5–3 seconds.
- **Rule:** Beat spacing implies a visual change at least every ~3.5s. `VIDEO_START` beat 1 must be the HOOK (0–2s).
- **Lint:** fail if any two consecutive timestamps are >4s apart; fail if the START prompt's first beat is not tagged as the hook.

### R10 — Loop Closure (optional, per-run toggle)
End frame ≈ opening frame drives replays, one of the strongest algorithm signals; loops are easiest under ~30s.
- **Rule (loop mode ON):** the `EXTEND_END` final frame must visually rhyme with the `IMAGE` prompt's composition — same framing family, same character placement zone, one intentional delta (e.g., the strings now visible / crowd now synced). The compiler injects a `LOOP CLOSURE` directive into both the IMAGE prompt ("compose so the frame can serve as a loop anchor") and the END prompt ("final frame mirrors the opening composition of the scene's source image, with [delta]").
- **Lint (loop mode):** fail if END prompt lacks the mirror directive.

### R11 — Audio direction in every video prompt
The video engine generates native audio; silent prompts waste the pass.
- **Rule:** Each video prompt carries exactly one audio cue sentence mapping to the song section (Intro/Build → START, Pre-Drop riser → MIDDLE, Drop → END). Always "no dialogue".
- **Lint:** fail if audio sentence missing or if a video prompt requests dialogue.

### R12 — Drop sync (series-specific)
- **Rule:** The scene's payoff beat in `EXTEND_END` and the song's Drop are the same timestamp. The chant `Shika! Shika! Shilshul! Shilshul!` appears in the Drop section of the lyrics.
- **Lint:** fail if END prompt's final beat isn't tagged `[DROP]`; fail if lyrics lack the chant.

### R13 — Character locks verbatim
- **Rule:** The two CRITICAL lock paragraphs (Shika image lock, character lock) appear VERBATIM in the IMAGE prompt, and a condensed positive preservation line appears in every video prompt.
- **Lint:** exact-string match on the lock blocks in IMAGE; keyword check in video prompts.

### R14 — Variety rules (batch + history)
- **Rule:** Within one batch of 5: no repeated hook type, primary camera move, physical gag, puppet dynamic, puppet visual style, payoff type, chaos-thread type, stage/area, or festival moment. Both Hindi and Japanese must appear (per configured weights). Against history (UsageLog): no stage+moment combo reuse in the last 30 days; no identical dynamic+payoff pair in the last 10 runs.
- **Lint:** hard fail on any within-batch collision; warn on history collisions (user can override).

### R15 — Iteration discipline (advisory, UI-level)
Outputs vary between runs; regenerate 2–3 times before rewriting, and change one variable at a time.
- **Feature:** every scene card has a **"Reroll scene"** button (re-runs only that scene with the same combo assignment) and a **"Reroll one stage"** button (regenerates a single prompt while freezing the others and the handshakes).

---

## 3. ARCHITECTURE

### 3.1 Stack (matches owner's established stack)
| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript strict** | Single repo, Vercel-native |
| Canvas | **@xyflow/react (React Flow v12)** | Custom node types for lanes + blocks |
| Styling | Tailwind CSS 4 | Dark UI, festival/UV accent palette |
| State (client) | Zustand | Canvas state, run progress |
| DB | **PostgreSQL via Prisma** (Supabase-hosted assumed; any Postgres URL works) | Owner already runs Supabase + Prisma |
| LLM | **Anthropic API, `claude-sonnet-4-6` default** (model configurable via env) | Server-side only, streaming |
| Validation | Zod (all API IO + Claude structured output) | |
| Unit/integration tests | **Vitest** + @testing-library/react | |
| E2E | **Playwright** (3–5 smoke flows only) | |
| CI | GitHub Actions: typecheck → lint → vitest → playwright | Required green before Vercel promote |
| Auth | Basic-auth middleware (`APP_USER`/`APP_PASSWORD` env) | Personal deployment gate |

### 3.2 Repo layout
```
puppetflow/
├─ app/
│  ├─ (auth gate via middleware.ts)
│  ├─ page.tsx                     # Canvas (main screen)
│  ├─ library/page.tsx             # Block & Theme Pack manager
│  ├─ runs/page.tsx                # Run history
│  ├─ runs/[id]/page.tsx           # Batch output viewer (5 scene cards)
│  └─ api/
│     ├─ blocks/route.ts           # CRUD BlockDefinition
│     ├─ theme-packs/route.ts      # CRUD ThemePack
│     ├─ templates/route.ts        # CRUD FlowTemplate (graph JSON)
│     ├─ runs/route.ts             # POST execute (streams SSE), GET list
│     ├─ runs/[id]/reroll/route.ts # POST reroll scene|stage
│     └─ export/[runId]/route.ts   # GET .md export
├─ packages/
│  └─ domain/                      # PURE TypeScript, zero React/Next imports
│     ├─ types.ts                  # All domain types + Zod schemas
│     ├─ rules.ts                  # R1–R15 as data + predicates
│     ├─ compiler.ts               # graph → scaffold (deterministic)
│     ├─ variety.ts                # combo assignment + collision detection
│     ├─ linter.ts                 # output validation, returns Violation[]
│     ├─ handshake.ts              # boundary-frame extraction & similarity
│     └─ exporter.ts               # batch → scenes/[date].md format
├─ lib/
│  ├─ anthropic.ts                 # API client, structured output, streaming
│  ├─ agent.ts                     # orchestrates compile→generate→lint→repair
│  └─ db.ts                        # Prisma client
├─ prisma/schema.prisma
├─ prisma/seed.ts                  # Master of Puppets seed (see §7)
├─ tests/                          # mirrors packages/domain + api + e2e
└─ .github/workflows/ci.yml
```
**Architectural invariant:** `packages/domain` is pure and framework-free. This is what makes TDD fast — the compiler, variety engine, linter, and exporter are all testable without a browser, DB, or API key.

### 3.3 Data model (Prisma)
```prisma
model ThemePack {
  id          String   @id @default(cuid())
  name        String   @unique          // "Master of Puppets Festival"
  canon       Json                       // universe canon: stages, moments, recurring characters, signage rules
  active      Boolean  @default(false)
  blocks      BlockDefinition[]
  templates   FlowTemplate[]
  createdAt   DateTime @default(now())
}

model BlockDefinition {
  id            String   @id @default(cuid())
  type          BlockType
  name          String                    // "Whip pan", "Shilshul puppets Shika", "Neon glowing strings"
  promptFragment String  @db.Text         // the text this block contributes
  stageScope    String[]                  // ["VIDEO_START"] | ["GLOBAL"] | ["EXTEND_MIDDLE","EXTEND_END"] ...
  rotationGroup String?                   // variety axis key, e.g. "camera", "hook", "dynamic"
  meta          Json?                     // e.g. { vibe: "psycore", language: "hi" }
  themePackId   String?
  themePack     ThemePack? @relation(fields: [themePackId], references: [id])
  archived      Boolean  @default(false)
}

enum BlockType {
  THEME_PACK_REF
  HOOK
  CAMERA_MOVE
  PUPPET_DYNAMIC
  PUPPET_VISUAL
  PHYSICAL_GAG
  CHAOS_THREAD
  PAYOFF
  SONG_SECTION
  LANGUAGE
  CHARACTER_LOCK
  STYLE_LOCK
  LOOP_CLOSURE
  STAGE_AREA
  FESTIVAL_MOMENT
  CUSTOM
}

model FlowTemplate {
  id          String   @id @default(cuid())
  name        String
  graph       Json                        // React Flow nodes+edges, versioned shape
  themePackId String
  themePack   ThemePack @relation(fields: [themePackId], references: [id])
  updatedAt   DateTime @updatedAt
  runs        Run[]
}

model Run {
  id          String   @id @default(cuid())
  templateId  String
  template    FlowTemplate @relation(fields: [templateId], references: [id])
  runDate     DateTime
  batchSize   Int      @default(5)
  loopMode    Boolean  @default(true)
  status      RunStatus @default(PENDING)  // PENDING|COMPILING|GENERATING|LINTING|REPAIRING|DONE|FAILED
  scaffold    String?  @db.Text            // the compiled mega-prompt (also what Export serves)
  model       String
  error       String?
  scenes      Scene[]
  createdAt   DateTime @default(now())
}

enum RunStatus { PENDING COMPILING GENERATING LINTING REPAIRING DONE FAILED }

model Scene {
  id             String @id @default(cuid())
  runId          String
  run            Run    @relation(fields: [runId], references: [id])
  index          Int                        // 1..5
  combo          Json                       // { stageArea, moment, dynamic, puppetVisual, hook, gag, camera:{start,middle,end}, payoff, chaosThread, language, subgenre }
  lyrics         String @db.Text
  imagePrompt    String @db.Text
  startPrompt    String @db.Text
  middlePrompt   String @db.Text
  endPrompt      String @db.Text
  boundaryFrame1 String @db.Text            // START→MIDDLE handshake text
  boundaryFrame2 String @db.Text            // MIDDLE→END handshake text
  finalFrame     String @db.Text
  lintReport     Json                       // Violation[] (empty = clean)
  notes          String?
}

model UsageLog {
  id        String   @id @default(cuid())
  runDate   DateTime
  comboHash String                          // hash of stageArea+moment
  axes      Json                            // { dynamic, hook, camera, payoff, gag, chaosThread, language }
  sceneId   String   @unique
  @@index([comboHash, runDate])
}
```

### 3.4 The canvas model (graph JSON contract)
```ts
// Versioned — v1
type CanvasGraph = {
  version: 1;
  lanes: ["GLOBAL","IMAGE","VIDEO_START","EXTEND_MIDDLE","EXTEND_END"]; // fixed, ordered
  nodes: Array<{
    id: string;
    blockDefId: string;        // FK to BlockDefinition
    lane: Lane;                // must be within blockDef.stageScope
    order: number;             // vertical order within lane = assembly order
    overrides?: { promptFragment?: string }; // per-template tweak without editing library
    pinned?: boolean;          // pinned blocks are exempt from variety rotation
  }>;
  edges: Array<{               // lane-to-lane handshake edges, auto-generated, carry config
    from: Lane; to: Lane;
    handshake: { strictness: "verbatim" | "paraphrase"; trackCrowdMembers: number }; // default verbatim, 2
  }>;
  runConfig: { loopMode: boolean; languages: { hi: number; ja: number }; batchSize: number };
};
```
**Snap rules (enforced in UI + revalidated server-side):** a node may only sit in a lane included in its `stageScope`; `GLOBAL` lane accepts locks, theme pack, style, loop closure; rotation-group blocks (hook/camera/gag/dynamic/payoff/chaos/stage/moment) dropped on the canvas define the *candidate pools* the variety engine draws from — dragging 6 camera blocks in means "rotate among these 6."

### 3.5 The agent pipeline (`lib/agent.ts`)
```
runBatch(templateId, config):
  1. graph = load + Zod-validate
  2. scaffold = compiler.compile(graph, themePack)          // deterministic, pure
  3. assignments = variety.assign(graph.pools, history, 5)  // pure; throws VarietyError on impossible constraints
  4. for progress streaming: emit SSE events per phase
  5. output = anthropic.generateBatch(scaffold, assignments)
       - single API call, structured output (tool schema = BatchOutput Zod)
       - temperature 1.0, max_tokens sized for 5 scenes
  6. violations = linter.lintBatch(output, graph, config)
  7. if violations.hard.length > 0 → repair pass:
       anthropic.repair(output, violations)   // one retry, violations quoted verbatim
       re-lint; if still failing → persist with lintReport, status DONE (user sees warnings)
  8. persist Run + Scenes + UsageLog entries
```
**Why one API call for the batch, not five:** the variety rules and background-thread contrast are cross-scene constraints; the model needs all 5 in context to keep them distinct. Reroll endpoints handle per-scene regeneration afterward (with the other 4 scenes' axes passed as exclusion constraints).

### 3.6 Compiler output shape (the scaffold)
The scaffold is a single markdown mega-prompt assembled from: theme pack canon → rulebook directives (R1–R13 rendered as instructions) → the 5 combo assignments (from variety engine) → per-stage templates with block fragments injected in lane order → output JSON schema instructions. This scaffold is **exactly what the Export button serves** — so API mode and Claude Code mode produce identical creative briefs.

---

## 4. UI SPECIFICATION

### 4.1 Canvas page (`/`)
- **Left sidebar — Block Palette:** grouped by BlockType, filtered by active Theme Pack, searchable. Drag out to lanes. "New block" inline creation.
- **Center — Canvas:** 5 vertical lanes rendered as React Flow group nodes (GLOBAL | IMAGE | START | MIDDLE | END). Blocks are custom nodes with type-colored headers, fragment preview (2 lines), pin toggle, and a validity dot (green = snap rules pass). Handshake edges between the 4 stage lanes render as thick connectors with a "🤝 verbatim" badge; clicking opens handshake config.
- **Right sidebar — Inspector:** selected block's full fragment (editable → saves as template override), stageScope, rotationGroup; or when a lane is selected, the lane's assembly-order list.
- **Top bar:** template switcher, Theme Pack indicator, **Run Batch** button, **Export scaffold** button, save state indicator.
- **Run modal:** date picker (default today), batch size, loop mode toggle, language weight sliders (hi/ja), history-strictness toggle (hard-fail vs warn on 30-day combo reuse).
- **Run progress:** SSE-driven stepper (Compiling → Assigning variety → Generating → Linting → Repairing → Done) with per-scene skeleton cards appearing as they stream.

### 4.2 Run viewer (`/runs/[id]`)
- 5 scene cards. Each card: combo chips (stage/moment/dynamic/visual/language/subgenre) → lyrics accordion → 4 prompt panels (Image / START / MIDDLE / END) each with a one-click **Copy** button → handshake chips between video panels showing the boundary-frame text → lint report banner (warnings amber, hard-fails red) → **Reroll scene** / **Reroll stage** buttons.
- Batch actions: **Copy all**, **Download scenes/[date].md**, **Download scaffold.md**.

### 4.3 Library page (`/library`)
- Theme Pack list (activate/duplicate/edit canon JSON with schema-validated form).
- Block table: filter by type/rotationGroup, inline edit, archive. Duplicating a Theme Pack deep-copies its blocks — this is the "change the whole theme every few days" workflow: duplicate → edit blocks → activate.

### 4.4 Design direction
Dark UI, near-black background, UV-violet/acid-green accents (festival identity), monospace for prompt text, Hebrew-safe font stack (the owner may add Hebrew block names). Read `frontend-design` skill during implementation for the token system. Mobile: read-only run viewer works on mobile; canvas editing is desktop-only (acceptable for v1).

---

## 5. API CONTRACTS (all Zod-validated, all behind auth middleware)

| Route | Method | Body / Query | Returns |
|---|---|---|---|
| `/api/theme-packs` | GET/POST/PATCH | ThemePack schemas | packs |
| `/api/blocks` | GET/POST/PATCH | BlockDefinition schemas | blocks |
| `/api/templates` | GET/POST/PATCH | `{name, graph, themePackId}` | template |
| `/api/runs` | POST | `{templateId, runConfig}` | **SSE stream**: `phase`, `scene`, `done`, `error` events |
| `/api/runs` | GET | `?limit&cursor` | run list |
| `/api/runs/[id]/reroll` | POST | `{sceneIndex, stage?: Lane}` | updated scene |
| `/api/export/[runId]` | GET | `?format=scenes\|scaffold` | `text/markdown` download |

Anthropic key lives ONLY in server env (`ANTHROPIC_API_KEY`). No client-side model calls. Rate guard: max 1 concurrent run, enforced by run status check.

---

## 6. TDD EXECUTION PLAN (for `/company-org` sub-agents)

**Method:** every phase = (a) test-writer agent produces failing tests from this spec, (b) implementer agent makes them green, (c) reviewer agent checks against the spec section + runs full suite. No implementation before its tests exist. `packages/domain` targets ≥90% branch coverage; API routes integration-tested against a disposable Postgres (docker-compose or Supabase branch DB); UI gets component tests for snap logic + 4 Playwright smokes.

### Phase 0 — Scaffold & CI (Agent: DevOps)
- Next.js 15 TS strict, Tailwind, Prisma init, Vitest + Playwright config, GitHub repo, Actions CI (typecheck → lint → unit → e2e), Vercel project linked, env schema (`env.ts` with Zod).
- **Tests:** CI pipeline green on empty suite; `env.ts` throws on missing vars.

### Phase 1 — Domain core (Agents: test-writer + domain-implementer) ← the heart
1. `types.ts` + Zod schemas. Tests: graph JSON round-trip, invalid lane rejection, version gate.
2. `rules.ts` — R1–R15 as data. Tests: each rule has ≥2 positive and ≥2 negative fixtures (real prompt strings).
3. `compiler.ts`. Tests: deterministic (same graph → identical scaffold, snapshot); lane order respected; GLOBAL blocks injected into all stages; pinned blocks always present; overrides win over library fragments; loop-mode injects closure directives into IMAGE + END sections; verbatim character locks present exactly once in IMAGE section.
4. `variety.ts`. Tests: 5 assignments with zero within-batch collisions across all rotation axes (property-based: run 200 random pools); both languages present per weights; history collisions detected from UsageLog fixtures; `VarietyError` when pool smaller than batch on any hard axis; pinned blocks bypass rotation.
5. `linter.ts`. Tests: one test file per rule (R1–R13), feeding crafted good/bad outputs; violation objects carry `{rule, severity, sceneIndex, stage, evidence}`.
6. `handshake.ts`. Tests: extracts ENDING FRAME paragraph; similarity ≥0.8 passes, mutated lighting descriptor fails; mid-blur wording ("motion-blurred", "mid-explosion of movement") flagged.
7. `exporter.ts`. Tests: snapshot of `scenes/[date].md` matches the existing scheduled-task file format (fixture provided from a real past output).

### Phase 2 — Persistence & API (Agents: backend-implementer + test-writer)
- Prisma schema, migrations, seed (§7). Integration tests: CRUD routes; run POST happy path with **mocked Anthropic client** (fixture BatchOutput); SSE event order; lint-fail → repair path invoked exactly once; UsageLog written per scene; reroll excludes sibling axes; export routes serve correct content-type + filename.
- Anthropic client (`lib/anthropic.ts`): structured output via tool schema, streaming, retry-on-429 with backoff. Tests with mocked fetch: schema-invalid model output triggers one re-request; token overflow surfaces typed error.

### Phase 3 — Canvas UI (Agents: frontend-implementer + test-writer)
- React Flow lanes + custom block nodes, palette drag-in, inspector, snap validation, template save/load (debounced autosave).
- Component tests: dropping a VIDEO_START-scoped block into IMAGE lane is rejected with toast; order drag persists; pin toggle updates graph; override edit round-trips.
- Playwright smoke #1: load seed template → canvas renders 5 lanes with seeded blocks.

### Phase 4 — Run experience (Agents: frontend + backend pairing)
- Run modal, SSE progress, run viewer cards, copy buttons, reroll, export downloads.
- Playwright smoke #2 (mocked API): full run → 5 cards → copy image prompt → clipboard contains character lock text. Smoke #3: export downloads a file starting with the date header. Smoke #4: auth — unauthenticated request to `/` gets 401 challenge.

### Phase 5 — Polish & deploy (Agents: DevOps + reviewer)
- Basic-auth middleware, dark theme pass (frontend-design skill), empty states, error toasts, Vercel env setup, production migration, seed in prod, smoke the deployed URL.
- Final reviewer checklist: every R-rule has passing lint tests; scaffold export byte-identical between API mode and export mode; README with runbook (local dev, migration, adding a Theme Pack).

**Suggested sub-agent roster for `/company-org`:** `architect` (owns this doc, resolves ambiguity), `test-writer`, `domain-dev`, `backend-dev`, `frontend-dev`, `devops`, `reviewer` (gatekeeper — nothing merges without spec-section citation + green CI).

---

## 7. SEED DATA (Master of Puppets Theme Pack v1)

Seed the DB from the existing "Master of Puppets" scheduled-task prompt so the tool is useful on first boot:
- **ThemePack canon:** festival name + signage rule (one allowed text), puppeteer-hand mainstage, recurring characters list, stages list (12), festival moments list (13), subgenres (5), languages (hi, ja) with example chants and tongue-twisters, Metallica exclusion rule, drop-sync rule.
- **Blocks:** 6 hooks, 8 camera moves per stage lane (scoped), 5 puppet dynamics, 5 puppet visuals, 8 physical gags, 8 chaos threads, 6 payoff types, 2 language blocks, character locks (GLOBAL, pinned), style lock "ARRI Alexa, 35mm, f/2.2, 9:16" (GLOBAL, pinned), loop closure block (GLOBAL), song structure block (Intro/Build/Pre-Drop/Drop/Outro).
- **One FlowTemplate** wiring it all, matching the current scheduled task's behavior — so day one, PuppetFlow reproduces today's pipeline, and every day after, themes change by dragging.
- **UsageLog backfill (optional manual step):** import `used-scenes-log.md` via a one-off script (`scripts/import-log.ts`) so history rules apply immediately.

---

## 8. ENVIRONMENT & DEPLOYMENT

```
# .env (Vercel project env vars)
DATABASE_URL=postgres://...        # Supabase pooled connection string
DIRECT_URL=postgres://...          # for migrations
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6
APP_USER=gal
APP_PASSWORD=<strong secret>
```
- Git: `main` = production, feature branches → PR → CI green → merge → Vercel auto-deploy. Vercel preview deployments inherit a branch DB or run with `ANTHROPIC_API_KEY` unset (run button disabled, export still works).
- Never commit `.env`; `env.ts` fails fast on boot if any var missing (except ANTHROPIC_API_KEY, which degrades to export-only mode with a UI banner — this is the "credits finished, switch to Claude Code" path working by design).

---

## 9. ACCEPTANCE CRITERIA (definition of done)
1. From a fresh clone: `pnpm i && pnpm db:migrate && pnpm db:seed && pnpm dev` gives a working canvas with the Master of Puppets template.
2. Run Batch produces 5 scenes where the linter reports zero hard violations, all handshakes verbatim, both languages present, no rotation-axis repeats, loop closure present when toggled.
3. Export scaffold pasted into Claude Code produces the same creative brief the API path used (byte-identical scaffold).
4. `scenes/[date].md` export is format-compatible with the existing scheduled task's output files.
5. Duplicating the Theme Pack, editing 3 blocks, and re-running visibly changes the batch's theme with zero code changes.
6. CI fully green; deployed on Vercel behind basic auth; README runbook complete.
