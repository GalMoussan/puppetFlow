# Pipeline: Phase 2 - Live AI Integration

**ID**: 20260703-phase2-live-ai-integration
**Status**: Ready
**Type**: Expand
**Module(s)**: API Integration, Agent System, State Management, UI Components
**Created**: 2026-07-03
**Work Directory**: /Users/galmoussan/projects/claude/agent-orchestrator

## Design Summary

Extend the Multi-Agent Workflow Orchestrator (Phase 1: 478 passing tests) with live AI integration supporting three providers: OpenAI (GPT-4o, GPT-4o-mini), Anthropic (Claude Opus, Sonnet, Haiku), and DeepSeek (DeepSeek-V3).

**Key Features**:
- **Hybrid Key Management**: Client-side (localStorage) for free demos, server-side (Supabase) for production users
- **Cost Tracking**: Pre-workflow estimation using tiktoken library (5-10% accuracy), real-time tracking, usage history, CSV export
- **Smart Provider Selection**: Default to DeepSeek (cheapest), cascade fallback to Anthropic/OpenAI on failure, user override available
- **Prompt Customization**: Industry templates (Technology, Healthcare, Finance, Retail, Education) + advanced mode for full editing
- **Retry Logic**: 3 retries with exponential backoff (2s/4s/8s) for resilience

**Backward Compatibility**: All 478 existing tests continue passing in simulated mode. Live mode is additive, not breaking.

## Design Decisions

**Q1: API Client Error Handling Strategy**
- **Decision**: Option B - Moderate (3 retries, exponential backoff 2s/4s/8s)
- **Rationale**: Industry standard, balances success rate with reasonable latency. Most failures resolve within 3 attempts.

**Q2: Cost Estimation Accuracy vs Speed**
- **Decision**: Option B - Accurate Estimate (tiktoken library)
- **Rationale**: Accuracy matters for cost-sensitive users. 50ms latency is acceptable for pre-workflow estimation. 5-10% accuracy vs 20-30% with naive approach.

**Q3: Prompt Template Storage**
- **Decision**: Option C - Hybrid (localStorage + optional Supabase sync)
- **Rationale**: Freemium enabler. Free users get immediate local storage, paid users upgrade to cross-device sync. Natural upgrade path.

**Q4: AI Provider Selection Logic**
- **Decision**: Option D + Option C - Cost-optimized default with cascade fallback
- **Rationale**: DeepSeek is cheapest (~$0.50/1M tokens vs $2.50-$15/1M for others). Fallback ensures reliability. User override for quality needs.

**Q5: Live Mode Testing Strategy**
- **Decision**: Option A + Option C - Mock in CI/CD, nightly real API tests
- **Rationale**: Fast CI/CD (<60s), real API validation nightly catches breaking changes. Balances speed and confidence.

**Q6: Prompt Template Industries**
- **Decision**: Keep current 5 (Technology, Healthcare, Financial Services, Retail, Education)
- **Rationale**: Cover 80% of B2B use cases. Additional industries can be added in Phase 3 marketplace.

**Q7: Sub-Plan Decomposition**
- **Decision**: Approved 6 sub-plans across 4 waves
- **Rationale**: Clear dependencies, parallel execution where possible, logical grouping by concern.

---

## Sub-Plan Decomposition

### Sub-Plan A: API Client Infrastructure

**Scope**: Build unified API client abstraction supporting OpenAI, Anthropic, and DeepSeek with retry logic, rate limiting, and error handling.

**Dependencies**: None

**Outputs**:
- `lib/ai-clients/base-client.ts` - Abstract base class for all providers
- `lib/ai-clients/openai-client.ts` - OpenAI integration (GPT-4o, GPT-4o-mini)
- `lib/ai-clients/anthropic-client.ts` - Anthropic integration (Opus, Sonnet, Haiku)
- `lib/ai-clients/deepseek-client.ts` - DeepSeek integration (DeepSeek-V3)
- `lib/ai-clients/types.ts` - Unified request/response types
- `lib/config.ts` - Configuration loader (API keys, model settings, retry config)
- `lib/rate-limiter.ts` - Rate limiting queue manager
- `lib/retry.ts` - Exponential backoff retry logic

**Test Scope**:
- Unit tests: `tests/ai-clients/*.test.ts` (80+ tests)
  - `base-client.test.ts` - Abstract interface compliance
  - `openai-client.test.ts` - OpenAI SDK integration (mocked)
  - `anthropic-client.test.ts` - Anthropic SDK integration (mocked)
  - `deepseek-client.test.ts` - DeepSeek API integration (mocked)
  - `config.test.ts` - Environment variable validation
  - `rate-limiter.test.ts` - Queue management, concurrency limits
  - `retry.test.ts` - Exponential backoff logic, error classification

**Key Files to Create**:
```
lib/
├── ai-clients/
│   ├── base-client.ts
│   ├── openai-client.ts
│   ├── anthropic-client.ts
│   ├── deepseek-client.ts
│   └── types.ts
├── config.ts
├── rate-limiter.ts
└── retry.ts

tests/
├── ai-clients/
│   ├── base-client.test.ts
│   ├── openai-client.test.ts
│   ├── anthropic-client.test.ts
│   ├── deepseek-client.test.ts
│   ├── config.test.ts
│   ├── rate-limiter.test.ts
│   └── retry.test.ts
```

**Phases**: Doc → Test → Code

**Details**:

**Base Client Interface**:
```typescript
export abstract class BaseAIClient {
  abstract readonly provider: 'openai' | 'anthropic' | 'deepseek';
  abstract readonly models: string[];

  abstract chat(request: ChatRequest): Promise<ChatResponse>;
  abstract estimateTokens(text: string): number;
  abstract calculateCost(tokens: number, model: string): number;
}

export interface ChatRequest {
  model: string;
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface ChatResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason: 'stop' | 'length' | 'error';
}
```

**OpenAI Client Implementation**:
- SDK: `openai` npm package (latest)
- Models: `gpt-4o` ($15/1M input, $60/1M output), `gpt-4o-mini` ($0.15/1M input, $0.60/1M output)
- Error handling: Map OpenAI errors to standard error types (401, 429, 500)
- Token estimation: Use `tiktoken` library (cl100k_base encoding)

**Anthropic Client Implementation**:
- SDK: `@anthropic-ai/sdk` npm package (latest)
- Models: `claude-opus-4` ($15/1M), `claude-sonnet-4` ($3/1M), `claude-haiku-4` ($0.25/1M)
- Error handling: Map Anthropic errors to standard error types
- Token estimation: Use Anthropic's recommended approximation (character count * 0.3)

**DeepSeek Client Implementation**:
- SDK: `axios` (DeepSeek uses OpenAI-compatible REST API)
- Models: `deepseek-chat` ($0.27/1M input, $1.10/1M output)
- Endpoint: `https://api.deepseek.com/v1/chat/completions`
- Error handling: Map HTTP status codes to standard error types
- Token estimation: Use tiktoken (same as OpenAI)

**Config System**:
```typescript
export interface AppConfig {
  openai?: {
    apiKey: string;
    defaultModel: string;
  };
  anthropic?: {
    apiKey: string;
    defaultModel: string;
  };
  deepseek?: {
    apiKey: string;
    defaultModel: string;
  };
  retry: {
    maxAttempts: number;      // 3
    backoffMs: number[];       // [2000, 4000, 8000]
  };
  rateLimit: {
    maxConcurrent: number;     // 5
    minDelayMs: number;        // 100
  };
}

export function loadConfig(): AppConfig {
  return {
    openai: process.env.OPENAI_API_KEY ? {
      apiKey: process.env.OPENAI_API_KEY,
      defaultModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    } : undefined,
    // ... similar for other providers
  };
}
```

