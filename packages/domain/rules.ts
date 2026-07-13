/**
 * Domain Rules (R1-R15)
 *
 * Rule definitions for the PuppetFlow prompt engineering rulebook.
 * Each rule is defined as data with predicates for linting.
 *
 * @module packages/domain/rules
 */

import { type Lane, type RuleSeverity } from "./types";

// =============================================================================
// Rule Type Definition
// =============================================================================

/**
 * Special targets beyond standard lanes (e.g., LYRICS for lyric validation)
 */
export type RuleTarget = Lane | "LYRICS";

/**
 * A rule definition with predicate for validation
 */
export interface Rule {
  id: string;
  name: string;
  description: string;
  severity: RuleSeverity;
  appliesTo: RuleTarget[];
  predicate?: (input: unknown) => boolean;
}

// =============================================================================
// Controlled Vocabulary - Camera Moves
// =============================================================================

/**
 * Controlled vocabulary for camera moves (R2)
 * These are the only valid primary camera verbs
 */
export const CAMERA_MOVES: readonly string[] = [
  "dolly",
  "push-in",
  "orbit",
  "circular dolly",
  "pan",
  "whip pan",
  "handheld tracking",
  "crane up",
  "crane down",
  "tilt-up",
  "tilt-down",
  "macro push-in",
  "dolly zoom",
  "crash-zoom",
  "snap-zoom",
  "static wide",
  "tracking shot",
] as const;

// =============================================================================
// Verb Lists
// =============================================================================

/**
 * Generic verbs to avoid (R3)
 * More than 2 of these triggers a hard fail
 */
export const GENERIC_VERBS: readonly string[] = [
  "moves",
  "goes",
  "is",
  "was",
  "are",
  "were",
  "has",
  "have",
  "had",
  "does",
  "do",
  "did",
] as const;

/**
 * Intensity verbs (preferred) (R3)
 */
export const INTENSITY_VERBS: readonly string[] = [
  "surges",
  "snaps",
  "unfurls",
  "detonates",
  "whips",
  "freezes",
  "explodes",
  "crashes",
  "bursts",
  "launches",
  "slams",
  "rips",
  "tears",
  "blazes",
  "erupts",
  "pulses",
  "throbs",
  "roars",
] as const;

// =============================================================================
// Negative Pattern Lists
// =============================================================================

/**
 * Forbidden negative patterns in video prompts (R6)
 */
export const NEGATIVE_PATTERNS: readonly string[] = [
  "no ",
  "avoid ",
  "never ",
  "don't ",
  "do not ",
  "without ",
  "exclude ",
  "refrain from ",
] as const;

/**
 * Allowed exceptions to negative patterns (R6)
 */
export const ALLOWED_NEGATIVES: readonly string[] = [
  "no dialogue",
] as const;

// =============================================================================
// Character Lock Blocks
// =============================================================================

/**
 * Verbatim character lock text blocks (R13)
 * These must appear EXACTLY in IMAGE prompts
 */
export const CHARACTER_LOCK_BLOCKS: readonly string[] = [
  `CRITICAL CHARACTER LOCK - SHIKA:
Shika is a humanoid puppet with orange fur, large expressive eyes, and visible string connections at joints. Height approximately 1.5 meters. Always shows marionette control bars above.`,
  `CRITICAL CHARACTER LOCK - SHILSHUL:
Shilshul is a humanoid puppet with blue fur, matching expressive eyes, complementary design to Shika. Same visible string mechanism and control aesthetic.`,
] as const;

/**
 * Character names for preservation checking in video prompts
 */
export const CHARACTER_NAMES: readonly string[] = [
  "Shika",
  "Shilshul",
] as const;

// =============================================================================
// Timestamp Patterns
// =============================================================================

/**
 * Pattern to match timestamp markers [00:00], [00:04], etc.
 */
export const TIMESTAMP_PATTERN = /\[(\d{2}):(\d{2})\]/g;

/**
 * Extract timestamps from a prompt
 */
export function extractTimestamps(prompt: string): number[] {
  const matches = prompt.matchAll(TIMESTAMP_PATTERN);
  const timestamps: number[] = [];
  for (const match of matches) {
    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    timestamps.push(minutes * 60 + seconds);
  }
  return timestamps;
}

