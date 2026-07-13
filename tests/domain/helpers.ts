/**
 * Test Helpers for Domain Layer Tests
 *
 * Shared utilities for loading fixtures, creating test data,
 * and common assertions across domain tests.
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Fixture types matching fixtures-spec.md
export interface PositiveFixture<T = unknown> {
  id: string;
  rule: `R${number}`;
  description: string;
  variant: string;
  input: T;
  expected: {
    pass: true;
    violations: [];
  };
}

export interface NegativeFixture<T = unknown> {
  id: string;
  rule: `R${number}`;
  description: string;
  failureMode: string;
  input: T;
  expected: {
    pass: false;
    violations: Array<{
      rule: `R${number}`;
      severity: "hard" | "warn";
      sceneIndex?: number;
      stage?: string;
      evidence: string;
    }>;
  };
}

export type RuleFixture<T = unknown> = PositiveFixture<T> | NegativeFixture<T>;

/**
 * Get the fixtures directory path
 */
function getFixturesDir(): string {
  // Handle both ESM and CJS contexts
  const currentDir = dirname(fileURLToPath(import.meta.url));
  return join(currentDir, "fixtures");
}

/**
 * Load a single fixture file by relative path
 * @param relativePath - Path relative to fixtures directory (e.g., 'rules/r01/r01-pos-basic.json')
 */
export function loadFixture<T>(relativePath: string): T {
  const fixturesDir = getFixturesDir();
  const fullPath = join(fixturesDir, relativePath);

  if (!existsSync(fullPath)) {
    throw new Error(`Fixture not found: ${fullPath}`);
  }

  const content = readFileSync(fullPath, "utf-8");
  return JSON.parse(content) as T;
}

/**
 * Load all positive fixtures for a specific rule
 * @param ruleNumber - Rule number (1-15)
 */
export function loadPositiveFixtures<T>(
  ruleNumber: number
): PositiveFixture<T>[] {
  const ruleDir = `r${String(ruleNumber).padStart(2, "0")}`;
  const fixturesDir = getFixturesDir();
  const rulePath = join(fixturesDir, "rules", ruleDir);

  if (!existsSync(rulePath)) {
    return [];
  }

  const files = readdirSync(rulePath);
  const positiveFiles = files.filter(
    (f) => f.startsWith(`${ruleDir}-pos-`) && f.endsWith(".json")
  );

  return positiveFiles.map((file) =>
    loadFixture<PositiveFixture<T>>(join("rules", ruleDir, file))
  );
}

/**
 * Load all negative fixtures for a specific rule
 * @param ruleNumber - Rule number (1-15)
 */
export function loadNegativeFixtures<T>(
  ruleNumber: number
): NegativeFixture<T>[] {
  const ruleDir = `r${String(ruleNumber).padStart(2, "0")}`;
  const fixturesDir = getFixturesDir();
  const rulePath = join(fixturesDir, "rules", ruleDir);

  if (!existsSync(rulePath)) {
    return [];
  }

  const files = readdirSync(rulePath);
  const negativeFiles = files.filter(
    (f) => f.startsWith(`${ruleDir}-neg-`) && f.endsWith(".json")
  );

  return negativeFiles.map((file) =>
    loadFixture<NegativeFixture<T>>(join("rules", ruleDir, file))
  );
}

/**
 * Load all fixtures (positive and negative) for a specific rule
 * @param ruleNumber - Rule number (1-15)
 */
export function loadAllFixtures<T>(ruleNumber: number): {
  positive: PositiveFixture<T>[];
  negative: NegativeFixture<T>[];
} {
  return {
    positive: loadPositiveFixtures<T>(ruleNumber),
    negative: loadNegativeFixtures<T>(ruleNumber),
  };
}

/**
 * Create a minimal valid canvas graph for testing
 */
