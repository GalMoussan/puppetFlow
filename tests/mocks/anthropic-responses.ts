/**
 * Mock Anthropic API Responses
 *
 * Fixtures for testing the Anthropic client, including valid batch outputs,
 * streaming chunks, and error responses.
 */

import type { BatchOutput, Scene, ComboAssignment } from "@/packages/domain/types";

// =============================================================================
// API Response Types (what Anthropic returns - before DB fields added)
// =============================================================================

/**
 * Generated scene from Anthropic API (only the 8 generated fields)
 * This matches the BatchOutputSchema in lib/anthropic.ts
 */
export interface GeneratedSceneOutput {
  lyrics: string;
  imagePrompt: string;
  startPrompt: string;
  middlePrompt: string;
  endPrompt: string;
  boundaryFrame1: string;
  boundaryFrame2: string;
  finalFrame: string;
}

/**
 * API batch output format (matches lib/anthropic.ts BatchOutputSchema)
 */
export interface ApiBatchOutput {
  scenes: GeneratedSceneOutput[];
}

/**
 * Create a generated scene for API response mocking
 * This only includes the 8 fields that come from Anthropic
 */
export function createMockGeneratedSceneOutput(index: number = 0): GeneratedSceneOutput {
  return {
    lyrics: `[Intro]\nShika! Shika! Shilshul! Shilshul!\n\n[Verse ${index + 1}]\nStrings of light illuminate the stage...`,
    imagePrompt: `A dramatic festival stage at sunset, Scene ${index + 1}. Massive LED screens display pulsing visuals. Two puppet figures, Shika and Shilshul, stand center stage with neon-glowing strings trailing behind them. The crowd of 50,000 stretches to the horizon. Camera angle: wide establishing shot. Style: cinematic 4K, high contrast, golden hour lighting.`,
    startPrompt: `[00:00] Shika surges forward from stage-left, neon strings blazing electric blue. Camera dollies in smoothly as the bass drops. Shilshul mirrors from stage-right, golden strings interweaving. The crowd roars, UV lights pulsing rhythmically across 50,000 raised hands. Energy builds toward the first drop.`,
    middlePrompt: `[00:00] Continue directly from the previous frame. Shika and Shilshul now center stage, strings fully entangled in a chaotic yet beautiful pattern. Camera pans 180 degrees as the beat intensifies. Rogue balloon drifts across frame left-to-right. Crowd chant builds: "Shika! Shilshul!"`,
    endPrompt: `[00:00] Continue directly from the previous frame. Final payoff as both puppets raise strings skyward. Camera cranes up revealing the full festival scope. Crowd sync moment achieved - 50,000 in perfect unison. Strings explode into particles of light. Loop-ready composition with mirrored framing of opening.`,
    boundaryFrame1: `ENDING FRAME [EXACT]: Shika stage-left, Shilshul stage-right, strings interweaved center. Camera angle: medium wide. Crowd visible in background with UV lights at 60% intensity. Golden hour lighting, warm tones dominant. Both puppets facing audience.`,
    boundaryFrame2: `ENDING FRAME [EXACT]: Both puppets center stage, strings raised at 45 degrees. Camera angle: low angle looking up. Full crowd visible in periphery. Rogue balloon visible upper-right. Energy peak moment captured.`,
    finalFrame: `FINAL FRAME: Mirror composition of opening shot. Shika and Shilshul returned to starting positions but with string particles floating. Camera wide establishing. Ready for loop back to start. Crowd energy sustained.`,
  };
}

/**
 * Create an API batch output for testing lib/anthropic.ts
 */
export function createMockApiBatchOutput(sceneCount: number = 5): ApiBatchOutput {
  return {
    scenes: Array.from({ length: sceneCount }, (_, i) => createMockGeneratedSceneOutput(i)),
  };
}

// =============================================================================
// Domain Types (full Scene objects for domain tests)
// =============================================================================

/**
 * Create a valid combo assignment for testing
 */
export function createMockCombo(overrides: Partial<ComboAssignment> = {}): ComboAssignment {
  return {
    stageArea: "Main Stage",
    festivalMoment: "Sunset Arrival",
    dynamic: "Synchronized puppetry",
    visual: "Neon strings",
    hook: "String explosion",
    gag: "Tangled strings",
    camera: { start: "dolly", middle: "pan", end: "crane up" },
    payoff: "Crowd sync",
    chaosThread: "Rogue balloon",
    language: "hi",
    subgenre: "psycore",
    ...overrides,
  };
}

/**
 * Create a valid scene for testing
 */
