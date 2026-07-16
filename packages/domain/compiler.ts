/**
 * Domain Compiler Module
 *
 * Compiles a CanvasGraph into a scaffold markdown document.
 * Handles block assembly, GLOBAL injection, placeholder substitution,
 * loop mode directives, and character locks.
 *
 * @module packages/domain/compiler
 */

import { type CanvasGraph, type CanvasNode, type ComboAssignment, type Lane } from "./types";
import { RULES } from "./rules";

// =============================================================================
// Types
// =============================================================================

/**
 * Theme pack definition for a series
 */
export interface ThemePack {
  id: string;
  name: string;
  festivalName: string;
  universeRules: string[];
  characters: CharacterDefinition[];
  stages: string[];
  festivalMoments: string[];
  subgenres: string[];
  languageChants: Record<string, string>;
}

/**
 * Character definition with lock text
 */
export interface CharacterDefinition {
  name: string;
  description: string;
  lockText: string;
}

/**
 * Block definition from the library
 */
export interface BlockDefinition {
  id: string;
  type: string;
  name: string;
  promptFragment: string;
  lane: Lane | "GLOBAL";
  defaultPinned: boolean;
}

/**
 * A block fragment with order for assembly
 */
interface OrderedFragment {
  fragment: string;
  order: number;
}

/**
 * Compiler error with detailed context
 */
export class CompilerError extends Error {
  constructor(
    public readonly type: "missing_block" | "unresolved_placeholder" | "invalid_graph" | "invalid_lane",
    public readonly nodeId: string | null,
    message: string
  ) {
    super(message);
    this.name = "CompilerError";
  }
}

// =============================================================================
// Required Lanes
// =============================================================================

const REQUIRED_LANES: Lane[] = ["IMAGE", "VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"];

// =============================================================================
// Block Resolution
// =============================================================================

/**
 * Resolve the prompt fragment for a node (override wins over library)
 */
export function resolveBlockFragment(
  node: CanvasNode,
  blockDefs: Record<string, BlockDefinition>
): string {
  // Check for override first
  if (node.overrides?.promptFragment) {
    return node.overrides.promptFragment;
  }

  // Look up library definition
  const def = blockDefs[node.blockDefId];
  if (!def) {
    throw new CompilerError(
      "missing_block",
      node.id,
      `Block definition '${node.blockDefId}' not found for node '${node.id}'`
    );
  }

  return def.promptFragment;
}

// =============================================================================
// Placeholder Substitution
// =============================================================================

/**
 * All supported placeholder keys (reserved for future template validation)
 */
const _PLACEHOLDER_KEYS = [
  "stageArea",
  "festivalMoment",
  "dynamic",
  "visual",
  "hook",
  "gag",
  "camera.start",
  "camera.middle",
  "camera.end",
  "payoff",
  "chaosThread",
  "language",
  "subgenre",
] as const;

/**
 * Substitute combo placeholders in a template
 */
export function injectComboPlaceholders(template: string, combo: ComboAssignment): string {
  let result = template;

  // Simple replacements
  result = result.replace(/\{\{stageArea\}\}/g, combo.stageArea);
  result = result.replace(/\{\{festivalMoment\}\}/g, combo.festivalMoment);
  result = result.replace(/\{\{dynamic\}\}/g, combo.dynamic);
  result = result.replace(/\{\{visual\}\}/g, combo.visual);
  result = result.replace(/\{\{hook\}\}/g, combo.hook);
  result = result.replace(/\{\{gag\}\}/g, combo.gag);
  result = result.replace(/\{\{payoff\}\}/g, combo.payoff);
  result = result.replace(/\{\{chaosThread\}\}/g, combo.chaosThread);
  result = result.replace(/\{\{language\}\}/g, combo.language);
  result = result.replace(/\{\{subgenre\}\}/g, combo.subgenre);

  // Nested camera replacements
  result = result.replace(/\{\{camera\.start\}\}/g, combo.camera.start);
  result = result.replace(/\{\{camera\.middle\}\}/g, combo.camera.middle);
  result = result.replace(/\{\{camera\.end\}\}/g, combo.camera.end);

  // Check for unresolved placeholders
  const unresolvedMatch = result.match(/\{\{(\w+(?:\.\w+)?)\}\}/);
  if (unresolvedMatch) {
    throw new CompilerError(
      "unresolved_placeholder",
      null,
      `Unresolved placeholder: {{${unresolvedMatch[1]}}}`
    );
  }

  return result;
}

