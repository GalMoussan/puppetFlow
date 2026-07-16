/**
 * Domain Handshake Module
 *
 * Boundary frame extraction and similarity checking for video prompt transitions.
 * Ensures continuity between video clips via the handshake pattern.
 *
 * @module packages/domain/handshake
 */

import { type Violation } from "./types";

// =============================================================================
// Types
// =============================================================================

/**
 * Extracted boundary frame from a prompt (internal use)
 */
export interface BoundaryFrame {
  raw: string;
  position: "end" | "start";
  stage: string;
  normalized: string;
}

/**
 * Similarity result between two boundary frames
 */
export interface SimilarityResult {
  similarity: number;
  passes: boolean;
  details: {
    matchedWords: number;
    totalWords: number;
    missingElements: string[];
    lightingMatch: boolean;
    characterMatch: boolean;
  };
}

/**
 * Handshake configuration (test-facing API)
 */
export interface HandshakeConfig {
  strictness: "verbatim" | "paraphrase";
  threshold?: number;
  checkLighting?: boolean;
  checkCharacters?: boolean;
}

/**
 * Handshake check options (internal, same as HandshakeConfig)
 */
export interface HandshakeOptions {
  strictness: "verbatim" | "paraphrase";
  threshold?: number;
  checkLighting?: boolean;
  checkCharacters?: boolean;
}

/**
 * Handshake validation result (test-facing API)
 */
export interface HandshakeResult {
  valid: boolean;
  similarity: number;
  violations: Violation[];
  endingFrameFound: boolean;
  continuationFound: boolean;
  lightingMatch: boolean;
  midBlurWarning: boolean;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Pattern to extract ENDING FRAME [EXACT]: content
 * Uses greedy match to get everything after the marker
 */
export const ENDING_FRAME_PATTERN = /ENDING FRAME \[EXACT\]:\s*(.+?)$/i;

/**
 * Pattern to extract continuation frame content
 */
export const CONTINUATION_PATTERN =
  /Continue (?:directly )?from (?:the )?(?:final )?(?:frame of )?(?:the )?previous(?: clip)?:\s*(.+?\.?)\s*\[00:/i;

/**
 * Default similarity threshold (80%)
 */
export const DEFAULT_THRESHOLD = 0.8;

/**
 * Lighting-related descriptors to check
 */
export const LIGHTING_DESCRIPTORS: readonly string[] = [
  "UV",
  "purple",
  "amber",
  "golden",
  "blue",
  "red",
  "green",
  "warm",
  "cool",
  "neon",
  "lighting",
  "lit",
  "bathed",
  "glow",
  "spotlight",
  "laser",
  "ambient",
  "festival lights",
] as const;

/**
 * Specific lighting color/type descriptors (excluding generic presence words)
 * These must match between frames for lighting continuity
 */
export const LIGHTING_COLOR_DESCRIPTORS: readonly string[] = [
  "UV",
  "purple",
  "amber",
  "golden",
  "blue",
  "red",
  "green",
  "warm",
  "cool",
  "neon",
  "laser",
] as const;

/**
 * Alias for backwards compatibility
 */
export const LIGHTING_KEYWORDS = LIGHTING_DESCRIPTORS;

/**
 * Mid-blur patterns that should be flagged
 */
export const MID_BLUR_PATTERNS: readonly string[] = [
  "blur",
  "blurry",
  "blurring",
  "out of focus",
  "defocus",
  "bokeh",
  "soft focus",
  "motion blur",
  "motion-blurred",
  "in motion blur",
  "mid-explosion",
  "transitioning",
] as const;

/**
 * Character-related keywords to check
 */
export const CHARACTER_KEYWORDS: readonly string[] = [
  "Shika",
  "Shilshul",
  "puppet",
  "strings",
  "marionette",
  "fur",
  "orange",
  "blue",
] as const;

// =============================================================================
// Frame Extraction (Internal - returns BoundaryFrame)
// =============================================================================

/**
 * Extract the ending boundary frame from a prompt (internal, reserved for future use)
 */
function _extractEndingFrameFull(prompt: string): BoundaryFrame | null {
  // Find all ENDING FRAME markers and get the last one
  const regex = /ENDING FRAME \[EXACT\]:\s*(.+?)(?:$)/gi;
  let lastMatch: RegExpExecArray | null = null;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(prompt)) !== null) {
    lastMatch = match;
  }

