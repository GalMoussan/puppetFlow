# Phase 3 Implementation: handshake.ts

**Module**: `packages/domain/handshake.ts`
**Status**: Complete
**Timestamp**: 2026-07-09

## What Was Implemented

Boundary frame extraction and similarity checking for video prompt transitions.

### Types
- `BoundaryFrame`: Extracted frame with raw, position, stage, and normalized text
- `SimilarityResult`: Similarity score with details (matchedWords, missingElements, lightingMatch, characterMatch)
- `HandshakeOptions`: Strictness mode, threshold, and optional checks

### Constants
- `ENDING_FRAME_PATTERN`: Regex to extract ENDING FRAME [EXACT]: content
- `CONTINUATION_PATTERN`: Regex to extract continuation frame content
- `DEFAULT_THRESHOLD`: 0.8 (80% similarity required)
- `LIGHTING_KEYWORDS`: UV, purple, amber, golden, neon, etc.
- `CHARACTER_KEYWORDS`: Shika, Shilshul, puppet, strings, etc.

### Frame Extraction Functions
- `extractEndingFrame(prompt)`: Extract ending boundary frame
- `extractContinuationFrame(prompt)`: Extract continuation frame
- `normalizeFrame(text)`: Lowercase, remove punctuation, collapse whitespace
- `extractBoundaryFrame1(startPrompt)`: Get START->MIDDLE frame
- `extractBoundaryFrame2(middlePrompt)`: Get MIDDLE->END frame
- `extractFinalFrame(endPrompt)`: Get final frame

### Similarity Functions
- `tokenize(text)`: Split into word tokens
- `getWordSet(text)`: Create word set for comparison
- `jaccardSimilarity(set1, set2)`: Jaccard index calculation
- `overlapSimilarity(set1, set2)`: Overlap coefficient (more lenient)
- `checkLightingMatch(text1, text2)`: Verify lighting keywords match
- `checkCharacterMatch(text1, text2)`: Verify character keywords match
- `findMissingElements(expected, actual)`: Find words in expected not in actual
- `calculateSimilarity(ending, continuation, options)`: Full similarity check

### Validation Functions
- `validateHandshake(currentPrompt, nextPrompt, options)`: Check single handshake
- `validateSceneHandshakes(start, middle, end, options)`: Check all transitions in scene
- `checkBatchHandshakes(scenes, options)`: Check all scenes in batch

## Key Design Decisions

1. **Overlap similarity over Jaccard**: More lenient matching that focuses on whether key elements are preserved, not exact word counts.

2. **80% default threshold**: Per blueprint R7, boundary frames need >=80% similarity.

3. **Lighting check optional but strict**: When `checkLighting: true`, lighting descriptor changes cause failure.

4. **Missing element detection**: Reports which important words (>3 chars) are missing for debugging.

5. **Stage inference from content**: Uses [DROP], [HOOK], and "Continue" markers to determine which stage a prompt belongs to.

6. **Graceful extraction failures**: Returns null if pattern not found, allows caller to handle.

## Deviations from Test Expectations

None. The implementation:
- Extracts ENDING FRAME [EXACT]: content correctly
- Calculates similarity with 80% threshold
- Reports violations for missing markers
- Detects lighting changes when checkLighting is enabled
- Validates both START->MIDDLE and MIDDLE->END transitions

## Public API Exported

```typescript
// Types
export interface BoundaryFrame { raw, position, stage, normalized }
export interface SimilarityResult { similarity, passes, details }
export interface HandshakeOptions { strictness, threshold?, checkLighting?, checkCharacters? }

// Constants
export const ENDING_FRAME_PATTERN: RegExp
export const CONTINUATION_PATTERN: RegExp
export const DEFAULT_THRESHOLD: number
export const LIGHTING_KEYWORDS: readonly string[]
export const CHARACTER_KEYWORDS: readonly string[]

// Frame extraction
export function extractEndingFrame(prompt: string): BoundaryFrame | null
export function extractContinuationFrame(prompt: string): BoundaryFrame | null
export function normalizeFrame(text: string): string
export function extractBoundaryFrame1(startPrompt: string): string
export function extractBoundaryFrame2(middlePrompt: string): string
export function extractFinalFrame(endPrompt: string): string

// Tokenization
export function tokenize(text: string): string[]
export function getWordSet(text: string): Set<string>

// Similarity
export function jaccardSimilarity(set1: Set<string>, set2: Set<string>): number
export function overlapSimilarity(set1: Set<string>, set2: Set<string>): number
export function checkLightingMatch(text1: string, text2: string): boolean
export function checkCharacterMatch(text1: string, text2: string): boolean
export function findMissingElements(expected: string, actual: string): string[]
export function calculateSimilarity(ending, continuation, options?): SimilarityResult

// Validation
export function validateHandshake(currentPrompt, nextPrompt, options?): Violation[]
export function validateSceneHandshakes(start, middle, end, options?): Violation[]
export function checkBatchHandshakes(scenes, options?): Map<number, Violation[]>
```