// =============================================================================
// Preservation Patterns
// =============================================================================

/**
 * Patterns indicating preservation language
 */
export const PRESERVATION_PATTERNS: readonly string[] = [
  "keep same",
  "keep the same",
  "maintain same",
  "maintain the same",
  "preserve",
  "identical to",
  "same lighting",
  "same character",
  "same string",
  "same UV",
  "same appearance",
] as const;

// =============================================================================
// Action Verbs (for R1)
// =============================================================================

/**
 * Strong action verbs indicating subject + action (R1)
 */
export const ACTION_VERBS: readonly string[] = [
  ...INTENSITY_VERBS,
  "dances",
  "performs",
  "leaps",
  "jumps",
  "runs",
  "walks",
  "spins",
  "twirls",
  "rises",
  "falls",
  "emerges",
  "appears",
  "strikes",
  "poses",
  "gestures",
  "waves",
  "reaches",
  "grabs",
  "holds",
  "releases",
  "drops",
  "catches",
  "throws",
  "continue",
  "continues",
  "maintains",
  "builds",
  "anticipation",
  "resumes",
] as const;

// =============================================================================
// Audio Patterns (R11)
// =============================================================================

/**
 * Patterns indicating audio direction
 */
export const AUDIO_PATTERNS: readonly string[] = [
  "audio:",
  "sound:",
  "music:",
  "sfx:",
] as const;

// =============================================================================
// Loop Closure Patterns (R10)
// =============================================================================

/**
 * Loop anchor directive patterns for IMAGE
 */
export const LOOP_ANCHOR_PATTERNS: readonly string[] = [
  "loop anchor",
  "seamless video looping",
  "seamless loop",
] as const;

/**
 * Mirror directive patterns for EXTEND_END
 */
export const MIRROR_DIRECTIVE_PATTERNS: readonly string[] = [
  "mirrors the opening",
  "mirrors opening",
  "mirror the opening",
  "mirror opening",
] as const;

// =============================================================================
// The 15 Rules
// =============================================================================

/**
 * R1: Sequential Weighting
 * First sentence = subject + primary action
 * Preservation in final 25%
 */