  if (!lastMatch || !lastMatch[1]) {
    return null;
  }

  const raw = lastMatch[1].trim();
  // Remove trailing period if present
  const cleanRaw = raw.endsWith('.') ? raw.slice(0, -1) : raw;

  return {
    raw: cleanRaw,
    position: "end",
    stage: inferStage(prompt),
    normalized: normalizeFrame(cleanRaw),
  };
}

/**
 * Extract the continuation frame from a prompt (internal)
 */
function extractContinuationFull(prompt: string): BoundaryFrame | null {
  const match = prompt.match(CONTINUATION_PATTERN);
  if (!match || !match[1]) {
    return null;
  }

  const raw = match[1].trim();
  return {
    raw,
    position: "start",
    stage: inferStage(prompt),
    normalized: normalizeFrame(raw),
  };
}

// =============================================================================
// Frame Extraction (Public API - returns string | null)
// =============================================================================

/**
 * Extract the ending frame text from a prompt
 * Returns the raw text string or null if not found
 */
export function extractEndingFrame(prompt: string): string | null {
  // Split on all ENDING FRAME markers (case insensitive) and take the last segment
  const markerRegex = /ENDING FRAME \[EXACT\]:\s*/gi;
  const parts = prompt.split(markerRegex);

  // If only one part, no marker was found
  if (parts.length < 2) {
    return null;
  }

  // Get the last segment (after the last marker)
  const lastPart = parts[parts.length - 1].trim();

  // Return empty string for empty content (not null)
  return lastPart;
}

/**
 * Extract the continuation frame text from a prompt
 * Returns the raw text string or null if not found
 */
export function extractContinuation(prompt: string): string | null {
  const match = prompt.match(CONTINUATION_PATTERN);
  if (!match || !match[1]) {
    return null;
  }
  return match[1].trim();
}

/**
 * Alias for extractContinuation (backwards compatibility)
 */
export function extractContinuationFrame(prompt: string): BoundaryFrame | null {
  return extractContinuationFull(prompt);
}

/**
 * Infer stage from prompt content
 */
function inferStage(prompt: string): string {
  if (prompt.includes("[DROP]")) return "EXTEND_END";
  if (prompt.includes("Continue directly from") || prompt.includes("Continue from")) {
    if (prompt.includes("[DROP]")) return "EXTEND_END";
    return "EXTEND_MIDDLE";
  }
  if (prompt.includes("[HOOK]")) return "VIDEO_START";
  return "VIDEO_START";
}

/**
 * Normalize frame text for comparison
 */
export function normalizeFrame(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ") // Remove punctuation
    .replace(/\s+/g, " ") // Collapse whitespace
    .trim();
}

// =============================================================================
// Word Tokenization
// =============================================================================

/**
 * Tokenize text into words for comparison
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

/**
 * Get word set from text
 */
export function getWordSet(text: string): Set<string> {
  return new Set(tokenize(text));
}

// =============================================================================
// Lighting and Character Detection
// =============================================================================

/**
 * Extract lighting descriptors from text
 */
export function extractLightingDescriptors(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];

  for (const descriptor of LIGHTING_DESCRIPTORS) {
    if (lower.includes(descriptor.toLowerCase())) {
      found.push(descriptor);
    }
  }

  return found;
}

/**
 * Detect mid-blur patterns in text
 */
export function detectMidBlur(text: string): boolean {
  const lower = text.toLowerCase();

  for (const pattern of MID_BLUR_PATTERNS) {
    if (lower.includes(pattern.toLowerCase())) {
      return true;
    }
  }

  return false;
}

// =============================================================================
// Similarity Calculation
// =============================================================================

/**
 * Calculate Jaccard similarity between two word sets
 */
export function jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
  if (set1.size === 0 && set2.size === 0) return 1.0;
  if (set1.size === 0 || set2.size === 0) return 0.0;

  let intersection = 0;
  for (const word of set1) {
    if (set2.has(word)) {
      intersection++;
    }
  }

  const union = set1.size + set2.size - intersection;
  return intersection / union;
}

/**
 * Calculate word overlap similarity (more lenient than Jaccard)
 */
export function overlapSimilarity(set1: Set<string>, set2: Set<string>): number {
  if (set1.size === 0 && set2.size === 0) return 1.0;
  if (set1.size === 0 || set2.size === 0) return 0.0;

  let intersection = 0;
  for (const word of set1) {
    if (set2.has(word)) {
      intersection++;
    }
  }

  const minSize = Math.min(set1.size, set2.size);
  return intersection / minSize;
}

