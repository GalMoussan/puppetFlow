# Sub-Plan A: Phase 1 - Technical Documentation

**Date:** 2026-07-03
**Phase:** Documentation
**Sub-Manager:** Frontend Developer Agent (Sonnet 4.5)

## Overview

This document defines the technical architecture for the unified AI client infrastructure. This system will provide a consistent interface for interacting with three AI providers: OpenAI, Anthropic, and DeepSeek, with built-in retry logic, rate limiting, and comprehensive error handling.

## Architecture Goals

1. **Unified Interface**: Single consistent API across all providers
2. **Type Safety**: Strict TypeScript with no `any` types
3. **Immutability**: All operations return new objects (no mutations)
4. **Resilience**: Retry logic for transient failures
5. **Rate Limiting**: Prevent overwhelming APIs with concurrent requests
6. **Cost Tracking**: Token usage and cost estimation per request
7. **Testability**: All external dependencies mockable

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Application Layer                   │
│              (Agents, Orchestrator)                  │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│              BaseAIClient Interface                  │
│        (Abstract class with common methods)          │
└──────────────────────┬──────────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
    ┌────────┐   ┌────────┐   ┌────────┐
    │ OpenAI │   │Anthropic│   │DeepSeek│
    │ Client │   │ Client │   │ Client │
    └────┬───┘   └────┬───┘   └────┬───┘
         │            │            │
         ▼            ▼            ▼
    ┌────────┐   ┌────────┐   ┌────────┐
    │OpenAI  │   │Anthropic│   │DeepSeek│
    │  SDK   │   │   SDK  │   │  REST  │
    └────────┘   └────────┘   └────────┘

        Retry Logic (lib/retry.ts)
              │
              ▼
        Rate Limiter (lib/rate-limiter.ts)
              │
              ▼
        Config Loader (lib/config.ts)
```

## Core Components

### 1. Base AI Client (`lib/ai-clients/base-client.ts`)

Abstract base class that defines the contract all AI clients must implement:

```typescript
export abstract class BaseAIClient {
  // Provider identification
  abstract readonly provider: 'openai' | 'anthropic' | 'deepseek';
  abstract readonly models: string[];

  // Core operations
  abstract chat(request: ChatRequest): Promise<ChatResponse>;
  abstract estimateTokens(text: string): number;
  abstract calculateCost(tokens: number, model: string): number;

  // Common validation
  protected validateRequest(request: ChatRequest): void {
    if (!request.model || !this.models.includes(request.model)) {
      throw new Error(`Invalid model: ${request.model}`);
    }
    if (!request.messages || request.messages.length === 0) {
      throw new Error('Messages array cannot be empty');
    }
  }
}
```

**Design Decisions:**
- Abstract class (not interface) to provide common validation logic
- Readonly properties for provider metadata (immutability)
- Protected validation method shared by all implementations
- Token estimation and cost calculation abstracted (provider-specific)

### 2. Unified Types (`lib/ai-clients/types.ts`)

Type definitions that normalize differences between providers:

```typescript
export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  model: string;
  messages: Message[];
  temperature?: number; // 0.0 - 2.0, default 1.0
  maxTokens?: number; // Provider-specific max
  systemPrompt?: string; // Convenience for system message
}

export interface ChatResponse {
  content: string;
  usage: TokenUsage;
  model: string;
  finishReason: 'stop' | 'length' | 'error';
  rawResponse?: unknown; // Provider-specific response for debugging
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ModelPricing {
  inputCostPer1M: number; // Cost per 1M input tokens
  outputCostPer1M: number; // Cost per 1M output tokens
}
```

**Design Decisions:**
- Separate `systemPrompt` convenience field (will be converted to system message)
- `finishReason` normalized across providers
- Optional `rawResponse` for debugging without coupling to provider types
- Pricing in per-1M tokens format for clarity

### 3. OpenAI Client (`lib/ai-clients/openai-client.ts`)

Wraps the official OpenAI SDK:

```typescript
export class OpenAIClient extends BaseAIClient {
  readonly provider = 'openai' as const;
  readonly models = ['gpt-4o', 'gpt-4o-mini'];

  private readonly sdk: OpenAI;
  private readonly pricing: Record<string, ModelPricing> = {
    'gpt-4o': { inputCostPer1M: 15, outputCostPer1M: 60 },
    'gpt-4o-mini': { inputCostPer1M: 0.15, outputCostPer1M: 0.60 },
  };