export function createMinimalGraph(): {
  version: 1;
  lanes: readonly [
    "GLOBAL",
    "IMAGE",
    "VIDEO_START",
    "EXTEND_MIDDLE",
    "EXTEND_END"
  ];
  nodes: never[];
  edges: never[];
  runConfig: { loopMode: boolean; languages: { hi: number; ja: number }; batchSize: number };
} {
  return {
    version: 1,
    lanes: ["GLOBAL", "IMAGE", "VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
    nodes: [],
    edges: [],
    runConfig: {
      loopMode: false,
      languages: { hi: 3, ja: 2 },
      batchSize: 5,
    },
  };
}

/**
 * Create a minimal valid scene for testing
 */
export function createMinimalScene(index: number): {
  id: string;
  runId: string;
  index: number;
  combo: {
    stageArea: string;
    festivalMoment: string;
    dynamic: string;
    visual: string;
    hook: string;
    gag: string;
    camera: { start: string; middle: string; end: string };
    payoff: string;
    chaosThread: string;
    language: string;
    subgenre: string;
  };
  lyrics: string;
  imagePrompt: string;
  startPrompt: string;
  middlePrompt: string;
  endPrompt: string;
  boundaryFrame1: string;
  boundaryFrame2: string;
  finalFrame: string;
  lintReport: never[];
  notes: null;
} {
  return {
    id: `scene-${index}`,
    runId: "run-1",
    index,
    combo: {
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
    },
    lyrics: "[Intro]\nTest lyrics\n\n[Drop]\nShika! Shika! Shilshul! Shilshul!",
    imagePrompt: "Test image prompt",
    startPrompt: "Test start prompt",
    middlePrompt: "Test middle prompt",
    endPrompt: "Test end prompt",
    boundaryFrame1: "Test boundary frame 1",
    boundaryFrame2: "Test boundary frame 2",
    finalFrame: "Test final frame",
    lintReport: [],
    notes: null,
  };
}

/**
 * Create a batch of 5 minimal scenes for testing
 */
export function createMinimalBatch(): ReturnType<typeof createMinimalScene>[] {
  return [1, 2, 3, 4, 5].map(createMinimalScene);
}

/**
 * Generate a prompt with a specific word count
 * @param wordCount - Target word count
 */
export function generatePromptWithWordCount(wordCount: number): string {
  const words = [
    "Shika",
    "surges",
    "forward",
    "strings",
    "blazing",
    "camera",
    "dollies",
    "crowd",
    "roars",
    "UV",
    "lights",
    "pulse",
    "rhythmically",
    "Shilshul",
    "emerges",
    "stage",
    "left",
    "energy",
    "builds",
    "festival",
  ];

  const result: string[] = [];
  for (let i = 0; i < wordCount; i++) {
    result.push(words[i % words.length]);
  }
  return result.join(" ");
}

/**
 * Assert that a violation matches expected structure
 */
export function assertViolationStructure(
  violation: unknown
): asserts violation is {
  rule: string;
  severity: "hard" | "warn";
  evidence: string;
} {
  if (typeof violation !== "object" || violation === null) {
    throw new Error("Violation must be an object");
  }

  const v = violation as Record<string, unknown>;

  if (typeof v.rule !== "string") {
    throw new Error("Violation.rule must be a string");
  }

  if (v.severity !== "hard" && v.severity !== "warn") {
    throw new Error("Violation.severity must be 'hard' or 'warn'");
  }

  if (typeof v.evidence !== "string") {
    throw new Error("Violation.evidence must be a string");
  }
}

/**
 * Type guard to check if a fixture is positive
 */
export function isPositiveFixture<T>(
  fixture: RuleFixture<T>
): fixture is PositiveFixture<T> {
  return fixture.expected.pass === true;
}

/**
 * Type guard to check if a fixture is negative
 */
export function isNegativeFixture<T>(
  fixture: RuleFixture<T>
): fixture is NegativeFixture<T> {
  return fixture.expected.pass === false;
}
