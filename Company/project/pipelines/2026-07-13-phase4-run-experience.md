# Pipeline: Phase 4 — Run Experience

**ID**: 2026-07-13-phase4-run-experience
**Status**: DONE
**Type**: Feature
**Module(s)**: components/run/, lib/store/, lib/hooks/, app/runs/, app/library/, lib/deepseek.ts
**Created**: 2026-07-13T12:00:00Z
**Completed**: 2026-07-14

Phase 4 closed 2026-07-14: T401–T407 green; DeepSeek live path; generation library;
P4-A/B/C/H complete. T408 deferred to Phase 5 with T501.


## Design Summary

Phase 4 implements the run execution UI for PuppetFlow per blueprint §4.1-4.2. Users can configure and launch batch generation from the canvas, watch SSE-driven progress, view generated scene cards with lint reports, copy prompts, reroll scenes/stages, and export markdown files.

Key components:
- Run modal for configuration (batch size, loop mode, language weights, history strictness)
- SSE progress stepper (Compiling → Assigning → Generating → Linting → Repairing → Done)
- Scene cards with combo chips, prompt panels, copy buttons
- Reroll scene/stage functionality
- Export download (scenes.md / scaffold.md)

## Design Decisions

- Q: State management for run execution? A: Separate `useRunStore` (Zustand) per Visionary recommendation — keeps canvas editing and run execution concerns separate
- Q: Run viewer location? A: Inline on canvas page during active run; dedicated `/runs/[id]` route for viewing past runs
- Q: SSE connection management? A: Custom `useRunStream` hook with EventSource, auto-reconnect, cleanup on unmount
- Q: Scene card layout? A: Accordion-style expandable cards, 4 prompt panels per card, lint badges inline
- Q: Copy feedback? A: Toast notification on successful copy
- Q: T408 (auth test)? A: OUT OF SCOPE — blocked on T501 (Phase 5)

## Pipeline Type: Feature

## Pre-Requisite: Component Test Infrastructure Fix

Per Visionary recommendation (HIGH priority), the component test infrastructure issue from Phase 3 must be fixed first. This is a 4-6 hour task that enables reliable TDD for Phase 4 UI components.

**Fix approach**: Refactor component tests to use real Zustand store with `setState()` reset between tests, instead of mocking selectors with `vi.mock()`.

## Test Scope

- **Component tests**: Run modal, progress UI, scene cards, copy buttons, reroll UI, export button
- **Integration tests**: SSE event handling, clipboard API, download triggers
- **E2E tests**: T407 - Playwright smoke: full run flow (mocked API)
- **Coverage target**: ≥70% line coverage for components/run/

## Task Breakdown

### Phase 0: Test Infrastructure Fix (Owner: Manager + Tester)
- [ ] Refactor tests/components/canvas/BlockNode.test.tsx to use real store
- [ ] Refactor tests/components/canvas/BlockPalette.test.tsx to use real store
- [ ] Refactor tests/components/canvas/Inspector.test.tsx to use real store
- [ ] Refactor tests/components/canvas/Canvas.test.tsx to use real store
- [ ] Verify all 104 component tests pass
- [ ] Document the testing pattern in project-guidelines.md

### Phase 1a: Design Documentation (Owner: Documenter)
- [ ] Create GDD for Run Experience in puppetflow-docs/product/run-experience.md
- [ ] Create Technical doc in puppetflow-docs/developer/run-technical.md
- [ ] Document useRunStore architecture
- [ ] Document SSE event handling patterns
- [ ] Document scene card component hierarchy

### Phase 1b: Test Specifications (Owner: Documenter)
- [ ] Create test spec for Run Modal component
- [ ] Create test spec for SSE Progress UI
- [ ] Create test spec for Scene Card components
- [ ] Create test spec for Copy buttons (clipboard)
- [ ] Create test spec for Reroll UI
- [ ] Create test spec for Export download
- [ ] Create test spec for E2E run flow

### Phase 2: Test Code (Owner: Tester)
- [ ] Write tests/lib/store/run-store.test.ts
- [ ] Write tests/lib/hooks/useRunStream.test.ts
- [ ] Write tests/components/run/RunModal.test.tsx
- [ ] Write tests/components/run/RunProgress.test.tsx
- [ ] Write tests/components/run/SceneCard.test.tsx
- [ ] Write tests/components/run/CopyButton.test.tsx
- [ ] Write tests/components/run/RerollButton.test.tsx
- [ ] Write tests/components/run/ExportButton.test.tsx
- [ ] Write tests/e2e/run-flow.spec.ts (T407)

### Phase 3: Implementation (Owner: Implementer)

#### Phase 3 Scope Contract (Manager MUST copy verbatim into Implementer dispatch prompt)

**Goal**: Implement the run execution UI with modal, SSE progress, scene cards, copy/reroll/export per blueprint §4.1-4.2

