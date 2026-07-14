/**
 * Zod Schemas for API Validation
 *
 * All API request/response validation schemas.
 * Used at route boundaries before passing to business logic.
 *
 * @module lib/schemas
 */

import { z } from "zod";
import {
  LaneSchema,
  BlockTypeSchema,
  RunConfigSchema,
  CanvasNodeSchema,
  CanvasEdgeSchema,
  ComboAssignmentSchema,
  ViolationSchema,
} from "@/packages/domain/types";

// =============================================================================
// Common Schemas
// =============================================================================

/**
 * Pagination query parameters
 * Note: Uses nullable().transform() because url.searchParams.get() returns null for missing params
 */
export const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).nullable().transform((v) => v ?? 20).default(20),
  cursor: z.string().nullable().transform((v) => v ?? undefined).optional(),
});

export type Pagination = z.infer<typeof PaginationSchema>;

/**
 * Paginated response envelope
 */
export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: z.array(dataSchema),
    cursor: z.string().nullable(),
    hasMore: z.boolean(),
  });

// =============================================================================
// Theme Pack Schemas
// =============================================================================

/**
 * Canon object for theme pack
 * Record of string arrays for each category
 */
export const CanonSchema = z.record(z.string(), z.array(z.string()).optional());

/**
 * Create theme pack request
 */
export const CreateThemePackSchema = z.object({
  name: z.string().min(1).max(255),
  canon: CanonSchema.default({}),
  active: z.boolean().default(true),
});

export type CreateThemePack = z.infer<typeof CreateThemePackSchema>;

/**
 * Update theme pack request (all fields optional)
 */
export const UpdateThemePackSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  canon: CanonSchema.optional(),
  active: z.boolean().optional(),
});

export type UpdateThemePack = z.infer<typeof UpdateThemePackSchema>;

// =============================================================================
// Block Schemas
// =============================================================================

/**
 * Create block request
 */
export const CreateBlockSchema = z.object({
  type: BlockTypeSchema,
  name: z.string().min(1).max(255),
  promptFragment: z.string().min(1),
  stageScope: z.array(LaneSchema).default([]),
  rotationGroup: z.string().nullable().optional(),
  // Required so blocks survive refresh under the active theme pack filter
  themePackId: z.string().min(1, "themePackId is required"),
});

export type CreateBlock = z.infer<typeof CreateBlockSchema>;

/**
 * Update block request (all fields optional)
 */
export const UpdateBlockSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  promptFragment: z.string().min(1).optional(),
  stageScope: z.array(LaneSchema).optional(),
  rotationGroup: z.string().nullable().optional(),
  archived: z.boolean().optional(),
});

export type UpdateBlock = z.infer<typeof UpdateBlockSchema>;

/**
 * Block filter query parameters
 * Note: Uses nullable().transform() because url.searchParams.get() returns null for missing params
 */
export const BlockFilterSchema = z.object({
  type: BlockTypeSchema.nullable().transform((v) => v ?? undefined).optional(),
  themePackId: z.string().nullable().transform((v) => v ?? undefined).optional(),
  rotationGroup: z.string().nullable().transform((v) => v ?? undefined).optional(),
  archived: z.coerce.boolean().default(false),
});

export type BlockFilter = z.infer<typeof BlockFilterSchema>;

// =============================================================================
// Template Schemas
// =============================================================================

/**
 * Canvas graph schema for templates
 */
export const CanvasGraphSchema = z.object({
  version: z.literal(1),
  lanes: z.tuple([
    z.literal("GLOBAL"),
    z.literal("IMAGE"),
    z.literal("VIDEO_START"),
    z.literal("EXTEND_MIDDLE"),
    z.literal("EXTEND_END"),
  ]),
  nodes: z.array(CanvasNodeSchema),
  edges: z.array(CanvasEdgeSchema),
  runConfig: RunConfigSchema,
});

export type CanvasGraphInput = z.infer<typeof CanvasGraphSchema>;

/**
 * Create template request
 */
export const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  graph: CanvasGraphSchema,
  themePackId: z.string(),
});

export type CreateTemplate = z.infer<typeof CreateTemplateSchema>;