// =============================================================================
// Loop Directives
// =============================================================================

/**
 * Loop anchor text for IMAGE stage
 */
const LOOP_ANCHOR_TEXT = "\n\nThis frame serves as a loop anchor for seamless video looping.";

/**
 * Mirror directive text for EXTEND_END stage
 */
const MIRROR_DIRECTIVE_TEXT = "\n\nFinal pose mirrors the opening composition.";

/**
 * Inject loop directives based on stage and loopMode
 */
export function injectLoopDirectives(template: string, stage: Lane, loopMode: boolean): string {
  if (!loopMode) {
    return template;
  }

  if (stage === "IMAGE") {
    return template + LOOP_ANCHOR_TEXT;
  }

  if (stage === "EXTEND_END") {
    return template + MIRROR_DIRECTIVE_TEXT;
  }

  return template;
}

// =============================================================================
// Character Locks
// =============================================================================

/**
 * Inject character lock paragraphs into a template
 */
export function injectCharacterLocks(template: string, characters: CharacterDefinition[]): string {
  const lockTexts = characters.map((c) => c.lockText).join("\n\n");
  return template + "\n\n" + lockTexts;
}

// =============================================================================
// Stage Template Compilation
// =============================================================================

/**
 * Video prompt structure templates (reserved for future template-based generation)
 */
const _VIDEO_START_TEMPLATE = `[00:00] {blocks}

ENDING FRAME [EXACT]: {description}`;

const _EXTEND_MIDDLE_TEMPLATE = `Continue directly from the final frame of the previous clip: {previous_frame}. [00:00] {blocks}

ENDING FRAME [EXACT]: {description}`;

const _EXTEND_END_TEMPLATE = `Continue directly from the final frame of the previous clip: {previous_frame}. [00:00] {blocks} [00:08] [DROP] {drop_action}

ENDING FRAME [EXACT]: {description}`;

/**
 * Compile a stage template from ordered blocks
 */
export function compileStageTemplate(
  stage: Lane,
  blocks: OrderedFragment[],
  combo: ComboAssignment
): string {
  // Sort blocks by order
  const sorted = [...blocks].sort((a, b) => a.order - b.order);

  // Join fragments
  const combined = sorted.map((b) => b.fragment).join(" ");

  // Substitute placeholders
  const substituted = injectComboPlaceholders(combined, combo);

  // Add stage-specific structure
  if (stage === "VIDEO_START") {
    return `[00:00] ${substituted} Audio: crowd, no dialogue. ENDING FRAME [EXACT]: {frame}`;
  }

  if (stage === "EXTEND_MIDDLE") {
    return `Continue directly from the final frame of the previous clip: {previous}. [00:00] ${substituted} Audio: synth pulse, no dialogue. ENDING FRAME [EXACT]: {frame}`;
  }

  if (stage === "EXTEND_END") {
    return `Continue directly from the final frame of the previous clip: {previous}. [00:00] ${substituted} [00:08] [DROP] Climactic moment! Audio: bass drop, no dialogue. ENDING FRAME [EXACT]: {frame}`;
  }

  return substituted;
}

// =============================================================================
// Theme Pack Canon Section
// =============================================================================

/**
 * Generate the Theme Pack Canon section
 */
function generateThemePackCanon(themePack: ThemePack): string {
  const lines: string[] = [];
  lines.push("## Theme Pack Canon");
  lines.push("");
  lines.push(`**Festival:** ${themePack.festivalName}`);
  lines.push("");
  lines.push("**Universe Rules:**");
  for (const rule of themePack.universeRules) {
    lines.push(`- ${rule}`);
  }
  lines.push("");
  lines.push("**Characters:**");
  for (const char of themePack.characters) {
    lines.push(`- **${char.name}:** ${char.description}`);
  }
  lines.push("");

  // Add character lock texts for IMAGE prompts
  if (themePack.characters.length > 0) {
    lines.push("**Character Locks (MUST appear verbatim in every imagePrompt):**");
    lines.push("");
    for (const char of themePack.characters) {
      if (char.lockText) {
        lines.push(char.lockText);
        lines.push("");
      }
    }
  }

  return lines.join("\n");
}

// =============================================================================
// Rulebook Section
// =============================================================================

/**
 * Generate the Rulebook Directives section
 */