/**
 * Extract specific lighting color descriptors from text
 */
export function extractLightingColorDescriptors(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];

  for (const descriptor of LIGHTING_COLOR_DESCRIPTORS) {
    if (lower.includes(descriptor.toLowerCase())) {
      found.push(descriptor);
    }
  }

  return found;
}

/**
 * Check if lighting keywords match
 * Returns true if lighting colors/types are consistent between frames
 */
export function checkLightingMatch(text1: string, text2: string): boolean {
  const colors1 = extractLightingColorDescriptors(text1);
  const colors2 = extractLightingColorDescriptors(text2);

  // If neither mentions specific lighting colors, consider it a match
  if (colors1.length === 0 && colors2.length === 0) return true;

  // If one has specific colors and the other doesn't, mismatch
  if (colors1.length === 0 || colors2.length === 0) return false;

  // Check that the color sets are the same (order-independent)
  const set1 = new Set(colors1.map(c => c.toLowerCase()));
  const set2 = new Set(colors2.map(c => c.toLowerCase()));

  if (set1.size !== set2.size) return false;

  for (const color of set1) {
    if (!set2.has(color)) return false;
  }

  return true;
}

/**
 * Check if character keywords match
 */
export function checkCharacterMatch(text1: string, text2: string): boolean {
  const lower1 = text1.toLowerCase();
  const lower2 = text2.toLowerCase();

  const chars1: string[] = [];
  const chars2: string[] = [];

  for (const keyword of CHARACTER_KEYWORDS) {
    if (lower1.includes(keyword.toLowerCase())) {
      chars1.push(keyword);
    }
    if (lower2.includes(keyword.toLowerCase())) {
      chars2.push(keyword);
    }
  }

  // If neither mentions characters, consider it a match
  if (chars1.length === 0 && chars2.length === 0) return true;

  // Check for matching character keywords
  for (const c of chars1) {
    if (chars2.map(x => x.toLowerCase()).includes(c.toLowerCase())) return true;
  }

  return false;
}

/**
 * Find missing elements between two frame descriptions
 */
export function findMissingElements(expected: string, actual: string): string[] {
  const expectedWords = getWordSet(expected);
  const actualWords = getWordSet(actual);
  const missing: string[] = [];

  // Check for important missing words (longer than 3 chars)
  for (const word of expectedWords) {
    if (word.length > 3 && !actualWords.has(word)) {
      missing.push(word);
    }
  }

  return missing;
}

/**
 * Calculate comprehensive similarity between two strings
 */
export function calculateSimilarity(
  ending: string,
  continuation: string,
  options: HandshakeConfig = { strictness: "verbatim" }
): SimilarityResult {
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;

  const endWords = getWordSet(ending);
  const contWords = getWordSet(continuation);

  // Calculate word overlap
  let matchedWords = 0;
  for (const word of endWords) {
    if (contWords.has(word)) {
      matchedWords++;
    }
  }

  // Use Jaccard similarity for accurate measurement
  const similarity = jaccardSimilarity(endWords, contWords);

  // Check lighting and character matches
  const lightingMatch = options.checkLighting !== false ? checkLightingMatch(ending, continuation) : true;

  const characterMatch =
    options.checkCharacters !== false ? checkCharacterMatch(ending, continuation) : true;

  // Find missing elements
  const missingElements = findMissingElements(ending, continuation);

  // Determine if passes
  let passes = similarity >= threshold;

  // Paraphrase mode uses lower threshold (60%)
  if (options.strictness === "paraphrase") {
    passes = similarity >= 0.6;
  }

  // Stricter mode requires lighting and character match
  if (options.strictness === "verbatim") {
    passes = passes && (options.checkLighting !== true || lightingMatch);
  }

  return {
    similarity,
    passes,
    details: {
      matchedWords,
      totalWords: endWords.size,
      missingElements,
      lightingMatch,
      characterMatch,
    },
  };
}

// =============================================================================
// Handshake Validation
// =============================================================================

/**
 * Validate handshake between two consecutive prompts
 * Returns HandshakeResult with validity, similarity, and violations
 */
