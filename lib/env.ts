import { z } from "zod";

const envSchema = z.object({
  // Database
  DATABASE_URL: z
    .string()
    .url()
    .describe("Supabase pooled connection string"),
  DIRECT_URL: z
    .string()
    .url()
    .describe("Direct connection for migrations"),

  // LLM providers (optional — degrades to export-only when none set)
  LLM_PROVIDER: z
    .enum(["anthropic", "deepseek", "auto"])
    .optional()
    .describe("Force provider; omit or 'auto' to pick from available keys"),
  ANTHROPIC_API_KEY: z
    .string()
    .optional()
    .describe("Anthropic API key for Claude"),
  ANTHROPIC_MODEL: z
    .string()
    .default("claude-sonnet-4-6")
    .describe("Claude model to use"),
  DEEPSEEK_API_KEY: z
    .string()
    .optional()
    .describe("DeepSeek API key (OpenAI-compatible)"),
  DEEPSEEK_MODEL: z
    .string()
    .default("deepseek-chat")
    .describe("DeepSeek model id"),

  // Authentication
  APP_USER: z.string().min(1).describe("Basic auth username"),
  APP_PASSWORD: z.string().min(1).describe("Basic auth password"),

  // Runtime
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    console.error(result.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables");
  }

  return result.data;
}

export const env = validateEnv();

// Export individual checks for conditional logic
export const hasAnthropicKey = Boolean(env.ANTHROPIC_API_KEY);
export const hasDeepseekKey = Boolean(env.DEEPSEEK_API_KEY);
export const hasLlmKey = hasAnthropicKey || hasDeepseekKey;
