/**
 * Domain Variety Engine
 *
 * Combo assignment and collision detection for PuppetFlow.
 * Generates unique combinations of axes values for each scene in a batch.
 *
 * @module packages/domain/variety
 */

import { type ComboAssignment, type LanguageWeights } from "./types";

// =============================================================================
// Types
// =============================================================================

/**
 * Variety axis names - matches ComboAssignment keys for rotation
 */
export type VarietyAxis =
  | "hook"
  | "camera_start"
  | "camera_middle"
  | "camera_end"
  | "dynamic"
  | "visual"
  | "gag"
  | "payoff"
  | "chaosThread"
  | "stageArea"
  | "festivalMoment"
  | "subgenre";

/**
 * Variety pool - contains options for each axis
 * Property names match ComboAssignment keys for easy mapping
 */
export interface VarietyPool {
  hook: string[];
  camera_start: string[];
  camera_middle: string[];
  camera_end: string[];
  dynamic: string[];
  visual: string[];
  gag: string[];
  payoff: string[];
  chaosThread: string[];
  stageArea: string[];
  festivalMoment: string[];
  language: readonly string[] | string[];
  subgenre: string[];
}

/**
 * Historical entry for collision checking (flat structure)
 * runDate is a timestamp number for easy comparison
 */
export interface HistoryEntry {
  runDate: number;
  stageArea: string;
  festivalMoment: string;
  dynamic: string;
  payoff: string;
  hook: string;
  camera: string;
  gag: string;
  chaosThread: string;
  language: string;
  subgenre?: string;
  visual?: string;
}

/**
 * Pinned block definition - axis and fixed value
 */
export interface PinnedBlock {
  axis: VarietyAxis;
  value: string;
}

/**
 * Configuration for variety engine
 */
export interface VarietyConfig {
  batchSize: number;
  languages: LanguageWeights;
  lookbackDays?: number;
  lookbackRuns?: number;
  pinnedBlocks?: PinnedBlock[];
  pinnedAxes?: Partial<ComboAssignment>;
  seed?: number;
}

/**
 * Error thrown when variety constraints cannot be satisfied
 */
export class VarietyError extends Error {
  public readonly poolSize?: number;
  public readonly batchSize?: number;

  constructor(
    public readonly type: "pool_exhausted" | "language_constraint" | "history_collision" | "invalid_config",
    public readonly axis: string,
    message: string,
    options?: { poolSize?: number; batchSize?: number }
  ) {
    super(message);
    this.name = "VarietyError";
    this.poolSize = options?.poolSize;
    this.batchSize = options?.batchSize;
  }
}

/**
 * Collision type - what kind of collision was detected
 */
export type CollisionType = "stage-moment" | "dynamic-payoff" | "within-batch" | "none";

/**
 * Collision severity
 */
export type CollisionSeverity = "hard" | "warn";

/**
 * Result of collision check
 */
export interface CollisionCheckResult {
  collision: boolean;
  hasCollision?: boolean;
  type?: CollisionType;
  severity?: CollisionSeverity;
  axis?: string;
  sceneIndex?: number;
  existingRunId?: string;
  evidence?: string;
}

// =============================================================================
// Default Pools (from blueprint)
// =============================================================================