**Retry Logic**:
```typescript
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const { maxAttempts, backoffMs, shouldRetry } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts || !shouldRetry(error)) {
        throw error;
      }
      await delay(backoffMs[attempt - 1]);
    }
  }
}

function shouldRetry(error: any): boolean {
  // Retry on: 429 (rate limit), 500/502/503 (server errors), network errors
  // Don't retry on: 401 (auth), 400 (bad request), 404 (not found)
  return [429, 500, 502, 503].includes(error.status) || error.code === 'ECONNRESET';
}
```

**Rate Limiter**:
```typescript
export class RateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private active: number = 0;

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    while (this.active >= this.maxConcurrent) {
      await this.waitForSlot();
    }

    this.active++;
    try {
      const result = await fn();
      await delay(this.minDelayMs);
      return result;
    } finally {
      this.active--;
    }
  }
}
```

**Success Criteria**:
- All API clients implement BaseAIClient interface
- Config system validates required API keys
- Retry logic works for transient failures (429, 500)
- Rate limiter prevents >5 concurrent requests
- 80+ unit tests passing
- No actual API calls in tests (all mocked)

---

### Sub-Plan B: Hybrid Key Management

**Scope**: Build key storage system supporting client-side (localStorage) and server-side (Supabase) modes with encryption and graceful fallback.

**Dependencies**: None (independent of Sub-Plan A)

**Outputs**:
- `lib/key-storage/client-storage.ts` - localStorage implementation
- `lib/key-storage/server-storage.ts` - Supabase implementation
- `lib/key-storage/types.ts` - Storage interface and types
- `app/api/keys/route.ts` - Next.js API route for server-side key CRUD
- Supabase schema migration for `api_keys` table
- UI component: `components/settings/ApiKeyManager.tsx`

**Test Scope**:
- Unit tests: `tests/key-storage/*.test.ts` (40+ tests)
  - `client-storage.test.ts` - localStorage operations, encryption
  - `server-storage.test.ts` - Supabase operations (mocked)
  - `key-manager.test.ts` - Unified interface, fallback logic
- Integration tests: `tests/integration/key-management.test.ts` (15 tests)
  - Client-side mode full workflow
  - Server-side mode full workflow
  - Fallback from server to client on error
  - Key masking in logs and exports

**Key Files to Create**:
```
lib/
└── key-storage/
    ├── client-storage.ts
    ├── server-storage.ts
    ├── key-manager.ts
    └── types.ts

app/
└── api/
    └── keys/
        └── route.ts

components/
└── settings/
    ├── ApiKeyManager.tsx
    └── ApiKeyManager.test.tsx

supabase/
└── migrations/
    └── 20260703_create_api_keys_table.sql
```

**Phases**: Doc → Test → Code

**Details**:

**Storage Interface**:
```typescript
export interface KeyStorage {
  saveKey(provider: Provider, key: string): Promise<void>;
  getKey(provider: Provider): Promise<string | null>;
  deleteKey(provider: Provider): Promise<void>;
  listProviders(): Promise<Provider[]>;
}

export type Provider = 'openai' | 'anthropic' | 'deepseek';
```

**Client-Side Storage** (localStorage):
```typescript
export class ClientKeyStorage implements KeyStorage {
  private readonly storageKey = 'agent-orchestrator-api-keys';

  async saveKey(provider: Provider, key: string): Promise<void> {
    const keys = this.loadKeys();
    keys[provider] = this.encrypt(key);
    localStorage.setItem(this.storageKey, JSON.stringify(keys));
  }

  private encrypt(key: string): string {
    // Simple XOR encryption with browser fingerprint
    // Note: Not cryptographically secure, just obfuscation
    const fingerprint = this.getBrowserFingerprint();
    return btoa(this.xor(key, fingerprint));
  }
}
```

**Server-Side Storage** (Supabase):
```typescript
export class ServerKeyStorage implements KeyStorage {
  private supabase: SupabaseClient;

  async saveKey(provider: Provider, key: string): Promise<void> {
    const { error } = await this.supabase
      .from('api_keys')
      .upsert({
        user_id: this.userId,
        provider,
        encrypted_key: this.encrypt(key),
        updated_at: new Date().toISOString(),
      });

    if (error) throw new Error(`Failed to save key: ${error.message}`);
  }

  private encrypt(key: string): string {
    // Use Supabase vault or encryption at rest
    // Keys are encrypted with user-specific key derived from auth
    return encryptAES256(key, this.getUserEncryptionKey());
  }
}
```

**Unified Key Manager** (with fallback):
```typescript
export class KeyManager {
  private clientStorage: ClientKeyStorage;
  private serverStorage?: ServerKeyStorage;

  async getKey(provider: Provider): Promise<string | null> {
    // Try server-side first (if available)
    if (this.serverStorage) {
      try {
        const key = await this.serverStorage.getKey(provider);
        if (key) return key;
      } catch (error) {
        console.warn('Server storage unavailable, falling back to client');
      }
    }

    // Fallback to client-side
    return this.clientStorage.getKey(provider);
  }
}
```

**Supabase Schema**:
```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'deepseek')),
  encrypted_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);

-- Row Level Security
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own keys"
  ON api_keys
  FOR ALL
  USING (auth.uid() = user_id);
```

**UI Component**:
```typescript
export function ApiKeyManager() {
  const [mode, setMode] = useState<'client' | 'server'>('client');
  const [keys, setKeys] = useState<Record<Provider, string>>({});

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Key Management</CardTitle>
        <CardDescription>
          Configure your AI provider API keys
        </CardDescription>
      </CardHeader>

      <CardContent>
        <RadioGroup value={mode} onValueChange={setMode}>
          <RadioGroupItem value="client">
            Client-Side (Browser Only)
          </RadioGroupItem>
          <RadioGroupItem value="server">
            Server-Side (Synced Across Devices) 🔒
          </RadioGroupItem>
        </RadioGroup>

        {/* Key input fields for each provider */}
        <KeyInput provider="openai" value={keys.openai} onChange={...} />
        <KeyInput provider="anthropic" value={keys.anthropic} onChange={...} />
        <KeyInput provider="deepseek" value={keys.deepseek} onChange={...} />
      </CardContent>
    </Card>
  );
}
```

**Security Considerations**:
- Client-side: Keys obfuscated with XOR (not secure, just prevents casual viewing)
- Server-side: Keys encrypted with AES-256, user-specific encryption key
- API routes: Validate user auth before key operations
- Logs: Mask keys (show only first/last 4 chars: `sk-...abc123`)
- Export: Never include full keys in JSON exports

**Success Criteria**:
- Keys can be saved and retrieved in both client and server modes
- Server mode requires Supabase auth
- Fallback to client mode works when server unavailable
- Keys are masked in all logs and exports
- 55+ tests passing (40 unit + 15 integration)

---

### Sub-Plan C: Live Agent Implementation

**Scope**: Convert all 4 existing agents (Lead Qualifier, Content Generator, CRM Updater, Performance Reporter) to support both simulated and live modes.

**Dependencies**:
- Sub-Plan A (API clients for making live calls)
- Sub-Plan B (Key storage for retrieving API keys)

