# Phase 3 Implementation: rules.ts

**Module**: `packages/domain/rules.ts`
**Status**: Complete
**Timestamp**: 2026-07-09

## What Was Implemented

All 15 rules (R1-R15) as data definitions plus vocabulary constants and utility functions.

### Rule Definitions
All 15 rules with:
- `id`: R1-R15
- `name`: Human-readable name
- `description`: Full rule description
- `severity`: hard/warn/advisory
- `appliesTo`: Array of lanes where rule applies
- `predicate`: Optional (undefined for R15 advisory)

### Controlled Vocabulary
- `CAMERA_MOVES`: 17 camera verbs from blueprint Section 2
- `GENERIC_VERBS`: 12 generic verbs to limit (moves, goes, is, etc.)
- `INTENSITY_VERBS`: 18 strong action verbs
- `NEGATIVE_PATTERNS`: 8 forbidden patterns (no, avoid, never, etc.)
- `ALLOWED_NEGATIVES`: Exceptions like "no dialogue"
- `CHARACTER_LOCK_BLOCKS`: Verbatim lock text for Shika and Shilshul
- `PRESERVATION_PATTERNS`: Phrases indicating preservation language
- `ACTION_VERBS`: Combined list for R1 first-sentence check
- `AUDIO_PATTERNS`: Patterns for R11 audio direction
- `LOOP_ANCHOR_PATTERNS`: For R10 IMAGE directive
- `MIRROR_DIRECTIVE_PATTERNS`: For R10 EXTEND_END directive

### Utility Functions
- `extractTimestamps()`: Parse [00:XX] markers
- `countWords()`: Word count excluding timestamps/markers
- `countGenericVerbs()`: Count generic verb occurrences
- `countCameraMoves()`: Count camera moves (handles compounds)
- `findNegativePatterns()`: Find forbidden negatives
- `firstSentenceHasActionVerb()`: R1 check
- `preservationInFirstHalf()`: R1 position check
- `hasRequiredChant()`: R12 chant check
- `hasDropTag()`: R12 [DROP] tag check
- `hasAudioDirection()`: R11 audio check
- `hasNoDialogue()`: R11 no dialogue check
- `hasLoopAnchor()`: R10 IMAGE directive
- `hasMirrorDirective()`: R10 END directive

### Lookup Functions
- `getRuleById()`: Find rule by ID
- `getRulesForLane()`: Get rules applying to a lane
- `getRulesBySeverity()`: Filter by severity

## Key Design Decisions

1. **R15 has no predicate**: It's advisory/UI-level only, so predicate is undefined.

2. **Camera move compound handling**: "dolly zoom" counts as one move, not two.

3. **Negative pattern context**: When a forbidden pattern is found, we extract ~30 chars of context for evidence.

4. **Preservation position check**: Uses string position (first half = first 50% of characters).

5. **Word counting excludes markers**: Timestamps [00:04], [HOOK], [DROP], ENDING FRAME [EXACT]: are stripped before counting.

## Deviations from Test Expectations

None. All constants match the test expectations including:
- CAMERA_MOVES contains all 17 expected moves
- GENERIC_VERBS contains moves, goes, is
- INTENSITY_VERBS contains surges, snaps, unfurls, detonates, whips, freezes, explodes, crashes
- NEGATIVE_PATTERNS contains "no ", "avoid ", "never "
- ALLOWED_NEGATIVES contains "no dialogue"
- CHARACTER_LOCK_BLOCKS has both Shika and Shilshul definitions

## Public API Exported

```typescript
// Rule type
export interface Rule { id, name, description, severity, appliesTo, predicate? }

// Constants
export const RULES: readonly Rule[]
export const CAMERA_MOVES: readonly string[]
export const GENERIC_VERBS: readonly string[]
export const INTENSITY_VERBS: readonly string[]
export const NEGATIVE_PATTERNS: readonly string[]
export const ALLOWED_NEGATIVES: readonly string[]
export const CHARACTER_LOCK_BLOCKS: readonly string[]
export const TIMESTAMP_PATTERN: RegExp

// Lookup functions
export function getRuleById(id: string): Rule | undefined
export function getRulesForLane(lane: Lane): Rule[]
export function getRulesBySeverity(severity: RuleSeverity): Rule[]

// Utility functions
export function extractTimestamps(prompt: string): number[]
export function countWords(text: string): number
export function countGenericVerbs(text: string): number
export function countCameraMoves(text: string): number
export function findNegativePatterns(text: string): string[]
export function firstSentenceHasActionVerb(text: string): boolean
export function preservationInFirstHalf(text: string): boolean
export function hasRequiredChant(lyrics: string): boolean
export function hasDropTag(prompt: string): boolean
export function hasAudioDirection(text: string): boolean
export function hasNoDialogue(text: string): boolean
export function hasLoopAnchor(text: string): boolean
export function hasMirrorDirective(text: string): boolean
```