export const DEFAULT_POOLS: VarietyPool = {
  stageArea: [
    "Main Stage",
    "Puppet Pavilion",
    "String Garden",
    "Chaos Corner",
    "Twilight Terrace",
    "Dawn Platform",
  ],
  festivalMoment: [
    "Sunset Arrival",
    "Golden Hour",
    "Twilight Transition",
    "Night Falls",
    "Midnight Peak",
    "Pre-Dawn Calm",
  ],
  dynamic: [
    "Synchronized dance",
    "Mirror play",
    "Chase sequence",
    "Call and response",
    "Tandem strings",
    "Opposition tension",
  ],
  visual: [
    "Neon glowing strings",
    "UV reactive fur",
    "Trailing light ribbons",
    "Particle burst",
    "Holographic shimmer",
    "Smoke and lasers",
  ],
  hook: [
    "String explosion",
    "Dramatic entrance",
    "Freeze frame break",
    "Power pose reveal",
    "Crowd interaction",
    "Pyro sync",
  ],
  gag: [
    "Strings tangle",
    "Puppet collision",
    "Missed high-five",
    "Exaggerated fall",
    "Double take",
    "Stuck pose",
  ],
  camera_start: ["dolly", "push-in", "orbit", "circular dolly"],
  camera_middle: ["pan", "whip pan", "handheld tracking", "crane up"],
  camera_end: ["crane up", "crane down", "tilt-up", "dolly zoom"],
  payoff: [
    "Crowd chant sync",
    "Confetti explosion",
    "Group pose freeze",
    "String finale",
    "Energy burst",
    "Unity gesture",
  ],
  chaosThread: [
    "Rogue balloon",
    "Flying confetti",
    "Smoke drift",
    "Laser sweep",
    "Crowd surge",
    "Technical glitch",
  ],
  language: ["hi", "ja"] as const,
  subgenre: ["psycore", "hi-tech", "forest", "darkpsy", "full-on"],
};

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_LOOKBACK_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// =============================================================================
// Seeded RNG
// =============================================================================

function createRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

// =============================================================================
// Pool Validation
// =============================================================================

/**
 * Result of pool validation with detailed error info
 */
export interface PoolValidationResult {
  valid: boolean;
  errors: string[];
  firstFailedAxis?: string;
  firstFailedPoolSize?: number;
  requiredSize?: number;
}

/**
 * Validate variety pools for completeness
 */
export function validatePools(
  pools: VarietyPool,
  configOrBatchSize: VarietyConfig | number
): PoolValidationResult {
  const errors: string[] = [];
  const config: VarietyConfig = typeof configOrBatchSize === "number"
    ? { batchSize: configOrBatchSize, languages: { hi: 0, ja: 0 } }
    : configOrBatchSize;
  const batchSize = config.batchSize;

  // Get set of pinned axes that don't need validation
  const pinnedAxes = new Set<string>();
  if (config.pinnedBlocks) {
    for (const block of config.pinnedBlocks) {
      pinnedAxes.add(block.axis);
    }
  }

  let firstFailedAxis: string | undefined;
  let firstFailedPoolSize: number | undefined;

  // Axes that require unique values per scene (no repeats within batch)
  const noRepeatAxes: VarietyAxis[] = [
    "hook",
    "dynamic",
    "visual",
    "gag",
    "payoff",
    "chaosThread",
    "stageArea",
    "festivalMoment",
  ];

  for (const axis of noRepeatAxes) {
    // Skip pinned axes - they don't need a full pool
    if (pinnedAxes.has(axis)) continue;

    const pool = pools[axis];
    if (!pool || pool.length < batchSize) {
      if (!firstFailedAxis) {
        firstFailedAxis = axis;
        firstFailedPoolSize = pool?.length ?? 0;
      }
      errors.push(`Pool '${axis}' has ${pool?.length ?? 0} items, need at least ${batchSize}`);
    }
  }

  // Camera axes - unique within batch (no repeats)
  const cameraAxes: VarietyAxis[] = ["camera_start", "camera_middle", "camera_end"];
  for (const axis of cameraAxes) {
    if (pinnedAxes.has(axis)) continue;

    const pool = pools[axis];
    if (!pool || pool.length < batchSize) {
      if (!firstFailedAxis) {
        firstFailedAxis = axis;
        firstFailedPoolSize = pool?.length ?? 0;
      }
      errors.push(`Pool '${axis}' has ${pool?.length ?? 0} items, need at least ${batchSize}`);
    }
  }

  // Language validation is handled by generateLanguageDistribution which checks
  // if required languages are available based on configured weights

  // Subgenre can repeat but must have at least 1
  if (!pools.subgenre || pools.subgenre.length < 1) {
    errors.push("Pool 'subgenre' must have at least 1 item");
  }

  return {
    valid: errors.length === 0,
    errors,
    firstFailedAxis,
    firstFailedPoolSize,
    requiredSize: batchSize,
  };
}

// =============================================================================
// Language Distribution
// =============================================================================

