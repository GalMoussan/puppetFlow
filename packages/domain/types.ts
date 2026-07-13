/**
 * Domain Types and Zod Schemas
 *
 * Pure TypeScript types with Zod validation for the PuppetFlow domain layer.
 * All types are framework-free (no React, Next.js, or Prisma imports).
 *
 * @module packages/domain/types
 */

import { z } from "zod";

// =============================================================================
// Lane and Stage Types
// =============================================================================

/**
 * Fixed, ordered lanes for the canvas
 * GLOBAL blocks apply to all stages
 */
export const LaneSchema = z.enum([
  "GLOBAL",
  "IMAGE",
  "VIDEO_START",
  "EXTEND_MIDDLE",
  "EXTEND_END",
]);

export type Lane = z.infer<typeof LaneSchema>;

/**
 * All 5 lanes in fixed order
 */
export const LANES: readonly Lane[] = [
  "GLOBAL",
  "IMAGE",
  "VIDEO_START",
  "EXTEND_MIDDLE",
  "EXTEND_END",
] as const;

// =============================================================================
// Block Types (matching Prisma enum)
// =============================================================================

/**
 * Block types matching the Prisma BlockType enum
 */
export const BlockTypeSchema = z.enum([
  "THEME_PACK_REF",
  "HOOK",
  "CAMERA_MOVE",
  "PUPPET_DYNAMIC",
  "PUPPET_VISUAL",
  "PHYSICAL_GAG",
  "CHAOS_THREAD",
  "PAYOFF",
  "SONG_SECTION",
  "LANGUAGE",
  "CHARACTER_LOCK",
  "STYLE_LOCK",
  "LOOP_CLOSURE",
  "STAGE_AREA",
  "FESTIVAL_MOMENT",
  "CUSTOM",
]);

export type BlockType = z.infer<typeof BlockTypeSchema>;

// =============================================================================
// Run Status (matching Prisma enum)
// =============================================================================

/**
 * Status of a run through the pipeline
 */
export const RunStatusSchema = z.enum([
  "PENDING",
  "COMPILING",
  "GENERATING",
  "LINTING",
  "REPAIRING",
  "DONE",
  "FAILED",
]);

export type RunStatus = z.infer<typeof RunStatusSchema>;

// =============================================================================
// Canvas Node Schema
// =============================================================================

/**
 * Node overrides for per-template customization
 */
export const NodeOverridesSchema = z.object({
  promptFragment: z.string().optional(),
});

export type NodeOverrides = z.infer<typeof NodeOverridesSchema>;

/**
 * A node on the canvas representing a block placement
 */
export const CanvasNodeSchema = z.object({
  id: z.string().describe("Unique node identifier"),
  blockDefId: z.string().describe("FK to BlockDefinition"),
  lane: LaneSchema.describe("Must be within blockDef.stageScope"),
  order: z.number().int().describe("Vertical order within lane"),
  overrides: NodeOverridesSchema.optional().describe("Per-template tweak"),
  pinned: z.boolean().optional().describe("Exempt from variety rotation"),
});

export type CanvasNode = z.infer<typeof CanvasNodeSchema>;

// =============================================================================
// Canvas Edge Schema (Handshake Configuration)
// =============================================================================

/**
 * Handshake configuration for lane-to-lane transitions
 */
export const HandshakeConfigSchema = z.object({
  strictness: z.enum(["verbatim", "paraphrase"]).describe("Similarity mode"),
  trackCrowdMembers: z.number().int().min(0).describe("Crowd members to track"),
});

export type HandshakeConfig = z.infer<typeof HandshakeConfigSchema>;

/**
 * Edge representing a handshake between lanes
 */
export const CanvasEdgeSchema = z.object({
  from: LaneSchema.describe("Source lane"),
  to: LaneSchema.describe("Target lane"),
  handshake: HandshakeConfigSchema.describe("Handshake configuration"),
});

export type CanvasEdge = z.infer<typeof CanvasEdgeSchema>;

// =============================================================================
// Run Configuration
// =============================================================================

/**
 * Language distribution weights
 */
