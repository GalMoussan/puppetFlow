/**
 * Domain Linter Module
 *
 * Validates generated output against the 15 rules.
 * Produces violations grouped by scene and rule.
 *
 * @module packages/domain/linter
 */

import {
  type BatchOutput,
  type Scene,
  type CanvasGraph,
  type RunConfig,
  type Violation,
} from "./types";
import {
  extractTimestamps,
  countWords,
  countGenericVerbs,
  countCameraMoves,
  findNegativePatterns,
  firstSentenceHasActionVerb,
  preservationInFirstHalf,
  hasRequiredChant,
  hasDropTag,
  hasAudioDirection,
  hasNoDialogue,
  hasLoopAnchor,
  hasMirrorDirective,
} from "./rules";
import {
  validateHandshake,
  type HandshakeOptions,
} from "./handshake";

// =============================================================================
// Types
// =============================================================================

/**
 * Lint report for a batch
 */
export interface LintReport {
  valid: boolean;
  hardViolations: Violation[];
  warnings: Violation[];
  byScene: Map<number, Violation[]>;
  byRule: Map<string, Violation[]>;
}

// =============================================================================
// R1 - Sequential Weighting
// =============================================================================

/**
 * Check R1: Sequential Weighting
 * - First sentence must have subject + action verb
 * - Preservation language in final 25% only
 */
export function checkR1SequentialWeighting(prompt: string, stage: string): Violation[] {
  const violations: Violation[] = [];

  // Check first sentence has action verb
  if (!firstSentenceHasActionVerb(prompt)) {
    violations.push({
      rule: "R1",
      severity: "hard",
      stage,
      evidence: "R1 violation: first sentence lacks subject + action verb",
    });
  }

  // Check preservation is not in first half
  if (preservationInFirstHalf(prompt)) {
    violations.push({
      rule: "R1",
      severity: "hard",
      stage,
      evidence: "R1 violation: preservation language appears in first half of prompt",
    });
  }

  return violations;
}

// =============================================================================
// R2 - Explicit Camera Verb
// =============================================================================

/**
 * Check R2: Explicit Camera Verb
 * - Exactly one camera move from controlled vocabulary
 */
export function checkR2CameraVerb(prompt: string, stage: string): Violation[] {
  const violations: Violation[] = [];

  const count = countCameraMoves(prompt);

  // Check for "cinematic" without proper camera verb
  if (count === 0 && /\bcinematic\b/i.test(prompt)) {
    violations.push({
      rule: "R2",
      severity: "hard",
      stage,
      evidence: "R2 violation: 'cinematic' is not a valid camera verb - use specific move from vocabulary",
    });
    return violations;
  }

  if (count === 0) {
    violations.push({
      rule: "R2",
      severity: "hard",
      stage,
      evidence: "R2 violation: No camera verb found - must name exactly one from controlled vocabulary",
    });
  } else if (count > 1) {
    violations.push({
      rule: "R2",
      severity: "hard",
      stage,
      evidence: `R2 violation: Found ${count} camera verbs - must have exactly one`,
    });
  }

  return violations;
}

// =============================================================================
// R3 - Word Budget and Strong Verbs
// =============================================================================

/**
 * Check R3: Word Budget and Strong Verbs
 * - 40-90 words for video prompts
 * - No more than 2 generic verbs
 */
export function checkR3WordBudget(prompt: string, stage: string): Violation[] {
  const violations: Violation[] = [];

  const wordCount = countWords(prompt);
  const genericCount = countGenericVerbs(prompt);

  // Word count warnings
  if (wordCount < 40) {
    violations.push({
      rule: "R3",
      severity: "warn",
      stage,
      evidence: `R3 warning: word count ${wordCount} is below 40-word minimum`,
    });
  } else if (wordCount > 90) {
    violations.push({
      rule: "R3",
      severity: "warn",
      stage,
      evidence: `R3 warning: word count ${wordCount} exceeds 90-word budget`,
    });
  }

  // Generic verb hard fail
  if (genericCount > 2) {
    violations.push({
      rule: "R3",
      severity: "hard",
      stage,
      evidence: `R3 violation: ${genericCount} generic verbs (moves, goes, is) - max 2 allowed`,
    });
  }

  return violations;
}