function generateLanguageDistribution(
  weights: LanguageWeights,
  batchSize: number,
  availableLanguages: readonly string[] | string[],
  rng: () => number
): string[] {
  const { hi, ja } = weights;
  const total = hi + ja;

  if (total !== batchSize) {
    throw new VarietyError(
      "language_constraint",
      "language",
      `Language weights sum to ${total}, but batch size is ${batchSize}`
    );
  }

  // Check if required languages are available in the pool
  if (hi > 0 && !availableLanguages.includes("hi")) {
    throw new VarietyError(
      "language_constraint",
      "language",
      `Hindi (hi) required by weights but not in language pool`
    );
  }
  if (ja > 0 && !availableLanguages.includes("ja")) {
    throw new VarietyError(
      "language_constraint",
      "language",
      `Japanese (ja) required by weights but not in language pool`
    );
  }

  // Create array with language assignments
  const languages: string[] = [];
  for (let i = 0; i < hi; i++) languages.push("hi");
  for (let i = 0; i < ja; i++) languages.push("ja");

  // Shuffle using Fisher-Yates
  for (let i = languages.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [languages[i], languages[j]] = [languages[j], languages[i]];
  }

  return languages;
}

// =============================================================================
// Collision Detection
// =============================================================================

/**
 * Check for collision against historical entries
 *
 * Two collision types:
 * - stage-moment: 30-day time-based window (inclusive)
 * - dynamic-payoff: 10-run position-based window (last 10 entries in array)
 */
export function checkHistoryCollision(
  combo: ComboAssignment,
  history: HistoryEntry[],
  lookbackDays: number = DEFAULT_LOOKBACK_DAYS
): CollisionCheckResult {
  const cutoffTime = Date.now() - lookbackDays * MS_PER_DAY;

  // Filter history by time-based lookback window (inclusive: >= not >)
  const timeRelevantHistory = history.filter((entry) => entry.runDate >= cutoffTime);

  // Check for stage-moment collision (30-day time-based window)
  for (const entry of timeRelevantHistory) {
    if (entry.stageArea === combo.stageArea && entry.festivalMoment === combo.festivalMoment) {
      const daysAgo = Math.floor((Date.now() - entry.runDate) / MS_PER_DAY);
      return {
        collision: true,
        hasCollision: true,
        type: "stage-moment",
        severity: "warn",
        axis: "stageArea-festivalMoment",
        evidence: `Used ${daysAgo} days ago`,
      };
    }
  }

  // Check for dynamic-payoff collision (10-run position-based window)
  // Array ordered from oldest to newest, so slice(-10) gets the 10 most recent runs
  const recentRuns = history.slice(-10);
  for (const entry of recentRuns) {
    if (entry.dynamic === combo.dynamic && entry.payoff === combo.payoff) {
      const daysAgo = Math.floor((Date.now() - entry.runDate) / MS_PER_DAY);
      return {
        collision: true,
        hasCollision: true,
        type: "dynamic-payoff",
        severity: "warn",
        axis: "dynamic-payoff",
        evidence: `Used ${daysAgo} days ago`,
      };
    }
  }

  return { collision: false, hasCollision: false };
}

/**
 * Check for within-batch collision (duplicate values for no-repeat axes)
 */
export function hasWithinBatchCollision(combos: ComboAssignment[]): boolean {
  const result = checkBatchCollision(combos);
  return result.collision;
}

/**
 * Check for within-batch collision and return result object
 */
export function checkBatchCollision(combos: ComboAssignment[]): CollisionCheckResult {
  const noRepeatAxes: (keyof ComboAssignment)[] = [
    "stageArea",
    "festivalMoment",
    "dynamic",
    "visual",
    "hook",
    "gag",
    "payoff",
    "chaosThread",
  ];

  for (const axis of noRepeatAxes) {
    const seen = new Map<string, number>();
    for (let i = 0; i < combos.length; i++) {
      const value = combos[i][axis] as string;
      if (seen.has(value)) {
        return {
          collision: true,
          hasCollision: true,
          type: "within-batch",
          severity: "hard",
          axis,
          sceneIndex: i,
          evidence: `Duplicate ${axis}: "${value}"`,
        };
      }
      seen.set(value, i);
    }
  }

  return { collision: false, hasCollision: false };
}

// =============================================================================
// Combo Generation
// =============================================================================

