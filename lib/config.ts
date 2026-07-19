/**
 * Centralized Configuration
 *
 * All application constants, thresholds, and configurable values.
 * Environment variables override defaults where applicable.
 *
 * @module lib/config
 */

// =============================================================================
// API Configuration
// =============================================================================

export const apiConfig = {
  /** Anthropic API timeout in milliseconds (default: 90s) */
  anthropicTimeoutMs: Number(process.env.ANTHROPIC_TIMEOUT_MS || 90000),

  /** Default Anthropic model */
  anthropicModel: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",

  /** DeepSeek API timeout in milliseconds (default: 90s) */
  deepseekTimeoutMs: Number(process.env.DEEPSEEK_TIMEOUT_MS || 90000),

  /** Default DeepSeek model */
  deepseekModel: process.env.DEEPSEEK_MODEL || "deepseek-chat",

  /** Maximum retry attempts for API calls */
  maxRetryAttempts: 2,

  /** Base delay between retries in milliseconds */
  retryDelayMs: 1000,
} as const;

// =============================================================================
// Generation Limits
// =============================================================================

export const generationLimits = {
  /** Maximum batch size for scene generation */
  maxBatchSize: 10,

  /** Maximum scenes per single run */
  maxScenesPerRun: 20,

  /** Maximum tokens per prompt */
  maxTokensPerPrompt: 4096,

  /** Default max tokens for generation */
  defaultMaxTokens: 4000,

  /** Default temperature for generation */
  defaultTemperature: 1.0,

  /** Temperature for repair passes */
  repairTemperature: 0.8,
} as const;

// =============================================================================
// Linter Thresholds (R1-R15 Rules)
// =============================================================================

export const linterThresholds = {
  /** R3: Minimum word budget for prompts */
  wordBudgetMin: 40,

  /** R3: Maximum word budget for prompts */
  wordBudgetMax: 90,

  /** R4: Maximum beat timestamps per stage */
  maxBeatsPerStage: 3,

  /** R9: Minimum retention pacing (seconds) */
  retentionPacingMinSec: 1.5,

  /** R9: Maximum retention pacing (seconds) */
  retentionPacingMaxSec: 3.0,

  /** IMAGE prompt minimum word count */
  imagePromptMinWords: 250,

  /** IMAGE prompt maximum word count */
  imagePromptMaxWords: 400,
} as const;

// =============================================================================
// UI Configuration
// =============================================================================

export const uiConfig = {
  /** Debounce delay for save operations (milliseconds) */
  saveDebounceMs: 1000,

  /** Debounce delay for search input (milliseconds) */
  searchDebounceMs: 300,

  /** Toast notification duration (milliseconds) */
  toastDurationMs: 3000,

  /** Maximum items per page in lists */
  defaultPageSize: 20,

  /** Canvas auto-save interval (milliseconds) */
  autoSaveIntervalMs: 30000,
} as const;

// =============================================================================
// Platform-Specific Settings
// =============================================================================

export const platformSettings = {
  tiktok: {
    /** Maximum video duration in seconds */
    maxDuration: 180,
    /** Ideal video duration in seconds */
    idealDuration: 30,
    /** Recommended loop mode */
    loopMode: true,
    /** Default pacing style */
    pacingStyle: "fast" as const,
  },
  youtube: {
    maxDuration: 60,
    idealDuration: 45,
    loopMode: false,
    pacingStyle: "normal" as const,
  },
  instagram: {
    maxDuration: 90,
    idealDuration: 30,
    loopMode: true,
    pacingStyle: "fast" as const,
  },
  generic: {
    maxDuration: 300,
    idealDuration: 60,
    loopMode: false,
    pacingStyle: "normal" as const,
  },
} as const;

// =============================================================================
// Pacing Multipliers
// =============================================================================

export const pacingMultipliers = {
  /** Slow pacing: longer beat intervals */
  slow: 1.5,
  /** Normal pacing: standard intervals */
  normal: 1.0,
  /** Fast pacing: shorter intervals */
  fast: 0.7,
  /** Chaotic pacing: very short intervals */
  chaotic: 0.4,
} as const;

// =============================================================================
// Variety Engine
// =============================================================================

export const varietyConfig = {
  /** Default language weights */
  defaultLanguageWeights: { hi: 0, ja: 0, en: 1 },

  /** Maximum history lookback for variety checks */
  maxHistoryLookback: 50,

  /** Minimum pool size warning threshold */
  minPoolSizeWarning: 3,
} as const;

// =============================================================================
// Aggregate Export
// =============================================================================

export const config = {
  api: apiConfig,
  generation: generationLimits,
  linter: linterThresholds,
  ui: uiConfig,
  platforms: platformSettings,
  pacing: pacingMultipliers,
  variety: varietyConfig,
} as const;

export type Config = typeof config;
