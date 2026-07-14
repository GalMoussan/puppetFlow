/**
 * LLM provider selection
 *
 * @module lib/llm-provider
 */

export type LlmProvider = "anthropic" | "deepseek";

/**
 * Resolve active provider.
 * - Explicit LLM_PROVIDER wins
 * - Else DeepSeek if only DEEPSEEK_API_KEY is set
 * - Else Anthropic if ANTHROPIC_API_KEY is set
 * - Else DeepSeek if DEEPSEEK_API_KEY is set
 * - Default "anthropic" for error messaging when nothing configured
 */
export function getLlmProvider(): LlmProvider {
  const explicit = process.env.LLM_PROVIDER?.toLowerCase();
  // "auto" or unset → pick from keys
  if (explicit === "deepseek" || explicit === "anthropic") {
    return explicit;
  }

  const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY);
  const hasDeepseek = Boolean(process.env.DEEPSEEK_API_KEY);

  if (hasDeepseek && !hasAnthropic) return "deepseek";
  if (hasAnthropic) return "anthropic";
  if (hasDeepseek) return "deepseek";
  return "anthropic";
}

export function hasLlmKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.DEEPSEEK_API_KEY);
}