function pickUnused(
  pool: readonly string[] | string[],
  used: Set<string>,
  axis: string,
  rng: () => number,
  batchSize?: number
): string {
  const available = pool.filter((v) => !used.has(v));
  if (available.length === 0) {
    throw new VarietyError(
      "pool_exhausted",
      axis,
      `No more unique values available for axis '${axis}'`,
      { poolSize: pool.length, batchSize }
    );
  }
  return available[Math.floor(rng() * available.length)];
}

function generateSingleCombo(
  pools: VarietyPool,
  usedInBatch: {
    stageArea: Set<string>;
    festivalMoment: Set<string>;
    dynamic: Set<string>;
    visual: Set<string>;
    hook: Set<string>;
    gag: Set<string>;
    payoff: Set<string>;
    chaosThread: Set<string>;
    camera_start: Set<string>;
    camera_middle: Set<string>;
    camera_end: Set<string>;
  },
  language: string,
  rng: () => number,
  pinnedBlocks?: Partial<ComboAssignment>,
  batchSize?: number
): ComboAssignment {
  // Generate combo with pinned blocks
  const stageArea =
    pinnedBlocks?.stageArea ?? pickUnused(pools.stageArea, usedInBatch.stageArea, "stageArea", rng, batchSize);
  const festivalMoment =
    pinnedBlocks?.festivalMoment ??
    pickUnused(pools.festivalMoment, usedInBatch.festivalMoment, "festivalMoment", rng, batchSize);
  const dynamic =
    pinnedBlocks?.dynamic ?? pickUnused(pools.dynamic, usedInBatch.dynamic, "dynamic", rng, batchSize);
  const visual = pinnedBlocks?.visual ?? pickUnused(pools.visual, usedInBatch.visual, "visual", rng, batchSize);
  const hook = pinnedBlocks?.hook ?? pickUnused(pools.hook, usedInBatch.hook, "hook", rng, batchSize);
  const gag = pinnedBlocks?.gag ?? pickUnused(pools.gag, usedInBatch.gag, "gag", rng, batchSize);
  const payoff = pinnedBlocks?.payoff ?? pickUnused(pools.payoff, usedInBatch.payoff, "payoff", rng, batchSize);
  const chaosThread =
    pinnedBlocks?.chaosThread ?? pickUnused(pools.chaosThread, usedInBatch.chaosThread, "chaosThread", rng, batchSize);

  // Camera - unique within batch, subgenre can repeat
  const camera = pinnedBlocks?.camera ?? {
    start: pickUnused(pools.camera_start, usedInBatch.camera_start, "camera_start", rng, batchSize),
    middle: pickUnused(pools.camera_middle, usedInBatch.camera_middle, "camera_middle", rng, batchSize),
    end: pickUnused(pools.camera_end, usedInBatch.camera_end, "camera_end", rng, batchSize),
  };
  const subgenre = pinnedBlocks?.subgenre ?? pools.subgenre[Math.floor(rng() * pools.subgenre.length)];

  // Mark as used
  usedInBatch.stageArea.add(stageArea);
  usedInBatch.festivalMoment.add(festivalMoment);
  usedInBatch.dynamic.add(dynamic);
  usedInBatch.visual.add(visual);
  usedInBatch.hook.add(hook);
  usedInBatch.gag.add(gag);
  usedInBatch.payoff.add(payoff);
  usedInBatch.chaosThread.add(chaosThread);
  usedInBatch.camera_start.add(camera.start);
  usedInBatch.camera_middle.add(camera.middle);
  usedInBatch.camera_end.add(camera.end);

  return {
    stageArea,
    festivalMoment,
    dynamic,
    visual,
    hook,
    gag,
    camera,
    payoff,
    chaosThread,
    language,
    subgenre,
  };
}

/**
 * Generate combo assignments for a full batch (main API)
 */