// =============================================================================
// R4 - Beat Structure with Timestamps
// =============================================================================

/**
 * Check R4: Beat Structure with Timestamps
 * - 1-3 timestamp markers [00:XX]
 */
export function checkR4BeatStructure(prompt: string, stage: string): Violation[] {
  const violations: Violation[] = [];

  const timestamps = extractTimestamps(prompt);

  if (timestamps.length === 0) {
    violations.push({
      rule: "R4",
      severity: "hard",
      stage,
      evidence: "R4 violation: No timestamp markers found - must have 1-3 [00:XX] beats",
    });
  } else if (timestamps.length > 3) {
    violations.push({
      rule: "R4",
      severity: "hard",
      stage,
      evidence: `R4 violation: ${timestamps.length} timestamps found - maximum 3 allowed`,
    });
  }

  return violations;
}

// =============================================================================
// R5 - Image-to-Video Division of Labor
// =============================================================================

/**
 * Words that are expected to appear in both IMAGE and VIDEO prompts
 * and should not count as environment repetition
 */
const R5_EXCLUDED_WORDS = new Set([
  // Character names
  "shika", "shilshul",
  // Structural terms expected in both
  "frame", "ending", "character", "reference", "image",
  // Preservation-related terms
  "lighting", "appearance", "identical",
  // Common technical terms
  "puppet", "puppets", "strings",
]);

/**
 * Check R5: Division of Labor
 * - VIDEO_START must not repeat >25% of IMAGE environment
 */
export function checkR5DivisionOfLabor(imagePrompt: string, videoPrompt: string): Violation[] {
  const violations: Violation[] = [];

  // Tokenize both prompts, excluding expected repeated terms
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

  // Count overlap
  let overlap = 0;
  for (const word of videoWords) {
    if (imageWords.has(word)) {
      overlap++;
    }
  }

  const overlapRatio = imageWords.size > 0 ? overlap / imageWords.size : 0;

  if (overlapRatio > 0.25) {
    violations.push({
      rule: "R5",
      severity: "hard",
      stage: "VIDEO_START",
      evidence: `R5 violation: ${Math.round(overlapRatio * 100)}% environment overlap with IMAGE prompt - must be <25%`,
    });
  }

  return violations;
}

// =============================================================================
// R6 - Negatives in Video
// =============================================================================

/**
 * Check R6: Negatives in Video
 * - No negative constraints (except "no dialogue")
 */
export function checkR6Negatives(prompt: string, stage: string): Violation[] {
  const violations: Violation[] = [];

  const negatives = findNegativePatterns(prompt);

  for (const negative of negatives) {
    violations.push({
      rule: "R6",
      severity: "hard",
      stage,
      evidence: `R6 violation: negative constraint found - "${negative.substring(0, 40)}..."`,
    });
  }

  return violations;
}

// =============================================================================
// R7 - Boundary Frame Handshake
// =============================================================================

/**
 * Check R7: Handshake
 * - ENDING FRAME [EXACT]: marker present
 * - Next prompt has continuation with >=80% similarity
 */
export function checkR7Handshake(
  currentPrompt: string,
  nextPrompt: string,
  options: HandshakeOptions = { strictness: "verbatim" }
): Violation[] {
  const result = validateHandshake(currentPrompt, nextPrompt, options);
  return result.violations;
}

// =============================================================================
// R8 - Short Extends
// =============================================================================

/**
 * Check R8: Short Extends
 * - 40-70 words for EXTEND prompts
 * - No new characters or locations
 */