export function createMockScene(index: number, runId: string = "run-1"): Scene {
  return {
    id: `scene-${index}`,
    runId,
    index,
    combo: createMockCombo(),
    lyrics: `[Intro]\nShika! Shika! Shilshul! Shilshul!\n\n[Verse ${index + 1}]\nStrings of light illuminate the stage...`,
    imagePrompt: `A dramatic festival stage at sunset, Scene ${index + 1}. Massive LED screens display pulsing visuals. Two puppet figures, Shika and Shilshul, stand center stage with neon-glowing strings trailing behind them. The crowd of 50,000 stretches to the horizon. Camera angle: wide establishing shot. Style: cinematic 4K, high contrast, golden hour lighting.`,
    startPrompt: `[00:00] Shika surges forward from stage-left, neon strings blazing electric blue. Camera dollies in smoothly as the bass drops. Shilshul mirrors from stage-right, golden strings interweaving. The crowd roars, UV lights pulsing rhythmically across 50,000 raised hands. Energy builds toward the first drop.`,
    middlePrompt: `[00:00] Continue directly from the previous frame. Shika and Shilshul now center stage, strings fully entangled in a chaotic yet beautiful pattern. Camera pans 180 degrees as the beat intensifies. Rogue balloon drifts across frame left-to-right. Crowd chant builds: "Shika! Shilshul!"`,
    endPrompt: `[00:00] Continue directly from the previous frame. Final payoff as both puppets raise strings skyward. Camera cranes up revealing the full festival scope. Crowd sync moment achieved - 50,000 in perfect unison. Strings explode into particles of light. Loop-ready composition with mirrored framing of opening.`,
    boundaryFrame1: `ENDING FRAME [EXACT]: Shika stage-left, Shilshul stage-right, strings interweaved center. Camera angle: medium wide. Crowd visible in background with UV lights at 60% intensity. Golden hour lighting, warm tones dominant. Both puppets facing audience.`,
    boundaryFrame2: `ENDING FRAME [EXACT]: Both puppets center stage, strings raised at 45 degrees. Camera angle: low angle looking up. Full crowd visible in periphery. Rogue balloon visible upper-right. Energy peak moment captured.`,
    finalFrame: `FINAL FRAME: Mirror composition of opening shot. Shika and Shilshul returned to starting positions but with string particles floating. Camera wide establishing. Ready for loop back to start. Crowd energy sustained.`,
    lintReport: [],
    notes: null,
  };
}

/**
 * Create a valid batch output with 5 scenes
 */
export function createMockBatchOutput(runId: string = "run-1", sceneCount: number = 5): BatchOutput {
  return {
    scenes: Array.from({ length: sceneCount }, (_, i) => createMockScene(i, runId)),
  };
}

/**
 * Valid batch output fixture
 */
export const validBatchOutput: BatchOutput = createMockBatchOutput("run-1", 5);

/**
 * Mock Anthropic streaming chunk
 */
export interface MockStreamChunk {
  type: "content_block_delta" | "content_block_start" | "content_block_stop" | "message_stop";
  index?: number;
  delta?: {
    type: "text_delta";
    text: string;
  };
  content_block?: {
    type: "tool_use";
    id: string;
    name: string;
    input: Record<string, unknown>;
  };
}

/**
 * Create mock streaming chunks for testing
 */
export function createMockStreamChunks(output: BatchOutput): MockStreamChunk[] {
  const jsonOutput = JSON.stringify(output);
  const chunkSize = 100;
  const chunks: MockStreamChunk[] = [];

  // Start event
  chunks.push({
    type: "content_block_start",
    index: 0,
    content_block: {
      type: "tool_use",
      id: "tool_1",
      name: "batch_output",
      input: {},
    },
  });

  // Split output into chunks
  for (let i = 0; i < jsonOutput.length; i += chunkSize) {
    chunks.push({
      type: "content_block_delta",
      index: 0,
      delta: {
        type: "text_delta",
        text: jsonOutput.slice(i, i + chunkSize),
      },
    });
  }

  // Stop events
  chunks.push({ type: "content_block_stop" });
  chunks.push({ type: "message_stop" });

  return chunks;
}

/**
 * Mock 429 rate limit response
 */
export const rateLimitResponse = {
  status: 429,
  statusText: "Too Many Requests",
  headers: {
    "retry-after": "5",
  },
  body: {
    type: "error",
    error: {
      type: "rate_limit_error",
      message: "Rate limit exceeded. Please retry after 5 seconds.",
    },
  },
};

/**
 * Mock 400 validation error response
 */
export const validationErrorResponse = {
  status: 400,
  statusText: "Bad Request",
  body: {
    type: "error",
    error: {
      type: "invalid_request_error",
      message: "Invalid request parameters",
    },
  },
};

/**
 * Mock 401 authentication error response
 */
export const authErrorResponse = {
  status: 401,
  statusText: "Unauthorized",
  body: {
    type: "error",
    error: {
      type: "authentication_error",
      message: "Invalid API key",
    },
  },
};

/**
 * Mock 500 server error response
 */
export const serverErrorResponse = {
  status: 500,
  statusText: "Internal Server Error",
  body: {
    type: "error",
    error: {
      type: "api_error",
      message: "Internal server error",
    },
  },
};

/**
 * Mock context length exceeded error
 */
export const contextLengthExceededResponse = {
  status: 400,
  statusText: "Bad Request",
  body: {
    type: "error",
    error: {
      type: "invalid_request_error",
      message: "context_length_exceeded: Request exceeds maximum context length of 200000 tokens",
    },
  },
};

/**
 * Mock invalid batch output (missing required field)
 */
export const invalidBatchOutput = {
  scenes: [
    {
      id: 123, // Should be string
      runId: "run-1",
      index: 0,
      // Missing combo and other required fields
    },
  ],
};

/**
 * Mock batch output with lint violations
 */
export function createMockBatchOutputWithViolations(
  runId: string = "run-1"
): BatchOutput {
  const scenes = createMockBatchOutput(runId, 5).scenes;

  // Add violations to scene 1 and scene 3
  scenes[1] = {
    ...scenes[1],
    lintReport: [
      {
        rule: "R2",
        severity: "hard",
        sceneIndex: 1,
        stage: "VIDEO_START",
        evidence: "No camera verb detected in startPrompt",
      },
    ],
  };

  scenes[3] = {
    ...scenes[3],
    lintReport: [
      {
        rule: "R3",
        severity: "hard",
        sceneIndex: 3,
        stage: "EXTEND_MIDDLE",
        evidence: "3 generic verbs detected: 'moves', 'goes', 'is' (max 2 allowed)",
      },
    ],
  };

  return { scenes };
}
