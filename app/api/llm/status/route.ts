/**
 * GET /api/llm/status
 * Public LLM config for the run modal (no secrets).
 */

import { NextResponse } from "next/server";
import { getLlmProvider, hasLlmKey } from "@/lib/llm-provider";
import { getModelName } from "@/lib/anthropic";

const ANTHROPIC_MODELS = [
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4" },
  { value: "claude-opus-4-20250514", label: "Claude Opus 4" },
  { value: "claude-haiku-4-20250514", label: "Claude Haiku 4" },
];

const DEEPSEEK_MODELS = [
  { value: "deepseek-chat", label: "DeepSeek Chat" },
  { value: "deepseek-reasoner", label: "DeepSeek Reasoner" },
];

export async function GET() {
  const provider = getLlmProvider();
  const models = provider === "deepseek" ? DEEPSEEK_MODELS : ANTHROPIC_MODELS;
  const defaultModel = getModelName();

  // Ensure default is in the list
  const list = models.some((m) => m.value === defaultModel)
    ? models
    : [{ value: defaultModel, label: defaultModel }, ...models];

  return NextResponse.json({
    provider,
    hasKey: hasLlmKey(),
    defaultModel,
    models: list,
  });
}
