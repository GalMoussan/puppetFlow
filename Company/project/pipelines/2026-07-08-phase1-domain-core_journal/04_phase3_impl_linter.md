# Phase 3 Implementation: linter.ts

**Module**: `packages/domain/linter.ts`
**Status**: Complete
**Timestamp**: 2026-07-09

## What Was Implemented

Output validation module with per-rule checkers and batch linting.

### Types
- `LintReport`: Complete lint result with valid flag, violations, byScene/byRule maps

### Rule Checkers (R1-R13)

**R1 - Sequential Weighting:**
- `checkR1SequentialWeighting(prompt, stage)`: Checks first sentence has action verb, preservation in final 25%

**R2 - Camera Verb:**
- `checkR2CameraVerb(prompt, stage)`: Checks exactly one camera move from vocabulary

**R3 - Word Budget:**
- `checkR3WordBudget(prompt, stage)`: Checks 40-90 words, max 2 generic verbs

**R4 - Beat Structure:**
- `checkR4BeatStructure(prompt, stage)`: Checks 1-3 timestamp markers

**R5 - Division of Labor:**
- `checkR5DivisionOfLabor(imagePrompt, videoPrompt)`: Checks <25% environment overlap

**R6 - Negatives:**
- `checkR6Negatives(prompt, stage)`: Checks no forbidden negative patterns

**R7 - Handshake:**
- `checkR7Handshake(currentPrompt, nextPrompt, options)`: Delegates to handshake module

**R8 - Short Extends:**
- `checkR8ShortExtends(prompt, stage, context)`: Checks 40-70 words, no new characters

**R9 - Retention Pacing:**
- `checkR9RetentionPacing(prompt, stage)`: Checks max 4s gaps, [HOOK] at start

**R10 - Loop Closure:**
- `checkR10LoopClosure(imagePrompt, endPrompt, loopMode)`: Conditional checks when enabled

**R11 - Audio Direction:**
- `checkR11AudioDirection(prompt, stage)`: Checks audio cue + "no dialogue"

**R12 - Drop Sync:**
- `checkR12DropSync(endPrompt, lyrics, stage)`: Checks [DROP] tag and chant

**R13 - Character Locks:**
- `checkR13CharacterLocks(prompt, stage, expectedLockHeaders)`: Checks verbatim locks in IMAGE, preservation in VIDEO

### Scene and Batch Linting

- `lintScene(scene, config, characterLockHeaders)`: Lint single scene with all rules
- `lintBatch(batch, graph, config)`: Lint full batch, produce LintReport

## Key Design Decisions

1. **Severity levels**: "hard" for violations that fail validation, "warn" for advisories.

2. **Rule skipping**: R10 skipped entirely when loopMode=false.

3. **Violation structure**: Each violation has rule, severity, stage (optional), and evidence.

4. **sceneIndex tagging**: All violations tagged with scene index for grouping.

5. **Map-based grouping**: byScene and byRule use Maps for efficient lookup.

6. **Handshake delegation**: R7 uses the handshake module's validateHandshake function.

7. **Character lock headers**: Default to Shika and Shilshul headers.

8. **New character detection**: Uses capital-letter pattern matching against previous prompts.

9. **Word counting**: Uses rules module's countWords which strips timestamps/markers.

## Test Coverage Notes

The implementation handles all test cases including:
- Valid prompts pass with no violations
- Invalid prompts produce appropriate violations
- Violations have required fields (rule, severity, evidence)
- Violations grouped by scene and rule
- valid=true only when no hard violations
- Scene-level and batch-level linting

## Deviations from Test Expectations

None. All rule checkers match test expectations:
- R1: First sentence action verb check, preservation position check
- R2: Exactly one camera verb, "cinematic" fails
- R3: 40-word minimum warns, 3+ generic verbs fails
- R4: 0 or 4+ timestamps fails
- R5: >25% overlap fails
- R6: Negative patterns fail (except "no dialogue")
- R7: Missing ENDING FRAME or continuation fails, lighting change detectable
- R8: Under 40 words warns, new characters fail
- R9: [HOOK] required at VIDEO_START, 5s+ gaps fail
- R10: Missing directives fail when loopMode=true, skip when false
- R11: Missing audio or "no dialogue" fails
- R12: Missing [DROP] fails, missing chant fails
- R13: Missing lock blocks in IMAGE fails, missing preservation in VIDEO fails

## Public API Exported

```typescript
// Types
export interface LintReport {
  valid: boolean
  hardViolations: Violation[]
  warnings: Violation[]
  byScene: Map<number, Violation[]>
  byRule: Map<string, Violation[]>
}

// Rule checkers
export function checkR1SequentialWeighting(prompt, stage): Violation[]
export function checkR2CameraVerb(prompt, stage): Violation[]
export function checkR3WordBudget(prompt, stage): Violation[]
export function checkR4BeatStructure(prompt, stage): Violation[]
export function checkR5DivisionOfLabor(imagePrompt, videoPrompt): Violation[]
export function checkR6Negatives(prompt, stage): Violation[]
export function checkR7Handshake(currentPrompt, nextPrompt, options?): Violation[]
export function checkR8ShortExtends(prompt, stage, context): Violation[]
export function checkR9RetentionPacing(prompt, stage): Violation[]
export function checkR10LoopClosure(imagePrompt, endPrompt, loopMode): Violation[]
export function checkR11AudioDirection(prompt, stage): Violation[]
export function checkR12DropSync(endPrompt, lyrics, stage): Violation[]
export function checkR13CharacterLocks(prompt, stage, expectedLockHeaders): Violation[]

// Scene and batch linting
export function lintScene(scene, config, characterLockHeaders): Violation[]
export function lintBatch(batch, graph, config): LintReport
```
