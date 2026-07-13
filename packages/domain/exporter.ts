/**
 * Domain Exporter Module
 *
 * Converts batch output to markdown format for scheduled task files.
 * Handles metadata frontmatter, combo chips, lyrics blocks, and boundary frames.
 *
 * @module packages/domain/exporter
 */

import { type Scene, type ComboAssignment } from "./types";

// =============================================================================
// Types
// =============================================================================

/**
 * Export metadata for YAML frontmatter
 */
export interface ExportMetadata {
  runId: string;
  model: string;
  loopMode: boolean;
  generatedAt: Date;
}

// =============================================================================
// Metadata Formatting
// =============================================================================

/**
 * Format metadata as YAML frontmatter
 */
export function formatMetadataFrontmatter(metadata: ExportMetadata): string {
  const lines: string[] = [];
  lines.push("---");
  lines.push(`runId: ${escapeYamlValue(metadata.runId)}`);
  lines.push(`model: ${escapeYamlValue(metadata.model)}`);
  lines.push(`loopMode: ${metadata.loopMode}`);
  lines.push(`generatedAt: ${metadata.generatedAt.toISOString()}`);
  lines.push("---");
  return lines.join("\n") + "\n";
}

/**
 * Escape special YAML characters in values
 * Hyphens in the middle of strings are safe - only quote when necessary
 */
