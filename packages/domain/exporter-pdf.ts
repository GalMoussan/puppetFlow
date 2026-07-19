/**
 * PDF Exporter Module
 *
 * Converts batch output to PDF format.
 * Pure TypeScript, no React/Next imports.
 *
 * @module packages/domain/exporter-pdf
 */

import { jsPDF } from "jspdf";
import { type Scene, type ComboAssignment } from "./types";

// =============================================================================
// Types
// =============================================================================

export interface PdfExportMetadata {
  runId: string;
  model: string;
  loopMode: boolean;
  generatedAt: Date;
  templateName?: string;
}

// =============================================================================
// Constants
// =============================================================================

const PAGE_WIDTH = 210; // A4 width in mm
const PAGE_HEIGHT = 297; // A4 height in mm
const MARGIN = 20;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
const LINE_HEIGHT = 6;
const TITLE_SIZE = 18;
const HEADING_SIZE = 14;
const SUBHEADING_SIZE = 11;
const BODY_SIZE = 10;
const SMALL_SIZE = 8;

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
  return `Stage: ${combo.stageArea} | Moment: ${combo.festivalMoment} | Dynamic: ${combo.dynamic}`;
}

function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  const paragraphs = text.split("\n");

  for (const paragraph of paragraphs) {
    if (paragraph.trim() === "") {
      lines.push("");
      continue;
    }
    const splitLines = doc.splitTextToSize(paragraph, maxWidth);
    lines.push(...splitLines);
  }

  return lines;
}

// =============================================================================
// PDF Generation
// =============================================================================

/**
 * Export scenes to PDF format
 */
export function exportToPdf(
  scenes: Scene[],
  metadata: PdfExportMetadata
): Uint8Array {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  let y = MARGIN;

  // Title page
  doc.setFontSize(TITLE_SIZE);
  doc.setFont("helvetica", "bold");
  doc.text("PuppetFlow Generation Report", MARGIN, y);
  y += LINE_HEIGHT * 2;

  doc.setFontSize(BODY_SIZE);
  doc.setFont("helvetica", "normal");

  if (metadata.templateName) {
    doc.text(`Template: ${metadata.templateName}`, MARGIN, y);
    y += LINE_HEIGHT;
  }

  doc.text(`Run ID: ${metadata.runId}`, MARGIN, y);
  y += LINE_HEIGHT;

  doc.text(`Model: ${metadata.model}`, MARGIN, y);
  y += LINE_HEIGHT;

  doc.text(`Loop Mode: ${metadata.loopMode ? "Enabled" : "Disabled"}`, MARGIN, y);
  y += LINE_HEIGHT;

  doc.text(`Generated: ${formatDate(metadata.generatedAt)}`, MARGIN, y);
  y += LINE_HEIGHT;

  doc.text(`Total Scenes: ${scenes.length}`, MARGIN, y);
  y += LINE_HEIGHT * 3;

  // Table of contents
  doc.setFontSize(HEADING_SIZE);
  doc.setFont("helvetica", "bold");
  doc.text("Table of Contents", MARGIN, y);
  y += LINE_HEIGHT * 1.5;

  doc.setFontSize(BODY_SIZE);
  doc.setFont("helvetica", "normal");

  for (let i = 0; i < scenes.length; i++) {
    doc.text(`Scene ${i + 1}`, MARGIN + 5, y);
    y += LINE_HEIGHT;
  }

  // Scene pages
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];

    // New page for each scene
    doc.addPage();
    y = MARGIN;

    // Scene header
    doc.setFontSize(HEADING_SIZE);
    doc.setFont("helvetica", "bold");
    doc.text(`Scene ${i + 1}`, MARGIN, y);
    y += LINE_HEIGHT * 1.5;

    // Combo info
    doc.setFontSize(SMALL_SIZE);
    doc.setFont("helvetica", "italic");
    doc.text(formatComboLine(scene.combo), MARGIN, y);
    y += LINE_HEIGHT * 1.5;

    // Lyrics
    doc.setFontSize(SUBHEADING_SIZE);
    doc.setFont("helvetica", "bold");
    doc.text("Lyrics", MARGIN, y);
    y += LINE_HEIGHT;

    doc.setFontSize(BODY_SIZE);
    doc.setFont("helvetica", "normal");
    const lyricsLines = wrapText(doc, scene.lyrics, CONTENT_WIDTH);
    for (const line of lyricsLines) {
      if (y > PAGE_HEIGHT - MARGIN) {
        doc.addPage();
        y = MARGIN;
      }
      doc.text(line, MARGIN, y);
      y += LINE_HEIGHT;
    }
    y += LINE_HEIGHT;

    // Image Prompt
    if (y > PAGE_HEIGHT - MARGIN - 50) {
      doc.addPage();
      y = MARGIN;
    }

    doc.setFontSize(SUBHEADING_SIZE);
    doc.setFont("helvetica", "bold");
    doc.text("IMAGE Prompt", MARGIN, y);
    y += LINE_HEIGHT;

    doc.setFontSize(BODY_SIZE);
    doc.setFont("helvetica", "normal");
    const imageLines = wrapText(doc, scene.imagePrompt, CONTENT_WIDTH);
    for (const line of imageLines) {
      if (y > PAGE_HEIGHT - MARGIN) {
        doc.addPage();
        y = MARGIN;
      }
      doc.text(line, MARGIN, y);
      y += LINE_HEIGHT;
    }
    y += LINE_HEIGHT;

    // Video Prompts
    const videoSections = [
      { title: "VIDEO_START Prompt", content: scene.startPrompt },
      { title: "Boundary Frame (START → MIDDLE)", content: scene.boundaryFrame1 },
      { title: "EXTEND_MIDDLE Prompt", content: scene.middlePrompt },
      { title: "Boundary Frame (MIDDLE → END)", content: scene.boundaryFrame2 },
      { title: "EXTEND_END Prompt", content: scene.endPrompt },
      { title: "Final Frame", content: scene.finalFrame },
    ];

    for (const section of videoSections) {
      if (y > PAGE_HEIGHT - MARGIN - 40) {
        doc.addPage();
        y = MARGIN;
      }

      doc.setFontSize(SUBHEADING_SIZE);
      doc.setFont("helvetica", "bold");
      doc.text(section.title, MARGIN, y);
      y += LINE_HEIGHT;

      doc.setFontSize(BODY_SIZE);
      doc.setFont("helvetica", "normal");
      const lines = wrapText(doc, section.content, CONTENT_WIDTH);
      for (const line of lines) {
        if (y > PAGE_HEIGHT - MARGIN) {
          doc.addPage();
          y = MARGIN;
        }
        doc.text(line, MARGIN, y);
        y += LINE_HEIGHT;
      }
      y += LINE_HEIGHT;
    }
  }

  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(SMALL_SIZE);
    doc.setFont("helvetica", "italic");
    doc.text(
      `Generated by PuppetFlow | ${formatDate(metadata.generatedAt)}`,
      MARGIN,
      PAGE_HEIGHT - 10
    );
    doc.text(`Page ${i} of ${pageCount}`, PAGE_WIDTH - MARGIN - 20, PAGE_HEIGHT - 10);
  }

  return doc.output("arraybuffer") as unknown as Uint8Array;
}
