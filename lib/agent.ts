/**
 * Agent Pipeline Orchestrator
 *
 * Orchestrates the compile-generate-lint-repair cycle for batch generation.
 * Emits SSE events for progress tracking.
 *
 * @module lib/agent
 */

import { prisma } from "./db";
import { NotFoundError, ConflictError, BadRequestError } from "./errors";
import {
  VarietyError,
  assign as varietyAssign,
  type VarietyPool,
  type HistoryEntry,
} from "@/packages/domain/variety";
import * as anthropic from "./anthropic";
import { compile } from "@/packages/domain/compiler";
import { lintBatch, lintScene } from "@/packages/domain/linter";
import type { SSEEvent, RunConfigInput } from "./schemas";
import type {
  CanvasGraph,
  Lane,
  ComboAssignment,
  Scene as DomainScene,
  Violation,
} from "@/packages/domain/types";
import type { ThemePack, BlockDefinition } from "@/packages/domain/compiler";

// =============================================================================
// Types
// =============================================================================

/**
 * SSE event emitter type
 */
export type SSEEmitter = (event: SSEEvent) => void;

/**
 * Run result
 */
export interface RunResult {
  status: "DONE" | "FAILED";
  runId: string;
  sceneCount: number;
  error?: string;
}

type AgentPhase = "COMPILING" | "ASSIGNING" | "GENERATING" | "LINTING" | "REPAIRING";

/**
 * Agent event emitter for SSE
 */
export class AgentEventEmitter {
  private listeners: Map<string, ((event: SSEEvent) => void)[]> = new Map();
  private closed = false;