export function checkR8ShortExtends(
  prompt: string,
  stage: string,
  context: { imagePrompt: string; startPrompt: string }
): Violation[] {
  const violations: Violation[] = [];

  // Word budget check
  const wordCount = countWords(prompt);
  if (wordCount < 40) {
    violations.push({
      rule: "R8",
      severity: "warn",
      stage,
      evidence: `R8 warning: Word count ${wordCount} is below 40-word minimum for EXTEND`,
    });
  } else if (wordCount > 70) {
    violations.push({
      rule: "R8",
      severity: "warn",
      stage,
      evidence: `R8 warning: Word count ${wordCount} exceeds 70-word budget for EXTEND`,
    });
  }

  // Check for new characters (names not in previous prompts)
  const existingContent = (context.imagePrompt + " " + context.startPrompt).toLowerCase();
  const namePattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g;
  const potentialNames = prompt.match(namePattern) || [];

  // Common words that look like names but aren't characters
  const COMMON_WORDS = new Set([
    "Shika", "Shilshul", "Audio", "Continue", "Frame", "Keep", "Camera",
    "Energy", "Anticipation", "Peak", "Climax", "Final", "Both", "Stage",
    "Crowd", "Festival", "Strings", "Puppets", "Lighting", "Sound", "Music",
    "Motion", "Action", "Scene", "Shot", "Drop", "Hook", "Sync", "Build",
    "Frozen", "Tableau", "Opening", "Composition", "Exact", "Reference",
    "Image", "Ending", "Critical", "Character", "Lock", "Same", "Identical"
  ]);

  for (const name of potentialNames) {
    // Skip known characters and common words
    if (COMMON_WORDS.has(name)) {
      continue;
    }
    if (!existingContent.includes(name.toLowerCase())) {
      violations.push({
        rule: "R8",
        severity: "hard",
        stage,
        evidence: `R8 violation: New character "${name}" introduced mid-scene`,
      });
    }
  }

  return violations;
}

// =============================================================================
// R9 - Retention Pacing
// =============================================================================

/**
 * Check R9: Retention Pacing
 * - Max 4s gap between timestamps
 * - [HOOK] tag at 0-2s for VIDEO_START
 */
export function checkR9RetentionPacing(prompt: string, stage: string): Violation[] {
  const violations: Violation[] = [];

  const timestamps = extractTimestamps(prompt);

  // Check for [HOOK] in VIDEO_START
  if (stage === "VIDEO_START") {
    const hasHook = /\[HOOK\]/i.test(prompt);

    if (!hasHook) {
      violations.push({
        rule: "R9",
        severity: "hard",
        stage,
        evidence: "R9 violation: VIDEO_START first beat must be tagged [HOOK]",
      });
    }
  }

  // Check timestamp spacing
  for (let i = 1; i < timestamps.length; i++) {
    const gap = timestamps[i] - timestamps[i - 1];
    if (gap > 4) {
      violations.push({
        rule: "R9",
        severity: "hard",
        stage,
        evidence: `R9 violation: ${gap}s gap between beats - max 4s allowed`,
      });
    }
  }

  return violations;
}

// =============================================================================
// R10 - Loop Closure
// =============================================================================

/**
 * Check R10: Loop Closure (conditional on loopMode)
 * - IMAGE has loop anchor directive
 * - EXTEND_END mirrors opening composition
 */
export function checkR10LoopClosure(
  imagePrompt: string,
  endPrompt: string,
  loopMode: boolean
): Violation[] {
  const violations: Violation[] = [];

  if (!loopMode) {
    return violations; // Skip when loopMode is off
  }

  // Check loop anchor in IMAGE
  if (!hasLoopAnchor(imagePrompt)) {
    violations.push({
      rule: "R10",
      severity: "hard",
      stage: "IMAGE",
      evidence: "R10 violation: Missing loop anchor directive in IMAGE when loopMode=true",
    });
  }

  // Check mirror directive in END
  if (!hasMirrorDirective(endPrompt)) {
    violations.push({
      rule: "R10",
      severity: "hard",
      stage: "EXTEND_END",
      evidence: "R10 violation: Missing mirror directive in EXTEND_END when loopMode=true",
    });
  }

  return violations;
}

// =============================================================================
// R11 - Audio Direction
// =============================================================================

/**
 * Check R11: Audio Direction
 * - Audio cue present
 * - "no dialogue" present
 */
export function checkR11AudioDirection(prompt: string, stage: string): Violation[] {
  const violations: Violation[] = [];

  if (!hasAudioDirection(prompt)) {
    violations.push({
      rule: "R11",
      severity: "hard",
      stage,
      evidence: "R11 violation: Missing audio cue (Audio:, Sound:, etc.)",
    });
  }

  if (!hasNoDialogue(prompt)) {
    violations.push({
      rule: "R11",
      severity: "hard",
      stage,
      evidence: "R11 violation: Missing 'no dialogue' directive",
    });
  }

  return violations;
}