  constructor(apiKey: string) {
    super();
    this.sdk = new OpenAI({ apiKey });
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    this.validateRequest(request);

    const messages = this.buildMessages(request);
    const response = await this.sdk.chat.completions.create({
      model: request.model,
      messages,
      temperature: request.temperature ?? 1.0,
      max_tokens: request.maxTokens,
    });

    return this.mapResponse(response);
  }

  estimateTokens(text: string): number {
    // Use tiktoken library with cl100k_base encoding
    const encoding = get_encoding('cl100k_base');
    const tokens = encoding.encode(text);
    encoding.free();
    return tokens.length;
  }

  calculateCost(tokens: number, model: string): number {
    const pricing = this.pricing[model];
    if (!pricing) return 0;
    return (tokens / 1_000_000) * pricing.inputCostPer1M;
  }

  private buildMessages(request: ChatRequest): OpenAI.ChatCompletionMessageParam[] {
    const messages: OpenAI.ChatCompletionMessageParam[] = [];

    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }

    messages.push(...request.messages.map(m => ({
      role: m.role,
      content: m.content,
    })));

    return messages;
  }

  private mapResponse(response: OpenAI.ChatCompletion): ChatResponse {
    const choice = response.choices[0];
    return {
      content: choice.message.content ?? '',
      usage: {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
      },
      model: response.model,
      finishReason: this.mapFinishReason(choice.finish_reason),
      rawResponse: response,
    };
  }

  private mapFinishReason(reason: string | null): 'stop' | 'length' | 'error' {
    if (reason === 'stop') return 'stop';
    if (reason === 'length') return 'length';
    return 'error';
  }
}
```

**Implementation Notes:**
- Uses official `openai` npm package (v4.x)
- `tiktoken` for accurate token counting (same as OpenAI's internal)
- Pricing hardcoded (could be moved to config in future)
- Memory management: `encoding.free()` to prevent leaks

### 4. Anthropic Client (`lib/ai-clients/anthropic-client.ts`)

Wraps the official Anthropic SDK:

```typescript
export class AnthropicClient extends BaseAIClient {
  readonly provider = 'anthropic' as const;
  readonly models = ['claude-opus-4', 'claude-sonnet-4', 'claude-haiku-4'];

  private readonly sdk: Anthropic;
  private readonly pricing: Record<string, ModelPricing> = {
    'claude-opus-4': { inputCostPer1M: 15, outputCostPer1M: 75 },
    'claude-sonnet-4': { inputCostPer1M: 3, outputCostPer1M: 15 },
    'claude-haiku-4': { inputCostPer1M: 0.25, outputCostPer1M: 1.25 },
  };

  constructor(apiKey: string) {
    super();
    this.sdk = new Anthropic({ apiKey });
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    this.validateRequest(request);

    // Anthropic requires system parameter separate from messages
    const { system, messages } = this.buildMessages(request);

    const response = await this.sdk.messages.create({
      model: request.model,
      system,
      messages,
      temperature: request.temperature ?? 1.0,
      max_tokens: request.maxTokens ?? 4096, // Required by Anthropic
    });

    return this.mapResponse(response);
  }

  estimateTokens(text: string): number {
    // Approximation: Claude's tokenizer ~= 0.3 tokens per character
    return Math.ceil(text.length * 0.3);
  }

  calculateCost(tokens: number, model: string): number {
    const pricing = this.pricing[model];
    if (!pricing) return 0;
    return (tokens / 1_000_000) * pricing.inputCostPer1M;
  }

  private buildMessages(request: ChatRequest): {
    system?: string;
    messages: Anthropic.MessageParam[];
  } {
    const messages: Anthropic.MessageParam[] = request.messages.map(m => ({
      role: m.role === 'system' ? 'user' : m.role, // Claude doesn't support system in messages
      content: m.content,
    }));

    return {
      system: request.systemPrompt,
      messages,
    };
  }

  private mapResponse(response: Anthropic.Message): ChatResponse {
    const content = response.content[0];
    const text = content.type === 'text' ? content.text : '';

    return {
      content: text,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
      model: response.model,
      finishReason: this.mapStopReason(response.stop_reason),
      rawResponse: response,
    };
  }