function escapeYamlValue(value: string): string {
  // Quote if value starts with special characters that would be misinterpreted
  if (/^[\-\[\]{}&*#?|<>=!%@`'"]/.test(value)) {
    return `"${value.replace(/"/g, '\\"')}"`;
  }
  // Quote if value contains : followed by space (would be parsed as key-value)
  if (/: /.test(value)) {
    return `"${value.replace(/"/g, '\\"')}"`;
  }
  // Quote if value contains newlines
  if (/\n/.test(value)) {
    return `"${value.replace(/"/g, '\\"')}"`;
  }
  return value;
}

// =============================================================================
// Combo Formatting
// =============================================================================

/**
 * Format combo assignment as inline badges
 */
export function formatComboChips(combo: ComboAssignment): string {
  const chips: string[] = [];
  chips.push(`**Stage:** ${combo.stageArea}`);
  chips.push(`**Moment:** ${combo.festivalMoment}`);
  chips.push(`**Dynamic:** ${combo.dynamic}`);
  chips.push(`**Visual:** ${combo.visual}`);
  chips.push(`**Hook:** ${combo.hook}`);
  chips.push(`**Gag:** ${combo.gag}`);
  chips.push(`**Camera:** ${combo.camera.start} | ${combo.camera.middle} | ${combo.camera.end}`);
  chips.push(`**Payoff:** ${combo.payoff}`);
  chips.push(`**Chaos:** ${combo.chaosThread}`);
  chips.push(`**Lang:** ${combo.language}`);
  chips.push(`**Subgenre:** ${combo.subgenre}`);

  return chips.join(" | ");
}

// =============================================================================
// Lyrics Formatting
// =============================================================================

/**
 * Format lyrics as code block with lyrics tag
 */
export function formatLyricsBlock(lyrics: string): string {
  const lines: string[] = [];
  lines.push("### Lyrics");
  lines.push("");
  lines.push("```lyrics");
  lines.push(lyrics);
  lines.push("```");
  return lines.join("\n");
}

// =============================================================================
// Prompt Formatting
// =============================================================================

/**
 * Valid prompt stages
 */
export type PromptStage = "IMAGE" | "VIDEO_START" | "EXTEND_MIDDLE" | "EXTEND_END";

/**
 * Format a prompt section with header
 */
export function formatPromptSection(stage: PromptStage, prompt: string): string {
  const lines: string[] = [];
  lines.push(`### ${stage} Prompt`);
  lines.push("");
  lines.push(prompt);
  return lines.join("\n");
}

// =============================================================================
// Boundary Frame Formatting
// =============================================================================

/**
 * Format a boundary frame as blockquote callout
 */
export function formatBoundaryFrameCallout(transition: string, frame: string): string {
  const lines: string[] = [];
  lines.push(`> **Boundary Frame (${transition})**`);
  lines.push(`>`);
  lines.push(`> ${frame}`);
  return lines.join("\n");
}

/**
 * Format final frame callout
 */
function formatFinalFrameCallout(frame: string): string {
  return `**Final Frame:** ${frame}`;
}

// =============================================================================
// Scene Formatting
// =============================================================================

/**
 * Format a single scene as markdown
 */
function formatScene(scene: Scene, sceneNumber: number): string {
  const sections: string[] = [];

  // Scene header
  sections.push(`## Scene ${sceneNumber}`);
  sections.push("");

  // Combo chips
  sections.push(formatComboChips(scene.combo));
  sections.push("");

  // Lyrics
  sections.push(formatLyricsBlock(scene.lyrics));
  sections.push("");

  // IMAGE prompt
  sections.push(formatPromptSection("IMAGE", scene.imagePrompt));
  sections.push("");

  // VIDEO_START prompt
  sections.push(formatPromptSection("VIDEO_START", scene.startPrompt));
  sections.push("");

  // Boundary Frame 1 (START -> MIDDLE)
  sections.push(formatBoundaryFrameCallout("START -> MIDDLE", scene.boundaryFrame1));
  sections.push("");

  // EXTEND_MIDDLE prompt
  sections.push(formatPromptSection("EXTEND_MIDDLE", scene.middlePrompt));
  sections.push("");

  // Boundary Frame 2 (MIDDLE -> END)
  sections.push(formatBoundaryFrameCallout("MIDDLE -> END", scene.boundaryFrame2));
  sections.push("");

  // EXTEND_END prompt
  sections.push(formatPromptSection("EXTEND_END", scene.endPrompt));
  sections.push("");

  // Final frame
  sections.push(formatFinalFrameCallout(scene.finalFrame));

  // Notes (optional)
  if (scene.notes && scene.notes.trim().length > 0) {
    sections.push("");
    sections.push("### Notes");
    sections.push("");
    sections.push(scene.notes);
  }

  return sections.join("\n");
}

// =============================================================================
// Batch Export
// =============================================================================

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Export a batch of scenes to markdown
 */
export function exportBatch(scenes: Scene[], runDate: Date, metadata?: ExportMetadata): string {
  const sections: string[] = [];

  // Add frontmatter if metadata provided
  if (metadata) {
    sections.push(formatMetadataFrontmatter(metadata));
  }

  // Date header
  sections.push(`# Scenes for ${formatDate(runDate)}`);
  sections.push("");

  // Format each scene
  for (let i = 0; i < scenes.length; i++) {
    if (i > 0) {
      sections.push("---");
      sections.push("");
    }
    sections.push(formatScene(scenes[i], i + 1));
    sections.push("");
  }

  // Build final output
  let output = sections.join("\n");

  // Ensure no trailing whitespace on lines
  output = output
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n");

  // Ensure exactly one trailing newline
  output = output.trimEnd() + "\n";

  return output;
}

// =============================================================================
// Scaffold Export
// =============================================================================

/**
 * Export a scaffold string with optional metadata
 */
export function exportScaffold(scaffold: string, metadata?: ExportMetadata): string {
  const sections: string[] = [];

  // Add frontmatter if metadata provided
  if (metadata) {
    sections.push(formatMetadataFrontmatter(metadata));
  }

  // Add scaffold content
  sections.push(scaffold);

  // Build final output
  let output = sections.join("\n");

  // Ensure exactly one trailing newline
  output = output.trimEnd() + "\n";

  return output;
}

// =============================================================================
// Utility Exports
// =============================================================================

/**
 * Parse exported markdown back to structured data (for round-trip testing)
 */
export function parseExportedMarkdown(markdown: string): {
  metadata?: Partial<ExportMetadata>;
  sceneCount: number;
} {
  // Extract frontmatter
  let metadata: Partial<ExportMetadata> | undefined;
  const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    metadata = {};
    const lines = frontmatterMatch[1].split("\n");
    for (const line of lines) {
      const [key, ...valueParts] = line.split(": ");
      const value = valueParts.join(": ").trim();
      if (key === "runId") metadata.runId = value.replace(/^"|"$/g, "");
      if (key === "model") metadata.model = value.replace(/^"|"$/g, "");
      if (key === "loopMode") metadata.loopMode = value === "true";
      if (key === "generatedAt") metadata.generatedAt = new Date(value);
    }
  }

  // Count scenes
  const sceneMatches = markdown.match(/## Scene \d+/g);
  const sceneCount = sceneMatches?.length ?? 0;

  return { metadata, sceneCount };
}