**Outputs**:
- `lib/agents/lead-qualifier.ts` - Updated with `executeInLiveMode()`
- `lib/agents/content-generator.ts` - Updated with `executeInLiveMode()`
- `lib/agents/crm-updater.ts` - Updated with `executeInLiveMode()`
- `lib/agents/performance-reporter.ts` - Updated with `executeInLiveMode()`
- `lib/agents/prompts.ts` - System prompts for each agent
- `lib/agents/response-parser.ts` - Parse and validate AI responses

**Test Scope**:
- Unit tests: `tests/agents/*-live.test.ts` (60+ tests)
  - `lead-qualifier-live.test.ts` (15 tests)
  - `content-generator-live.test.ts` (15 tests)
  - `crm-updater-live.test.ts` (15 tests)
  - `performance-reporter-live.test.ts` (15 tests)
- Integration tests: `tests/integration/live-workflow.test.ts` (20 tests)
  - Full live workflow with all 4 agents
  - Provider selection logic
  - Cascade fallback on failure
  - Cost accumulation across agents

**Key Files to Modify/Create**:
```
lib/agents/
├── lead-qualifier.ts          # MODIFY: Add executeInLiveMode()
├── content-generator.ts       # MODIFY: Add executeInLiveMode()
├── crm-updater.ts            # MODIFY: Add executeInLiveMode()
├── performance-reporter.ts    # MODIFY: Add executeInLiveMode()
├── prompts.ts                # NEW: System prompts per agent
└── response-parser.ts        # NEW: Parse/validate responses

tests/agents/
├── lead-qualifier-live.test.ts       # NEW
├── content-generator-live.test.ts    # NEW
├── crm-updater-live.test.ts         # NEW
└── performance-reporter-live.test.ts # NEW

tests/integration/
└── live-workflow.test.ts             # NEW
```

**Phases**: Doc → Test → Code

**Details**:

**Agent Mode Switching Pattern**:
```typescript
export class LeadQualifierAgent implements Agent {
  readonly name = 'Lead Qualifier';

  async execute(input: AgentRunInput): Promise<AgentRunOutput> {
    const startTime = Date.now();
    const mode = input.mode ?? 'simulated';

    const result = mode === 'live-ai'
      ? await this.executeInLiveMode(input)
      : await this.executeInSimulatedMode(input);

    return {
      agentName: this.name,
      data: result.data,
      thoughts: result.thoughts,
      durationMs: Date.now() - startTime,
      status: 'completed',
    };
  }

  private async executeInSimulatedMode(input: AgentRunInput) {
    // Existing implementation (unchanged)
    const seed = input.seed ?? Math.floor(Math.random() * 100000);
    const random = createSeededRandom(seed);
    const delay = Math.floor(random() * 300) + 500;
    await new Promise(resolve => setTimeout(resolve, delay));
    return {
      data: { /* mock data */ },
      thoughts: this.generateThoughts(seed),
    };
  }

  private async executeInLiveMode(input: AgentRunInput) {
    const client = await this.getAIClient(input.provider);
    const prompt = this.buildPrompt(input.leadData);

    const response = await client.chat({
      model: client.models[0],
      messages: [
        { role: 'system', content: LEAD_QUALIFIER_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      maxTokens: 500,
    });

    const data = this.parseResponse(response.content);
    validateLeadQualifierOutput(data);

    return {
      data,
      thoughts: response.content,
      usage: response.usage,
    };
  }
}
```

**System Prompts** (`lib/agents/prompts.ts`):
```typescript
export const LEAD_QUALIFIER_SYSTEM_PROMPT = `You are a B2B lead qualification specialist. Analyze leads based on:

1. Company Industry (fit with our offering)
2. Company Size (budget indicators)
3. Intent Signals (notes, behavior)
4. Decision Authority (who the contact is)

Output a JSON object with this exact structure:
{
  "qualificationStatus": "qualified" | "nurture" | "disqualified",
  "leadScore": <number 0-100>,
  "intentLevel": "high" | "medium" | "low",
  "confidence": <number 0-1>,
  "fitAssessment": "<string explaining fit>",
  "reasoning": "<string explaining your decision>"
}

Be objective and data-driven. Score conservatively.`;

export const CONTENT_GENERATOR_SYSTEM_PROMPT = `You are an expert B2B copywriter...`;
export const CRM_UPDATER_SYSTEM_PROMPT = `You are a CRM data specialist...`;
export const PERFORMANCE_REPORTER_SYSTEM_PROMPT = `You are a workflow analyst...`;
```

**Response Parser** (`lib/agents/response-parser.ts`):
```typescript
export function parseLeadQualifierResponse(content: string): LeadQualifierOutput {
  // Try to extract JSON from markdown code blocks or raw text
  const jsonMatch = content.match(/```json\n([\s\S]+?)\n```/) ||
                    content.match(/\{[\s\S]+\}/);

  if (!jsonMatch) {
    throw new Error('No JSON found in AI response');
  }

  const data = JSON.parse(jsonMatch[1] || jsonMatch[0]);

  // Validate structure
  if (!data.qualificationStatus || !data.leadScore) {
    throw new Error('Invalid response structure from AI');
  }

  return data as LeadQualifierOutput;
}
```

**Provider Selection Logic**:
```typescript
async function selectProvider(
  input: AgentRunInput,
  keyManager: KeyManager
): Promise<BaseAIClient> {
  // User override
  if (input.preferredProvider) {
    const key = await keyManager.getKey(input.preferredProvider);
    if (key) return getClient(input.preferredProvider, key);
  }

  // Default: Try DeepSeek (cheapest) first
  const deepseekKey = await keyManager.getKey('deepseek');
  if (deepseekKey) return new DeepSeekClient(deepseekKey);

  // Fallback: Anthropic (good balance)
  const anthropicKey = await keyManager.getKey('anthropic');
  if (anthropicKey) return new AnthropicClient(anthropicKey);

  // Last resort: OpenAI (most expensive)
  const openaiKey = await keyManager.getKey('openai');
  if (openaiKey) return new OpenAIClient(openaiKey);

  throw new Error('No API keys configured for any provider');
}
```

**Success Criteria**:
- All 4 agents support both simulated and live modes
- Mode switching works via `input.mode` parameter
- Live mode calls actual AI APIs (when API keys present)
- Responses are parsed and validated against output schemas
- Provider selection follows cost-optimized logic with fallback
- 478 existing tests still pass (simulated mode)
- 80+ new tests pass (60 unit + 20 integration for live mode)

---

### Sub-Plan D: Cost Tracking & Estimation

**Scope**: Build comprehensive cost tracking system with pre-workflow estimation, real-time tracking, usage history, and CSV export.

**Dependencies**: Sub-Plan C (needs live agents to track costs)

**Outputs**:
- `lib/cost-tracking/estimator.ts` - Pre-workflow cost estimation using tiktoken
- `lib/cost-tracking/tracker.ts` - Real-time cost tracking during workflow
- `lib/cost-tracking/history.ts` - Usage history storage (localStorage + optional Supabase)
- `lib/cost-tracking/exporter.ts` - CSV export for cost reports
- UI components:
  - `components/cost/CostEstimateDialog.tsx` - Pre-workflow confirmation
  - `components/cost/CostDisplay.tsx` - Real-time cost during execution
  - `components/cost/UsageHistory.tsx` - Historical cost dashboard

**Test Scope**:
- Unit tests: `tests/cost-tracking/*.test.ts` (50+ tests)
  - `estimator.test.ts` - Token counting, cost calculation per provider
  - `tracker.test.ts` - Real-time accumulation, agent-level breakdown
  - `history.test.ts` - Storage, retrieval, date filtering
  - `exporter.test.ts` - CSV formatting, data accuracy