function generateRulebookSection(): string {
  const lines: string[] = [];
  lines.push("## Rulebook Directives");
  lines.push("");
  for (const rule of RULES) {
    if (rule.severity === "advisory") continue;
    // Use lowercase rule name to avoid collisions with block content searches
    lines.push(`- **${rule.id} (${rule.name.toLowerCase()}):** ${rule.description}`);
  }
  lines.push("");
  return lines.join("\n");
}

// =============================================================================
// Combo Assignments Section
// =============================================================================

/**
 * Generate the Combo Assignments section
 */
function generateComboAssignmentsSection(combos: ComboAssignment[]): string {
  const lines: string[] = [];
  lines.push("## Combo Assignments");
  lines.push("");
  for (let i = 0; i < combos.length; i++) {
    const combo = combos[i];
    lines.push(`### Scene ${i + 1}`);
    lines.push(`- Stage: ${combo.stageArea}`);
    lines.push(`- Moment: ${combo.festivalMoment}`);
    lines.push(`- Dynamic: ${combo.dynamic}`);
    lines.push(`- Visual: ${combo.visual}`);
    lines.push(`- Hook: ${combo.hook}`);
    lines.push(`- Gag: ${combo.gag}`);
    lines.push(`- Cam: ${combo.camera.start} / ${combo.camera.middle} / ${combo.camera.end}`);
    lines.push(`- Payoff: ${combo.payoff}`);
    lines.push(`- Chaos: ${combo.chaosThread}`);
    lines.push(`- Language: ${combo.language}`);
    lines.push(`- Subgenre: ${combo.subgenre}`);
    lines.push("");
  }
  return lines.join("\n");
}

// =============================================================================
// Per-Stage Templates Section
// =============================================================================

/**
 * Fragment with lane info for proper ordering
 */
interface LaneOrderedFragment {
  fragment: string;
  order: number;
  isGlobal: boolean;
  isPinned: boolean;
}

/**
 * Generate the Per-Stage Templates section
 */
function generateStageTemplatesSection(
  graph: CanvasGraph,
  themePack: ThemePack,
  combos: ComboAssignment[],
  blockDefs: Record<string, BlockDefinition>
): string {
  const lines: string[] = [];
  lines.push("## Per-Stage Templates");
  lines.push("");

  // Group nodes by lane
  const nodesByLane = new Map<Lane, CanvasNode[]>();
  for (const lane of ["GLOBAL", "IMAGE", "VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"] as Lane[]) {
    nodesByLane.set(lane, []);
  }
  for (const node of graph.nodes) {
    const existing = nodesByLane.get(node.lane) ?? [];
    existing.push(node);
    nodesByLane.set(node.lane, existing);
  }

  // Get GLOBAL blocks (apply to all stages)
  const globalNodes = nodesByLane.get("GLOBAL" as Lane) ?? [];
  const globalFragments: LaneOrderedFragment[] = [];
  for (const node of globalNodes) {
    const fragment = resolveBlockFragment(node, blockDefs);
    globalFragments.push({ fragment, order: node.order, isGlobal: true, isPinned: node.pinned ?? false });
  }
  // Sort GLOBAL fragments by order
  globalFragments.sort((a, b) => a.order - b.order);

  // Generate template for each stage
  for (const stage of REQUIRED_LANES) {
    lines.push(`### ${stage} Template`);
    lines.push("");

    const stageNodes = nodesByLane.get(stage) ?? [];

    // Collect stage-specific fragments
    const stageFragments: LaneOrderedFragment[] = [];
    for (const node of stageNodes) {
      const fragment = resolveBlockFragment(node, blockDefs);
      stageFragments.push({ fragment, order: node.order, isGlobal: false, isPinned: node.pinned ?? false });
    }
    // Sort stage fragments by order
    stageFragments.sort((a, b) => a.order - b.order);

    // GLOBAL first, then stage-specific (each group sorted by order)
    const allFragments = [...globalFragments, ...stageFragments];

    // For pinned blocks, generate content per scene (each combo)
    const pinnedFragments = allFragments.filter((f) => f.isPinned);
    const nonPinnedFragments = allFragments.filter((f) => !f.isPinned);

    // Build the combined template
    // First, GLOBAL non-pinned fragments
    let combined = allFragments.map((f) => f.fragment).join("\n\n");

    // Substitute in non-pinned fragments only (pinned stay as-is)
    if (combos.length > 0 && nonPinnedFragments.length > 0) {
      // Build substitution for non-pinned parts
      const nonPinnedCombined = nonPinnedFragments.map((f) => f.fragment).join("\n\n");
      const substituted = injectComboPlaceholders(nonPinnedCombined, combos[0]);

      // Rebuild combined with substituted non-pinned + original pinned
      const pinnedCombined = pinnedFragments.map((f) => f.fragment).join("\n\n");
      combined = substituted + (pinnedCombined ? "\n\n" + pinnedCombined : "");
    }

    // For pinned blocks that should appear per-scene, repeat for each combo
    if (pinnedFragments.length > 0 && combos.length > 1) {
      // Add pinned block content for each scene
      const pinnedContent = pinnedFragments.map((f) => f.fragment).join("\n\n");
      const extraPinnedContent = combos.slice(1).map(() => pinnedContent).join("\n\n");
      combined = combined + "\n\n" + extraPinnedContent;
    }

    // Inject loop directives
    combined = injectLoopDirectives(combined, stage, graph.runConfig.loopMode);

    // Add stage-specific structure hints
    if (stage === "IMAGE") {
      lines.push("```");
      lines.push(combined);
      lines.push("```");
    } else if (stage === "VIDEO_START") {
      lines.push("Structure: [00:00] ... ENDING FRAME [EXACT]: ...");
      lines.push("```");
      lines.push(combined);
      lines.push("```");
    } else if (stage === "EXTEND_MIDDLE") {
      lines.push("Structure: Continue from previous... [00:00] ... ENDING FRAME [EXACT]: ...");
      lines.push("```");
      lines.push(combined);
      lines.push("```");
    } else if (stage === "EXTEND_END") {
      lines.push("Structure: Continue from previous... [00:00] ... [DROP] ... ENDING FRAME [EXACT]: ...");
      lines.push("```");
      lines.push(combined);
      lines.push("```");
    }

    lines.push("");
  }

  return lines.join("\n");
}

