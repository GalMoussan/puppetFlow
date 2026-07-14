/**
 * Tests for API run → RunViewer model mapping
 *
 * Phase 4 - T403: Run Viewer route
 */

import { describe, it, expect } from "vitest";
import {
  mapApiRunToViewerRun,
  mapApiRunToLibraryItem,
  mapLintReportToResult,
} from "@/lib/map-run";

const apiScene = {
  id: "scene-1",
  runId: "run-1",
  index: 0,
  combo: {},
  lyrics: "Line one\nLine two",
  imagePrompt: "Image prompt text",
  startPrompt: "Start prompt",
  middlePrompt: "Middle prompt",
  endPrompt: "End prompt",
  boundaryFrame1: "BF1 exact frame",
  boundaryFrame2: "BF2 exact frame",
  finalFrame: "Final frame",
  lintReport: [] as Array<{ rule: string; severity: string; evidence?: string; message?: string }>,
  notes: null as string | null,
};

const apiRun = {
  id: "run-1",
  templateId: "tpl-1",
  status: "DONE",
  model: "claude-sonnet-4-20250514",
  createdAt: "2024-01-15T10:30:00.000Z",
  updatedAt: "2024-01-15T10:32:45.000Z",
  template: { id: "tpl-1", name: "Master of Puppets" },
  scenes: [
    apiScene,
    { ...apiScene, id: "scene-2", index: 1 },
  ],
};

describe("lib/map-run", () => {
  describe("mapLintReportToResult", () => {
    it("returns pass for empty report", () => {
      expect(mapLintReportToResult([])).toEqual({
        status: "pass",
        violations: [],
      });
    });

    it("returns fail when any hard violation exists", () => {
      const result = mapLintReportToResult([
        { rule: "R2", severity: "hard", evidence: "no camera" },
        { rule: "R14", severity: "warn", evidence: "minor" },
      ]);
      expect(result.status).toBe("fail");
      expect(result.violations).toHaveLength(2);
    });

    it("returns warn for warn-only violations", () => {
      const result = mapLintReportToResult([
        { rule: "R14", severity: "warn", evidence: "minor" },
      ]);
      expect(result.status).toBe("warn");
    });
  });

  describe("mapApiRunToViewerRun", () => {
    it("maps metadata and template name", () => {
      const run = mapApiRunToViewerRun(apiRun);
      expect(run.id).toBe("run-1");
      expect(run.templateId).toBe("tpl-1");
      expect(run.templateName).toBe("Master of Puppets");
      expect(run.model).toBe("claude-sonnet-4-20250514");
      expect(run.status).toBe("done");
      expect(run.sceneCount).toBe(2);
      expect(run.duration).toBe(165000);
    });

    it("maps scene fields to viewer shape with 1-based display index", () => {
      const run = mapApiRunToViewerRun(apiRun);
      expect(run.scenes[0]).toMatchObject({
        id: "scene-1",
        index: 1,
        lyrics: "Line one\nLine two",
        imagePrompt: "Image prompt text",
        videoStart: "Start prompt",
        videoMiddle: "Middle prompt",
        videoEnd: "End prompt",
        notes: "",
      });
      expect(run.scenes[0].boundaryFrames.start.description).toBe("BF1 exact frame");
      expect(run.scenes[0].boundaryFrames.end.description).toBe("BF2 exact frame");
      expect(run.scenes[0].lintResult.status).toBe("pass");
      expect(run.scenes[1].index).toBe(2);
    });

    it("maps failed status", () => {
      const run = mapApiRunToViewerRun({ ...apiRun, status: "FAILED" });
      expect(run.status).toBe("failed");
    });
  });

  describe("mapApiRunToLibraryItem", () => {
    it("maps list payload with _count and first-scene preview", () => {
      const item = mapApiRunToLibraryItem({
        id: "run-1",
        templateId: "tpl-1",
        status: "DONE",
        model: "deepseek-chat",
        createdAt: "2026-07-14T10:00:00.000Z",
        template: { id: "tpl-1", name: "Master of Puppets" },
        scenes: [
          {
            id: "s1",
            index: 0,
            lyrics: "Preview lyrics",
            imagePrompt: "Preview image",
            startPrompt: "",
            middlePrompt: "",
            endPrompt: "",
            boundaryFrame1: "",
            boundaryFrame2: "",
          },
        ],
        _count: { scenes: 5 },
      });

      expect(item.templateName).toBe("Master of Puppets");
      expect(item.sceneCount).toBe(5);
      expect(item.previewLyrics).toBe("Preview lyrics");
      expect(item.model).toBe("deepseek-chat");
      expect(item.status).toBe("DONE");
    });
  });

  it("falls back template name when template missing", () => {
    const run = mapApiRunToViewerRun({ ...apiRun, template: undefined });
    expect(run.templateName).toBe("Untitled");
  });
});
