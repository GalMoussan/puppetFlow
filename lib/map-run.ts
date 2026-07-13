/**
 * Map API Run payloads to RunViewer presentation models.
 *
 * @module lib/map-run
 */

import type { Run as ViewerRun } from "@/components/run/RunViewer";
import type { Scene as ViewerScene, LintResult } from "@/components/run/SceneCard";
import type { Violation } from "@/components/run/LintBadge";

// =============================================================================
// API shapes (loose — matches Prisma JSON + includes)
// =============================================================================

export interface ApiViolation {
  rule: string;
  severity: string;
  evidence?: string;
  message?: string;
  stage?: string;
  sceneIndex?: number;
}

export interface ApiScene {
  id: string;
  runId?: string;
  index: number;
  lyrics: string;
  imagePrompt: string;
  startPrompt: string;
  middlePrompt: string;
  endPrompt: string;
  boundaryFrame1: string;
  boundaryFrame2: string;
  finalFrame?: string;
  lintReport?: ApiViolation[] | unknown;
  notes?: string | null;
  combo?: unknown;
}

export interface ApiRun {
  id: string;
  templateId: string;
  status: string;
  model?: string | null;
  createdAt: string | Date;
  updatedAt?: string | Date;
  template?: { id?: string; name?: string } | null;
  scenes?: ApiScene[];
}

// =============================================================================
// Mapping
// =============================================================================

function toIso(value: string | Date | undefined): string {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  return value;
}

function normalizeViolations(raw: unknown): Violation[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((v) => {
    const item = v as ApiViolation;
    return {
      rule: item.rule ?? "unknown",
      severity: item.severity === "hard" ? "hard" : "soft",
      message: item.message ?? item.evidence ?? "",
    };
  });
}

/**
 * Convert domain/API lintReport array into SceneCard lintResult.
 */
export function mapLintReportToResult(raw: unknown): LintResult {
  const violations = normalizeViolations(raw);
  const hasHard = Array.isArray(raw)
    ? raw.some((v) => (v as ApiViolation).severity === "hard")
    : false;
  const hasWarn =
    Array.isArray(raw) &&
    raw.some(
      (v) =>
        (v as ApiViolation).severity === "warn" ||
        (v as ApiViolation).severity === "soft"
    );

  let status: LintResult["status"] = "pass";
  if (hasHard) status = "fail";
  else if (hasWarn || violations.length > 0) status = "warn";

  return { status, violations };
}

/**
 * Map a single API scene to the viewer Scene model.
 * Display index is 1-based (API domain index is 0-based).
 */
export function mapApiSceneToViewerScene(scene: ApiScene): ViewerScene {
  return {
    id: scene.id,
    index: scene.index + 1,
    lyrics: scene.lyrics ?? "",
    imagePrompt: scene.imagePrompt ?? "",
    videoStart: scene.startPrompt ?? "",
    videoMiddle: scene.middlePrompt ?? "",
    videoEnd: scene.endPrompt ?? "",
    boundaryFrames: {
      start: { description: scene.boundaryFrame1 ?? "" },
      end: { description: scene.boundaryFrame2 ?? "" },
    },
    lintResult: mapLintReportToResult(scene.lintReport ?? []),
    notes: scene.notes ?? "",
  };
}

function mapStatus(status: string): ViewerRun["status"] {
  const upper = status.toUpperCase();
  if (upper === "DONE") return "done";
  if (upper === "FAILED") return "failed";
  return "generating";
}

/**
 * Map GET /api/runs/[id] JSON to RunViewer props.
 */
export function mapApiRunToViewerRun(apiRun: ApiRun): ViewerRun {
  const createdAt = toIso(apiRun.createdAt);
  const updatedAt = toIso(apiRun.updatedAt ?? apiRun.createdAt);
  const duration = Math.max(
    0,
    new Date(updatedAt).getTime() - new Date(createdAt).getTime()
  );

  const scenes = (apiRun.scenes ?? []).map(mapApiSceneToViewerScene);

  return {
    id: apiRun.id,
    templateId: apiRun.templateId,
    templateName: apiRun.template?.name ?? "Untitled",
    sceneCount: scenes.length,
    model: apiRun.model ?? "unknown",
    status: mapStatus(apiRun.status),
    createdAt,
    completedAt: apiRun.status.toUpperCase() === "DONE" ? updatedAt : undefined,
    duration,
    scenes,
  };
}