export const LanguageWeightsSchema = z.object({
  hi: z.number().int().min(0).describe("Hindi scene count"),
  ja: z.number().int().min(0).describe("Japanese scene count"),
});

export type LanguageWeights = z.infer<typeof LanguageWeightsSchema>;

/**
 * Configuration for a run
 */
export const RunConfigSchema = z.object({
  loopMode: z.boolean().describe("Enable loop closure directives"),
  languages: LanguageWeightsSchema.describe("Language distribution"),
  batchSize: z
    .number()
    .int()
    .min(1)
    .max(10)
    .describe("Number of scenes to generate"),
  similarityThreshold: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Handshake similarity threshold (default: 0.8)"),
  varietyLookback: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe("Days to look back for variety (default: 30)"),
});

export type RunConfig = z.infer<typeof RunConfigSchema>;

/**
 * Default values for optional RunConfig fields
 */
export const RUN_CONFIG_DEFAULTS = {
  similarityThreshold: 0.8,
  varietyLookback: 30,
} as const;

// =============================================================================
// Canvas Graph (Versioned)
// =============================================================================

/**
 * Fixed lanes array (accepts both readonly and mutable)
 */
export const LanesArraySchema = z.array(LaneSchema).length(5);

/**
 * Type for the lanes array that accepts readonly
 */
export type LanesArray = readonly ["GLOBAL", "IMAGE", "VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"];

/**
 * Mutable lanes array for use in code
 */
export const LANES_MUTABLE: ["GLOBAL", "IMAGE", "VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"] = [
  "GLOBAL",
  "IMAGE",
  "VIDEO_START",
  "EXTEND_MIDDLE",
  "EXTEND_END",
];

/**
 * The complete canvas graph - versioned for forward compatibility
 */
export const CanvasGraphSchema = z.object({
  version: z.literal(1).describe("Schema version for migrations"),
  lanes: LanesArraySchema.describe("Fixed, ordered lanes"),
  nodes: z.array(CanvasNodeSchema).describe("Block placements"),
  edges: z.array(CanvasEdgeSchema).describe("Handshake edges"),
  runConfig: RunConfigSchema.describe("Run configuration"),
});

/**
 * CanvasGraph type - accepts readonly lanes array for compatibility
 */
export type CanvasGraph = {
  version: 1;
  lanes: LanesArray | ["GLOBAL", "IMAGE", "VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"];
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  runConfig: RunConfig;
};

// =============================================================================
// Violation Types (Linter Output)
// =============================================================================

/**
 * Severity levels for violations
 */
export const ViolationSeveritySchema = z.enum(["hard", "warn"]);

export type ViolationSeverity = z.infer<typeof ViolationSeveritySchema>;

/**
 * A rule violation detected by the linter
 */
export const ViolationSchema = z.object({
  rule: z.string().describe("Rule ID (R1-R15)"),
  severity: ViolationSeveritySchema.describe("Violation severity"),
  sceneIndex: z.number().int().optional().describe("Scene index (0-based)"),
  stage: z.string().optional().describe("Stage where violation occurred"),
  evidence: z.string().describe("Human-readable explanation"),
});

export type Violation = z.infer<typeof ViolationSchema>;

// =============================================================================
// Combo Assignment (Variety Engine Output)
// =============================================================================

/**
 * Camera moves for each stage
 */
export const CameraAssignmentSchema = z.object({
  start: z.string().describe("Camera move for VIDEO_START"),
  middle: z.string().describe("Camera move for EXTEND_MIDDLE"),
  end: z.string().describe("Camera move for EXTEND_END"),
});

export type CameraAssignment = z.infer<typeof CameraAssignmentSchema>;

/**
 * Complete combo assignment for a scene
 */
