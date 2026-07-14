/**
 * Scene import — parse pasted multi-stage scene markdown into blocks + canvas graph.
 * Pure domain (no React/Prisma). Deterministic heuristics for v1.
 *
 * @module packages/domain/scene-import
 */

import type { BlockType, CanvasGraph, Lane, RunConfig } from "./types";

// =============================================================================
// Types
// =============================================================================

export type SceneStageKey = "IMAGE" | "VIDEO_START" | "EXTEND_MIDDLE" | "EXTEND_END";

export interface ParsedStage {
  key: SceneStageKey;
  title: string;
  body: string;
  camera?: string;
  endingFrame?: string;
  openContinuation?: string;
  duration?: string;
}

export interface ParsedCharacterLock {
  name: string;
  text: string;
}

export interface ParsedScene {
  raw: string;
  stages: ParsedStage[];
  styleLock?: string;
  characterLocks: ParsedCharacterLock[];
  location?: string;
  chaosThreads: string[];
  absurdityVisual?: string;
  warnings: string[];
}

export interface PlannedBlock {
  /** Temporary id used in graph nodes before DB ids exist */
  tempId: string;
  type: BlockType;
  name: string;
  promptFragment: string;
  stageScope: Lane[];
  rotationGroup?: string | null;
  pinned?: boolean;
  /** Primary placement lane on canvas */
  lane: Lane;
  order: number;
}

export interface ImportPlan {
  blocks: PlannedBlock[];
  /** Graph with blockDefId = tempId; API remaps to real ids */
  graph: CanvasGraph;
  warnings: string[];
  stats: {
    stages: SceneStageKey[];
    blockCount: number;
  };
}

export interface PlanImportOptions {
  pinCharacterLocks?: boolean;
  /** Prefix for block names */
  namePrefix?: string;
}

// =============================================================================
// Section detection
// =============================================================================

const STAGE_HEADER_RE =
  /^#{1,3}\s*(.+)$/gm;

function classifyHeader(title: string): SceneStageKey | null {
  const t = title.toLowerCase();
  if (/\bimage\b/.test(t) && !/\bvideo\b/.test(t)) return "IMAGE";
  if (/\bstart\b/.test(t) || (/video/.test(t) && /start/.test(t)))
    return "VIDEO_START";
  if (/\bmiddle\b/.test(t) || /extend\s*prompt\s*1/.test(t))
    return "EXTEND_MIDDLE";
  if (
    /\bend\b/.test(t) ||
    /extend\s*prompt\s*2/.test(t) ||
    (/extend/.test(t) && /end/.test(t))
  )
    return "EXTEND_END";
  return null;
}

function splitByHeaders(
  raw: string
): Array<{ title: string; body: string }> {
  const text = raw.replace(/\r\n/g, "\n").trim();
  if (!text) return [];

  const matches = [...text.matchAll(STAGE_HEADER_RE)];
  if (matches.length === 0) {
    return [{ title: "Untitled", body: text }];
  }

  const parts: Array<{ title: string; body: string }> = [];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const title = m[1].trim();
    const start = (m.index ?? 0) + m[0].length;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? text.length) : text.length;
    parts.push({ title, body: text.slice(start, end).trim() });
  }
  return parts;
}

function extractCamera(body: string): string | undefined {
  const m =
    body.match(/\*\*Camera:\*\*\s*(.+?)(?:\n|$)/i) ||
    body.match(/^Camera:\s*(.+?)(?:\n|$)/im);
  return m?.[1]?.trim() || undefined;
}