- Integration tests: `tests/integration/cost-tracking.test.ts` (20 tests)
  - Full workflow cost estimation vs actual
  - Cost accumulation across multiple runs
  - Export validation (CSV structure)

**Key Files to Create**:
```
lib/cost-tracking/
├── estimator.ts
├── tracker.ts
├── history.ts
└── exporter.ts

components/cost/
├── CostEstimateDialog.tsx
├── CostEstimateDialog.test.tsx
├── CostDisplay.tsx
├── CostDisplay.test.tsx
├── UsageHistory.tsx
└── UsageHistory.test.tsx

tests/cost-tracking/
├── estimator.test.ts
├── tracker.test.ts
├── history.test.ts
└── exporter.test.ts

tests/integration/
└── cost-tracking.test.ts
```

**Phases**: Doc → Test → Code

**Details**:

**Cost Estimator** (using tiktoken):
```typescript
import { encoding_for_model } from 'tiktoken';

export class CostEstimator {
  private encoder = encoding_for_model('gpt-4o');

  estimateWorkflowCost(
    leadData: LeadInput,
    provider: Provider,
    model: string
  ): CostEstimate {
    const estimates = [];

    // Estimate each agent
    for (const agent of this.agents) {
      const prompt = agent.buildPrompt(leadData);
      const inputTokens = this.countTokens(prompt);
      const outputTokens = this.estimateOutputTokens(agent);

      const cost = this.calculateCost(provider, model, inputTokens, outputTokens);

      estimates.push({
        agentName: agent.name,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        cost,
      });
    }

    return {
      provider,
      model,
      agentEstimates: estimates,
      totalTokens: estimates.reduce((sum, e) => sum + e.totalTokens, 0),
      totalCost: estimates.reduce((sum, e) => sum + e.cost, 0),
      accuracy: '±10%',
    };
  }

  private countTokens(text: string): number {
    return this.encoder.encode(text).length;
  }

  private estimateOutputTokens(agent: Agent): number {
    // Based on historical averages per agent type
    const averages = {
      'Lead Qualifier': 300,
      'Content Generator': 500,
      'CRM Updater': 200,
      'Performance Reporter': 400,
    };
    return averages[agent.name] || 300;
  }

  private calculateCost(
    provider: Provider,
    model: string,
    inputTokens: number,
    outputTokens: number
  ): number {
    const pricing = PROVIDER_PRICING[provider][model];
    return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
  }
}

const PROVIDER_PRICING = {
  openai: {
    'gpt-4o': { input: 15, output: 60 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
  },
  anthropic: {
    'claude-opus-4': { input: 15, output: 75 },
    'claude-sonnet-4': { input: 3, output: 15 },
    'claude-haiku-4': { input: 0.25, output: 1.25 },
  },
  deepseek: {
    'deepseek-chat': { input: 0.27, output: 1.10 },
  },
};
```

**Real-Time Tracker**:
```typescript
export class CostTracker {
  private currentRun: {
    runId: string;
    startedAt: Date;
    agentCosts: Array<{
      agentName: string;
      provider: Provider;
      model: string;
      inputTokens: number;
      outputTokens: number;
      cost: number;
    }>;
  } | null = null;

  startRun(runId: string): void {
    this.currentRun = {
      runId,
      startedAt: new Date(),
      agentCosts: [],
    };
  }

  recordAgentExecution(
    agentName: string,
    provider: Provider,
    model: string,
    usage: TokenUsage
  ): void {
    const cost = this.calculateCost(provider, model, usage);

    this.currentRun!.agentCosts.push({
      agentName,
      provider,
      model,
      inputTokens: usage.promptTokens,
      outputTokens: usage.completionTokens,
      cost,
    });
  }

  finishRun(): CostSummary {
    const summary = {
      runId: this.currentRun!.runId,
      startedAt: this.currentRun!.startedAt,
      completedAt: new Date(),
      agentCosts: this.currentRun!.agentCosts,
      totalTokens: this.currentRun!.agentCosts.reduce(
        (sum, a) => sum + a.inputTokens + a.outputTokens, 0
      ),
      totalCost: this.currentRun!.agentCosts.reduce((sum, a) => sum + a.cost, 0),
    };

    // Save to history
    this.saveToHistory(summary);

    this.currentRun = null;
    return summary;
  }
}
```

**Usage History Storage**:
```typescript
export class UsageHistory {
  private readonly storageKey = 'agent-orchestrator-usage-history';

  save(summary: CostSummary): void {
    const history = this.load();
    history.push(summary);

    // Keep last 30 days only
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const filtered = history.filter(s => s.completedAt.getTime() > cutoff);

    localStorage.setItem(this.storageKey, JSON.stringify(filtered));
  }

  load(): CostSummary[] {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  }

  getStats(days: number = 30): UsageStats {
    const history = this.load();
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const recent = history.filter(s => s.completedAt.getTime() > cutoff);

    return {
      totalRuns: recent.length,
      totalCost: recent.reduce((sum, s) => sum + s.totalCost, 0),
      totalTokens: recent.reduce((sum, s) => sum + s.totalTokens, 0),
      avgCostPerRun: recent.reduce((sum, s) => sum + s.totalCost, 0) / recent.length,
      costByProvider: this.groupByProvider(recent),
      costByAgent: this.groupByAgent(recent),
    };
  }
}
```

**CSV Exporter**:
```typescript
export function exportToCsv(history: CostSummary[]): string {
  const rows = [
    ['Run ID', 'Date', 'Agent', 'Provider', 'Model', 'Input Tokens', 'Output Tokens', 'Cost ($)']
  ];

  for (const run of history) {
    for (const agent of run.agentCosts) {
      rows.push([
        run.runId,
        run.completedAt.toISOString(),
        agent.agentName,
        agent.provider,
        agent.model,
        agent.inputTokens.toString(),
        agent.outputTokens.toString(),
        agent.cost.toFixed(4),
      ]);
    }
  }

  return rows.map(row => row.join(',')).join('\n');
}
```

**UI Components**:

