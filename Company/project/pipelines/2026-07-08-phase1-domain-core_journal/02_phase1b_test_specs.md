# Journal: Documenter — Phase 1b Test Specifications

## What I Did

- Created 3 test specification documents for Phase 1 Domain Core:
  1. `fixtures-spec.md` — Fixture structure, naming conventions, schemas for positive/negative test fixtures
  2. `rule-scenarios.md` — Comprehensive scenario tables for all 15 rules (R1-R15)
  3. `property-tests.md` — Property-based test requirements for the variety engine

## Scenario Counts per Rule

| Rule | Positive | Negative | Edge Cases | Total |
|------|----------|----------|------------|-------|
| R1 (Sequential Weighting) | 4 | 3 | 4 | 11 |
| R2 (Camera Verb) | 4 | 4 | 4 | 12 |
| R3 (Word Budget) | 4 | 4 | 5 | 13 |
| R4 (Timestamps) | 4 | 3 | 3 | 10 |
| R5 (Image-Video Division) | 4 | 2 | 3 | 9 |
| R6 (Negatives/Positives) | 3 | 3 | 3 | 9 |
| R7 (Boundary Handshake) | 4 | 4 | 4 | 12 |
| R8 (Short Extends) | 4 | 4 | 5 | 13 |
| R9 (Retention Pacing) | 4 | 3 | 4 | 11 |
| R10 (Loop Closure) | 2 | 2 | 1 | 5 |
| R11 (Audio Direction) | 2 | 3 | 0 | 5 |
| R12 (Drop Sync) | 2 | 3 | 0 | 5 |
| R13 (Character Locks) | 2 | 3 | 0 | 5 |
| R14 (Variety Rules) | 3 | 4 | 0 | 7 |
| R15 (Iteration Discipline) | 0 | 0 | 0 | 0 (UI) |
| **Total** | **46** | **45** | **36** | **127** |

Plus 5 property-based test properties for the variety engine:
1. Zero within-batch collision (200 runs)
2. History collision detection (100 runs)
3. Language distribution (100 runs)
4. Pinned block bypass (50 runs)
5. VarietyError on impossible constraints (50 runs)

## Decisions Made

1. **Fixture Naming Convention:** Adopted `r{NN}-{pos|neg}-{variant}.json` format with 2-digit rule numbers for consistent sorting.

2. **Boundary Precision:** Explicitly documented boundary conditions for all numeric thresholds. For example, R7 similarity: 0.799 (fail), 0.80 (pass), 0.801 (pass). This follows role rule #10 about explicit boundary examples.

3. **Evidence Format:** Standardized violation evidence to include specific values (e.g., "3 generic verbs detected: 'moves', 'goes', 'is'") rather than vague messages.

4. **Property Test Framework:** Specified `fast-check` with fixed seeds (seed: 42) for CI reproducibility.

5. **R15 Exclusion:** R15 (Iteration Discipline) has no predicate tests since it's purely a UI feature. Coverage comes from component/E2E tests.

## Gaps and Ambiguities Found

### Gaps

1. **R1 Preservation Position Threshold:** Blueprint says "final 25%" but doesn't specify if this is word-based or character-based. Assumed word-based (word 76+ of 100 words = final 25%).

2. **R3 Word Counting Algorithm:** Blueprint doesn't specify how to count words in prompts. Assumed whitespace-split with exclusion of timestamp markers.

3. **R5 Token Overlap Calculation:** "Token overlap" isn't precisely defined. Assumed token = word after common NLP preprocessing (lowercase, punctuation removed).

4. **R7 Similarity Algorithm:** 80% similarity threshold specified but algorithm undefined. The Tester must use whatever algorithm handshake.ts implements; fixtures may need adjustment based on actual algorithm behavior.

5. **R8 Noun Detection:** "New noun" detection requires NLP or a noun list. Implementation approach unclear.

6. **R13 Lock Block Text:** The actual CHARACTER_LOCK_BLOCKS text isn't defined in blueprint. Tester needs seed data to create accurate fixtures.

### Ambiguities

1. **R1 "First Sentence" Definition:** How to detect sentence boundaries? Period followed by space? What about timestamps like `[00:00]`?

2. **R2 Camera Vocabulary Matching:** Case-sensitive? "Dolly" vs "dolly"? "pan left" vs just "pan"?

3. **R6 "no " Pattern Matching:** Should match "no " at word start only? What about "knowingly"?

4. **R9 Hook Tag Format:** Is it exactly `[HOOK]` or can it be `hook:`, `(hook)`, etc.?

5. **R14 History Window:** "30 days" — calendar days or 30*24 hours from now?

## Assumptions

1. All numeric boundaries are inclusive unless specified otherwise (40-90 words means 40 and 90 both pass).

2. Pattern matching for camera verbs and negative patterns is case-insensitive.

3. The similarity algorithm for R7 will be implemented in handshake.ts; fixtures showing 79% vs 80% may need calibration after implementation.

4. Timestamp format is `[MM:SS]` or `[M:SS]` — both accepted.

5. Property tests use seed data constants (STAGE_AREAS, CAMERA_MOVES, etc.) from blueprint Section 7.

## Files Modified

### Created
- `/Users/galmoussan/projects/claude/puppetflow-docs/testing/fixtures-spec.md`
- `/Users/galmoussan/projects/claude/puppetflow-docs/testing/rule-scenarios.md`
- `/Users/galmoussan/projects/claude/puppetflow-docs/testing/property-tests.md`

## Notes for Optimizer

1. **Fixture Schema as Zod:** The fixture schemas are documented in TypeScript interface format, but could be implemented as Zod schemas for runtime validation. Consider adding a `tests/domain/rules/fixture-types.ts` file.

2. **Similarity Calibration:** The R7 fixtures assume a specific similarity algorithm. If handshake.ts uses a different algorithm (e.g., Jaccard vs cosine vs Levenshtein), the fixtures' boundary examples (79%, 80%) may produce different actual similarities. The Tester may need to adjust sample data after implementation.

3. **Seed Data Dependency:** Property tests and some fixture constants depend on the seed data from blueprint Section 7. If seed data changes, these specs need updating.

4. **Test Count vs Blueprint:** Blueprint says "minimum 60 test cases (15 rules x 4 fixtures)" but I've specified 127 scenarios (46 positive + 45 negative + 36 edge cases). This exceeds the minimum but follows the role rule about boundary conditions and edge cases.