function extractEndingFrame(body: string): string | undefined {
  // **Ending frame [EXACT]:** ...  or Ending frame: ...
  const m = body.match(
    /\*\*Ending frame[^*]*:\*\*\s*([\s\S]+?)(?=\n\s*\*\*|\n\s*##|\n\s*\*\*Duration|\n\s*Duration:|$)/i
  );
  if (m?.[1]) return m[1].trim();
  const m2 = body.match(
    /Ending frame\s*(?:\[[^\]]*\])?\s*:\s*([\s\S]+?)(?=\n\s*\*\*|\n\s*##|\n\s*Duration:|$)/i
  );
  return m2?.[1]?.trim() || undefined;
}

function extractOpenContinuation(body: string): string | undefined {
  const m = body.match(
    /\*\*OPEN:\*\*\s*[“"']?([\s\S]+?)[”"']?(?=\n\s*\*\*|\n\s*##|$)/i
  );
  if (m?.[1]) return m[1].trim().replace(/^["“]|["”]$/g, "");
  return undefined;
}

function extractDuration(body: string): string | undefined {
  const m = body.match(/\*\*Duration:\*\*\s*(.+)/i) || body.match(/^Duration:\s*(.+)/im);
  return m?.[1]?.trim();
}

function extractLabeledBlock(body: string, label: RegExp): string | undefined {
  const re = new RegExp(
    `(?:^|\\n)\\s*(?:\\*\\*)?${label.source}(?:\\*\\*)?\\s*:\\s*([\\s\\S]+?)(?=\\n\\s*(?:\\*\\*)?[A-Z][^\\n]{0,40}:|\\n\\s*\\*\\*CRITICAL|\\n\\s*##|$)`,
    "i"
  );
  const m = body.match(re);
  return m?.[1]?.trim();
}

function extractCriticalLocks(body: string): ParsedCharacterLock[] {
  const locks: ParsedCharacterLock[] = [];
  // **CRITICAL ...:** paragraph until next **CRITICAL or ## or end
  const re =
    /\*\*(CRITICAL[^*]+)\*\*\s*:?\s*([\s\S]+?)(?=\n\s*\*\*CRITICAL|\n\s*##|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const header = m[1].trim();
    const text = `**${header}:** ${m[2].trim()}`;
    const nameMatch =
      header.match(/SHIKA|SHILSHUL|CHARACTER/i) ||
      m[2].match(/\b(Shika\s+\w+|Shilshul\s+\w+)\b/);
    const name = nameMatch
      ? nameMatch[0].replace(/CRITICAL|LOCK|IMAGE|CHARACTER/gi, "").trim() ||
        header.slice(0, 40)
      : header.slice(0, 48);
    locks.push({ name: name || "Character", text });
  }
  return locks;
}

function extractStyleFromImage(body: string): string | undefined {
  // First paragraph-ish before character names often is style
  const lines = body.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const styleLines: string[] = [];
  for (const line of lines) {
    if (
      /shika|shilshul|location environment|background chaos|bystanders|mood:|critical/i.test(
        line
      )
    ) {
      break;
    }
    if (line.startsWith("**") && !/real|hyper|arri|vertical|cinematic/i.test(line)) {
      break;
    }
    styleLines.push(line);
    if (styleLines.join(" ").length > 400) break;
  }
  const joined = styleLines.join("\n").trim();
  return joined.length > 40 ? joined : undefined;
}

/**
 * Parse a pasted scene markdown document into structured stages + extracts.
 */
export function parseSceneMarkdown(raw: string): ParsedScene {
  const warnings: string[] = [];
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) {
    return {
      raw: "",
      stages: [],
      characterLocks: [],
      chaosThreads: [],
      warnings: ["Empty paste — nothing to import"],
    };
  }

  const parts = splitByHeaders(trimmed);
  const stages: ParsedStage[] = [];
  const seen = new Set<SceneStageKey>();

  for (const part of parts) {
    const key = classifyHeader(part.title);
    if (!key) continue;
    if (seen.has(key)) {
      warnings.push(`Duplicate section for ${key}; keeping first`);
      continue;
    }
    seen.add(key);
    stages.push({
      key,
      title: part.title,
      body: part.body,
      camera: extractCamera(part.body),
      endingFrame: extractEndingFrame(part.body),
      openContinuation: extractOpenContinuation(part.body),
      duration: extractDuration(part.body),
    });
  }

  if (stages.length === 0) {
    // Treat whole document as IMAGE if no headers matched
    warnings.push(
      "No stage headers detected — treating entire paste as IMAGE stage"
    );
    stages.push({
      key: "IMAGE",
      title: "Image (inferred)",
      body: trimmed,
      camera: extractCamera(trimmed),
      endingFrame: extractEndingFrame(trimmed),
    });
  }

  const imageBody =
    stages.find((s) => s.key === "IMAGE")?.body ?? trimmed;

  const characterLocks = extractCriticalLocks(imageBody);
  // Also scan full doc for locks
  if (characterLocks.length === 0) {
    characterLocks.push(...extractCriticalLocks(trimmed));
  }

  const location =
    extractLabeledBlock(imageBody, /Location environment/) ||
    extractLabeledBlock(imageBody, /Location/);

  const chaosThreads: string[] = [];
  for (const stage of stages) {
    const chaos =
      extractLabeledBlock(stage.body, /Background chaos thread(?:\s*\([^)]*\))?/) ||
      extractLabeledBlock(stage.body, /Background chaos/);
    if (chaos) chaosThreads.push(chaos);
  }
  // Generic chaos mentions in image
  const imgChaos = extractLabeledBlock(imageBody, /Background chaos thread/);
  if (imgChaos && !chaosThreads.includes(imgChaos)) {
    chaosThreads.unshift(imgChaos);
  }

  const absurdityVisual =
    extractLabeledBlock(imageBody, /The Absurdity Visual/) ||
    extractLabeledBlock(imageBody, /Absurdity Visual/);

  const styleLock = extractStyleFromImage(imageBody);

  if (!stages.some((s) => s.key === "VIDEO_START")) {
    warnings.push("No VIDEO START section found");
  }
  if (!stages.some((s) => s.key === "EXTEND_END")) {
    warnings.push("No EXTEND END section found");
  }
  if (characterLocks.length === 0) {
    warnings.push("No CRITICAL character lock blocks found");
  }

  return {
    raw: trimmed,
    stages,
    styleLock,
    characterLocks,
    location,
    chaosThreads,
    absurdityVisual,
    warnings,
  };
}