  private mapStopReason(reason: string | null): 'stop' | 'length' | 'error' {
    if (reason === 'end_turn') return 'stop';
    if (reason === 'max_tokens') return 'length';
    return 'error';
  }
}
```

**Implementation Notes:**
- Uses official `@anthropic-ai/sdk` package
- System prompt handled differently (separate parameter, not in messages)
- Token estimation is approximation (Claude doesn't expose tokenizer)
- `max_tokens` required by API (defaults to 4096)

### 5. DeepSeek Client (`lib/ai-clients/deepseek-client.ts`)

Uses axios for OpenAI-compatible REST API:

```typescript
export class DeepSeekClient extends BaseAIClient {
  readonly provider = 'deepseek' as const;
  readonly models = ['deepseek-chat'];

  private readonly axios: AxiosInstance;
  private readonly pricing: Record<string, ModelPricing> = {
    'deepseek-chat': { inputCostPer1M: 0.27, outputCostPer1M: 1.10 },
  };

  constructor(apiKey: string) {
    super();
    this.axios = axios.create({
      baseURL: 'https://api.deepseek.com',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000, // 60s timeout
    });
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    this.validateRequest(request);

    const messages = this.buildMessages(request);

    const response = await this.axios.post<DeepSeekResponse>('/v1/chat/completions', {
      model: request.model,
      messages,
      temperature: request.temperature ?? 1.0,
      max_tokens: request.maxTokens,
    });

    return this.mapResponse(response.data);
  }

  estimateTokens(text: string): number {
    // DeepSeek uses OpenAI-compatible tokenization
    const encoding = get_encoding('cl100k_base');
    const tokens = encoding.encode(text);
    encoding.free();
    return tokens.length;
  }

  calculateCost(tokens: number, model: string): number {
    const pricing = this.pricing[model];
    if (!pricing) return 0;
    return (tokens / 1_000_000) * pricing.inputCostPer1M;
  }

  private buildMessages(request: ChatRequest): Array<{ role: string; content: string }> {
    const messages: Array<{ role: string; content: string }> = [];

    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }

    messages.push(...request.messages);
    return messages;
  }

  private mapResponse(response: DeepSeekResponse): ChatResponse {
    const choice = response.choices[0];
    return {
      content: choice.message.content,
      usage: {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      },
      model: response.model,
      finishReason: this.mapFinishReason(choice.finish_reason),
      rawResponse: response,
    };
  }

  private mapFinishReason(reason: string): 'stop' | 'length' | 'error' {
    if (reason === 'stop') return 'stop';
    if (reason === 'length') return 'length';
    return 'error';
  }
}

interface DeepSeekResponse {
  model: string;
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
```

**Implementation Notes:**
- OpenAI-compatible API (same request/response format)
- Manual axios configuration (no official SDK)
- Same tokenization as OpenAI (tiktoken)
- 60s timeout for long-running requests

### 6. Retry Logic (`lib/retry.ts`)

Exponential backoff retry strategy:

```typescript
export interface RetryOptions {
  maxAttempts: number; // Default: 3
  backoffMs: number[]; // [2000, 4000, 8000]
  shouldRetry: (error: unknown) => boolean;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const { maxAttempts, backoffMs, shouldRetry } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isLastAttempt = attempt === maxAttempts;
      const shouldRetryError = shouldRetry(error);

      if (isLastAttempt || !shouldRetryError) {
        throw error;
      }

      const delayMs = backoffMs[attempt - 1] ?? backoffMs[backoffMs.length - 1];
      await delay(delayMs);
    }
  }

  // TypeScript exhaustiveness check
  throw new Error('Retry loop completed without return or throw');
}

export function isRetryableError(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    // Retry on: rate limit, server errors, network errors
    return (
      status === 429 || // Rate limit
      status === 500 || // Internal server error
      status === 502 || // Bad gateway
      status === 503 || // Service unavailable
      error.code === 'ECONNRESET' ||
      error.code === 'ETIMEDOUT'
    );
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('econnreset')
    );
  }

  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  backoffMs: [2000, 4000, 8000],
  shouldRetry: isRetryableError,
};
```

**Design Decisions:**
- Exponential backoff: 2s → 4s → 8s (prevents thundering herd)
- Don't retry on 401 (auth error), 400 (bad request), 404 (not found)
- Retry on transient errors: 429, 500-503, network errors
- Configurable retry predicate for flexibility

### 7. Rate Limiter (`lib/rate-limiter.ts`)

Token bucket rate limiter:

```typescript
export interface RateLimiterOptions {
  maxConcurrent: number; // Default: 5
  minDelayMs: number; // Default: 100
}

