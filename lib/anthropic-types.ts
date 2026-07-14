/**
 * Shared LLM output types (provider-agnostic)
 *
 * @module lib/anthropic-types
 */

import { z } from "zod";

export interface GeneratedScene {
  lyrics: string;
  imagePrompt: string;
  startPrompt: string;
  middlePrompt: string;
  endPrompt: string;
  boundaryFrame1: string;
  boundaryFrame2: string;
  finalFrame: string;
}

export const BatchOutputSchema = z.object({
  scenes: z.array(
    z.object({
      lyrics: z.string(),
      imagePrompt: z.string(),
      startPrompt: z.string(),
      middlePrompt: z.string(),
      endPrompt: z.string(),
      boundaryFrame1: z.string(),
      boundaryFrame2: z.string(),
      finalFrame: z.string(),
    })
  ),
});

export type BatchOutput = z.infer<typeof BatchOutputSchema>;

export interface GenerationOptions {
  temperature?: number;
  maxTokens?: number;
}