const R1: Rule = {
  id: "R1",
  name: "Sequential Weighting",
  description:
    "First sentence must have subject + action verb. Preservation language in final 25% only.",
  severity: "hard",
  appliesTo: ["VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
  predicate: (input: unknown): boolean => {
    const { prompt } = input as { prompt: string };
    return firstSentenceHasActionVerb(prompt) && !preservationInFirstHalf(prompt);
  },
};

/**
 * R2: Explicit Camera Verb
 * Exactly one camera move from controlled vocabulary
 */
const R2: Rule = {
  id: "R2",
  name: "Explicit Camera Verb",
  description:
    "Each video prompt must name exactly one primary camera move from controlled vocabulary.",
  severity: "hard",
  appliesTo: ["VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
  predicate: (input: unknown): boolean => {
    const { prompt } = input as { prompt: string };
    return countCameraMoves(prompt) === 1;
  },
};

/**
 * R3: Word Budget and Strong Verbs
 * 40-90 words for video, prefer intensity verbs
 */
const R3: Rule = {
  id: "R3",
  name: "Word Budget and Strong Verbs",
  description:
    "Video prompt: 40-90 words. No more than 2 generic verbs (moves, goes, is).",
  severity: "hard",
  appliesTo: ["VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
  predicate: (input: unknown): boolean => {
    const { prompt } = input as { prompt: string };
    const wordCount = countWords(prompt);
    const genericVerbCount = countGenericVerbs(prompt);
    return wordCount >= 40 && wordCount <= 90 && genericVerbCount <= 2;
  },
};

/**
 * R4: Beat Structure with Timestamps
 * 1-3 beats with [00:XX] markers
 */
const R4: Rule = {
  id: "R4",
  name: "Beat Structure with Timestamps",
  description: "Each video prompt has 1-3 timestamp beats [00:XX]. Never more than 3.",
  severity: "hard",
  appliesTo: ["VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
  predicate: (input: unknown): boolean => {
    const { prompt } = input as { prompt: string };
    const timestamps = (prompt.match(TIMESTAMP_PATTERN) || []).length;
    return timestamps >= 1 && timestamps <= 3;
  },
};

/**
 * R5: Image-to-Video Division of Labor
 * VIDEO_START must not re-describe scene from IMAGE
 */
const R5: Rule = {
  id: "R5",
  name: "Image-to-Video Division of Labor",
  description: "VIDEO_START must not repeat >25% environment from IMAGE prompt.",
  severity: "hard",
  appliesTo: ["VIDEO_START"],
  predicate: (input: unknown): boolean => {
    const { imagePrompt, videoPrompt } = input as { imagePrompt?: string; videoPrompt?: string };
    if (!imagePrompt || !videoPrompt) return true; // Pass if missing prompts
    return calculateEnvironmentOverlap(imagePrompt, videoPrompt) <= 0.25;
  },
};

/**
 * R6: Negatives in Image, Positives in Video
 * No negative constraints in video prompts (except "no dialogue")
 */
const R6: Rule = {
  id: "R6",
  name: "Negatives in Image, Positives in Video",
  description: "Video prompts use only positive preservation. Exception: 'no dialogue'.",
  severity: "hard",
  appliesTo: ["VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
  predicate: (input: unknown): boolean => {
    const { prompt } = input as { prompt: string };
    return !hasNegativePatterns(prompt);
  },
};

/**
 * R7: Boundary Frame Handshake
 * ENDING FRAME [EXACT]: + continuation with 80% similarity
 */
const R7: Rule = {
  id: "R7",
  name: "Boundary Frame Handshake",
  description:
    "Every video prompt ends with ENDING FRAME [EXACT]:. Next clip opens with verbatim restatement (>=80% similarity).",
  severity: "hard",
  appliesTo: ["VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
  predicate: (input: unknown): boolean => {
    const { prompt } = input as { prompt: string };
    // For single prompt check, verify ending frame marker exists
    return /ENDING FRAME \[EXACT\]:/i.test(prompt);
  },
};

/**
 * R8: Short Extends, Preservation-Heavy
 * EXTEND prompts: 40-70 words, no new characters/locations
 */
const R8: Rule = {
  id: "R8",
  name: "Short Extends, Preservation-Heavy",
  description: "EXTEND prompts: 40-70 words. No new characters or locations mid-scene.",
  severity: "hard",
  appliesTo: ["EXTEND_MIDDLE", "EXTEND_END"],
  predicate: (input: unknown): boolean => {
    const { prompt } = input as { prompt: string };
    const wordCount = countWords(prompt);
    return wordCount >= 40 && wordCount <= 70;
  },
};

/**
 * R9: Retention Pacing
 * Visual change every 1.5-3s, max 4s gap
 * Hook in first 2s of VIDEO_START
 */
const R9: Rule = {
  id: "R9",
  name: "Retention Pacing",
  description:
    "Beat spacing max 4s apart. VIDEO_START first beat must be tagged [HOOK] at 0-2s.",
  severity: "hard",
  appliesTo: ["VIDEO_START"],
  predicate: (input: unknown): boolean => {
    const { prompt } = input as { prompt: string };
    // Check for [HOOK] tag within first 2 seconds (at 00:00, 00:01, or 00:02)
    return /\[00:0[0-2]\].*\[HOOK\]|\[HOOK\].*\[00:0[0-2]\]/i.test(prompt);
  },
};

/**
 * R10: Loop Closure (Conditional)
 * When loopMode=true, inject loop anchor + mirror directives
 */
const R10: Rule = {
  id: "R10",
  name: "Loop Closure",
  description:
    "When loopMode ON: IMAGE has loop anchor directive, EXTEND_END mirrors opening composition.",
  severity: "hard",
  appliesTo: ["IMAGE", "EXTEND_END"],
  predicate: (input: unknown): boolean => {
    const { prompt, runConfig } = input as { prompt: string; runConfig?: { loopMode?: boolean } };
    // If loopMode is off, rule passes
    if (!runConfig?.loopMode) return true;
    // Check for loop anchor or mirror directive
    return /loop anchor|mirrors? opening|seamless.*loop/i.test(prompt);
  },
};

/**
 * R11: Audio Direction
 * Each video prompt has audio cue + "no dialogue"
 */
const R11: Rule = {
  id: "R11",
  name: "Audio Direction",
  description: "Each video prompt carries audio cue sentence + 'no dialogue'.",
  severity: "hard",
  appliesTo: ["VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
  predicate: (input: unknown): boolean => {
    const { prompt } = input as { prompt: string };
    return hasAudioDirection(prompt) && /no dialogue/i.test(prompt);
  },
};

/**
 * R12: Drop Sync (Series-Specific)
 * EXTEND_END final beat tagged [DROP]
 * Lyrics must have chant in Drop section
 */
const R12: Rule = {
  id: "R12",
  name: "Drop Sync",
  description:
    "EXTEND_END final beat tagged [DROP]. Lyrics Drop section has 'Shika! Shika! Shilshul! Shilshul!' chant.",
  severity: "hard",
  appliesTo: ["EXTEND_END", "LYRICS"],
  predicate: (input: unknown): boolean => {
    const { prompt, stage } = input as { prompt: string; stage?: string };
    if (stage === "LYRICS") {
      return hasRequiredChant(prompt);
    }
    return hasDropTag(prompt);
  },
};

/**
 * R13: Character Locks Verbatim
 * CRITICAL lock blocks verbatim in IMAGE
 * Condensed preservation in video prompts
 */
const R13: Rule = {
  id: "R13",
  name: "Character Locks Verbatim",
  description:
    "CRITICAL lock blocks appear VERBATIM in IMAGE. Video prompts have condensed preservation.",
  severity: "hard",
  appliesTo: ["IMAGE", "VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
  predicate: (input: unknown): boolean => {
    const { prompt, stage } = input as { prompt: string; stage?: string };
    if (stage === "IMAGE") {
      // IMAGE must contain character lock blocks
      return CHARACTER_LOCK_BLOCKS.some(block => prompt.includes(block));
    }
    // Video prompts must have condensed preservation
    return PRESERVATION_PATTERNS.some(pattern => prompt.toLowerCase().includes(pattern.toLowerCase()));
  },
};

/**
 * R14: Variety Rules
 * No repeats within batch on rotation axes
 * History checks for 30-day stage+moment, 10-run dynamic+payoff
 */
const R14: Rule = {
  id: "R14",
  name: "Variety Rules",
  description:
    "No repeats within batch. 30-day stage+moment history. 10-run dynamic+payoff history.",
  severity: "hard",
  appliesTo: ["GLOBAL"],
  predicate: (input: unknown): boolean => {
    // Batch-level rule - actual checking done in variety module
    const { batchCombos } = input as { batchCombos?: Record<string, string>[] };
    if (!batchCombos || batchCombos.length === 0) return true;
    // Simple check: no two combos have identical stage+moment
    const seen = new Set<string>();
    for (const combo of batchCombos) {
      const key = `${combo.stage || ""}_${combo.moment || ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
    }
    return true;
  },
};

/**
 * R15: Iteration Discipline (Advisory)
 * UI-level feature, not enforced by linter
 */
const R15: Rule = {
  id: "R15",
  name: "Iteration Discipline",
  description: "Regenerate 2-3 times before rewriting. Change one variable at a time.",
  severity: "advisory",
  appliesTo: [],
  predicate: undefined, // No predicate - advisory only
};

// =============================================================================
// Rules Array
// =============================================================================

/**
 * All 15 rules in order
 */
export const RULES: readonly Rule[] = [
  R1,
  R2,
  R3,
  R4,
  R5,
  R6,
  R7,
  R8,
  R9,
  R10,
  R11,
  R12,
  R13,
  R14,
  R15,
] as const;

// =============================================================================
// Rule Lookup
// =============================================================================

/**
 * Get a rule by ID
 */
export function getRuleById(id: string): Rule | undefined {
  return RULES.find((r) => r.id === id);
}

/**
 * Get rules that apply to a specific lane/stage
 */
export function getRulesForLane(lane: Lane): Rule[] {
  return RULES.filter((r) => r.appliesTo.includes(lane));
}

/**
 * Get rules by severity
 */
export function getRulesBySeverity(severity: RuleSeverity): Rule[] {
  return RULES.filter((r) => r.severity === severity);
}

// =============================================================================
// Utility Functions for Rule Checking
// =============================================================================

/**
 * Count words in a prompt (excluding timestamps and markers)
 */
export function countWords(text: string): number {
  // Remove timestamps like [00:04]
  const withoutTimestamps = text.replace(TIMESTAMP_PATTERN, "");
  // Remove markers like [HOOK], [DROP], ENDING FRAME [EXACT]:
  const withoutMarkers = withoutTimestamps
    .replace(/\[(HOOK|DROP)\]/gi, "")
    .replace(/ENDING FRAME \[EXACT\]:/gi, "");
  // Split on whitespace and filter empty
  const words = withoutMarkers.split(/\s+/).filter((w) => w.length > 0);
  return words.length;
}

/**
 * Count unique generic verbs in text (not total occurrences)
 * e.g., "moves...moves...goes" counts as 2 (moves + goes)
 */
export function countGenericVerbs(text: string): number {
  const lowerText = text.toLowerCase();
  let count = 0;
  for (const verb of GENERIC_VERBS) {
    // Match word boundaries - count presence, not occurrences
    const regex = new RegExp(`\\b${verb}\\b`, "gi");
    if (regex.test(lowerText)) {
      count++;
    }
  }
  return count;
}

/**
 * Count camera moves in text
 */
export function countCameraMoves(text: string): number {
  const lowerText = text.toLowerCase();
  let count = 0;
  const foundMoves: string[] = [];

  // Sort moves by length (longest first) to match compound moves before simple ones
  // e.g., "dolly zoom" should match before "dolly"
  const sortedMoves = [...CAMERA_MOVES].sort((a, b) => b.length - a.length);

  for (const move of sortedMoves) {
    // Build regex pattern that handles verb conjugations
    // e.g., "dolly" -> matches "dolly", "dollies", "dollying"
    // e.g., "pan" -> matches "pan", "pans", "panning"
    let pattern = move.replace(/-/g, "[\\s-]?");

    // Handle verb conjugations for common camera move verbs
    if (move === "dolly" || move === "circular dolly") {
      // dolly -> dollies, dollying
      pattern = pattern.replace(/dolly$/, "doll(y|ies|ying)");
    } else if (move === "pan" || move === "whip pan") {
      // pan -> pans, panning
      pattern = pattern.replace(/pan$/, "pan(s|ning)?");
    } else if (move === "orbit") {
      // orbit -> orbits, orbiting
      pattern = "orbit(s|ing)?";
    } else if (move === "tilt-up" || move === "tilt-down") {
      // tilt -> tilts, tilting
      pattern = pattern.replace(/tilt/, "tilt(s|ing)?");
    } else if (move === "crane up" || move === "crane down") {
      // crane -> cranes, craning
      pattern = pattern.replace(/crane/, "cran(e|es|ing)");
    } else if (move === "tracking shot") {
      // track -> tracks, tracking
      pattern = "track(s|ing)?[\\s-]?shot";
    } else if (move.includes("zoom")) {
      // zoom -> zooms, zooming
      pattern = pattern.replace(/zoom/, "zoom(s|ing)?");
    } else if (move.includes("push")) {
      // push -> pushes, pushing
      pattern = pattern.replace(/push/, "push(es|ing)?");
    }

    const regex = new RegExp(`\\b${pattern}\\b`, "gi");
    if (regex.test(lowerText)) {
      // Check if this move is part of a compound move we already counted
      // e.g., if "dolly zoom" was already found, don't count "dolly" separately
      const isPartOfFound = foundMoves.some((found) => found.includes(move));
      if (!isPartOfFound) {
        count++;
        foundMoves.push(move);
      }
    }
  }
  return count;
}

/**
 * Check if text contains forbidden negative patterns
 */
export function findNegativePatterns(text: string): string[] {
  const found: string[] = [];
  const lowerText = text.toLowerCase();

  for (const pattern of NEGATIVE_PATTERNS) {
    if (lowerText.includes(pattern.toLowerCase())) {
      // Check if it's an allowed exception
      let isAllowed = false;
      for (const allowed of ALLOWED_NEGATIVES) {
        if (lowerText.includes(allowed.toLowerCase())) {
          // Check if this specific occurrence is the allowed one
          const patternIndex = lowerText.indexOf(pattern.toLowerCase());
          const allowedIndex = lowerText.indexOf(allowed.toLowerCase());
          if (patternIndex >= allowedIndex && patternIndex < allowedIndex + allowed.length) {
            isAllowed = true;
            break;
          }
        }
      }
      if (!isAllowed) {
        // Extract the context around the pattern
        const index = lowerText.indexOf(pattern.toLowerCase());
        const context = text.substring(index, Math.min(index + 30, text.length));
        found.push(context.trim());
      }
    }
  }
  return found;
}

/**
 * Check if text has any negative patterns (excluding allowed negatives)
 */
export function hasNegativePatterns(text: string): boolean {
  return findNegativePatterns(text).length > 0;
}

/**
 * Check if first sentence has an action verb
 */
export function firstSentenceHasActionVerb(text: string): boolean {
  // Extract first sentence (up to first period, or first timestamp after content)
  const firstSentenceMatch = text.match(/^[^\.\n]+[\.]/);
  if (!firstSentenceMatch) {
    // Try to get text up to first timestamp if no period
    const upToTimestamp = text.match(/^[^\[]+/);
    if (!upToTimestamp) return false;
    return checkForActionVerb(upToTimestamp[0]);
  }
  return checkForActionVerb(firstSentenceMatch[0]);
}

function checkForActionVerb(text: string): boolean {
  const lowerText = text.toLowerCase();
  for (const verb of ACTION_VERBS) {
    if (new RegExp(`\\b${verb}\\b`, "i").test(lowerText)) {
      return true;
    }
  }
  return false;
}

/**
 * Words to exclude from R5 environment overlap calculation
 */
const R5_EXCLUDED_WORDS = new Set([
  "shika", "shilshul", "frame", "ending", "character", "reference", "image",
  "lighting", "appearance", "identical", "puppet", "puppets", "strings",
]);

/**
 * Calculate environment overlap ratio between image and video prompts
 */
export function calculateEnvironmentOverlap(imagePrompt: string, videoPrompt: string): number {
  const imageWords = new Set(
    imagePrompt
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 4 && !R5_EXCLUDED_WORDS.has(w))
  );

  const videoWords = videoPrompt
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4 && !R5_EXCLUDED_WORDS.has(w));

  let overlap = 0;
  for (const word of videoWords) {
    if (imageWords.has(word)) {
      overlap++;
    }
  }

  return imageWords.size > 0 ? overlap / imageWords.size : 0;
}

/**
 * Check if preservation language is in first half of prompt
 */
export function preservationInFirstHalf(text: string): boolean {
  const halfLength = Math.floor(text.length / 2);
  const firstHalf = text.substring(0, halfLength).toLowerCase();

  for (const pattern of PRESERVATION_PATTERNS) {
    if (firstHalf.includes(pattern.toLowerCase())) {
      return true;
    }
  }
  return false;
}

/**
 * Check if text has the required chant
 */
export function hasRequiredChant(lyrics: string): boolean {
  return lyrics.includes("Shika! Shika! Shilshul! Shilshul!");
}

/**
 * Check if EXTEND_END has [DROP] tag
 */
export function hasDropTag(prompt: string): boolean {
  return /\[DROP\]/i.test(prompt);
}

/**
 * Check if text has audio direction
 */
export function hasAudioDirection(text: string): boolean {
  const lowerText = text.toLowerCase();
  for (const pattern of AUDIO_PATTERNS) {
    if (lowerText.includes(pattern.toLowerCase())) {
      return true;
    }
  }
  return false;
}

/**
 * Check if text has "no dialogue"
 */
export function hasNoDialogue(text: string): boolean {
  return /no dialogue/i.test(text);
}

/**
 * Check for loop anchor patterns
 */
export function hasLoopAnchor(text: string): boolean {
  const lowerText = text.toLowerCase();
  for (const pattern of LOOP_ANCHOR_PATTERNS) {
    if (lowerText.includes(pattern.toLowerCase())) {
      return true;
    }
  }
  return false;
}

/**
 * Check for mirror directive patterns
 */
export function hasMirrorDirective(text: string): boolean {
  const lowerText = text.toLowerCase();
  for (const pattern of MIRROR_DIRECTIVE_PATTERNS) {
    if (lowerText.includes(pattern.toLowerCase())) {
      return true;
    }
  }
  return false;
}
