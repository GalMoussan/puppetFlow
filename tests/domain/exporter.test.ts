/**
 * Tests for Domain Exporter Module
 *
 * Per blueprint Section 6, Phase 1.7:
 * - Snapshot test: Output matches scheduled task file format exactly
 * - Fixture: Real past output file as golden fixture
 * - Round-trip: Parse exported markdown back to structured data
 * - Empty notes: Notes section omitted when null/empty
 * - Metadata frontmatter: YAML valid when metadata provided
 */

import { describe, it, expect } from "vitest";

// These imports will fail until implementation exists - that's expected (RED phase)
import {
  exportBatch,
  exportScaffold,
  formatComboChips,
  formatLyricsBlock,
  formatPromptSection,
  formatBoundaryFrameCallout,
  formatMetadataFrontmatter,
  parseExportedMarkdown,
  type ExportMetadata,
} from "@/packages/domain/exporter";

import { type Scene, type BatchOutput, type ComboAssignment } from "@/packages/domain/types";

import { createMinimalScene, createMinimalBatch } from "./helpers";

// Sample export metadata for testing
const SAMPLE_METADATA: ExportMetadata = {
  runId: "run-20240315-001",
  model: "claude-sonnet-4-6",
  loopMode: false,
  generatedAt: new Date("2024-03-15T14:30:00Z"),
};

// Sample combo for testing
const SAMPLE_COMBO: ComboAssignment = {
  stageArea: "Main Stage",
  festivalMoment: "Sunset Arrival",
  dynamic: "Synchronized dance",
  visual: "Neon glowing strings",
  hook: "String explosion",
  gag: "Strings tangle",
  camera: { start: "dolly", middle: "pan", end: "crane up" },
  payoff: "Crowd chant sync",
  chaosThread: "Rogue balloon",
  language: "hi",
  subgenre: "psycore",
};

// Sample scene for testing
function createDetailedScene(index: number): Scene {
  return {
    id: `scene-${index}`,
    runId: "run-20240315-001",
    index,
    combo: SAMPLE_COMBO,
    lyrics: `[Intro]
Festival energy rises under purple skies...

[Build]
The crowd anticipates the drop...

[Pre-Drop]
Tension building higher...

[Drop]
Shika! Shika! Shilshul! Shilshul!
The bass explodes through the speakers!

[Outro]
Energy slowly fades as dawn approaches...`,
    imagePrompt: `Grand festival stage bathed in UV purple lighting. Two puppet characters, Shika and Shilshul, stand ready center stage. The mainstage towers behind them with psychedelic visuals projected onto massive LED screens. Dense crowd silhouettes visible in foreground.

CRITICAL CHARACTER LOCK - SHIKA:
Shika is a humanoid puppet with orange fur, large expressive eyes, and visible string connections at joints. Height approximately 1.5 meters. Always shows marionette control bars above.

CRITICAL CHARACTER LOCK - SHILSHUL:
Shilshul is a humanoid puppet with blue fur, matching expressive eyes, complementary design to Shika. Same visible string mechanism and control aesthetic.

This frame serves as a loop anchor for seamless video looping.`,
    startPrompt: `[00:00] [HOOK] Shika explodes onto stage left, strings blazing with intense neon purple light. The crowd surges forward in anticipation. [00:04] Camera dollies dramatically backward to capture the full spectacle as Shilshul emerges from shadow. [00:08] Both puppets freeze mid-pose, strings taut. Keep same UV purple lighting, same character appearance, same string tension throughout. Audio: crowd roar building to crescendo, no dialogue. ENDING FRAME [EXACT]: Shika stage-left, strings taut at 45-degree angle, mouth agape in mid-laugh, Shilshul stage-right with one arm raised, confetti frozen mid-air, camera at medium-wide, UV purple lighting from overhead, crowd silhouettes visible.`,
    middlePrompt: `Continue directly from the final frame of the previous clip: Shika stage-left, strings taut at 45-degree angle, mouth agape in mid-laugh, Shilshul stage-right with one arm raised, confetti frozen mid-air, camera at medium-wide, UV purple lighting from overhead, crowd silhouettes visible. [00:00] Shika's strings surge upward as both puppets resume their synchronized dance. Camera pans smoothly left to capture the energy. [00:04] Festival atmosphere builds as pyrotechnics pulse overhead. Keep same UV purple lighting, same character appearance, same string positions. Audio: synth pulse building, no dialogue. ENDING FRAME [EXACT]: Both puppets centered stage, arms extended outward in unison, strings gleaming under festival lights, UV purple lighting overhead, crowd energy visible.`,
    endPrompt: `Continue directly from the final frame of the previous clip: Both puppets centered stage, arms extended outward in unison, strings gleaming under festival lights, UV purple lighting overhead, crowd energy visible. [00:00] Energy builds to climactic moment. Camera cranes up dramatically. [00:04] Anticipation peaks as both puppets prepare. [00:08] [DROP] Both puppets explode into synchronized movement, strings blazing! Final pose mirrors the opening composition. Keep same UV purple lighting. Audio: bass drop impact with crowd roar, no dialogue. ENDING FRAME [EXACT]: Peak energy frozen tableau, both puppets in triumphant pose, strings at maximum extension.`,
    boundaryFrame1:
      "Shika stage-left, strings taut at 45-degree angle, mouth agape in mid-laugh, Shilshul stage-right with one arm raised, confetti frozen mid-air, camera at medium-wide, UV purple lighting from overhead, crowd silhouettes visible.",
    boundaryFrame2:
      "Both puppets centered stage, arms extended outward in unison, strings gleaming under festival lights, UV purple lighting overhead, crowd energy visible.",
    finalFrame: "Peak energy frozen tableau, both puppets in triumphant pose, strings at maximum extension.",
    lintReport: [],
    notes: null,
  };
}