export function validateHandshake(
  currentPrompt: string,
  nextPrompt: string,
  config: HandshakeConfig = { strictness: "verbatim" }
): HandshakeResult {
  const violations: Violation[] = [];
  const threshold = config.threshold ?? DEFAULT_THRESHOLD;

  // Extract ending frame from current prompt
  const endingFrame = extractEndingFrame(currentPrompt);
  const endingFrameFound = endingFrame !== null && endingFrame.trim().length > 0;

  // Extract continuation frame from next prompt
  const continuationText = extractContinuation(nextPrompt);
  const continuationFound = continuationText !== null && continuationText.trim().length > 0;

  // Default values
  let similarity = 0;
  let lightingMatch = true;
  let midBlurWarning = false;

  // Check for missing markers
  if (!endingFrameFound) {
    violations.push({
      rule: "R7",
      severity: "hard",
      evidence: "Missing ENDING FRAME [EXACT]: marker in prompt",
    });
  }

  if (!continuationFound) {
    violations.push({
      rule: "R7",
      severity: "hard",
      evidence: "Missing continuation statement at start of next prompt",
    });
  }

  // Calculate similarity only if both frames found
  if (endingFrameFound && continuationFound && endingFrame && continuationText) {
    const result = calculateSimilarity(endingFrame, continuationText, config);
    similarity = result.similarity;
    lightingMatch = result.details.lightingMatch;

    // Check mid-blur patterns
    midBlurWarning = detectMidBlur(endingFrame) || detectMidBlur(continuationText);

    if (!result.passes) {
      violations.push({
        rule: "R7",
        severity: "hard",
        evidence: `Handshake similarity ${(result.similarity * 100).toFixed(1)}% is below ${threshold * 100}% threshold`,
      });
    }

    // Add specific lighting violation if applicable
    if (config.checkLighting && !result.details.lightingMatch) {
      const endingLighting = extractLightingColorDescriptors(endingFrame);
      const contLighting = extractLightingColorDescriptors(continuationText);
      violations.push({
        rule: "R7",
        severity: "hard",
        evidence: `R7 violation: lighting changed from [${endingLighting.join(", ")}] to [${contLighting.join(", ")}]`,
      });
    }
  }

  return {
    valid: violations.length === 0,
    similarity,
    violations,
    endingFrameFound,
    continuationFound,
    lightingMatch,
    midBlurWarning,
  };
}

/**
 * Check handshake for all transitions in a scene
 */
export function validateSceneHandshakes(
  startPrompt: string,
  middlePrompt: string,
  endPrompt: string,
  config: HandshakeConfig = { strictness: "verbatim" }
): Violation[] {
  const violations: Violation[] = [];

  // Check START -> MIDDLE handshake
  const startToMiddle = validateHandshake(startPrompt, middlePrompt, config);
  for (const v of startToMiddle.violations) {
    violations.push({
      ...v,
      stage: "VIDEO_START -> EXTEND_MIDDLE",
    });
  }

  // Check MIDDLE -> END handshake
  const middleToEnd = validateHandshake(middlePrompt, endPrompt, config);
  for (const v of middleToEnd.violations) {
    violations.push({
      ...v,
      stage: "EXTEND_MIDDLE -> EXTEND_END",
    });
  }

  return violations;
}

// =============================================================================
// Boundary Frame Extraction Utilities
// =============================================================================

/**
 * Extract boundary frame 1 (START -> MIDDLE)
 */
export function extractBoundaryFrame1(startPrompt: string): string {
  return extractEndingFrame(startPrompt) ?? "";
}

/**
 * Extract boundary frame 2 (MIDDLE -> END)
 */
export function extractBoundaryFrame2(middlePrompt: string): string {
  return extractEndingFrame(middlePrompt) ?? "";
}

/**
 * Extract final frame from END prompt
 */
export function extractFinalFrame(endPrompt: string): string {
  return extractEndingFrame(endPrompt) ?? "";
}

// =============================================================================
// Full Batch Handshake Check
// =============================================================================

/**
 * Check all handshakes in a batch of scenes
 */
export function checkBatchHandshakes(
  scenes: Array<{ startPrompt: string; middlePrompt: string; endPrompt: string }>,
  config: HandshakeConfig = { strictness: "verbatim" }
): Map<number, Violation[]> {
  const results = new Map<number, Violation[]>();

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const violations = validateSceneHandshakes(scene.startPrompt, scene.middlePrompt, scene.endPrompt, config);

    // Tag with scene index
    const taggedViolations = violations.map((v) => ({
      ...v,
      sceneIndex: i,
    }));

    results.set(i, taggedViolations);
  }

  return results;
}