**Cost Estimate Dialog**:
```typescript
export function CostEstimateDialog({ leadData, onConfirm, onCancel }) {
  const [estimate, setEstimate] = useState<CostEstimate | null>(null);

  useEffect(() => {
    const estimator = new CostEstimator();
    const result = estimator.estimateWorkflowCost(leadData, 'deepseek', 'deepseek-chat');
    setEstimate(result);
  }, [leadData]);

  return (
    <Dialog>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Estimated Cost</DialogTitle>
          <DialogDescription>
            This workflow will cost approximately ${estimate?.totalCost.toFixed(4)} (±10%)
          </DialogDescription>
        </DialogHeader>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead>Tokens</TableHead>
              <TableHead>Cost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {estimate?.agentEstimates.map(e => (
              <TableRow key={e.agentName}>
                <TableCell>{e.agentName}</TableCell>
                <TableCell>{e.totalTokens}</TableCell>
                <TableCell>${e.cost.toFixed(4)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={onConfirm}>Confirm & Run</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Success Criteria**:
- Pre-workflow estimation within 10% of actual cost
- Real-time cost display updates during workflow
- Usage history tracks last 30 days
- CSV export includes all required fields
- 70+ tests passing (50 unit + 20 integration)

---

### Sub-Plan E: Prompt Customization System

**Scope**: Build prompt template system with industry-specific templates (Technology, Healthcare, Finance, Retail, Education) and advanced mode for full prompt editing.

**Dependencies**: Sub-Plan C (needs live agents to apply custom prompts)

**Outputs**:
- `lib/prompts/templates.ts` - Industry-specific prompt templates
- `lib/prompts/manager.ts` - Prompt storage and versioning
- `lib/prompts/validator.ts` - Prompt validation and variable interpolation
- UI components:
  - `components/prompts/PromptEditor.tsx` - Template selector + advanced editor
  - `components/prompts/TemplateSelector.tsx` - Industry template gallery
  - `components/prompts/AdvancedEditor.tsx` - Full prompt editing with syntax highlighting

**Test Scope**:
- Unit tests: `tests/prompts/*.test.ts` (40+ tests)
  - `templates.test.ts` - Template loading, industry coverage
  - `manager.test.ts` - Save/load/delete custom prompts, versioning
  - `validator.test.ts` - Variable interpolation, validation rules
- Integration tests: `tests/integration/prompt-customization.test.ts` (15 tests)
  - End-to-end prompt customization workflow
  - Template usage in live mode
  - Advanced mode custom prompts

**Key Files to Create**:
```
lib/prompts/
├── templates.ts
├── manager.ts
└── validator.ts

components/prompts/
├── PromptEditor.tsx
├── PromptEditor.test.tsx
├── TemplateSelector.tsx
├── TemplateSelector.test.tsx
├── AdvancedEditor.tsx
└── AdvancedEditor.test.tsx

tests/prompts/
├── templates.test.ts
├── manager.test.ts
└── validator.test.ts

tests/integration/
└── prompt-customization.test.ts
```

**Phases**: Doc → Test → Code

**Details**:

**Industry Templates** (`lib/prompts/templates.ts`):
```typescript
export const INDUSTRY_TEMPLATES = {
  technology: {
    leadQualifier: {
      systemPrompt: `You are a B2B SaaS lead qualification specialist. Focus on:
- Technical stack compatibility
- Engineering team size
- Current tools and integration needs
- Budget for software purchases
- Development roadmap alignment

Prioritize leads with modern tech stacks and growing engineering teams.`,
      focusAreas: ['Technical Fit', 'Integration Complexity', 'Team Size', 'Growth Trajectory'],
    },
    contentGenerator: {
      systemPrompt: `You are a technical B2B copywriter. Write for:
- Technical decision makers (CTOs, VPs of Engineering)
- Focus on ROI, performance gains, integration ease
- Use technical terminology appropriately
- Avoid marketing fluff, be direct

Tone: Professional, data-driven, solution-focused.`,
      style: 'technical',
    },
  },

  healthcare: {
    leadQualifier: {
      systemPrompt: `You are a healthcare industry lead qualification specialist. Focus on:
- HIPAA compliance requirements
- Clinical vs administrative use cases
- Security and privacy standards
- Regulatory approval timelines
- Budget cycles (often fiscal year-based)

Be especially careful with compliance and security signals.`,
      focusAreas: ['Compliance', 'Security', 'Use Case', 'Budget Cycle'],
    },
    contentGenerator: {
      systemPrompt: `You are a healthcare industry copywriter. Write for:
- Healthcare administrators and clinical leaders
- Emphasize compliance (HIPAA, HITECH)
- Focus on patient outcomes and operational efficiency
- Use appropriate medical terminology

Tone: Professional, compassionate, evidence-based.`,
      style: 'healthcare',
    },
  },

  finance: {
    leadQualifier: {
      systemPrompt: `You are a financial services lead qualification specialist. Focus on:
- Regulatory compliance (SOC2, PCI-DSS, etc.)
- Data security and encryption
- Audit trail requirements
- Risk assessment and due diligence
- Decision-making hierarchy (often slow)

Financial services buyers are conservative; qualify carefully.`,
      focusAreas: ['Compliance', 'Security', 'Risk', 'Authority'],
    },
    contentGenerator: {
      systemPrompt: `You are a financial services copywriter. Write for:
- CFOs, Risk Officers, Compliance teams
- Emphasize security, compliance, ROI
- Use financial terminology appropriately
- Be conservative and risk-aware

Tone: Professional, trustworthy, detail-oriented.`,
      style: 'financial',
    },
  },

  retail: {
    leadQualifier: {
      systemPrompt: `You are a retail industry lead qualification specialist. Focus on:
- E-commerce platform (Shopify, WooCommerce, custom)
- Customer volume and transaction patterns
- Seasonal business cycles
- Marketing budget and CAC
- Omnichannel needs (online + physical)

Retail moves fast; prioritize clear buying signals.`,
      focusAreas: ['Platform', 'Volume', 'Seasonality', 'Budget'],
    },
    contentGenerator: {
      systemPrompt: `You are a retail industry copywriter. Write for:
- E-commerce managers, CMOs, Operations leaders
- Focus on conversion rates, customer experience, revenue growth
- Use retail KPIs (AOV, CAC, LTV)
- Be results-focused and action-oriented

Tone: Energetic, results-driven, customer-focused.`,
      style: 'retail',
    },
  },

  education: {
    leadQualifier: {
      systemPrompt: `You are an education industry lead qualification specialist. Focus on:
- Institution type (K-12, higher ed, corporate training)
- Stakeholder complexity (teachers, admin, parents)
- Budget constraints (often limited)
- Academic calendar timing
- EdTech stack compatibility

Education buyers need relationship-building; qualify patiently.`,
      focusAreas: ['Institution Type', 'Stakeholders', 'Budget', 'Calendar'],
    },
    contentGenerator: {
      systemPrompt: `You are an education industry copywriter. Write for:
- Educators, administrators, instructional designers
- Focus on learning outcomes, engagement, accessibility
- Use educational terminology appropriately
- Be supportive and mission-driven

Tone: Supportive, educational, mission-focused.`,
      style: 'education',
    },
  },
};
```

**Prompt Manager** (`lib/prompts/manager.ts`):
```typescript
export class PromptManager {
  private readonly storageKey = 'agent-orchestrator-custom-prompts';

  saveCustomPrompt(
    agentName: string,
    customPrompt: CustomPrompt
  ): void {
    const prompts = this.loadCustomPrompts();
    prompts[agentName] = {
      ...customPrompt,
      version: (prompts[agentName]?.version || 0) + 1,
      updatedAt: new Date().toISOString(),
    };

    // Save to localStorage (client-side)
    localStorage.setItem(this.storageKey, JSON.stringify(prompts));

    // Optionally sync to Supabase (server-side)
    if (this.supabase && this.userId) {
      this.syncToServer(agentName, prompts[agentName]);
    }
  }

  getPrompt(agentName: string, industry?: Industry): string {
    // Priority: Custom > Industry Template > Default

    // 1. Check for custom prompt
    const custom = this.loadCustomPrompts()[agentName];
    if (custom) return custom.systemPrompt;

    // 2. Check for industry template
    if (industry && INDUSTRY_TEMPLATES[industry]) {
      return INDUSTRY_TEMPLATES[industry][agentName]?.systemPrompt;
    }

    // 3. Fall back to default
    return DEFAULT_PROMPTS[agentName];
  }

  resetToDefault(agentName: string): void {
    const prompts = this.loadCustomPrompts();
    delete prompts[agentName];
    localStorage.setItem(this.storageKey, JSON.stringify(prompts));
  }
}
```

**Prompt Validator** (`lib/prompts/validator.ts`):
```typescript
export function validatePrompt(prompt: string): ValidationResult {
  const errors: string[] = [];

  // Check minimum length
  if (prompt.length < 50) {
    errors.push('Prompt is too short (minimum 50 characters)');
  }

  // Check for required structure (optional but recommended)
  if (!prompt.includes('You are')) {
    errors.push('Prompt should start with role definition ("You are...")');
  }

  // Check for variable placeholders
  const variables = prompt.match(/\{\{([^}]+)\}\}/g);
  if (variables) {
    for (const v of variables) {
      const varName = v.slice(2, -2);
      if (!VALID_VARIABLES.includes(varName)) {
        errors.push(`Unknown variable: ${varName}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function interpolateVariables(
  prompt: string,
  data: Record<string, any>
): string {
  return prompt.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
    return data[varName] || match;
  });
}

const VALID_VARIABLES = [
  'lead.name',
  'lead.company',
  'lead.industry',
  'lead.notes',
  'qualifier.score',
  'qualifier.status',
];
```

**UI Components**:

**Prompt Editor**:
```typescript
export function PromptEditor({ agentName }) {
  const [mode, setMode] = useState<'template' | 'advanced'>('template');
  const [industry, setIndustry] = useState<Industry>('technology');
  const [customPrompt, setCustomPrompt] = useState('');

  const promptManager = new PromptManager();
  const currentPrompt = promptManager.getPrompt(agentName, mode === 'template' ? industry : undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{agentName} Prompt Customization</CardTitle>
        <Tabs value={mode} onValueChange={setMode}>
          <TabsList>
            <TabsTrigger value="template">Templates</TabsTrigger>
            <TabsTrigger value="advanced">Advanced Mode</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent>
        {mode === 'template' ? (
          <TemplateSelector
            industry={industry}
            onIndustryChange={setIndustry}
            agentName={agentName}
          />
        ) : (
          <AdvancedEditor
            prompt={customPrompt || currentPrompt}
            onChange={setCustomPrompt}
            onSave={() => promptManager.saveCustomPrompt(agentName, { systemPrompt: customPrompt })}
            onReset={() => {
              promptManager.resetToDefault(agentName);
              setCustomPrompt('');
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}
```

**Advanced Editor** (with syntax highlighting):
```typescript
export function AdvancedEditor({ prompt, onChange, onSave, onReset }) {
  const [errors, setErrors] = useState<string[]>([]);

  const handleChange = (value: string) => {
    onChange(value);
    const validation = validatePrompt(value);
    setErrors(validation.errors);
  };

  return (
    <div className="space-y-4">
      <Textarea
        value={prompt}
        onChange={e => handleChange(e.target.value)}
        rows={20}
        className="font-mono text-sm"
        placeholder="Enter custom system prompt..."
      />

      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>Validation Errors</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">
              {errors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <Button onClick={onSave} disabled={errors.length > 0}>
          Save Custom Prompt
        </Button>
        <Button variant="outline" onClick={onReset}>
          Reset to Default
        </Button>
      </div>

      <Alert>
        <AlertTitle>Available Variables</AlertTitle>
        <AlertDescription>
          Use <code>{'{{lead.company}}'}</code>, <code>{'{{lead.industry}}'}</code>, etc.
        </AlertDescription>
      </Alert>
    </div>
  );
}
```

**Success Criteria**:
- 5 industry templates available (Technology, Healthcare, Finance, Retail, Education)
- Each industry has prompts for all 4 agents
- Custom prompts can be saved and loaded
- Prompt validation catches common errors
- Variable interpolation works correctly
- Advanced mode allows full prompt editing
- 55+ tests passing (40 unit + 15 integration)

---

### Sub-Plan F: Integration, Testing & Documentation

**Scope**: Comprehensive integration testing, UI polish, documentation updates, and final verification of all Phase 2 features.

**Dependencies**: All previous sub-plans (A, B, C, D, E)

**Outputs**:
- Integration tests covering full Phase 2 functionality
- Updated README with live mode instructions
- Updated LIVE_AI_INTEGRATION.md with actual implementation
- API key setup guide
- Cost optimization guide
- Prompt customization guide
- Deployment guide (Vercel + Supabase)
- Performance benchmarks (simulated vs live)

**Test Scope**:
- Integration tests: `tests/integration/*.test.ts` (50+ new tests)
  - `full-phase2-workflow.test.ts` - End-to-end live workflow
  - `provider-switching.test.ts` - Test all 3 providers
  - `cost-accuracy.test.ts` - Verify cost estimation accuracy
  - `prompt-templates.test.ts` - Test all industry templates
  - `error-scenarios.test.ts` - Comprehensive error handling
  - `performance.test.ts` - Benchmark simulated vs live
- UI tests: `tests/ui/*.test.tsx` (30+ new tests)
  - All new UI components (ApiKeyManager, CostDisplay, PromptEditor, etc.)
  - Mode switching in ControlPanel
  - Cost estimate dialog flow
  - Usage history dashboard

**Key Files to Create/Update**:
```
README.md                              # UPDATE: Add Phase 2 sections
LIVE_AI_INTEGRATION.md                 # UPDATE: Implementation complete
docs/
├── API_KEY_SETUP.md                  # NEW: Key configuration guide
├── COST_OPTIMIZATION.md              # NEW: Cost-saving strategies
├── PROMPT_CUSTOMIZATION.md           # NEW: Template and advanced usage
└── DEPLOYMENT_PHASE2.md              # NEW: Vercel + Supabase setup

tests/integration/
├── full-phase2-workflow.test.ts      # NEW
├── provider-switching.test.ts        # NEW
├── cost-accuracy.test.ts             # NEW
├── prompt-templates.test.ts          # NEW
├── error-scenarios.test.ts           # NEW
└── performance.test.ts               # NEW

tests/ui/
├── ApiKeyManager.test.tsx            # NEW
├── CostEstimateDialog.test.tsx       # NEW
├── CostDisplay.test.tsx              # NEW
├── UsageHistory.test.tsx             # NEW
├── PromptEditor.test.tsx             # NEW
├── TemplateSelector.test.tsx         # NEW
└── AdvancedEditor.test.tsx           # NEW
```

**Phases**: Doc → Test → Code

**Details**:

**End-to-End Integration Test**:
```typescript
describe('Phase 2: Full Live Workflow', () => {
  it('should execute complete workflow in live mode', async () => {
    // Setup: Mock API clients
    mockOpenAI.mockResolvedValue(mockOpenAIResponse);
    mockAnthropic.mockResolvedValue(mockAnthropicResponse);
    mockDeepSeek.mockResolvedValue(mockDeepSeekResponse);

    // Setup: Configure API keys
    await keyManager.saveKey('deepseek', 'sk-test-deepseek-key');

    // Setup: Select industry template
    const promptManager = new PromptManager();
    await promptManager.setIndustry('technology');

    // Step 1: Pre-workflow cost estimation
    const estimator = new CostEstimator();
    const estimate = estimator.estimateWorkflowCost(testLead, 'deepseek', 'deepseek-chat');
    expect(estimate.totalCost).toBeGreaterThan(0);
    expect(estimate.totalCost).toBeLessThan(0.01); // Should be cheap with DeepSeek

    // Step 2: Run workflow in live mode
    const store = useWorkflowStore.getState();
    store.setMode('live-ai');
    store.setLeadInput(testLead);

    await act(async () => {
      const promise = store.runFullWorkflow();
      await vi.runAllTimersAsync();
      await promise;
    });

    // Step 3: Verify all agents executed
    expect(store.currentRun?.status).toBe('completed');
    expect(store.currentRun?.logs.length).toBe(4);
    expect(store.currentRun?.logs.every(log => log.status === 'completed')).toBe(true);

    // Step 4: Verify cost tracking
    const costSummary = store.getCostSummary();
    expect(costSummary).toBeDefined();
    expect(costSummary.totalCost).toBeCloseTo(estimate.totalCost, 1); // Within 10%

    // Step 5: Verify outputs match expected schema
    const qualifierOutput = store.currentRun?.agentOutputs['Lead Qualifier'];
    expect(isLeadQualifierOutput(qualifierOutput)).toBe(true);

    // Step 6: Export and verify
    const exportData = store.exportResults();
    expect(exportData.flat.mode).toBe('live-ai');
    expect(exportData.structured.metadata.cost).toBeDefined();
  });
});
```

**Provider Switching Test**:
```typescript
describe('Provider Selection and Fallback', () => {
  it('should default to DeepSeek when all keys present', async () => {
    await keyManager.saveKey('openai', 'sk-openai');
    await keyManager.saveKey('anthropic', 'sk-anthropic');
    await keyManager.saveKey('deepseek', 'sk-deepseek');

    const client = await selectProvider(input, keyManager);
    expect(client.provider).toBe('deepseek');
  });

  it('should fall back to Anthropic when DeepSeek fails', async () => {
    mockDeepSeek.mockRejectedValue(new Error('429 Rate Limit'));
    await keyManager.saveKey('deepseek', 'sk-deepseek');
    await keyManager.saveKey('anthropic', 'sk-anthropic');

    const agent = new LeadQualifierAgent();
    const result = await agent.execute({ leadData: testLead, mode: 'live-ai' });

    expect(result.status).toBe('completed');
    expect(mockAnthropic).toHaveBeenCalled();
  });

  it('should respect user provider override', async () => {
    const input = {
      leadData: testLead,
      mode: 'live-ai',
      preferredProvider: 'openai',
    };

    const client = await selectProvider(input, keyManager);
    expect(client.provider).toBe('openai');
  });
});
```

**Documentation Updates**:

**README.md additions**:
```markdown
## Live AI Mode (Phase 2)

### Quick Start

1. **Configure API Keys**
   ```bash
   cp .env.example .env
   # Add your API keys to .env
   OPENAI_API_KEY=sk-...
   ANTHROPIC_API_KEY=sk-ant-...
   DEEPSEEK_API_KEY=sk-...
   ```

2. **Toggle Live Mode**
   - Switch mode in UI: `Simulated` → `Live AI`
   - Review cost estimate
   - Confirm and run

3. **Cost Tracking**
   - Pre-workflow: Cost estimate dialog
   - During: Real-time cost display
   - After: View usage history, export CSV

### Providers Supported

| Provider | Models | Cost (per 1M tokens) | Best For |
|----------|--------|---------------------|----------|
| DeepSeek | deepseek-chat | $0.27-$1.10 | Cost optimization (default) |
| Anthropic | Claude Opus/Sonnet/Haiku | $0.25-$75 | Quality and reliability |
| OpenAI | GPT-4o/GPT-4o-mini | $0.15-$60 | Wide model selection |

### Prompt Customization

**Template Mode** (Recommended):
- Select your industry: Technology, Healthcare, Finance, Retail, Education
- Optimized prompts for your use case
- No configuration needed

**Advanced Mode**:
- Full control over system prompts
- Custom variable interpolation
- Validation and syntax checking

See [PROMPT_CUSTOMIZATION.md](docs/PROMPT_CUSTOMIZATION.md) for details.
```

**API_KEY_SETUP.md**:
```markdown
# API Key Setup Guide

## Client-Side (Free, Immediate)

1. Navigate to Settings → API Keys
2. Select "Client-Side (Browser Only)"
3. Enter your API keys
4. Keys stored in browser localStorage (not synced)

**Pros**: No account needed, works immediately
**Cons**: Lost if browser data cleared, not synced across devices

## Server-Side (Paid, Synced)

1. Sign up for account (requires Supabase auth)
2. Navigate to Settings → API Keys
3. Select "Server-Side (Synced Across Devices)"
4. Enter your API keys
5. Keys encrypted and stored in Supabase

**Pros**: Synced across devices, persistent, secure
**Cons**: Requires account, paid feature ($5/month)

## Getting API Keys

### OpenAI
1. Visit https://platform.openai.com/api-keys
2. Create new secret key
3. Copy key (starts with `sk-proj-...`)

### Anthropic
1. Visit https://console.anthropic.com/settings/keys
2. Create new API key
3. Copy key (starts with `sk-ant-...`)

### DeepSeek
1. Visit https://platform.deepseek.com/api_keys
2. Create new API key
3. Copy key (starts with `sk-...`)

## Security Best Practices

- Never commit API keys to git
- Use environment variables in production
- Rotate keys if exposed
- Monitor usage for unexpected costs
```

**Performance Benchmarks**:

Document expected performance characteristics:

```markdown
# Performance Benchmarks

## Simulated Mode
- Execution time: 2-3 seconds (4 agents × ~600ms each)
- Cost: $0
- Deterministic: Same inputs → same outputs

## Live AI Mode

### DeepSeek (Default)
- Execution time: 8-12 seconds (4 agents × 2-3s each + API latency)
- Cost: ~$0.002 per workflow
- Quality: Good for most use cases

### Anthropic Claude Sonnet
- Execution time: 10-15 seconds
- Cost: ~$0.01 per workflow
- Quality: Excellent, best balance

### OpenAI GPT-4o
- Execution time: 10-15 seconds
- Cost: ~$0.05 per workflow
- Quality: Excellent, most expensive

## Cost Optimization Tips
1. Use DeepSeek for high-volume workflows
2. Reserve Anthropic/OpenAI for high-value leads
3. Enable cost limits to prevent overspending
4. Export usage history to track trends
```

**Success Criteria**:
- All 578 tests passing (478 existing + 100 new)
- README updated with Phase 2 instructions
- 4 new documentation guides created
- Performance benchmarks documented
- Vercel + Supabase deployment guide complete
- Zero regressions in simulated mode

---

## Dependency Graph

```
        A (API Clients)
        |
        |
        B (Key Management)
       / \
      /   \
     /     \
    v       v
    C (Live Agents)
    |       |
    |       |
    v       v
    D (Cost)  E (Prompts)
     \       /
      \     /
       \   /
        \ /
         v
    F (Integration & Docs)
```

More precisely:
- **A** and **B** are independent (can run in parallel)
- **C** depends on **A** (needs API clients) and **B** (needs keys)
- **D** depends on **C** (needs live agents to track costs)
- **E** depends on **C** (needs live agents to apply prompts)
- **F** depends on all (**A**, **B**, **C**, **D**, **E**)

---

## Execution Order

### Wave 1 (Start Immediately - Parallel)
- **Sub-Plan A**: API Client Infrastructure
- **Sub-Plan B**: Hybrid Key Management

### Wave 2 (After Wave 1 passes tests + debug)
- **Sub-Plan C**: Live Agent Implementation

### Wave 3 (After Wave 2 passes tests + debug - Parallel)
- **Sub-Plan D**: Cost Tracking & Estimation
- **Sub-Plan E**: Prompt Customization System

### Wave 4 (After Wave 3 passes tests + debug)
- **Sub-Plan F**: Integration, Testing & Documentation

### Full Regression (After Wave 4 passes)
Run ALL unit tests + ALL integration tests (578 total: 478 existing + 100 new) as a final regression check. If any failures occur outside a sub-plan's original test scope, dispatch Debugger to investigate and fix before proceeding to post-pipeline review.

**Estimated Total Duration**: 3-4 weeks (assuming 1 week per wave, with some parallelization)

---

## Context for Agents

### Key Files to Read

**Wave 1**:
- Sub-Plan A: Review existing agent implementations to understand execution patterns
- Sub-Plan B: Review Zustand store patterns for state management

**Wave 2**:
- Sub-Plan C: Read all 4 agent files (lead-qualifier.ts, content-generator.ts, crm-updater.ts, performance-reporter.ts)
- Understand Agent interface contract in types.ts

**Wave 3**:
- Sub-Plan D: Review orchestrator.ts to understand workflow execution flow
- Sub-Plan E: Review existing agent prompts in agent files

**Wave 4**:
- Sub-Plan F: Review all Phase 2 code for integration testing
- Review existing integration test patterns

### Patterns to Follow

**From Phase 1 (Preserve These)**:
- Immutability: All state updates return new objects
- Type Safety: Strict TypeScript, no `any` types
- Error Handling: Catch at boundaries, propagate with context
- Testing: TDD workflow, deterministic tests, fake timers
- File Organization: Small files (200-400 lines), high cohesion

**New Patterns for Phase 2**:
- API Client Abstraction: Unified interface across providers
- Retry Logic: Exponential backoff for transient failures
- Cost Tracking: Record usage at every API call
- Mode Switching: Support both simulated and live in same agent class
- Hybrid Storage: Client-side first, server-side optional

### Known Gotchas

**From Phase 1 Debugging**:
1. **Zustand + React Testing Library**: Use direct `getState()` instead of `renderHook()` to avoid state pollution
2. **Fake Timers**: Must use `await vi.runAllTimersAsync()` for async operations, not just `vi.advanceTimersByTime()`
3. **Store-Orchestrator Sync**: Use deep copies (`JSON.parse(JSON.stringify())`) to prevent shared references
4. **Multiple Element Queries**: Use `getAllByText()` instead of `getByText()` when text appears multiple times
5. **Async State Updates**: Always wrap in `act()` from React Testing Library

**New Phase 2 Gotchas**:
1. **API Rate Limits**: DeepSeek has lower limits than OpenAI/Anthropic, implement queue management
2. **Token Counting**: tiktoken encoding varies by model, use model-specific encoders
3. **Response Parsing**: AI responses may include markdown code blocks, extract JSON carefully
4. **Cost Accuracy**: Token estimation is approximate, actual cost may vary ±10%
5. **Provider Fallback**: Cache provider availability to avoid repeated failures on same provider
6. **Supabase Auth**: Row-level security policies must match user authentication flow
7. **localStorage Limits**: Browser localStorage is ~5-10MB, don't store too much history

### Learnings Applied

**From Phase 1 Architecture Review** (Visionary findings):
1. **Dual State Ownership**: Phase 2 maintains single source of truth in Zustand store
2. **Test Store Isolation**: New tests create fresh store instances to prevent pollution
3. **Atomic State Transitions**: Build complete new state before assignment (no intermediate states)

**From Phase 1 Documentation Sync**:
1. Keep test counts updated in README as we add new tests
2. Sync documentation immediately after implementation (don't wait)
3. Create separate guides for complex features (API keys, cost tracking, prompts)

**From Phase 1 Testing Patterns**:
1. Mock external dependencies (APIs) at SDK level, not HTTP level
2. Use fake timers for controlling delays in tests
3. Maintain 80%+ coverage as tests are written
4. Test both success and error paths for every feature

---

## Guidelines Gaps

*This section will be populated if sub-managers discover missing information in project guidelines during execution.*

**Expected Gaps for Phase 2**:
1. No existing guidelines for API client testing patterns (will establish during Wave 1)
2. No existing guidelines for cost tracking infrastructure (will establish during Wave 3)
3. No existing guidelines for prompt template organization (will establish during Wave 3)
4. Supabase integration patterns not documented (will establish during Wave 1)

---

## Execution Log

*This section will be populated by `/company-execute` as each sub-plan progresses.*

### Wave 1: API Infrastructure & Key Management
- [ ] Sub-Plan A started
- [ ] Sub-Plan A tests written
- [ ] Sub-Plan A implementation complete
- [ ] Sub-Plan A tests passing
- [ ] Sub-Plan B started
- [ ] Sub-Plan B tests written
- [ ] Sub-Plan B implementation complete
- [ ] Sub-Plan B tests passing

### Wave 2: Live Agent Implementation
- [ ] Sub-Plan C started
- [ ] Sub-Plan C tests written
- [ ] Sub-Plan C implementation complete
- [ ] Sub-Plan C tests passing

### Wave 3: Cost & Prompts
- [ ] Sub-Plan D started
- [ ] Sub-Plan D tests written
- [ ] Sub-Plan D implementation complete
- [ ] Sub-Plan D tests passing
- [ ] Sub-Plan E started
- [ ] Sub-Plan E tests written
- [ ] Sub-Plan E implementation complete
- [ ] Sub-Plan E tests passing

### Wave 4: Integration & Documentation
- [ ] Sub-Plan F started
- [ ] Sub-Plan F tests written
- [ ] Sub-Plan F implementation complete
- [ ] Sub-Plan F tests passing

### Full Regression
- [ ] All 578 tests passing (478 existing + 100 new)
- [ ] Code coverage ≥80%
- [ ] Production build successful
- [ ] Vercel deployment successful
- [ ] Supabase integration functional

### Post-Pipeline Review
- [ ] Documentation sync complete
- [ ] Architecture review complete
- [ ] Learnings documented

---

## Risk Assessment

**High Risk**:
- API provider rate limits (mitigation: queue management, cascade fallback)
- Cost estimation accuracy (mitigation: conservative estimates, ±10% warning)
- Supabase setup complexity (mitigation: detailed deployment guide, optional feature)

**Medium Risk**:
- Response parsing fragility (mitigation: robust JSON extraction, schema validation)
- Test execution time (mitigation: mock by default, real API only nightly)
- Token counting accuracy (mitigation: tiktoken library, model-specific encoders)

**Low Risk**:
- Breaking existing 478 tests (mitigation: no changes to simulated mode logic)
- Prompt template quality (mitigation: 5 well-researched industry templates)
- UI complexity (mitigation: leverages existing shadcn/ui components)

---

## Success Metrics

**Technical**:
- ✅ All 6 sub-plans complete with passing tests
- ✅ 578 total tests passing (478 existing + 100 new)
- ✅ Code coverage ≥80%
- ✅ Production build succeeds
- ✅ Vercel + Supabase deployment successful

**Functional**:
- ✅ All 4 agents work in live mode with all 3 providers
- ✅ Hybrid key management functional (client + server)
- ✅ Cost estimation within 10% accuracy
- ✅ 5 industry prompt templates working
- ✅ Cascade fallback works on provider failure

**Quality**:
- ✅ Zero regressions in simulated mode
- ✅ Live mode UX is professional and intuitive
- ✅ Documentation is comprehensive and accurate
- ✅ Cost tracking is transparent and accurate
- ✅ API errors are handled gracefully

---

**Pipeline Ready for Execution**

Run `/company-execute 20260703-phase2-live-ai-integration` to launch Phase 2.