describe("exporter", () => {
  describe("exportBatch", () => {
    describe("basic functionality", () => {
      it("returns complete markdown document as string", () => {
        const scenes = createMinimalBatch();
        const runDate = new Date("2024-03-15");

        const result = exportBatch(scenes, runDate);

        expect(typeof result).toBe("string");
        expect(result.length).toBeGreaterThan(0);
      });

      it("is pure function with deterministic output", () => {
        const scenes = createMinimalBatch();
        const runDate = new Date("2024-03-15");

        const result1 = exportBatch(scenes, runDate);
        const result2 = exportBatch(scenes, runDate);

        expect(result1).toBe(result2);
      });
    });

    describe("header format", () => {
      it("includes date header in correct format", () => {
        const scenes = createMinimalBatch();
        const runDate = new Date("2024-03-15");

        const result = exportBatch(scenes, runDate);

        expect(result).toContain("# Scenes for 2024-03-15");
      });

      it("handles different dates correctly", () => {
        const scenes = createMinimalBatch();
        const runDate = new Date("2025-01-01");

        const result = exportBatch(scenes, runDate);

        expect(result).toContain("# Scenes for 2025-01-01");
      });
    });

    describe("scene structure", () => {
      it("numbers scenes starting from 1", () => {
        const scenes = createMinimalBatch();
        const runDate = new Date("2024-03-15");

        const result = exportBatch(scenes, runDate);

        expect(result).toContain("## Scene 1");
        expect(result).toContain("## Scene 2");
        expect(result).toContain("## Scene 3");
        expect(result).toContain("## Scene 4");
        expect(result).toContain("## Scene 5");
      });

      it("includes horizontal rule separator between scenes", () => {
        const scenes = [createDetailedScene(1), createDetailedScene(2)];
        const runDate = new Date("2024-03-15");

        const result = exportBatch(scenes, runDate);

        expect(result).toMatch(/---\n+## Scene 2/);
      });

      it("includes all scene sections in correct order", () => {
        const scenes = [createDetailedScene(1)];
        const runDate = new Date("2024-03-15");

        const result = exportBatch(scenes, runDate);

        // Check order by finding positions
        const comboPos = result.indexOf("**Stage:**");
        const lyricsPos = result.indexOf("### Lyrics");
        const imagePos = result.indexOf("### IMAGE Prompt");
        const videoStartPos = result.indexOf("### VIDEO_START Prompt");
        const boundary1Pos = result.indexOf("Boundary Frame (START");
        const extendMiddlePos = result.indexOf("### EXTEND_MIDDLE Prompt");
        const boundary2Pos = result.indexOf("Boundary Frame (MIDDLE");
        const extendEndPos = result.indexOf("### EXTEND_END Prompt");
        const finalFramePos = result.indexOf("**Final Frame:**");

        expect(comboPos).toBeLessThan(lyricsPos);
        expect(lyricsPos).toBeLessThan(imagePos);
        expect(imagePos).toBeLessThan(videoStartPos);
        expect(videoStartPos).toBeLessThan(boundary1Pos);
        expect(boundary1Pos).toBeLessThan(extendMiddlePos);
        expect(extendMiddlePos).toBeLessThan(boundary2Pos);
        expect(boundary2Pos).toBeLessThan(extendEndPos);
        expect(extendEndPos).toBeLessThan(finalFramePos);
      });
    });

    describe("combo chips format", () => {
      it("displays combo values as inline badges", () => {
        const scenes = [createDetailedScene(1)];
        const runDate = new Date("2024-03-15");

        const result = exportBatch(scenes, runDate);

        expect(result).toContain("**Stage:** Main Stage");
        expect(result).toContain("**Moment:** Sunset Arrival");
        expect(result).toContain("**Dynamic:** Synchronized dance");
      });

      it("includes all axis values", () => {
        const scenes = [createDetailedScene(1)];
        const runDate = new Date("2024-03-15");

        const result = exportBatch(scenes, runDate);

        expect(result).toContain("Main Stage");
        expect(result).toContain("Sunset Arrival");
        expect(result).toContain("Synchronized dance");
        expect(result).toContain("Neon glowing strings");
        expect(result).toContain("String explosion");
        expect(result).toContain("psycore");
      });

      it("shows language as code (hi/ja)", () => {
        const scenes = [createDetailedScene(1)];
        const runDate = new Date("2024-03-15");

        const result = exportBatch(scenes, runDate);

        expect(result).toContain("hi");
        // Should not contain full name
        expect(result).not.toContain("Hindi");
      });
    });

    describe("lyrics block format", () => {
      it("uses lyrics language tag for code fence", () => {
        const scenes = [createDetailedScene(1)];
        const runDate = new Date("2024-03-15");

        const result = exportBatch(scenes, runDate);

        expect(result).toContain("```lyrics");
        expect(result).toContain("```\n");
      });

      it("preserves section markers", () => {
        const scenes = [createDetailedScene(1)];
        const runDate = new Date("2024-03-15");

        const result = exportBatch(scenes, runDate);

        expect(result).toContain("[Intro]");
        expect(result).toContain("[Build]");
        expect(result).toContain("[Pre-Drop]");
        expect(result).toContain("[Drop]");
        expect(result).toContain("[Outro]");
      });

      it("includes chant in Drop section", () => {
        const scenes = [createDetailedScene(1)];
        const runDate = new Date("2024-03-15");

        const result = exportBatch(scenes, runDate);

        expect(result).toContain("Shika! Shika! Shilshul! Shilshul!");
      });
    });

    describe("prompt sections", () => {
      it("includes IMAGE prompt section", () => {
        const scenes = [createDetailedScene(1)];
        const runDate = new Date("2024-03-15");

        const result = exportBatch(scenes, runDate);

        expect(result).toContain("### IMAGE Prompt");
        expect(result).toContain("Grand festival stage bathed in UV purple lighting");
      });

      it("includes VIDEO_START prompt section", () => {
        const scenes = [createDetailedScene(1)];
        const runDate = new Date("2024-03-15");

        const result = exportBatch(scenes, runDate);

        expect(result).toContain("### VIDEO_START Prompt");
        expect(result).toContain("[00:00] [HOOK]");
      });

      it("includes EXTEND_MIDDLE prompt section", () => {
        const scenes = [createDetailedScene(1)];
        const runDate = new Date("2024-03-15");

        const result = exportBatch(scenes, runDate);

        expect(result).toContain("### EXTEND_MIDDLE Prompt");
        expect(result).toContain("Continue directly from the final frame");
      });

      it("includes EXTEND_END prompt section", () => {
        const scenes = [createDetailedScene(1)];
        const runDate = new Date("2024-03-15");

        const result = exportBatch(scenes, runDate);

        expect(result).toContain("### EXTEND_END Prompt");
        expect(result).toContain("[DROP]");
      });

      it("preserves full prompt text without truncation", () => {
        const scenes = [createDetailedScene(1)];
        const runDate = new Date("2024-03-15");

        const result = exportBatch(scenes, runDate);

        // Check for specific text from the detailed scene
        expect(result).toContain("CRITICAL CHARACTER LOCK - SHIKA");
        expect(result).toContain("CRITICAL CHARACTER LOCK - SHILSHUL");
        expect(result).toContain("ENDING FRAME [EXACT]:");
      });

      it("preserves internal formatting (newlines)", () => {
        const scenes = [createDetailedScene(1)];
        const runDate = new Date("2024-03-15");

        const result = exportBatch(scenes, runDate);

        // The IMAGE prompt has multiple paragraphs
        expect(result).toContain("Grand festival stage");
        expect(result).toContain("\n\nCRITICAL CHARACTER LOCK");
      });
    });

    describe("boundary frame callouts", () => {
      it("formats boundary frames as blockquotes", () => {
        const scenes = [createDetailedScene(1)];
        const runDate = new Date("2024-03-15");

        const result = exportBatch(scenes, runDate);

        expect(result).toContain("> **Boundary Frame (START");
        expect(result).toContain("> **Boundary Frame (MIDDLE");
      });

      it("includes transition labels", () => {
        const scenes = [createDetailedScene(1)];
        const runDate = new Date("2024-03-15");

        const result = exportBatch(scenes, runDate);

        expect(result).toContain("(START");
        expect(result).toContain("MIDDLE)");
      });

      it("includes final frame callout", () => {
        const scenes = [createDetailedScene(1)];
        const runDate = new Date("2024-03-15");

        const result = exportBatch(scenes, runDate);

        expect(result).toContain("**Final Frame:**");
        expect(result).toContain("Peak energy frozen tableau");
      });
    });

    describe("notes section", () => {
      it("omits notes section when notes is null", () => {
        const scene = createDetailedScene(1);
        scene.notes = null;
        const scenes = [scene];
        const runDate = new Date("2024-03-15");

        const result = exportBatch(scenes, runDate);

        expect(result).not.toContain("### Notes");
      });

      it("omits notes section when notes is empty string", () => {
        const scene = createDetailedScene(1);
        scene.notes = "";
        const scenes = [scene];
        const runDate = new Date("2024-03-15");

        const result = exportBatch(scenes, runDate);

        expect(result).not.toContain("### Notes");
      });

      it("includes notes section when notes has content", () => {
        const scene = createDetailedScene(1);
        scene.notes = "Producer requested more energy in hook section.";
        const scenes = [scene];
        const runDate = new Date("2024-03-15");

        const result = exportBatch(scenes, runDate);

        expect(result).toContain("### Notes");
        expect(result).toContain("Producer requested more energy");
      });
    });

    describe("metadata handling", () => {
      it("includes YAML frontmatter when metadata provided", () => {
        const scenes = createMinimalBatch();
        const runDate = new Date("2024-03-15");

        const result = exportBatch(scenes, runDate, SAMPLE_METADATA);

        expect(result.startsWith("---\n")).toBe(true);
        expect(result).toContain("runId:");
        expect(result).toContain("model:");
      });

      it("omits frontmatter when metadata not provided", () => {
        const scenes = createMinimalBatch();
        const runDate = new Date("2024-03-15");

        const result = exportBatch(scenes, runDate);

        expect(result.startsWith("---\n")).toBe(false);
        expect(result.startsWith("# Scenes for")).toBe(true);
      });

      it("includes all metadata fields in frontmatter", () => {
        const scenes = createMinimalBatch();
        const runDate = new Date("2024-03-15");

        const result = exportBatch(scenes, runDate, SAMPLE_METADATA);

        expect(result).toContain("runId: run-20240315-001");
        expect(result).toContain("model: claude-sonnet-4-6");
        expect(result).toContain("loopMode: false");
        expect(result).toContain("generatedAt:");
      });
    });

    describe("compatibility requirements", () => {
      it("uses LF line endings (Unix style)", () => {
        const scenes = createMinimalBatch();
        const runDate = new Date("2024-03-15");

        const result = exportBatch(scenes, runDate);

        expect(result).not.toContain("\r\n");
        expect(result).toContain("\n");
      });

      it("has no trailing whitespace on lines", () => {
        const scenes = [createDetailedScene(1)];
        const runDate = new Date("2024-03-15");

        const result = exportBatch(scenes, runDate);

        const lines = result.split("\n");
        for (const line of lines) {
          // Empty lines are okay, but lines with content shouldn't have trailing spaces
          if (line.length > 0) {
            expect(line).toBe(line.trimEnd());
          }
        }
      });

      it("ends with single newline", () => {
        const scenes = createMinimalBatch();
        const runDate = new Date("2024-03-15");

        const result = exportBatch(scenes, runDate);

        expect(result.endsWith("\n")).toBe(true);
        expect(result.endsWith("\n\n")).toBe(false);
      });
    });
  });

  describe("exportScaffold", () => {
    it("exports scaffold string with metadata", () => {
      const scaffold = `# Scaffold for Master of Puppets

## Theme Pack Canon
Festival name: PuppetFest 2024
...rest of scaffold...`;

      const result = exportScaffold(scaffold, SAMPLE_METADATA);

      expect(result).toContain("---\n");
      expect(result).toContain("runId:");
      expect(result).toContain(scaffold);
    });

    it("exports scaffold without metadata", () => {
      const scaffold = `# Scaffold content here`;

      const result = exportScaffold(scaffold);

      expect(result.startsWith("---")).toBe(false);
      expect(result).toBe(scaffold + "\n");
    });

    it("is deterministic", () => {
      const scaffold = "Test scaffold content";

      const result1 = exportScaffold(scaffold, SAMPLE_METADATA);
      const result2 = exportScaffold(scaffold, SAMPLE_METADATA);

      expect(result1).toBe(result2);
    });

    it("ends with single newline", () => {
      const scaffold = "Scaffold content";

      const result = exportScaffold(scaffold);

      expect(result.endsWith("\n")).toBe(true);
      expect(result.endsWith("\n\n")).toBe(false);
    });
  });

  describe("formatComboChips", () => {
    it("formats combo as inline badges", () => {
      const result = formatComboChips(SAMPLE_COMBO);

      expect(result).toContain("**Stage:** Main Stage");
      expect(result).toContain("**Moment:** Sunset Arrival");
    });

    it("separates chips with pipe character", () => {
      const result = formatComboChips(SAMPLE_COMBO);

      expect(result).toContain("|");
    });

    it("includes camera moves", () => {
      const result = formatComboChips(SAMPLE_COMBO);

      expect(result).toContain("dolly");
      expect(result).toContain("pan");
      expect(result).toContain("crane up");
    });
  });

  describe("formatLyricsBlock", () => {
    it("wraps lyrics in code fence with lyrics tag", () => {
      const lyrics = "[Intro]\nTest lyrics here";

      const result = formatLyricsBlock(lyrics);

      expect(result).toContain("```lyrics\n");
      expect(result).toContain("\n```");
    });

    it("includes section header", () => {
      const lyrics = "[Drop]\nShika!";

      const result = formatLyricsBlock(lyrics);

      expect(result).toContain("### Lyrics");
    });

    it("preserves lyrics content exactly", () => {
      const lyrics = `[Intro]
First line
Second line

[Build]
More lines`;

      const result = formatLyricsBlock(lyrics);

      expect(result).toContain(lyrics);
    });
  });

  describe("formatPromptSection", () => {
    it("formats with correct header", () => {
      const prompt = "Test prompt content";
      const stage = "IMAGE";

      const result = formatPromptSection(stage, prompt);

      expect(result).toContain("### IMAGE Prompt");
      expect(result).toContain("Test prompt content");
    });

    it("handles VIDEO_START header", () => {
      const prompt = "[00:00] Action";
      const stage = "VIDEO_START";

      const result = formatPromptSection(stage, prompt);

      expect(result).toContain("### VIDEO_START Prompt");
    });

    it("handles EXTEND_MIDDLE header", () => {
      const prompt = "Continue from previous";
      const stage = "EXTEND_MIDDLE";

      const result = formatPromptSection(stage, prompt);

      expect(result).toContain("### EXTEND_MIDDLE Prompt");
    });

    it("handles EXTEND_END header", () => {
      const prompt = "[DROP] Final moment";
      const stage = "EXTEND_END";

      const result = formatPromptSection(stage, prompt);

      expect(result).toContain("### EXTEND_END Prompt");
    });
  });

  describe("formatBoundaryFrameCallout", () => {
    it("formats as blockquote with header", () => {
      const frame = "Shika frozen mid-pose";
      const transition = "START -> MIDDLE";

      const result = formatBoundaryFrameCallout(transition, frame);

      expect(result).toContain("> **Boundary Frame");
      expect(result).toContain("START");
      expect(result).toContain("MIDDLE");
    });

    it("includes frame content", () => {
      const frame = "Detailed frame description here";
      const transition = "MIDDLE -> END";

      const result = formatBoundaryFrameCallout(transition, frame);

      expect(result).toContain("Detailed frame description here");
    });
  });

  describe("formatMetadataFrontmatter", () => {
    it("formats as YAML frontmatter", () => {
      const result = formatMetadataFrontmatter(SAMPLE_METADATA);

      expect(result.startsWith("---\n")).toBe(true);
      expect(result.endsWith("---\n")).toBe(true);
    });

    it("includes all metadata fields", () => {
      const result = formatMetadataFrontmatter(SAMPLE_METADATA);

      expect(result).toContain("runId:");
      expect(result).toContain("model:");
      expect(result).toContain("loopMode:");
      expect(result).toContain("generatedAt:");
    });

    it("produces valid YAML", () => {
      const result = formatMetadataFrontmatter(SAMPLE_METADATA);

      // Basic YAML validity checks
      expect(result).toMatch(/^---\n/);
      expect(result).toMatch(/---\n$/);
      expect(result).toMatch(/\w+:\s+\S+/); // key: value pattern
    });

    it("quotes string values appropriately", () => {
      const metadata: ExportMetadata = {
        ...SAMPLE_METADATA,
        runId: "run-with-special-chars: test",
      };

      const result = formatMetadataFrontmatter(metadata);

      // Should handle special characters in values
      expect(result).toContain("runId:");
    });
  });

  describe("edge cases", () => {
    it("handles single scene batch", () => {
      const scenes = [createDetailedScene(1)];
      const runDate = new Date("2024-03-15");

      const result = exportBatch(scenes, runDate);

      expect(result).toContain("## Scene 1");
      expect(result).not.toContain("## Scene 2");
    });

    it("handles 10 scene batch", () => {
      const scenes = Array.from({ length: 10 }, (_, i) => createMinimalScene(i + 1));
      const runDate = new Date("2024-03-15");

      const result = exportBatch(scenes, runDate);

      expect(result).toContain("## Scene 10");
    });

    it("handles empty lyrics", () => {
      const scene = createDetailedScene(1);
      scene.lyrics = "";
      const scenes = [scene];
      const runDate = new Date("2024-03-15");

      const result = exportBatch(scenes, runDate);

      // Should still have lyrics section header
      expect(result).toContain("### Lyrics");
    });

    it("handles special characters in prompts", () => {
      const scene = createDetailedScene(1);
      scene.imagePrompt = "Scene with <angle brackets> & ampersands and \"quotes\"";
      const scenes = [scene];
      const runDate = new Date("2024-03-15");

      const result = exportBatch(scenes, runDate);

      expect(result).toContain("<angle brackets>");
      expect(result).toContain("&");
      expect(result).toContain('"quotes"');
    });

    it("handles unicode in content", () => {
      const scene = createDetailedScene(1);
      scene.notes = "Unicode test: cafe emoji: test";
      const scenes = [scene];
      const runDate = new Date("2024-03-15");

      const result = exportBatch(scenes, runDate);

      expect(result).toContain("cafe");
    });

    it("handles very long prompt text", () => {
      const scene = createDetailedScene(1);
      scene.imagePrompt = "A".repeat(5000); // 5000 character prompt
      const scenes = [scene];
      const runDate = new Date("2024-03-15");

      const result = exportBatch(scenes, runDate);

      expect(result).toContain("A".repeat(5000));
    });
  });

  describe("snapshot consistency", () => {
    // These tests ensure the format remains stable
    it("scene section structure is consistent", () => {
      const scene = createDetailedScene(1);
      const scenes = [scene];
      const runDate = new Date("2024-03-15");

      const result = exportBatch(scenes, runDate);

      // Check for expected structure elements
      const expectedElements = [
        "## Scene 1",
        "**Stage:**",
        "### Lyrics",
        "### IMAGE Prompt",
        "### VIDEO_START Prompt",
        "**Boundary Frame (START",
        "### EXTEND_MIDDLE Prompt",
        "**Boundary Frame (MIDDLE",
        "### EXTEND_END Prompt",
        "**Final Frame:**",
      ];

      for (const element of expectedElements) {
        expect(result).toContain(element);
      }
    });

    it("metadata frontmatter structure is consistent", () => {
      const scenes = createMinimalBatch();
      const runDate = new Date("2024-03-15");

      const result = exportBatch(scenes, runDate, SAMPLE_METADATA);

      // Check frontmatter is before content
      const frontmatterEnd = result.indexOf("---\n", 4); // Skip opening ---
      const contentStart = result.indexOf("# Scenes for");

      expect(frontmatterEnd).toBeLessThan(contentStart);
    });
  });

  describe("parseExportedMarkdown", () => {
    it("parses frontmatter from exported markdown", () => {
      const markdown = `---
runId: "test-run-123"
model: "test-model"
loopMode: true
generatedAt: 2024-03-15T00:00:00.000Z
---

# Scenes for 2024-03-15

## Scene 1

Content here

## Scene 2

More content
`;

      const result = parseExportedMarkdown(markdown);

      expect(result.metadata?.runId).toBe("test-run-123");
      expect(result.metadata?.model).toBe("test-model");
      expect(result.metadata?.loopMode).toBe(true);
      expect(result.sceneCount).toBe(2);
    });

    it("counts scenes correctly", () => {
      const markdown = `---
runId: "test"
---

## Scene 1
Content

## Scene 2
Content

## Scene 3
Content
`;

      const result = parseExportedMarkdown(markdown);
      expect(result.sceneCount).toBe(3);
    });

    it("handles markdown without frontmatter", () => {
      const markdown = `# Scenes

## Scene 1
Content
`;

      const result = parseExportedMarkdown(markdown);
      expect(result.metadata).toBeUndefined();
      expect(result.sceneCount).toBe(1);
    });

    it("handles markdown without scenes", () => {
      const markdown = `# Just a title

Some content without scene markers
`;

      const result = parseExportedMarkdown(markdown);
      expect(result.sceneCount).toBe(0);
    });
  });

  describe("YAML escaping edge cases", () => {
    it("escapes values starting with special characters", () => {
      const metadata: ExportMetadata = {
        runId: "-starts-with-hyphen",
        model: "test",
        loopMode: false,
        generatedAt: new Date("2024-03-15"),
      };

      const result = formatMetadataFrontmatter(metadata);

      // Value starting with - should be quoted
      expect(result).toContain('runId: "-starts-with-hyphen"');
    });

    it("escapes values containing colon-space", () => {
      const metadata: ExportMetadata = {
        runId: "id: with colon",
        model: "test",
        loopMode: false,
        generatedAt: new Date("2024-03-15"),
      };

      const result = formatMetadataFrontmatter(metadata);

      // Value with ": " should be quoted
      expect(result).toContain('runId: "id: with colon"');
    });

    it("escapes values containing newlines", () => {
      const metadata: ExportMetadata = {
        runId: "id\nwith\nnewlines",
        model: "test",
        loopMode: false,
        generatedAt: new Date("2024-03-15"),
      };

      const result = formatMetadataFrontmatter(metadata);

      // Value with newlines should be quoted
      expect(result).toContain('"id');
    });
  });
});