export const ComboAssignmentSchema = z.object({
  stageArea: z.string().describe("Festival stage/area"),
  festivalMoment: z.string().describe("Time/moment at festival"),
  dynamic: z.string().describe("Puppet interaction dynamic"),
  visual: z.string().describe("Puppet visual style"),
  hook: z.string().describe("Opening hook type"),
  gag: z.string().describe("Physical gag/comedy beat"),
  camera: CameraAssignmentSchema.describe("Camera moves per stage"),
  payoff: z.string().describe("Climax/payoff type"),
  chaosThread: z.string().describe("Chaos element threading through"),
  language: z.string().describe("Language code (hi/ja)"),
  subgenre: z.string().describe("Music subgenre"),
});

export type ComboAssignment = z.infer<typeof ComboAssignmentSchema>;

// =============================================================================
// Scene Types (Generated Output)
// =============================================================================

/**
 * A complete generated scene
 */
export const SceneSchema = z.object({
  id: z.string().describe("Unique scene identifier"),
  runId: z.string().describe("FK to Run"),
  index: z.number().int().min(0).describe("Scene index (0-based)"),
  combo: ComboAssignmentSchema.describe("Combo assignment used"),
  lyrics: z.string().describe("Generated lyrics"),
  imagePrompt: z.string().describe("IMAGE stage prompt"),
  startPrompt: z.string().describe("VIDEO_START stage prompt"),
  middlePrompt: z.string().describe("EXTEND_MIDDLE stage prompt"),
  endPrompt: z.string().describe("EXTEND_END stage prompt"),
  boundaryFrame1: z.string().describe("START->MIDDLE handshake"),
  boundaryFrame2: z.string().describe("MIDDLE->END handshake"),
  finalFrame: z.string().describe("Final frame description"),
  lintReport: z.array(ViolationSchema).describe("Violations found"),
  notes: z.string().nullable().describe("Optional notes"),
});

export type Scene = z.infer<typeof SceneSchema>;

/**
 * Batch output from generation
 */
export const BatchOutputSchema = z.object({
  scenes: z.array(SceneSchema).min(1).describe("Generated scenes"),
});

export type BatchOutput = z.infer<typeof BatchOutputSchema>;

// =============================================================================
// Compiled Scaffold Types
// =============================================================================

/**
 * A compiled scaffold ready for generation
 */
export const CompiledScaffoldSchema = z.object({
  markdown: z.string().describe("Complete scaffold markdown"),
  themePack: z.string().describe("Theme pack ID used"),
  combos: z.array(ComboAssignmentSchema).describe("Combo assignments"),
  loopMode: z.boolean().describe("Whether loop mode is enabled"),
});

export type CompiledScaffold = z.infer<typeof CompiledScaffoldSchema>;

// =============================================================================
// Variety Error Type
// =============================================================================

/**
 * Error types for variety engine failures
 */
export const VarietyErrorTypeSchema = z.enum([
  "pool_exhausted",
  "language_constraint",
  "history_collision",
  "invalid_config",
]);

export type VarietyErrorType = z.infer<typeof VarietyErrorTypeSchema>;

// =============================================================================
// Rule Severity Types
// =============================================================================

/**
 * Rule severity including advisory
 */
export const RuleSeveritySchema = z.enum(["hard", "warn", "advisory"]);

export type RuleSeverity = z.infer<typeof RuleSeveritySchema>;

// =============================================================================
// Export All Schemas
// =============================================================================

export const schemas = {
  Lane: LaneSchema,
  BlockType: BlockTypeSchema,
  RunStatus: RunStatusSchema,
  NodeOverrides: NodeOverridesSchema,
  CanvasNode: CanvasNodeSchema,
  HandshakeConfig: HandshakeConfigSchema,
  CanvasEdge: CanvasEdgeSchema,
  LanguageWeights: LanguageWeightsSchema,
  RunConfig: RunConfigSchema,
  CanvasGraph: CanvasGraphSchema,
  ViolationSeverity: ViolationSeveritySchema,
  Violation: ViolationSchema,
  CameraAssignment: CameraAssignmentSchema,
  ComboAssignment: ComboAssignmentSchema,
  Scene: SceneSchema,
  BatchOutput: BatchOutputSchema,
  CompiledScaffold: CompiledScaffoldSchema,
  VarietyErrorType: VarietyErrorTypeSchema,
  RuleSeverity: RuleSeveritySchema,
} as const;