// =============================================================================
// R12 - Drop Sync
// =============================================================================

/**
 * Check R12: Drop Sync
 * - EXTEND_END final beat tagged [DROP]
 * - Lyrics contain chant in Drop section
 */
export function checkR12DropSync(
  endPrompt: string,
  lyrics: string,
  stage: string
): Violation[] {
  const violations: Violation[] = [];

  // Check [DROP] tag in END
  if (stage === "EXTEND_END" && !hasDropTag(endPrompt)) {
    violations.push({
      rule: "R12",
      severity: "hard",
      stage,
      evidence: "R12 violation: EXTEND_END final beat must be tagged [DROP]",
    });
  }

  // Check chant in lyrics
  if (!hasRequiredChant(lyrics)) {
    violations.push({
      rule: "R12",
      severity: "hard",
      stage: "LYRICS",
      evidence: "R12 violation: Lyrics Drop section must contain 'Shika! Shika! Shilshul! Shilshul!' chant",
    });
  }

  return violations;
}

// =============================================================================
// R13 - Character Locks
// =============================================================================

/**
 * Check R13: Character Locks
 * - Verbatim locks in IMAGE
 * - Preservation in VIDEO
 */
export function checkR13CharacterLocks(
  prompt: string,
  stage: string,
  expectedLockHeaders: string[]
): Violation[] {
  const violations: Violation[] = [];

  if (stage === "IMAGE") {
    // Check for verbatim lock blocks
    for (const header of expectedLockHeaders) {
      if (!prompt.includes(header)) {
        violations.push({
          rule: "R13",
          severity: "hard",
          stage,
          evidence: `R13 violation: Missing verbatim character lock "${header}" in IMAGE`,
        });
      }
    }
  } else {
    // Check for preservation in VIDEO prompts
    const hasPreservation =
      /keep.*identical.*reference/i.test(prompt) ||
      /identical to reference/i.test(prompt) ||
      /same.*character.*appearance/i.test(prompt);

    if (!hasPreservation) {
      violations.push({
        rule: "R13",
        severity: "hard",
        stage,
        evidence: "R13 violation: Missing character preservation directive in VIDEO prompt",
      });
    }
  }

  return violations;
}

// =============================================================================
// Scene Linting
// =============================================================================

/**
 * Lint a single scene
 */