// =============================================================================
// Image Prompt Style Guide Section
// =============================================================================

/**
 * Generate the Image Prompt Style Guide section
 */
function generateImagePromptStyleGuide(): string {
  const lines: string[] = [];
  lines.push("## IMAGE Prompt Style Guide");
  lines.push("");
  lines.push("The imagePrompt field must be HIGHLY DETAILED and CINEMATIC. Follow this structure:");
  lines.push("");
  lines.push("### Required Elements (in order):");
  lines.push("");
  lines.push("1. **Technical Frame** (first line):");
  lines.push("   - \"A real, unedited photograph. Hyperrealistic cinematic realism, full color, no animation, no cartoon, no illustration.\"");
  lines.push("   - Camera specs: ARRI Alexa, lens (24-85mm), aperture (f/1.8-f/4), color grade");
  lines.push("");
  lines.push("2. **Character Descriptions** (2-3 paragraphs each):");
  lines.push("   - Name in bold");
  lines.push("   - Exact physical appearance locked to reference");
  lines.push("   - Current pose/action in this frame");
  lines.push("   - Emotional state visible in expression");
  lines.push("");
  lines.push("3. **The Puppet Visual** (1 paragraph):");
  lines.push("   - How the puppet-master dynamic manifests visually");
  lines.push("   - \"Invisible gesture control\" - describe the eerie synchronization");
  lines.push("   - The tell: delayed mirroring, synchronized twitches");
  lines.push("");
  lines.push("4. **Setting** (1 detailed paragraph):");
  lines.push("   - Specific location with 5+ environmental details");
  lines.push("   - Textures, materials, weathering, lighting quality");
  lines.push("   - Atmospheric elements: haze, particles, reflections");
  lines.push("");
  lines.push("5. **Negative Constraints** (1 line):");
  lines.push("   - \"No floating text anywhere (scene description).\"");
  lines.push("");
  lines.push("6. **Background Chaos Thread** (1 line):");
  lines.push("   - Background element that adds life/humor");
  lines.push("");
  lines.push("7. **Crowd Description** (1 paragraph):");
  lines.push("   - 3-4 specific crowd member activities");
  lines.push("   - Creates sense of authentic busy environment");
  lines.push("");
  lines.push("8. **Mood Line** (final line):");
  lines.push("   - \"Mood: [emotional essence]. [List of negative constraints].\"");
  lines.push("");
  lines.push("9. **CRITICAL CHARACTER LOCKS** (final paragraphs):");
  lines.push("   - Verbatim character lock text for each character");
  lines.push("   - These MUST appear exactly as defined in the theme pack");
  lines.push("");
  lines.push("### Word Count: 250-400 words for imagePrompt");
  lines.push("");
  lines.push("### Example Structure:");
  lines.push("```");
  lines.push("A real, unedited photograph. Hyperrealistic cinematic realism, full color, no animation. ARRI Alexa, 35mm lens, f/2.2, [color grade].");
  lines.push("");
  lines.push("[Character 1 Name] — [Exact physical description from reference]. [Current pose]. [Emotional expression].");
  lines.push("");
  lines.push("[Character 2 Name] — [Exact physical description from reference]. [Current action]. [Emotional state].");
  lines.push("");
  lines.push("The Puppet Visual — [How the control dynamic is shown visually without visible strings].");
  lines.push("");
  lines.push("Setting — [Location]: [5+ specific environmental details with textures and lighting].");
  lines.push("");
  lines.push("No floating text anywhere ([scene type]).");
  lines.push("");
  lines.push("Background chaos thread — [subtle background element].");
  lines.push("");
  lines.push("Crowd — [3-4 specific crowd activities creating authentic atmosphere].");
  lines.push("");
  lines.push("Mood: [emotional essence]. No distorted animals, no extra characters, no cartoon features, no illustration, correct anatomy, no floating text.");
  lines.push("");
  lines.push("**CRITICAL CHARACTER LOCK:** [Verbatim lock text for each character].");
  lines.push("```");
  lines.push("");
  return lines.join("\n");
}

