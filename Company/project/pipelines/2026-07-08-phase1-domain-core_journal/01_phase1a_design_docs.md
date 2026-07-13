# Journal: Documenter — Phase 1a Design Documentation

## What I Did

- Created 7 task specification documents for Phase 1 Domain Core modules:
  - `T101-domain-types.md` — Domain types and Zod schemas
  - `T102-domain-rules.md` — R1-R15 rules data and predicates
  - `T103-domain-variety.md` — Variety engine for combo assignment
  - `T104-domain-handshake.md` — Boundary frame handshake validation
  - `T105-domain-exporter.md` — Batch export to scenes/[date].md format
  - `T106-domain-compiler.md` — Graph-to-scaffold compilation
  - `T107-domain-linter.md` — Output validation against R1-R13

- Updated `TASK_BOARD.md`:
  - Renumbered Phase 1 tasks from T010-T017 to T101-T107
  - Moved agent.ts (T016) to Phase 2 as T207 (it lives in `lib/` not `packages/domain/`)
  - Renumbered all subsequent phases (Phase 2: T201-T210, Phase 3: T301-T307, Phase 4: T401-T408, Phase 5: T501-T506)
  - Updated dependency references across all phases
  - Updated summary table with corrected task counts

## Decisions Made

1. **Task ID Renumbering**: Changed from T0xx sequential to TXxx phase-prefixed scheme (T1xx for Phase 1, T2xx for Phase 2, etc.). This makes task IDs self-documenting regarding which phase they belong to.

2. **agent.ts Moved to Phase 2**: The original task board had `agent.ts` (orchestrator) as T016 in Phase 1. However, `agent.ts` lives in `lib/` (not `packages/domain/`) and orchestrates the entire pipeline including Anthropic API calls. It depends on compiler, linter, and variety engine, and properly belongs in Phase 2 with the API layer.

3. **Test Requirements per Blueprint**: Each task spec includes explicit test requirements derived from blueprint Section 6, following the TDD mandate.

4. **Explicit Boundary Conditions**: Per documenter role rules, handshake.ts spec includes explicit boundary condition tests (similarity 0.79 fail, 0.80 pass, 0.81 pass) to eliminate ambiguity.

## Problems Encountered

- **Task ID Mismatch**: The prompt asked for T101-T107 but the existing task board used T010-T017. Resolved by updating the entire task board to use the phase-prefixed numbering scheme, which is clearer.

- **Blueprint Ambiguity on Word Budget**: R3 specifies 40-90 words for video prompts, but the boundary conditions (exactly 40 or exactly 90) were not specified as pass or fail. I documented this as a "warn outside budget" which implies boundary-inclusive, but the implementer should confirm this interpretation.

## Assumptions

1. The handshake similarity threshold (80%) uses token-based comparison, not character-level. This aligns with semantic matching intent.

2. The "action core" word count for R3 excludes character locks and preservation language per blueprint, but the exact extraction algorithm is left to implementer discretion.

3. Variety axes for camera moves are stage-specific (start, middle, end can each have different pools), allowing up to 15 different camera moves per batch (5 scenes x 3 stages).

4. Pinned blocks are identified by `node.pinned` in the graph, not by block type. Character locks and style locks are typically pinned but this is a per-template choice.

## Files Modified

### Created
- `/Users/galmoussan/projects/claude/puppetflow-docs/tasks/phase-1/T101-domain-types.md`
- `/Users/galmoussan/projects/claude/puppetflow-docs/tasks/phase-1/T102-domain-rules.md`
- `/Users/galmoussan/projects/claude/puppetflow-docs/tasks/phase-1/T103-domain-variety.md`
- `/Users/galmoussan/projects/claude/puppetflow-docs/tasks/phase-1/T104-domain-handshake.md`
- `/Users/galmoussan/projects/claude/puppetflow-docs/tasks/phase-1/T105-domain-exporter.md`
- `/Users/galmoussan/projects/claude/puppetflow-docs/tasks/phase-1/T106-domain-compiler.md`
- `/Users/galmoussan/projects/claude/puppetflow-docs/tasks/phase-1/T107-domain-linter.md`

### Updated
- `/Users/galmoussan/projects/claude/puppetflow-docs/TASK_BOARD.md` — Complete renumbering of all phases

## Notes for Optimizer

1. **Numbering Scheme Inconsistency**: The original task board used T0xx sequential numbering while the prompt requested T1xx. This suggests the workspace conventions may need updating to explicitly specify the task ID scheme (sequential vs phase-prefixed).

2. **agent.ts Placement**: The blueprint places agent.ts in Phase 1 tests, but architecturally it belongs in Phase 2 with the API layer since it makes network calls. The task board now reflects the correct placement, but the Tester should be aware of this adjustment.

3. **Cross-Phase Dependencies**: The renumbering cascaded through all phases. Future documentation updates should reference the new task IDs. The SUMMARY.md links to task directories but not individual tasks, so no update was needed there.

4. **Test Fixture Gap**: Several task specs reference fixture files that don't exist yet (e.g., `tests/domain/compiler/fixtures/master-of-puppets.json`). The Tester will need to create these or the Implementer will need to provide them as part of TDD setup.