export class RateLimiter {
  private queue: Array<() => void> = [];
  private activeCount: number = 0;
  private readonly maxConcurrent: number;
  private readonly minDelayMs: number;

  constructor(options: RateLimiterOptions) {
    this.maxConcurrent = options.maxConcurrent;
    this.minDelayMs = options.minDelayMs;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Wait for available slot
    while (this.activeCount >= this.maxConcurrent) {
      await this.waitForSlot();
    }

    this.activeCount++;

    try {
      const result = await fn();
      await this.delay(this.minDelayMs);
      return result;
    } finally {
      this.activeCount--;
      this.processQueue();
    }
  }

  private waitForSlot(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  private processQueue(): void {
    const resolve = this.queue.shift();
    if (resolve) {
      resolve();
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // For testing: get current state
  getStats(): { activeCount: number; queueLength: number } {
    return {
      activeCount: this.activeCount,
      queueLength: this.queue.length,
    };
  }
}

export const DEFAULT_RATE_LIMITER_OPTIONS: RateLimiterOptions = {
  maxConcurrent: 5,
  minDelayMs: 100,
};
```

**Design Decisions:**
- Concurrency limit (5 simultaneous requests)
- Minimum delay between requests (100ms) to avoid bursts
- Queue-based waiting (FIFO)
- Immutable stats for monitoring

### 8. Configuration (`lib/config.ts`)

Environment-based configuration:

```typescript
export interface AIConfig {
  openai: {
    apiKey: string;
    defaultModel: string;
  };
  anthropic: {
    apiKey: string;
    defaultModel: string;
  };
  deepseek: {
    apiKey: string;
    defaultModel: string;
  };
  retry: RetryOptions;
  rateLimiter: RateLimiterOptions;
}

export function loadConfig(): AIConfig {
  const config: AIConfig = {
    openai: {
      apiKey: getEnvVar('OPENAI_API_KEY'),
      defaultModel: process.env.OPENAI_DEFAULT_MODEL ?? 'gpt-4o-mini',
    },
    anthropic: {
      apiKey: getEnvVar('ANTHROPIC_API_KEY'),
      defaultModel: process.env.ANTHROPIC_DEFAULT_MODEL ?? 'claude-sonnet-4',
    },
    deepseek: {
      apiKey: getEnvVar('DEEPSEEK_API_KEY'),
      defaultModel: process.env.DEEPSEEK_DEFAULT_MODEL ?? 'deepseek-chat',
    },
    retry: {
      maxAttempts: parseInt(process.env.RETRY_MAX_ATTEMPTS ?? '3', 10),
      backoffMs: [2000, 4000, 8000],
      shouldRetry: isRetryableError,
    },
    rateLimiter: {
      maxConcurrent: parseInt(process.env.RATE_LIMIT_MAX_CONCURRENT ?? '5', 10),
      minDelayMs: parseInt(process.env.RATE_LIMIT_MIN_DELAY_MS ?? '100', 10),
    },
  };

  validateConfig(config);
  return config;
}

function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function validateConfig(config: AIConfig): void {
  // Validate API keys format
  if (config.openai.apiKey.length < 10) {
    throw new Error('Invalid OpenAI API key');
  }
  if (config.anthropic.apiKey.length < 10) {
    throw new Error('Invalid Anthropic API key');
  }
  if (config.deepseek.apiKey.length < 10) {
    throw new Error('Invalid DeepSeek API key');
  }

  // Validate numeric ranges
  if (config.retry.maxAttempts < 1 || config.retry.maxAttempts > 10) {
    throw new Error('retry.maxAttempts must be between 1 and 10');
  }
  if (config.rateLimiter.maxConcurrent < 1 || config.rateLimiter.maxConcurrent > 20) {
    throw new Error('rateLimiter.maxConcurrent must be between 1 and 20');
  }
  if (config.rateLimiter.minDelayMs < 0 || config.rateLimiter.minDelayMs > 5000) {
    throw new Error('rateLimiter.minDelayMs must be between 0 and 5000');
  }
}
```

**Design Decisions:**
- Fail fast on missing API keys (better than runtime errors)
- Sensible defaults for optional config
- Validation prevents invalid configuration
- Immutable config object

## Error Handling Strategy

All errors follow consistent patterns:

1. **Validation Errors**: Thrown immediately with clear messages
2. **API Errors**: Wrapped with provider context
3. **Network Errors**: Retried with exponential backoff
4. **Rate Limit Errors**: Retried after delay

```typescript
export class AIClientError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'AIClientError';
  }
}
```

## Testing Strategy

### Unit Tests (80+ tests)

1. **Base Client Tests** (`base-client.test.ts`):
   - Interface compliance
   - Validation logic
   - Abstract method enforcement

2. **OpenAI Client Tests** (`openai-client.test.ts`):
   - SDK initialization
   - Message formatting (with/without system prompt)
   - Response mapping
   - Token estimation (tiktoken)
   - Cost calculation
   - Error handling
   - Mock all SDK calls

3. **Anthropic Client Tests** (`anthropic-client.test.ts`):
   - SDK initialization
   - System prompt extraction
   - Response mapping (content blocks)
   - Token estimation (approximation)
   - Cost calculation
   - Error handling
   - Mock all SDK calls

4. **DeepSeek Client Tests** (`deepseek-client.test.ts`):
   - Axios configuration
   - Request formatting
   - Response mapping
   - Token estimation (tiktoken)
   - Cost calculation
   - Error handling
   - Mock all HTTP calls

5. **Config Tests** (`config.test.ts`):
   - Environment variable loading
   - Missing required vars (should throw)
   - Default values
   - Validation (API key length, numeric ranges)

6. **Rate Limiter Tests** (`rate-limiter.test.ts`):
   - Concurrency limiting
   - Queue management (FIFO)
   - Delay enforcement
   - Stats reporting
   - Use fake timers

7. **Retry Tests** (`retry.test.ts`):
   - Successful first attempt
   - Retry on transient errors (429, 500)
   - No retry on permanent errors (401, 400)
   - Exponential backoff timing
   - Max attempts enforcement
   - Use fake timers

## Dependencies

```json
{
  "dependencies": {
    "openai": "^4.77.3",
    "@anthropic-ai/sdk": "^0.35.0",
    "tiktoken": "^1.0.19",
    "axios": "^1.7.9"
  },
  "devDependencies": {
    "@types/node": "^22.0.0"
  }
}
```

## File Structure

```
lib/
├── ai-clients/
│   ├── base-client.ts         # Abstract base class
│   ├── openai-client.ts       # OpenAI implementation
│   ├── anthropic-client.ts    # Anthropic implementation
│   ├── deepseek-client.ts     # DeepSeek implementation
│   ├── types.ts               # Unified types
│   └── errors.ts              # Custom error classes
├── config.ts                  # Configuration loader
├── rate-limiter.ts            # Rate limiting
└── retry.ts                   # Retry logic

tests/
└── ai-clients/
    ├── base-client.test.ts
    ├── openai-client.test.ts
    ├── anthropic-client.test.ts
    ├── deepseek-client.test.ts
    ├── config.test.ts
    ├── rate-limiter.test.ts
    └── retry.test.ts
```

## Integration Points

The AI clients will be used by:

1. **Agent Implementations** (Sub-Plan B):
   - Lead Qualifier
   - Content Generator
   - CRM Updater
   - Performance Reporter

2. **Orchestrator** (existing):
   - Mode selection (simulated vs live-ai)
   - Error propagation
   - Logging

## Success Criteria

- [ ] All types defined with strict TypeScript
- [ ] All 3 clients implement BaseAIClient
- [ ] Config validates API keys at startup
- [ ] Retry works for 429, 500-503 errors
- [ ] Rate limiter enforces concurrency limits
- [ ] 80+ unit tests written
- [ ] All tests pass with mocked dependencies
- [ ] No actual API calls in tests
- [ ] Code follows immutability principles
- [ ] Error messages are clear and actionable

## Next Steps

**Phase 2: Write Tests (TDD)**
- Create all test files
- Write 80+ unit tests BEFORE implementation
- Ensure tests fail initially (RED state)

**Phase 3: Implementation**
- Implement all clients to make tests pass
- Verify all 80+ tests passing (GREEN state)
- Install dependencies

**Phase 4: Completion**
- Final journal entry
- Return STATUS: READY_FOR_TESTING

---

**Phase 1 Complete**: Technical documentation defines the architecture, contracts, and testing strategy. Ready to proceed to Phase 2: Test Writing.