export function lintScene(
  scene: Scene,
  config: RunConfig,
  characterLockHeaders: string[]
): Violation[] {
  const violations: Violation[] = [];

  // R1: Sequential Weighting (VIDEO prompts)
  for (const [prompt, stage] of [
    [scene.startPrompt, "VIDEO_START"],
    [scene.middlePrompt, "EXTEND_MIDDLE"],
    [scene.endPrompt, "EXTEND_END"],
  ] as const) {
    violations.push(...checkR1SequentialWeighting(prompt, stage));
  }

  // R2: Camera Verb (VIDEO prompts)
  for (const [prompt, stage] of [
    [scene.startPrompt, "VIDEO_START"],
    [scene.middlePrompt, "EXTEND_MIDDLE"],
    [scene.endPrompt, "EXTEND_END"],
  ] as const) {
    violations.push(...checkR2CameraVerb(prompt, stage));
  }

  // R3: Word Budget (VIDEO prompts)
  for (const [prompt, stage] of [
    [scene.startPrompt, "VIDEO_START"],
    [scene.middlePrompt, "EXTEND_MIDDLE"],
    [scene.endPrompt, "EXTEND_END"],
  ] as const) {
    violations.push(...checkR3WordBudget(prompt, stage));
  }

  // R4: Beat Structure (VIDEO prompts)
  for (const [prompt, stage] of [
    [scene.startPrompt, "VIDEO_START"],
    [scene.middlePrompt, "EXTEND_MIDDLE"],
    [scene.endPrompt, "EXTEND_END"],
  ] as const) {
    violations.push(...checkR4BeatStructure(prompt, stage));
  }

  // R5: Division of Labor (VIDEO_START vs IMAGE)
  violations.push(...checkR5DivisionOfLabor(scene.imagePrompt, scene.startPrompt));

  // R6: Negatives (VIDEO prompts)
  for (const [prompt, stage] of [
    [scene.startPrompt, "VIDEO_START"],
    [scene.middlePrompt, "EXTEND_MIDDLE"],
    [scene.endPrompt, "EXTEND_END"],
  ] as const) {
    violations.push(...checkR6Negatives(prompt, stage));
  }

  // R7: Handshake (handled separately for transitions)
  const r7Violations = checkR7Handshake(scene.startPrompt, scene.middlePrompt, { strictness: "verbatim" });
  for (const v of r7Violations) {
    violations.push({ ...v, stage: "VIDEO_START -> EXTEND_MIDDLE" });
  }
  const r7Violations2 = checkR7Handshake(scene.middlePrompt, scene.endPrompt, { strictness: "verbatim" });
  for (const v of r7Violations2) {
    violations.push({ ...v, stage: "EXTEND_MIDDLE -> EXTEND_END" });
  }

  // R8: Short Extends (EXTEND prompts)
  violations.push(
    ...checkR8ShortExtends(scene.middlePrompt, "EXTEND_MIDDLE", {
      imagePrompt: scene.imagePrompt,
      startPrompt: scene.startPrompt,
    })
  );
  violations.push(
    ...checkR8ShortExtends(scene.endPrompt, "EXTEND_END", {
      imagePrompt: scene.imagePrompt,
      startPrompt: scene.startPrompt,
    })
  );

  // R9: Retention Pacing (VIDEO_START)
  violations.push(...checkR9RetentionPacing(scene.startPrompt, "VIDEO_START"));

  // R10: Loop Closure (conditional)
  violations.push(...checkR10LoopClosure(scene.imagePrompt, scene.endPrompt, config.loopMode));

  // R11: Audio Direction (VIDEO prompts)
  for (const [prompt, stage] of [
    [scene.startPrompt, "VIDEO_START"],
    [scene.middlePrompt, "EXTEND_MIDDLE"],
    [scene.endPrompt, "EXTEND_END"],
  ] as const) {
    violations.push(...checkR11AudioDirection(prompt, stage));
  }

  // R12: Drop Sync (EXTEND_END + lyrics)
  violations.push(...checkR12DropSync(scene.endPrompt, scene.lyrics, "EXTEND_END"));

  // R13: Character Locks
  violations.push(...checkR13CharacterLocks(scene.imagePrompt, "IMAGE", characterLockHeaders));
  for (const [prompt, stage] of [
    [scene.startPrompt, "VIDEO_START"],
    [scene.middlePrompt, "EXTEND_MIDDLE"],
    [scene.endPrompt, "EXTEND_END"],
  ] as const) {
    violations.push(...checkR13CharacterLocks(prompt, stage, []));
  }

  // Tag all violations with scene index
  return violations.map((v) => ({
    ...v,
    sceneIndex: scene.index,
  }));
}

// =============================================================================
// Batch Linting
// =============================================================================

/**
 * Lint a full batch of scenes
 */
export function lintBatch(
  batch: BatchOutput,
  graph: CanvasGraph,
  config: RunConfig
): LintReport {
  // Extract character lock headers from graph or use defaults
  const characterLockHeaders = [
    "CRITICAL CHARACTER LOCK - SHIKA",
    "CRITICAL CHARACTER LOCK - SHILSHUL",
  ];

  const allViolations: Violation[] = [];
  const byScene = new Map<number, Violation[]>();
  const byRule = new Map<string, Violation[]>();

  // Lint each scene
  for (const scene of batch.scenes) {
    const sceneViolations = lintScene(scene, config, characterLockHeaders);
    allViolations.push(...sceneViolations);

    // Group by scene
    const existing = byScene.get(scene.index) ?? [];
    byScene.set(scene.index, [...existing, ...sceneViolations]);
  }

  // Group by rule
  for (const violation of allViolations) {
    const existing = byRule.get(violation.rule) ?? [];
    byRule.set(violation.rule, [...existing, violation]);
  }

  // Separate hard violations from warnings
  const hardViolations = allViolations.filter((v) => v.severity === "hard");
  const warnings = allViolations.filter((v) => v.severity === "warn");

  return {
    valid: hardViolations.length === 0,
    hardViolations,
    warnings,
    byScene,
    byRule,
  };
}