  on(event: string, callback: (event: SSEEvent) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  emit(event: SSEEvent): void {
    if (this.closed) return;

    const callbacks = this.listeners.get(event.type) || [];
    callbacks.forEach((cb) => cb(event));

    // Also emit to "all" listeners
    const allCallbacks = this.listeners.get("all") || [];
    allCallbacks.forEach((cb) => cb(event));
  }

  disconnect(): void {
    this.closed = true;
    this.listeners.clear();
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Generate a hash for a combo assignment for deduplication
 */
function hashCombo(combo: ComboAssignment): string {
  const key = [
    combo.stageArea,
    combo.festivalMoment,
    combo.dynamic,
    combo.payoff,
  ].join("|");
  return key;
}

/**
 * Generate a new combo avoiding siblings
 */
function rerollCombo(
  current: ComboAssignment,
  siblings: ComboAssignment[],
  pool: VarietyPool
): ComboAssignment {
  // Build used sets from siblings
  const usedStageArea = new Set(siblings.map((s) => s.stageArea));
  const usedFestivalMoment = new Set(siblings.map((s) => s.festivalMoment));
  const usedDynamic = new Set(siblings.map((s) => s.dynamic));
  const usedVisual = new Set(siblings.map((s) => s.visual));
  const usedHook = new Set(siblings.map((s) => s.hook));
  const usedGag = new Set(siblings.map((s) => s.gag));
  const usedPayoff = new Set(siblings.map((s) => s.payoff));
  const usedChaosThread = new Set(siblings.map((s) => s.chaosThread));

  // Pick new values avoiding siblings
  const pickNew = (values: string[], used: Set<string>, fallback: string): string => {
    const available = values.filter((v) => !used.has(v) && v !== fallback);
    if (available.length === 0) return fallback;
    return available[Math.floor(Math.random() * available.length)];
  };

  return {
    stageArea: pickNew(pool.stageArea, usedStageArea, current.stageArea),
    festivalMoment: pickNew(pool.festivalMoment, usedFestivalMoment, current.festivalMoment),
    dynamic: pickNew(pool.dynamic, usedDynamic, current.dynamic),
    visual: pickNew(pool.visual, usedVisual, current.visual),
    hook: pickNew(pool.hook, usedHook, current.hook),
    gag: pickNew(pool.gag, usedGag, current.gag),
    payoff: pickNew(pool.payoff, usedPayoff, current.payoff),
    chaosThread: pickNew(pool.chaosThread, usedChaosThread, current.chaosThread),
    camera: {
      start: pool.camera_start[Math.floor(Math.random() * pool.camera_start.length)],
      middle: pool.camera_middle[Math.floor(Math.random() * pool.camera_middle.length)],
      end: pool.camera_end[Math.floor(Math.random() * pool.camera_end.length)],
    },
    language: current.language,
    subgenre: pool.subgenre[Math.floor(Math.random() * pool.subgenre.length)],
  };
}

/**
 * Ensure a pool has at least `min` unique values so variety.assign can fill a batch.
 * Theme pack canon is often thin (3–4 items); pad with fallbacks without duplicates.
 */
export function padPool(
  values: string[] | undefined,
  fallbacks: string[],
  min: number = 10
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const v of values ?? []) {
    const key = String(v).trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(key);
  }

  // Already large enough — do not append fallbacks
  if (result.length >= min) {
    return result;
  }

  for (const v of fallbacks) {
    if (result.length >= min) break;
    const key = String(v).trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(key);
  }

  let n = 1;
  const base = fallbacks[0] ?? "variant";
  while (result.length < min) {
    const candidate = `${base} ${n++}`;
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    result.push(candidate);
  }

  return result;
}

/**
 * Build variety pool from canon data.
 * Pads each axis to ≥10 so default batchSize 5–10 never fails on thin seed canon.
 */
function buildVarietyPool(canon: Record<string, string[]>): VarietyPool {
  const cameras = padPool(canon.cameras, [
    "dolly",
    "pan",
    "crane up",
    "whip pan",
    "tracking shot",
    "push-in",
    "pull-back",
    "steadicam",
    "handheld",
    "aerial",
  ]);

  return {
    hook: padPool(canon.hooks, [
      "surprise entrance",
      "dramatic lighting",
      "crowd surge",
      "sudden silence",
      "UV blackout",
      "string snap tease",
      "mirror reveal",
      "pyro flash",
      "crowd part",
      "silhouette rise",
    ]),
    camera_start: cameras,
    camera_middle: cameras,
    camera_end: cameras,
    dynamic: padPool(canon.dynamics, [
      "synchronized",
      "call-response",
      "battle",
      "mirror",
      "tandem",
      "wave",
      "orbit",
      "leapfrog",
      "lockstep",
      "duet break",
    ]),
    visual: padPool(canon.visuals, [
      "neon strings",
      "golden glow",
      "UV reactive",
      "smoke",
      "particles",
      "puppet shadows",
      "sparkle trail",
      "laser lattice",
      "strobe freeze",
      "hologram flicker",
    ]),
    gag: padPool(canon.gags, [
      "tangled strings",
      "puppet falls",
      "wrong stage",
      "collision",
      "stuck",
      "delayed reaction",
      "wrong puppet",
      "hat steal",
      "mic drop fail",
      "shoe fly",
    ]),
    payoff: padPool(canon.payoffs, [
      "crowd sync",
      "confetti burst",
      "light explosion",
      "freeze",
      "unity",
      "puppet bow",
      "stage reveal",
      "chant peak",
      "drop impact",
      "hands skyward",
    ]),
    chaosThread: padPool(canon.chaosThreads, [
      "rogue balloon",
      "lost phone",
      "beach ball",
      "smoke drift",
      "confetti",
      "drunk fan",
      "pyro misfire",
      "security jog",
      "flag wave",
      "drone buzz",
    ]),
    stageArea: padPool(canon.stages, [
      "Main Stage",
      "Pyramid Stage",
      "Other Stage",
      "Secret Stage",
      "Campground",
      "West Holts",
      "The Park",
      "Arcadia",
      "Glade",
      "Field of Avalon",
    ]),
    festivalMoment: padPool(canon.moments, [
      "Sunset Arrival",
      "Peak Hour",
      "After Hours",
      "Dawn",
      "Midnight",
      "Headliner",
      "Secret Set",
      "Dawn Chorus",
      "Golden Hour",
      "Blue Hour",
    ]),
    // Languages used for assignment weights (hi/ja) — keep distinct codes
    language: padPool(
      (canon.languages ?? []).filter((l) => l === "hi" || l === "ja"),
      ["hi", "ja"],
      2
    ),
    subgenre: padPool(canon.subgenres, [
      "psycore",
      "techno",
      "house",
      "trance",
      "dubstep",
      "drum and bass",
      "hardstyle",
      "minimal",
      "progressive",
      "breaks",
    ]),
  };
}

/**
 * Build ThemePack for compiler from DB data
 */
function buildThemePack(dbThemePack: {
  id: string;
  name: string;
  canon: unknown;
}): ThemePack {
  const canon = dbThemePack.canon as Record<string, string[]>;
  return {
    id: dbThemePack.id,
    name: dbThemePack.name,
    festivalName: dbThemePack.name,
    universeRules: [],
    characters: [],
    stages: canon.stages || [],
    festivalMoments: canon.moments || [],
    subgenres: canon.subgenres || [],
    languageChants: {},
  };
}

/**
 * Build empty block definitions (for now)
 */
function buildBlockDefs(): Record<string, BlockDefinition> {
  return {};
}

function nowTs(): number {
  return Date.now();
}

function previewText(scene: {
  lyrics?: string;
  imagePrompt?: string;
}): string {
  const source = scene.lyrics || scene.imagePrompt || "";
  return source.slice(0, 100);
}

function makeSceneId(runId: string, index: number): string {
  return `${runId}-scene-${index}`;
}

// =============================================================================
// Main Orchestrator
// =============================================================================

/**
 * Run a batch generation
 *
 * @param templateId - ID of the template to use
 * @param runConfig - Run configuration (optional, uses template defaults)
 * @param emitter - SSE event emitter
 * @returns Run result
 */
export async function runBatch(
  templateId: string,
  runConfig: RunConfigInput | undefined,
  emitter: SSEEmitter
): Promise<RunResult> {
  const startedAt = nowTs();
  let currentPhase: AgentPhase = "COMPILING";

  // 1. Load template + validate
  const template = await prisma.flowTemplate.findUnique({
    where: { id: templateId },
    include: { themePack: true },
  });

  if (!template) {
    throw new NotFoundError("Template not found");
  }

  // 2. Validate and parse graph (normalize incomplete seed/legacy graphs)
  const rawGraph = template.graph as Partial<CanvasGraph> & {
    nodes?: CanvasGraph["nodes"];
    edges?: CanvasGraph["edges"];
  };
  const defaultRunConfig = {
    loopMode: true,
    languages: { hi: 3, ja: 2 },
    batchSize: 5,
  };
  const graphRunConfig = rawGraph.runConfig ?? defaultRunConfig;
  const config = {
    ...defaultRunConfig,
    ...graphRunConfig,
    ...runConfig,
    languages: {
      ...defaultRunConfig.languages,
      ...(graphRunConfig.languages ?? {}),
      ...(runConfig?.languages ?? {}),
    },
    batchSize:
      runConfig?.batchSize ??
      graphRunConfig.batchSize ??
      defaultRunConfig.batchSize,
  };

  // Ensure compiler/linter always see a full CanvasGraph with runConfig
  const graph: CanvasGraph = {
    version: (rawGraph.version as 1) ?? 1,
    lanes: rawGraph.lanes ?? [
      "GLOBAL",
      "IMAGE",
      "VIDEO_START",
      "EXTEND_MIDDLE",
      "EXTEND_END",
    ],
    nodes: rawGraph.nodes ?? [],
    edges: rawGraph.edges ?? [],
    runConfig: {
      loopMode: config.loopMode,
      languages: config.languages,
      batchSize: config.batchSize,
    },
  };

  // Early language constraint check (sum of language weights must fit batch)
  const languageTotal = (config.languages.hi ?? 0) + (config.languages.ja ?? 0);
  if (languageTotal > config.batchSize) {
    // Create a failed run record for observability, then return FAILED
    const failedRun = await prisma.run.create({
      data: {
        templateId,
        status: "FAILED",
        model: anthropic.getModelName(),
        error: `language constraint impossible: hi=${config.languages.hi} + ja=${config.languages.ja} exceeds batchSize=${config.batchSize}`,
      },
    });

    emitter({
      type: "error",
      error: failedRun.error ?? "language constraint impossible",
      phase: "COMPILING",
      runId: failedRun.id,
      timestamp: nowTs(),
    });

    return {
      status: "FAILED",
      runId: failedRun.id,
      sceneCount: 0,
      error: failedRun.error ?? "language constraint impossible",
    };
  }

  // 3. Check for concurrent runs
  const activeRun = await prisma.run.findFirst({
    where: {
      status: {
        in: ["PENDING", "COMPILING", "GENERATING", "LINTING", "REPAIRING"],
      },
    },
  });

  if (activeRun) {
    throw new ConflictError("A batch is already running");
  }

  // 4. Create run record (status = PENDING)
  const run = await prisma.run.create({
    data: {
      templateId,
      status: "PENDING",
      model: anthropic.getModelName(),
    },
  });

  try {
    // 5. COMPILING — compile scaffold after variety assignment
    currentPhase = "COMPILING";
    emitter({ type: "phase", phase: "COMPILING", timestamp: nowTs() });

    await prisma.run.update({
      where: { id: run.id },
      data: { status: "COMPILING" },
    });

    // Load history for variety engine
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const historyEntries = await prisma.usageLog.findMany({
      where: {
        runDate: {
          gte: thirtyDaysAgo,
        },
      },
    });

    // Convert to variety engine format
    const history: HistoryEntry[] = historyEntries.map((entry) => {
      const axes = entry.axes as Record<string, unknown>;
      return {
        runDate: entry.runDate.getTime(),
        stageArea: (axes.stageArea as string) || "",
        festivalMoment: (axes.festivalMoment as string) || "",
        dynamic: (axes.dynamic as string) || "",
        payoff: (axes.payoff as string) || "",
        hook: (axes.hook as string) || "",
        camera: (axes.camera as { start: string })?.start || "",
        gag: (axes.gag as string) || "",
        chaosThread: (axes.chaosThread as string) || "",
        language: (axes.language as string) || "",
        subgenre: (axes.subgenre as string) || "",
        visual: (axes.visual as string) || "",
      };
    });

    // Build variety pool from theme pack canon
    const canon = template.themePack.canon as Record<string, string[]>;
    const pool = buildVarietyPool(canon);

    // Assign combos (variety failures bubble to catch → FAILED)
    const assignments = varietyAssign(pool, history, {
      batchSize: config.batchSize,
      languages: config.languages,
      lookbackDays: 30,
      lookbackRuns: 10,
    });

    const themePack = buildThemePack(template.themePack);
    const blockDefs = buildBlockDefs();
    const scaffold = compile(graph, themePack, assignments, blockDefs);

    // Update run with scaffold
    await prisma.run.update({
      where: { id: run.id },
      data: { scaffold },
    });

    // 6. Generate with Anthropic
    currentPhase = "GENERATING";
    emitter({ type: "phase", phase: "GENERATING", timestamp: nowTs() });

    await prisma.run.update({
      where: { id: run.id },
      data: { status: "GENERATING" },
    });

    const batchOutput = await anthropic.generateBatch(scaffold, assignments, {
      temperature: 1.0,
      maxTokens: 4000,
    });

    // Emit scene previews as soon as generation completes (before lint)
    batchOutput.scenes.forEach((scene, index) => {
      emitter({
        type: "scene",
        index,
        preview: previewText(scene),
        timestamp: nowTs(),
      });
    });

    // 7. Lint batch output
    currentPhase = "LINTING";
    emitter({ type: "phase", phase: "LINTING", timestamp: nowTs() });

    await prisma.run.update({
      where: { id: run.id },
      data: { status: "LINTING" },
    });

    // Convert to full Scene objects for linting (preserve any fixture lintReport)
    const scenesForLinting: DomainScene[] = batchOutput.scenes.map((s, idx) => ({
      lyrics: s.lyrics,
      imagePrompt: s.imagePrompt,
      startPrompt: s.startPrompt,
      middlePrompt: s.middlePrompt,
      endPrompt: s.endPrompt,
      boundaryFrame1: s.boundaryFrame1,
      boundaryFrame2: s.boundaryFrame2,
      finalFrame: s.finalFrame,
      id: `temp-${idx}`,
      runId: run.id,
      index: idx,
      combo: assignments[idx],
      lintReport: ("lintReport" in s && Array.isArray(s.lintReport) ? s.lintReport : []) as Violation[],
      notes: null,
    }));

    let finalOutput = batchOutput;
    let lintReport = lintBatch({ scenes: scenesForLinting }, graph, config);

    // 8. Repair if hard violations (single retry)
    if (!lintReport.valid && anthropic.hasAnthropicKey()) {
      currentPhase = "REPAIRING";
      emitter({ type: "phase", phase: "REPAIRING", timestamp: nowTs() });

      await prisma.run.update({
        where: { id: run.id },
        data: { status: "REPAIRING" },
      });

      finalOutput = await anthropic.repair(scaffold, {
        violations: lintReport.hardViolations,
      });

      // Re-lint after repair
      const repairedScenesForLinting: DomainScene[] = finalOutput.scenes.map(
        (s, idx) => ({
          lyrics: s.lyrics,
          imagePrompt: s.imagePrompt,
          startPrompt: s.startPrompt,
          middlePrompt: s.middlePrompt,
          endPrompt: s.endPrompt,
          boundaryFrame1: s.boundaryFrame1,
          boundaryFrame2: s.boundaryFrame2,
          finalFrame: s.finalFrame,
          id: `temp-${idx}`,
          runId: run.id,
          index: idx,
          combo: assignments[idx],
          lintReport: ("lintReport" in s && Array.isArray(s.lintReport)
            ? s.lintReport
            : []) as Violation[],
          notes: null,
        })
      );
      lintReport = lintBatch({ scenes: repairedScenesForLinting }, graph, config);
      // Even if still invalid after one repair, persist with warnings (DONE)
    }

    // 9. Persist scenes + UsageLog via createMany (explicit IDs for FK linking)
    const sceneRows = finalOutput.scenes.map((scene, idx) => {
      const sceneViolations = lintReport.byScene.get(idx) || [];
      return {
        id: makeSceneId(run.id, idx),
        runId: run.id,
        index: idx,
        combo: assignments[idx] as object,
        lyrics: scene.lyrics,
        imagePrompt: scene.imagePrompt,
        startPrompt: scene.startPrompt,
        middlePrompt: scene.middlePrompt,
        endPrompt: scene.endPrompt,
        boundaryFrame1: scene.boundaryFrame1,
        boundaryFrame2: scene.boundaryFrame2,
        finalFrame: scene.finalFrame,
        lintReport: sceneViolations as object,
      };
    });

    await prisma.scene.createMany({
      data: sceneRows,
    });

    await prisma.usageLog.createMany({
      data: sceneRows.map((row, idx) => ({
        runDate: new Date(),
        comboHash: hashCombo(assignments[idx]),
        axes: assignments[idx] as object,
        sceneId: row.id,
      })),
    });

    // 10. Mark run complete
    await prisma.run.update({
      where: { id: run.id },
      data: { status: "DONE" },
    });

    emitter({
      type: "done",
      runId: run.id,
      sceneCount: sceneRows.length,
      duration: nowTs() - startedAt,
      timestamp: nowTs(),
    });

    return {
      status: "DONE",
      runId: run.id,
      sceneCount: sceneRows.length,
    };
  } catch (err) {
    // Update run status to FAILED
    const errorMessage = err instanceof Error ? err.message : "Unknown error";

    await prisma.run.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        error: errorMessage,
      },
    });