// =============================================================================
// Output Schema Section
// =============================================================================

/**
 * Generate the Output Schema section
 */
function generateOutputSchemaSection(): string {
  const lines: string[] = [];
  lines.push("## Output Schema Instructions");
  lines.push("");
  lines.push("Return output as JSON with the following structure:");
  lines.push("");
  lines.push("```json");
  lines.push(`{
  "scenes": [
    {
      "index": 0,
      "lyrics": "...",
      "imagePrompt": "... (250-400 words following IMAGE Prompt Style Guide above)",
      "startPrompt": "...",
      "middlePrompt": "...",
      "endPrompt": "...",
      "boundaryFrame1": "...",
      "boundaryFrame2": "...",
      "finalFrame": "..."
    }
  ]
}`);
  lines.push("```");
  lines.push("");
  return lines.join("\n");
}

// =============================================================================
// Main Compile Function
// =============================================================================

/**
 * Compile a CanvasGraph into a scaffold markdown document
 */
export function compile(
  graph: CanvasGraph,
  themePack: ThemePack,
  combos: ComboAssignment[],
  blockDefs: Record<string, BlockDefinition>
): string {
  // Validate graph structure
  if (!graph.lanes || graph.lanes.length < 5) {
    throw new CompilerError(
      "invalid_graph",
      null,
      "Graph must have all 5 lanes: GLOBAL, IMAGE, VIDEO_START, EXTEND_MIDDLE, EXTEND_END"
    );
  }

  // Check for required lanes
  for (const lane of REQUIRED_LANES) {
    if (!graph.lanes.includes(lane)) {
      throw new CompilerError(
        "invalid_graph",
        null,
        `Graph missing required lane: ${lane}`
      );
    }
  }

  // Validate all nodes reference valid block definitions
  for (const node of graph.nodes) {
    if (!node.overrides?.promptFragment && !blockDefs[node.blockDefId]) {
      throw new CompilerError(
        "missing_block",
        node.id,
        `Block definition '${node.blockDefId}' not found for node '${node.id}'`
      );
    }
  }

  // Build scaffold sections
  const sections: string[] = [];

  // Header
  sections.push(`# Scaffold for ${themePack.name}`);
  sections.push("");

  // Theme Pack Canon
  sections.push(generateThemePackCanon(themePack));

  // Rulebook Directives
  sections.push(generateRulebookSection());

  // Combo Assignments
  sections.push(generateComboAssignmentsSection(combos));

  // Per-Stage Templates
  sections.push(generateStageTemplatesSection(graph, themePack, combos, blockDefs));

  // Image Prompt Style Guide (critical for quality)
  sections.push(generateImagePromptStyleGuide());

  // Output Schema
  sections.push(generateOutputSchemaSection());

  // Join and ensure consistent line endings
  let output = sections.join("\n");

  // Ensure LF line endings
  output = output.replace(/\r\n/g, "\n");

  return output;
}