/**
 * Update template request (all fields optional)
 */
export const UpdateTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  graph: CanvasGraphSchema.optional(),
});

export type UpdateTemplate = z.infer<typeof UpdateTemplateSchema>;

// =============================================================================
// Run Schemas
// =============================================================================

/**
 * Run config for creating a run
 */
export const RunConfigInputSchema = z.object({
  loopMode: z.boolean().default(true),
  languages: z.object({
    hi: z.number().int().min(0).default(0),
    ja: z.number().int().min(0).default(0),
  }).default({ hi: 0, ja: 0 }),
  batchSize: z.number().int().min(1).max(10).default(5),
  historyStrictness: z.enum(["hard-fail", "warn"]).default("warn"),
});

export type RunConfigInput = z.infer<typeof RunConfigInputSchema>;

/**
 * Create run request
 */
export const CreateRunSchema = z.object({
  templateId: z.string(),
  runConfig: RunConfigInputSchema.optional(),
});

export type CreateRun = z.infer<typeof CreateRunSchema>;

/**
 * Run filter query parameters
 * Note: Uses nullable().transform() because url.searchParams.get() returns null for missing params
 */
export const RunFilterSchema = z.object({
  templateId: z.string().nullable().transform((v) => v ?? undefined).optional(),
  status: z.enum(["PENDING", "COMPILING", "GENERATING", "LINTING", "REPAIRING", "DONE", "FAILED"]).nullable().transform((v) => v ?? undefined).optional(),
});

export type RunFilter = z.infer<typeof RunFilterSchema>;

// =============================================================================
// Reroll Schemas
// =============================================================================

/**
 * Reroll request
 */
export const RerollSchema = z.object({
  sceneIndex: z.number().int().min(0).max(9),
  stage: LaneSchema.optional(),
});

export type Reroll = z.infer<typeof RerollSchema>;

// =============================================================================
// Scene Schemas
// =============================================================================

/**
 * Scene output schema
 */
export const SceneOutputSchema = z.object({
  id: z.string(),
  runId: z.string(),
  index: z.number().int(),
  combo: ComboAssignmentSchema,
  lyrics: z.string(),
  imagePrompt: z.string(),
  startPrompt: z.string(),
  middlePrompt: z.string(),
  endPrompt: z.string(),
  boundaryFrame1: z.string(),
  boundaryFrame2: z.string(),
  finalFrame: z.string(),
  lintReport: z.array(ViolationSchema),
  notes: z.string().nullable(),
});

export type SceneOutput = z.infer<typeof SceneOutputSchema>;

// =============================================================================
// SSE Event Schemas
// =============================================================================

/**
 * SSE event types
 *
 * Contract matches Phase 2 test spec §4.5 / §5.3 and tests/utils/sse-reader.ts:
 * - phase: pipeline stage markers
 * - scene: flat index + preview (first 100 chars) for streaming efficiency
 * - done: runId + sceneCount + optional duration
 * - error: error message with optional phase/runId context
 */
export const SSEEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("phase"),
    phase: z.enum(["COMPILING", "ASSIGNING", "GENERATING", "LINTING", "REPAIRING"]),
    timestamp: z.number().optional(),
  }),
  z.object({
    type: z.literal("scene"),
    index: z.number().int(),
    preview: z.string().optional(),
    partial: z.boolean().optional(),
    timestamp: z.number().optional(),
  }),
  z.object({
    type: z.literal("done"),
    runId: z.string(),
    sceneCount: z.number().int(),
    duration: z.number().optional(),
    timestamp: z.number().optional(),
  }),
  z.object({
    type: z.literal("error"),
    error: z.string(),
    phase: z.enum(["COMPILING", "ASSIGNING", "GENERATING", "LINTING", "REPAIRING"]).optional(),
    runId: z.string().optional(),
    timestamp: z.number().optional(),
  }),
]);

export type SSEEvent = z.infer<typeof SSEEventSchema>;

// =============================================================================
// Export Schemas
// =============================================================================

/**
 * Export format query parameter
 */
export const ExportFormatSchema = z.enum(["scenes", "scaffold"]).default("scenes");

export type ExportFormat = z.infer<typeof ExportFormatSchema>;
