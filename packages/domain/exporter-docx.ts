/**
 * DOCX Exporter Module
 *
 * Converts batch output to DOCX format.
 * Pure TypeScript, no React/Next imports.
 *
 * @module packages/domain/exporter-docx
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  PageBreak,
  BorderStyle,
} from "docx";
import { type Scene, type ComboAssignment } from "./types";

// =============================================================================
// Types
// =============================================================================

export interface DocxExportMetadata {
  runId: string;
  model: string;
  loopMode: boolean;
  generatedAt: Date;
  templateName?: string;
}

// =============================================================================
// Helpers
// =============================================================================

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatComboLine(combo: ComboAssignment): string {
  return `Stage: ${combo.stageArea} | Moment: ${combo.festivalMoment} | Dynamic: ${combo.dynamic} | Hook: ${combo.hook}`;
}

function createTextParagraph(text: string, options?: { bold?: boolean; italic?: boolean; size?: number }): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: options?.bold,
        italics: options?.italic,
        size: options?.size ?? 24, // Default 12pt
      }),
    ],
    spacing: { after: 120 },
  });
}

function createHeading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]): Paragraph {
  return new Paragraph({
    text,
    heading: level,
    spacing: { before: 240, after: 120 },
  });
}

function createBoundaryFrameBlock(title: string, content: string): Paragraph[] {
  return [
    new Paragraph({
      children: [
        new TextRun({
          text: title,
          bold: true,
          color: "6B21A8", // Purple
        }),
      ],
      spacing: { before: 200, after: 80 },
      border: {
        left: {
          color: "6B21A8",
          space: 10,
          size: 24,
          style: BorderStyle.SINGLE,
        },
      },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: content,
          italics: true,
        }),
      ],
      spacing: { after: 200 },
      indent: { left: 400 },
      border: {
        left: {
          color: "6B21A8",
          space: 10,
          size: 24,
          style: BorderStyle.SINGLE,
        },
      },
    }),
  ];
}

// =============================================================================
// DOCX Generation
// =============================================================================

/**
 * Export scenes to DOCX format
 */
export async function exportToDocx(
  scenes: Scene[],
  metadata: DocxExportMetadata
): Promise<Uint8Array> {
  const children: Paragraph[] = [];

  // Title
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "PuppetFlow Generation Report",
          bold: true,
          size: 48, // 24pt
        }),
      ],
      spacing: { after: 400 },
    })
  );

  // Metadata
  if (metadata.templateName) {
    children.push(createTextParagraph(`Template: ${metadata.templateName}`));
  }
  children.push(createTextParagraph(`Run ID: ${metadata.runId}`));
  children.push(createTextParagraph(`Model: ${metadata.model}`));
  children.push(createTextParagraph(`Loop Mode: ${metadata.loopMode ? "Enabled" : "Disabled"}`));
  children.push(createTextParagraph(`Generated: ${formatDate(metadata.generatedAt)}`));
  children.push(createTextParagraph(`Total Scenes: ${scenes.length}`));

  // Spacer
  children.push(new Paragraph({ spacing: { after: 400 } }));

  // Table of Contents (manual entries like PDF exporter)
  children.push(createHeading("Table of Contents", HeadingLevel.HEADING_1));
  for (let i = 0; i < scenes.length; i++) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Scene ${i + 1}`,
            size: 22,
          }),
        ],
        spacing: { after: 80 },
        indent: { left: 200 },
      })
    );
  }

  // Page break before scenes
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // Scenes
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];

    // Scene header
    children.push(createHeading(`Scene ${i + 1}`, HeadingLevel.HEADING_1));

    // Combo info
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: formatComboLine(scene.combo),
            italics: true,
            size: 20, // 10pt
            color: "6B7280", // Gray
          }),
        ],
        spacing: { after: 200 },
      })
    );

    // Lyrics
    children.push(createHeading("Lyrics", HeadingLevel.HEADING_2));
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: scene.lyrics,
            font: "Courier New",
            size: 22,
          }),
        ],
        spacing: { after: 200 },
        shading: { fill: "F3F4F6" },
      })
    );

    // IMAGE Prompt
    children.push(createHeading("IMAGE Prompt", HeadingLevel.HEADING_2));
    children.push(createTextParagraph(scene.imagePrompt));

    // VIDEO_START Prompt
    children.push(createHeading("VIDEO_START Prompt", HeadingLevel.HEADING_2));
    children.push(createTextParagraph(scene.startPrompt));

    // Boundary Frame 1
    children.push(...createBoundaryFrameBlock("Boundary Frame (START → MIDDLE)", scene.boundaryFrame1));

    // EXTEND_MIDDLE Prompt
    children.push(createHeading("EXTEND_MIDDLE Prompt", HeadingLevel.HEADING_2));
    children.push(createTextParagraph(scene.middlePrompt));

    // Boundary Frame 2
    children.push(...createBoundaryFrameBlock("Boundary Frame (MIDDLE → END)", scene.boundaryFrame2));

    // EXTEND_END Prompt
    children.push(createHeading("EXTEND_END Prompt", HeadingLevel.HEADING_2));
    children.push(createTextParagraph(scene.endPrompt));

    // Final Frame
    children.push(createHeading("Final Frame", HeadingLevel.HEADING_3));
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: scene.finalFrame,
            bold: true,
          }),
        ],
        spacing: { after: 200 },
      })
    );

    // Notes if present
    if (scene.notes && scene.notes.trim()) {
      children.push(createHeading("Notes", HeadingLevel.HEADING_3));
      children.push(createTextParagraph(scene.notes));
    }

    // Page break between scenes (except last)
    if (i < scenes.length - 1) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }
  }

  // Footer paragraph
  children.push(new Paragraph({ spacing: { before: 600 } }));
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Generated by PuppetFlow | ${formatDate(metadata.generatedAt)}`,
          italics: true,
          size: 18,
          color: "9CA3AF",
        }),
      ],
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return new Uint8Array(buffer);
}
