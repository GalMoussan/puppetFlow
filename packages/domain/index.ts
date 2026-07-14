/**
 * PuppetFlow Domain Layer
 *
 * Pure TypeScript domain modules for the PuppetFlow scaffold generation pipeline.
 * Zero external dependencies beyond Zod for schema validation.
 *
 * @module packages/domain
 */

// =============================================================================
// Types
// =============================================================================

export {
  // Schemas
  LaneSchema,
  BlockTypeSchema,
  RunStatusSchema,
  NodeOverridesSchema,
  CanvasNodeSchema,
  HandshakeConfigSchema,
  CanvasEdgeSchema,
  LanguageWeightsSchema,
  RunConfigSchema,
  CanvasGraphSchema,
  ViolationSeveritySchema,
  ViolationSchema,
  CameraAssignmentSchema,
  ComboAssignmentSchema,
  SceneSchema,
  BatchOutputSchema,
  CompiledScaffoldSchema,
  VarietyErrorTypeSchema,
  RuleSeveritySchema,
  LanesArraySchema,
  schemas,
  // Types
  type Lane,
  type BlockType,
  type RunStatus,
  type NodeOverrides,
  type CanvasNode,
  type HandshakeConfig,
  type CanvasEdge,
  type LanguageWeights,
  type RunConfig,
  type CanvasGraph,
  type ViolationSeverity,
  type Violation,
  type CameraAssignment,
  type ComboAssignment,
  type Scene,
  type BatchOutput,
  type CompiledScaffold,
  type VarietyErrorType,
  type RuleSeverity,
  // Constants
  LANES,
} from "./types";

// =============================================================================
// Rules
// =============================================================================

export {
  // Types
  type Rule,
  // Constants
  RULES,
  CAMERA_MOVES,
  GENERIC_VERBS,
  INTENSITY_VERBS,
  NEGATIVE_PATTERNS,
  ALLOWED_NEGATIVES,
  CHARACTER_LOCK_BLOCKS,
  CHARACTER_NAMES,
  TIMESTAMP_PATTERN,
  PRESERVATION_PATTERNS,
  ACTION_VERBS,
  AUDIO_PATTERNS,
  LOOP_ANCHOR_PATTERNS,
  MIRROR_DIRECTIVE_PATTERNS,
  // Lookup functions
  getRuleById,
  getRulesForLane,
  getRulesBySeverity,
  // Utility functions
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

// =============================================================================
// Variety Engine
// =============================================================================

export {
  // Types
  type HistoryEntry,
  type HistoricalCombo,
  type CollisionCheckResult,
  type CollisionResult,
  type VarietyPool,
  type VarietyAxis,
  type VarietyConfig,
  // Error class
  VarietyError,
  // Constants
  DEFAULT_POOLS,
  // Functions
  assign,
  generateBatchCombos,
  checkHistoryCollision,
  checkBatchCollision,
  hasWithinBatchCollision,
  validatePools,
} from "./variety";

// =============================================================================
// Handshake
// =============================================================================

export {
  // Types
  type BoundaryFrame,
  type SimilarityResult,
  type HandshakeOptions,
  // Constants
  ENDING_FRAME_PATTERN,
  CONTINUATION_PATTERN,
  DEFAULT_THRESHOLD,
  LIGHTING_KEYWORDS,
  CHARACTER_KEYWORDS,
  // Frame extraction
  extractEndingFrame,
  extractContinuationFrame,
  normalizeFrame,
  extractBoundaryFrame1,
  extractBoundaryFrame2,
  extractFinalFrame,
  // Tokenization
  tokenize,
  getWordSet,
  // Similarity
  jaccardSimilarity,
  overlapSimilarity,
  checkLightingMatch,
  checkCharacterMatch,
  findMissingElements,
  calculateSimilarity,
  // Validation
  validateHandshake,
  validateSceneHandshakes,
  checkBatchHandshakes,
} from "./handshake";

// =============================================================================
// Exporter
// =============================================================================

export {
  // Types
  type ExportMetadata,
  type PromptStage,
  // Formatting
  formatMetadataFrontmatter,
  formatComboChips,
  formatLyricsBlock,
  formatPromptSection,
  formatBoundaryFrameCallout,
  // Export functions
  exportBatch,
  exportScaffold,
  parseExportedMarkdown,
} from "./exporter";

// =============================================================================
// Compiler
// =============================================================================

export {
  // Types
  type ThemePack,
  type CharacterDefinition,
  type BlockDefinition,
  // Error class
  CompilerError,
  // Functions
  resolveBlockFragment,
  injectComboPlaceholders,
  injectLoopDirectives,
  injectCharacterLocks,
  compileStageTemplate,
  compile,
} from "./compiler";

// =============================================================================
// Scene import
// =============================================================================

export {
  parseSceneMarkdown,
  planImport,
  importSceneFromMarkdown,
  type SceneStageKey,
  type ParsedStage,
  type ParsedScene,
  type ParsedCharacterLock,
  type PlannedBlock,
  type ImportPlan,
  type PlanImportOptions,
} from "./scene-import";

// =============================================================================
// Linter
// =============================================================================

export {
  // Types
  type LintReport,
  // Rule checkers
  checkR1SequentialWeighting,
  checkR2CameraVerb,
  checkR3WordBudget,
  checkR4BeatStructure,
  checkR5DivisionOfLabor,
  checkR6Negatives,
  checkR7Handshake,
  checkR8ShortExtends,
  checkR9RetentionPacing,
  checkR10LoopClosure,
  checkR11AudioDirection,
  checkR12DropSync,
  checkR13CharacterLocks,
  // Scene and batch linting
  lintScene,
  lintBatch,
} from "./linter";