**Anti-Scope (DO NOT)**:
- Do not modify packages/domain/ files (domain layer is complete)
- Do not modify lib/agent.ts or lib/anthropic.ts (Phase 2 complete)
- Do not modify existing API routes (Phase 2 complete)
- Do not implement authentication (that's Phase 5)
- Do not implement T408 auth test (blocked on Phase 5)

**Allowed Scope Expansion (OK)**:
- Add utility hooks in lib/hooks/
- Add shared UI components in components/ui/
- Add run-specific types in lib/types/run.ts
- Modify canvas-store.ts minimally if needed for run modal trigger

**Checkpoint Requirement**:
- Implementer writes a journal entry after each major component completion

#### Phase 3 Tasks

Sub-Phase 3a: Foundation (Store + Hook)
- [ ] Create lib/store/run-store.ts with Zustand
- [ ] Create lib/hooks/useRunStream.ts for SSE subscription
- [ ] Create lib/types/run.ts for UI-specific types

Sub-Phase 3b: Run Modal (T401)
- [ ] Create components/run/RunModal.tsx
- [ ] Add date picker (default today)
- [ ] Add batch size slider (1-10)
- [ ] Add loop mode toggle
- [ ] Add language weight sliders (hi/ja)
- [ ] Add history strictness toggle
- [ ] Integrate with useRunStore and POST /api/runs

Sub-Phase 3c: Progress UI (T402)
- [ ] Create components/run/RunProgress.tsx
- [ ] Implement phase stepper (Compiling → Done)
- [ ] Connect to SSE stream via useRunStream
- [ ] Show skeleton cards as scenes stream
- [ ] Handle error states with toast

Sub-Phase 3d: Scene Cards (T403)
- [ ] Create components/run/SceneCard.tsx
- [ ] Create components/run/ComboChips.tsx
- [ ] Create components/run/PromptPanel.tsx
- [ ] Create components/run/LintBanner.tsx
- [ ] Implement lyrics accordion
- [ ] Implement 4 prompt panels (Image/START/MIDDLE/END)
- [ ] Implement handshake chips between video panels
- [ ] Show lint violations (warnings amber, hard-fails red)

Sub-Phase 3e: Copy Buttons (T404)
- [ ] Create components/run/CopyButton.tsx
- [ ] Implement per-prompt copy via Clipboard API
- [ ] Implement "Copy all" for entire scene
- [ ] Add toast feedback on copy

Sub-Phase 3f: Reroll UI (T405)
- [ ] Create components/run/RerollButton.tsx
- [ ] Implement "Reroll scene" button
- [ ] Implement "Reroll stage" dropdown/buttons
- [ ] Call POST /api/runs/[id]/reroll
- [ ] Update scene card optimistically or refetch

Sub-Phase 3g: Export Download (T406)
- [ ] Create components/run/ExportButton.tsx
- [ ] Implement "Download scenes.md" button
- [ ] Implement "Download scaffold.md" button
- [ ] Call GET /api/export/[runId]?format=
- [ ] Trigger browser download

Sub-Phase 3h: Page Assembly + Routes
- [ ] Add run modal trigger to app/page.tsx top bar
- [ ] Create app/runs/[id]/page.tsx for run viewer
- [ ] Integrate all components
- [ ] Add navigation between canvas and run viewer

### Phase 4: Verification (Owner: Manager — pipeline tests only)
- [ ] Run unit tests: `pnpm test tests/lib/store/run-store.test.ts tests/lib/hooks/useRunStream.test.ts`
- [ ] Run component tests: `pnpm test tests/components/run`
- [ ] Run typecheck: `pnpm typecheck`
- [ ] Run lint: `pnpm lint`
- [ ] Run Playwright T407: `pnpm test:e2e tests/e2e/run-flow.spec.ts`

### Phase 5: Doc Sync (Owner: Documenter, dispatched by Manager)
- [ ] Update technical docs to match actual implementation
- [ ] Update component documentation
- [ ] Update project-guidelines.md with Phase 4 patterns

### Phase 6: Post-Pipeline Review (Owner: Optimizer + Visionary, dispatched by Manager)
- [ ] Optimizer retrospective
- [ ] Visionary strategic review

## Dependencies

```
Phase 0 (test infra fix) → Phase 2 (test code relies on working test infra)
T401 (run modal) → T402 (progress needs modal to trigger run)
T402 (progress) → T403 (cards appear during progress)
T403 (scene cards) → T404, T405, T406 (buttons live in cards)
T404 + T405 + T406 → T407 (E2E tests all features)
T501 (Phase 5) → T408 (auth test - OUT OF SCOPE)
```

## Context for Agents

### Key Files to Read
- puppetflow-blueprint.md §4.1-4.2 (UI specification)
- puppetflow-blueprint.md §5 (API contracts)
- lib/agent.ts (orchestrator - already complete)
- lib/schemas.ts (SSEEvent types)
- app/api/runs/route.ts (SSE streaming pattern)
- lib/store/canvas-store.ts (existing Zustand patterns)
- Company/project/org/CEO/RunExperience/manager.md (org node with invariants)

### Patterns to Follow
- Zustand store with subscribeWithSelector middleware (see canvas-store.ts)
- SSE streaming: EventSource for client, ReadableStream for server
- Zod validation at all boundaries
- Tailwind CSS 4 for styling
- Dark UI: near-black background, UV-violet/acid-green accents
- Toast notifications for user feedback

### Known Gotchas
1. SSE requires `text/event-stream` content-type and `Cache-Control: no-cache`
2. EventSource only supports GET; POST /api/runs returns SSE via custom ReadableStream
3. Clipboard API requires secure context (HTTPS or localhost)
4. useRunStore must be separate from useCanvasStore to avoid state bloat
5. Zustand tests: use real store with setState(), not vi.mock() (Phase 3 lesson)
6. Scene cards must handle 5 scenes; index is 0-4

### Learnings Applied
- Separate stores for different concerns (Visionary recommendation)
- Real store testing pattern (Optimizer recommendation from Phase 3)
- TDD approach: tests before implementation
- Component tests with @testing-library/react

## Guidelines Gaps

- SSE client-side patterns not documented in project-guidelines.md
- Clipboard API patterns not documented
- File download patterns not documented

## Out of Scope (blocked tests)

- T408 Playwright auth test (blocked on T501 - Phase 5 auth middleware)

## Execution Log

<!-- Filled during execution -->