export function assign(
  pools: VarietyPool,
  history: HistoryEntry[] = [],
  config: VarietyConfig
): ComboAssignment[] {
  // Validate config
  if (config.batchSize < 1 || config.batchSize > 10) {
    throw new VarietyError("invalid_config", "batchSize", "Batch size must be 1-10");
  }

  // Validate pools
  const poolValidation = validatePools(pools, config);
  if (!poolValidation.valid) {
    throw new VarietyError(
      "pool_exhausted",
      poolValidation.firstFailedAxis ?? "pools",
      poolValidation.errors.join("; "),
      {
        poolSize: poolValidation.firstFailedPoolSize,
        batchSize: poolValidation.requiredSize,
      }
    );
  }

  // Create RNG
  const rng = createRng(config.seed ?? Date.now());

  // Generate language distribution
  const languages = generateLanguageDistribution(config.languages, config.batchSize, pools.language, rng);

  // Track used values within batch
  const usedInBatch = {
    stageArea: new Set<string>(),
    festivalMoment: new Set<string>(),
    dynamic: new Set<string>(),
    visual: new Set<string>(),
    hook: new Set<string>(),
    gag: new Set<string>(),
    payoff: new Set<string>(),
    chaosThread: new Set<string>(),
    camera_start: new Set<string>(),
    camera_middle: new Set<string>(),
    camera_end: new Set<string>(),
  };

  // Convert pinnedBlocks array to Partial<ComboAssignment> for internal use
  let pinnedValues: Partial<ComboAssignment> | undefined;
  if (config.pinnedBlocks) {
    pinnedValues = {};
    for (const block of config.pinnedBlocks) {
      // Map axis name to ComboAssignment property
      const axisMap: Record<VarietyAxis, keyof ComboAssignment> = {
        hook: "hook",
        camera_start: "camera",
        camera_middle: "camera",
        camera_end: "camera",
        dynamic: "dynamic",
        visual: "visual",
        gag: "gag",
        payoff: "payoff",
        chaosThread: "chaosThread",
        stageArea: "stageArea",
        festivalMoment: "festivalMoment",
        subgenre: "subgenre",
      };
      const key = axisMap[block.axis];
      if (key && key !== "camera") {
        (pinnedValues as Record<string, string>)[key] = block.value;
      }
    }
  }
  const pinnedBlocks = pinnedValues ?? config.pinnedAxes;

  // Generate combos
  const combos: ComboAssignment[] = [];
  const maxRetries = 100;
  const lookbackDays = config.lookbackDays ?? DEFAULT_LOOKBACK_DAYS;

  for (let i = 0; i < config.batchSize; i++) {
    let combo: ComboAssignment | null = null;
    let retries = 0;

    while (combo === null && retries < maxRetries) {
      retries++;

      try {
        const candidate = generateSingleCombo(pools, usedInBatch, languages[i], rng, pinnedBlocks, config.batchSize);

        // Check history collision
        const historyCollision = checkHistoryCollision(candidate, history, lookbackDays);

        if (historyCollision.collision) {
          // Roll back usage tracking and retry
          usedInBatch.stageArea.delete(candidate.stageArea);
          usedInBatch.festivalMoment.delete(candidate.festivalMoment);
          usedInBatch.dynamic.delete(candidate.dynamic);
          usedInBatch.visual.delete(candidate.visual);
          usedInBatch.hook.delete(candidate.hook);
          usedInBatch.gag.delete(candidate.gag);
          usedInBatch.payoff.delete(candidate.payoff);
          usedInBatch.chaosThread.delete(candidate.chaosThread);
          usedInBatch.camera_start.delete(candidate.camera.start);
          usedInBatch.camera_middle.delete(candidate.camera.middle);
          usedInBatch.camera_end.delete(candidate.camera.end);
          continue;
        }

        combo = candidate;
      } catch (e) {
        if (e instanceof VarietyError && e.type === "pool_exhausted") {
          throw e; // Can't recover from exhausted pool
        }
        throw e;
      }
    }

    if (combo === null) {
      throw new VarietyError(
        "history_collision",
        "combo",
        `Could not generate unique combo for scene ${i} after ${maxRetries} retries`
      );
    }

    combos.push(combo);
  }

  return combos;
}

// =============================================================================
// Backward Compatibility Aliases
// =============================================================================

/**
 * @deprecated Use HistoryEntry
 */
export type HistoricalCombo = HistoryEntry;

/**
 * @deprecated Use CollisionCheckResult
 */
export type CollisionResult = CollisionCheckResult;

/**
 * Alias for assign
 */
export const generateBatchCombos = assign;
