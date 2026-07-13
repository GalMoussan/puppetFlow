# Journal: Debug Loop - Iter 1 Premise Verified

## Scope Contract (from dispatch)
- **Goal**: Align test files with actual implementation API signatures. Fix imports, argument counts, and type mismatches so tests compile.
- **Anti-Scope**: Production code in `app/` or `lib/` directories, changing behavior tests are testing, deleting test cases
- **Allowed Expansion**: Add test helper types in test files, mock definitions, simplify test setup

## Iter 1 Mandate: Read Implementation Files

### Implementation Analysis Complete

**1. lib/agent.ts - Actual API:**
- Exports: `runBatch`, `rerollScene`, `rerollStage`, `AgentEventEmitter`, `VarietyError` (re-export), `SSEEmitter`, `RunResult`
- NOT exported: `AgentError`, `VarietyEngineError`, `RunBatchOptions`, `AgentEvent`
- `runBatch(templateId: string, runConfig: RunConfigInput | undefined, emitter: SSEEmitter)` - 3 required args
- `rerollScene(runId: string, sceneIndex: number, stage?: Lane)` - 2-3 args
- `rerollStage(runId: string, sceneIndex: number, stage: Lane)` - 3 args

**2. lib/anthropic.ts - Actual API:**
- Exports: `hasAnthropicKey`, `getModelName`, `generateBatch`, `generateScene`, `buildRepairPrompt`, `repair`, `GeneratedScene`, `BatchOutputSchema`, `BatchOutput`, `GenerationOptions`
- NOT exported: `parseStructuredOutput`, `streamGeneration`, `AnthropicParseError`, `AnthropicAPIError`, `AuthenticationError`, `RateLimitError`, `TokenOverflowError`, `NetworkError`, `AnthropicServerError`
- `generateBatch(scaffold: string, assignments: ComboAssignment[], options?: GenerationOptions)` - 2-3 args
- `repair(repairPrompt: string)` - 1 arg

**3. lib/errors.ts - Actual API:**
- Exports: `VarietyError`, `AnthropicError`, `NotFoundError`, `BadRequestError`, `ConflictError`, `LintError`, `isCustomError`, `getErrorStatusCode`, `getErrorMessage`
- NOT exported: Individual error subclasses for Anthropic (AuthenticationError, RateLimitError, etc.)

**4. lib/schemas.ts - Actual API (RunConfigInput):**
- Need to check this file for the RunConfigInput type definition

### Error Categories Identified

| Category | Count | Root Cause | Fix Strategy |
|----------|-------|------------|--------------|
| API tests - RequestInit signal type | 6 | Next.js 16 changed RequestInit type - `signal: null` is no longer valid | Cast to appropriate type or use `as any` |
| agent.test.ts - Missing exports | 4 | Tests expect non-existent exports | Remove unused imports, use actual exports |
| agent.test.ts - runBatch args | ~15 | Tests pass 2 args, implementation needs 3 | Add emitter callback or mock |
| agent.test.ts - RunConfigInput fields | ~10 | Tests pass partial config, type requires all fields | Use type casting or Partial<> |
| anthropic.test.ts - Missing exports | 9 | Tests expect non-existent exports (parseStructuredOutput, etc.) | Remove tests or mock appropriately |
| anthropic.test.ts - generateBatch args | ~15 | Tests pass 1 arg, implementation needs 2 | Add assignments array |

## Next Steps

Iteration 1 will fix:
1. All 6 API test files - add type cast for RequestInit
2. agent.test.ts - fix imports and function signatures
3. anthropic.test.ts - fix imports and function signatures

## Files to Read
Already read: lib/agent.ts, lib/anthropic.ts, lib/errors.ts, app/api/blocks/route.ts

Need to check: lib/schemas.ts for RunConfigInput definition