    emitter({
      type: "error",
      error: errorMessage,
      phase: currentPhase,
      runId: run.id,
      timestamp: nowTs(),
    });

    return {
      status: "FAILED",
      runId: run.id,
      sceneCount: 0,
      error: errorMessage,
    };
  }
}

/**
 * Reroll a single scene
 */
export async function rerollScene(
  runId: string,
  sceneIndex: number,
  stage?: Lane
): Promise<DomainScene> {
  // 1. Load run + all scenes
  const run = await prisma.run.findUnique({
    where: { id: runId },
    include: {
      scenes: true,
      template: { include: { themePack: true } },
    },
  });

  if (!run) {
    throw new NotFoundError("Run not found");
  }

  if (run.status !== "DONE") {
    throw new ConflictError("Run not complete");
  }

  const targetScene = run.scenes.find((s) => s.index === sceneIndex);
  if (!targetScene) {
    throw new BadRequestError("Invalid scene index");
  }

  // 2. Extract sibling combos
  const siblingCombos = run.scenes
    .filter((s) => s.index !== sceneIndex)
    .map((s) => s.combo as ComboAssignment);

  // 3. Get scaffold (recompile if missing)
  const graph = run.template.graph as CanvasGraph;
  let scaffold = run.scaffold;

  if (!scaffold) {
    const themePack = buildThemePack(run.template.themePack);
    const blockDefs = buildBlockDefs();
    const allCombos = run.scenes.map((s) => s.combo as ComboAssignment);
    scaffold = compile(graph, themePack, allCombos, blockDefs);
  }

  // 4. Reroll combo
  const currentCombo = targetScene.combo as ComboAssignment;
  const canon = run.template.themePack.canon as Record<string, string[]>;
  const pool = buildVarietyPool(canon);

  const updatedCombo = rerollCombo(currentCombo, siblingCombos, pool);

  // 5. Generate new scene
  const singleSceneOutput = await anthropic.generateScene(
    scaffold,
    sceneIndex,
    updatedCombo,
    stage
  );

  // 6. Lint the updated scene
  const fullScene: DomainScene = {
    ...singleSceneOutput,
    id: targetScene.id,
    runId: run.id,
    index: sceneIndex,
    combo: updatedCombo,
    lintReport: [],
    notes: null,
  };

  const violations = lintScene(fullScene, graph.runConfig, []);

  // 7. Update Scene record
  const updatedScene = await prisma.scene.update({
    where: { id: targetScene.id },
    data: {
      combo: updatedCombo,
      lyrics: singleSceneOutput.lyrics,
      imagePrompt: singleSceneOutput.imagePrompt,
      startPrompt: singleSceneOutput.startPrompt,
      middlePrompt: singleSceneOutput.middlePrompt,
      endPrompt: singleSceneOutput.endPrompt,
      boundaryFrame1: singleSceneOutput.boundaryFrame1,
      boundaryFrame2: singleSceneOutput.boundaryFrame2,
      finalFrame: singleSceneOutput.finalFrame,
      lintReport: violations,
    },
  });

  // 8. Update UsageLog
  const existingLog = await prisma.usageLog.findUnique({
    where: { sceneId: targetScene.id },
  });

  if (existingLog) {
    await prisma.usageLog.update({
      where: { id: existingLog.id },
      data: {
        comboHash: hashCombo(updatedCombo),
        axes: updatedCombo,
      },
    });
  }

  return {
    id: updatedScene.id,
    runId: updatedScene.runId,
    index: updatedScene.index,
    combo: updatedScene.combo as ComboAssignment,
    lyrics: updatedScene.lyrics,
    imagePrompt: updatedScene.imagePrompt,
    startPrompt: updatedScene.startPrompt,
    middlePrompt: updatedScene.middlePrompt,
    endPrompt: updatedScene.endPrompt,
    boundaryFrame1: updatedScene.boundaryFrame1,
    boundaryFrame2: updatedScene.boundaryFrame2,
    finalFrame: updatedScene.finalFrame,
    lintReport: updatedScene.lintReport as Violation[],
    notes: updatedScene.notes,
  };
}

/**
 * Reroll a single stage within a scene
 * Alias for rerollScene with stage parameter
 */
export async function rerollStage(
  runId: string,
  sceneIndex: number,
  stage: Lane
): Promise<DomainScene> {
  return rerollScene(runId, sceneIndex, stage);
}

// Re-export for convenience
export { VarietyError };