// =============================================================================
// Planner
// =============================================================================

function slugId(prefix: string, n: number): string {
  return `${prefix}-${n}`;
}

function defaultRunConfig(): RunConfig {
  return {
    loopMode: true,
    languages: { hi: 3, ja: 2 },
    batchSize: 5,
  };
}

function stageToLane(key: SceneStageKey): Lane {
  return key;
}

function residualBody(stage: ParsedStage): string {
  let body = stage.body;
  // Strip extracted structured bits for residual action block
  body = body.replace(/\*\*Camera:\*\*\s*.+/i, "");
  body = body.replace(
    /\*\*Ending frame[^*]*:\*\*\s*[\s\S]+?(?=\n\s*\*\*|\n\s*##|$)/i,
    ""
  );
  body = body.replace(
    /\*\*OPEN:\*\*\s*[\s\S]+?(?=\n\s*\*\*|\n\s*##|$)/i,
    ""
  );
  body = body.replace(/\*\*Duration:\*\*\s*.+/i, "");
  return body.replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Build block plans + canvas graph from a parsed scene.
 */
export function planImport(
  parsed: ParsedScene,
  options: PlanImportOptions = {}
): ImportPlan {
  const pinLocks = options.pinCharacterLocks !== false;
  const prefix = options.namePrefix ?? "Import";
  const warnings = [...parsed.warnings];
  const blocks: PlannedBlock[] = [];
  let n = 0;

  const add = (
    partial: Omit<PlannedBlock, "tempId" | "order"> & { order?: number }
  ): PlannedBlock => {
    const block: PlannedBlock = {
      tempId: slugId("import", ++n),
      order: partial.order ?? blocks.filter((b) => b.lane === partial.lane).length,
      type: partial.type,
      name: partial.name,
      promptFragment: partial.promptFragment,
      stageScope: partial.stageScope,
      rotationGroup: partial.rotationGroup ?? null,
      pinned: partial.pinned,
      lane: partial.lane,
    };
    blocks.push(block);
    return block;
  };

  // GLOBAL / IMAGE foundation
  if (parsed.styleLock) {
    add({
      type: "STYLE_LOCK",
      name: `${prefix} · Style lock`,
      promptFragment: parsed.styleLock,
      stageScope: ["GLOBAL", "IMAGE"],
      lane: "GLOBAL",
      rotationGroup: "style",
    });
  }

  for (const lock of parsed.characterLocks) {
    add({
      type: "CHARACTER_LOCK",
      name: `${prefix} · Character · ${lock.name.slice(0, 40)}`,
      promptFragment: lock.text,
      stageScope: ["GLOBAL", "IMAGE"],
      lane: "GLOBAL",
      pinned: pinLocks,
      rotationGroup: "character",
    });
  }

  if (parsed.location) {
    add({
      type: "STAGE_AREA",
      name: `${prefix} · Stage area`,
      promptFragment: parsed.location,
      stageScope: ["GLOBAL", "IMAGE"],
      lane: "IMAGE",
      rotationGroup: "stageArea",
    });
  }

  if (parsed.absurdityVisual) {
    add({
      type: "PUPPET_VISUAL",
      name: `${prefix} · Absurdity visual`,
      promptFragment: parsed.absurdityVisual,
      stageScope: ["IMAGE"],
      lane: "IMAGE",
      rotationGroup: "visual",
    });
  }

  // Chaos — first as IMAGE setup, rest on video stages by order
  parsed.chaosThreads.forEach((chaos, i) => {
    const lane: Lane =
      i === 0
        ? "IMAGE"
        : i === 1
          ? "VIDEO_START"
          : i === 2
            ? "EXTEND_MIDDLE"
            : "EXTEND_END";
    add({
      type: "CHAOS_THREAD",
      name: `${prefix} · Chaos · ${i + 1}`,
      promptFragment: chaos,
      stageScope: ["IMAGE", "VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
      lane,
      rotationGroup: "chaosThread",
    });
  });

  // Per-stage cameras + residual action
  for (const stage of parsed.stages) {
    const lane = stageToLane(stage.key);

    if (stage.camera) {
      add({
        type: "CAMERA_MOVE",
        name: `${prefix} · Camera · ${stage.key.replace("EXTEND_", "").replace("VIDEO_", "")}`,
        promptFragment: stage.camera,
        stageScope: [lane, "IMAGE"].filter((l, i, a) => a.indexOf(l) === i) as Lane[],
        lane,
        rotationGroup: "camera",
      });
    }

    if (stage.key === "VIDEO_START") {
      const hookMatch = stage.body.match(
        /\*\*OPENING HOOK[^*]*\*\*\s*:?\s*([\s\S]+?)(?=\n\s*\*\*|\n\n[A-Z]|$)/i
      );
      if (hookMatch?.[1]) {
        add({
          type: "HOOK",
          name: `${prefix} · Opening hook`,
          promptFragment: hookMatch[1].trim(),
          stageScope: ["VIDEO_START", "GLOBAL"],
          lane: "VIDEO_START",
          rotationGroup: "hook",
        });
      }
    }

    if (stage.key === "EXTEND_END") {
      const residual = residualBody(stage);
      const endText =
        residual.length > 40 ? residual : stage.body.replace(/\*\*Camera:\*\*.+/i, "").trim();
      if (endText.length > 40) {
        add({
          type: /drop|payoff|snatch|trophy|downbeat|chant|bass/i.test(endText)
            ? "PAYOFF"
            : "PUPPET_DYNAMIC",
          name: `${prefix} · Payoff`,
          promptFragment: endText.slice(0, 2000),
          stageScope: ["EXTEND_END"],
          lane: "EXTEND_END",
          rotationGroup: "payoff",
        });
      }
      if (stage.endingFrame || /final frame|screenshot-worthy/i.test(stage.body)) {
        const finalText =
          stage.endingFrame ||
          stage.body.match(
            /(?:final frame|screenshot-worthy)[^\n]*:?\s*([\s\S]+?)(?=\n\s*\*\*|\n\s*##|$)/i
          )?.[1];
        if (finalText) {
          add({
            type: "LOOP_CLOSURE",
            name: `${prefix} · Final frame`,
            promptFragment: finalText.trim().slice(0, 1500),
            stageScope: ["EXTEND_END"],
            lane: "EXTEND_END",
            rotationGroup: null,
          });
        }
      }
      continue;
    }

    if (stage.key === "IMAGE") {
      // Character description paragraphs (non-lock) as visual if present
      const residual = residualBody(stage)
        .replace(/\*\*CRITICAL[\s\S]+?(?=\n\s*\*\*CRITICAL|\n\s*##|$)/gi, "")
        .trim();
      // Avoid dumping entire image if we already extracted pieces
      if (
        residual.length > 80 &&
        blocks.filter((b) => b.lane === "IMAGE").length < 2
      ) {
        add({
          type: "CUSTOM",
          name: `${prefix} · Image body`,
          promptFragment: residual.slice(0, 2500),
          stageScope: ["IMAGE"],
          lane: "IMAGE",
        });
      }
      continue;
    }

    // START / MIDDLE residual action
    const residual = residualBody(stage);
    if (residual.length > 60) {
      const isGag =
        /gag|flick|blink|fail|lunge|grab|tiny arms|scissors/i.test(residual);
      add({
        type: isGag ? "PHYSICAL_GAG" : "PUPPET_DYNAMIC",
        name: `${prefix} · ${stage.key === "VIDEO_START" ? "Start" : "Middle"} action`,
        promptFragment: residual.slice(0, 2000),
        stageScope: [lane],
        lane,
        rotationGroup: isGag ? "gag" : "dynamic",
      });
    }

    // Ending frame as small CUSTOM pinned for reference on that lane
    if (stage.endingFrame) {
      add({
        type: "CUSTOM",
        name: `${prefix} · Ending frame · ${stage.key === "VIDEO_START" ? "START" : "MIDDLE"}`,
        promptFragment: `ENDING FRAME [EXACT]: ${stage.endingFrame}`,
        stageScope: [lane],
        lane,
        pinned: true,
      });
    }
  }

  // Cap block explosion — drop low-priority CUSTOM first
  const MAX = 18;
  if (blocks.length > MAX) {
    const priority = (t: BlockType) => {
      if (t === "CHARACTER_LOCK" || t === "STYLE_LOCK") return 0;
      if (t === "CAMERA_MOVE" || t === "PAYOFF" || t === "HOOK") return 1;
      if (t === "CHAOS_THREAD" || t === "STAGE_AREA") return 2;
      if (t === "CUSTOM") return 9;
      return 5;
    };
    blocks.sort((a, b) => priority(a.type) - priority(b.type));
    const removed = blocks.length - MAX;
    blocks.splice(MAX);
    // Re-number order per lane after trim
    const laneOrder: Record<string, number> = {};
    for (const b of blocks) {
      const o = laneOrder[b.lane] ?? 0;
      b.order = o;
      laneOrder[b.lane] = o + 1;
    }
    warnings.push(`Trimmed ${removed} lower-priority blocks (kept ${MAX})`);
  }

  if (blocks.length === 0) {
    warnings.push("No blocks planned — paste may not match expected format");
  }

  // Build graph
  const nodes = blocks.map((b) => ({
    id: `node-${b.tempId}`,
    blockDefId: b.tempId,
    lane: b.lane,
    order: b.order,
    pinned: b.pinned,
  }));

  const edges: CanvasGraph["edges"] = [];
  const start = parsed.stages.find((s) => s.key === "VIDEO_START");
  const middle = parsed.stages.find((s) => s.key === "EXTEND_MIDDLE");
  const end = parsed.stages.find((s) => s.key === "EXTEND_END");

  if (start || middle) {
    edges.push({
      from: "VIDEO_START",
      to: "EXTEND_MIDDLE",
      handshake: { strictness: "verbatim", trackCrowdMembers: 0 },
    });
  }
  if (middle || end) {
    edges.push({
      from: "EXTEND_MIDDLE",
      to: "EXTEND_END",
      handshake: { strictness: "verbatim", trackCrowdMembers: 0 },
    });
  }
  // IMAGE → START soft edge not in domain edge model (only stage handshakes)

  const graph: CanvasGraph = {
    version: 1,
    lanes: ["GLOBAL", "IMAGE", "VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
    nodes,
    edges,
    runConfig: defaultRunConfig(),
  };

  // Attach ending frames into a synthetic note on graph via warnings for UI
  if (start?.endingFrame) {
    warnings.push(`Handshake START→MIDDLE: ${start.endingFrame.slice(0, 80)}…`);
  }
  if (middle?.endingFrame) {
    warnings.push(`Handshake MIDDLE→END: ${middle.endingFrame.slice(0, 80)}…`);
  }

  return {
    blocks,
    graph,
    warnings,
    stats: {
      stages: parsed.stages.map((s) => s.key),
      blockCount: blocks.length,
    },
  };
}

/**
 * Convenience: parse + plan in one call.
 */
export function importSceneFromMarkdown(
  raw: string,
  options?: PlanImportOptions
): { parsed: ParsedScene; plan: ImportPlan } {
  const parsed = parseSceneMarkdown(raw);
  const plan = planImport(parsed, options);
  return { parsed, plan };
}
