# Journal: Debug Loop - Iter 1 Premise Verification

## Scope Contract (from dispatch)
- **Goal**: Fix test mocks/fixtures to match actual implementation behavior. Make all 571 tests pass.
- **Anti-Scope**: Do NOT modify production code in app/ or lib/ directories, delete test cases, or weaken test assertions.
- **Allowed Expansion**: Add test helper types, create complete mock fixtures, simplify test setup.

## Iter 1 Mandate: Read Actual Implementation

### Findings

#### 1. Two Different BatchOutputSchema Definitions

There are **two distinct BatchOutputSchema definitions** in the codebase:

**`lib/anthropic.ts` (lines 35-48)** - Anthropic API response schema:
```typescript
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
```

**`packages/domain/types.ts` (lines 324-328)** - Full domain Scene schema:
```typescript
export const BatchOutputSchema = z.object({
  scenes: z.array(SceneSchema).min(1).describe("Generated scenes"),
});
```

Where `SceneSchema` requires: `id`, `runId`, `index`, `combo`, `lyrics`, `imagePrompt`, `startPrompt`, `middlePrompt`, `endPrompt`, `boundaryFrame1`, `boundaryFrame2`, `finalFrame`, `lintReport`, `notes`.

#### 2. Test Mock Issues

**`tests/mocks/anthropic-responses.ts`** imports `BatchOutput` from domain types:
```typescript
import type { BatchOutput, Scene, ComboAssignment } from "@/packages/domain/types";
```

But `createMockBatchOutput()` returns full Scene objects which:
- Is correct for domain tests
- Is INCORRECT for `lib/anthropic.test.ts` which expects the API response format (only 8 fields)

#### 3. Reroll Test Issues

The `reroll.test.ts` mocks `rerollScene` and `rerollStage` from `@/lib/agent` but:
1. The mocks are set up to reject with "Pool exhausted with exclusions" by default because the initial mock setup doesn't match the actual function signatures
2. The test expects `mockRerollScene.mockResolvedValue(newScene)` to work, but `newScene` is a full Scene object which should work fine

Looking at the actual test failures:
- Most reroll tests fail with "Pool exhausted with exclusions" error
- This is because `mockRerollScene` is NOT being called in most tests - instead the actual `rerollScene` function from `@/lib/agent` is being invoked because the mock isn't properly set up

The root cause: **The mock is defined correctly but the `vi.mock` hoisting is not working as expected**, OR the tests aren't properly setting up the mock responses.

#### 4. Anthropic Test Retry Logic Issues

The tests for retry logic have timing issues:
- `retries on validation failure` - The mock response for retry doesn't include all required fields
- `retries on 429 with backoff` - Timer advancement not aligned with implementation
- `fails after max retries exceeded` - Mock resolves instead of rejecting
- `handles network failures` - Times out (likely due to infinite retry loop)

### Root Causes Summary

| Test File | Root Cause | Fix Strategy |
|-----------|-----------|--------------|
| `reroll.test.ts` | Mock setup for `rerollScene` not properly intercepting actual function calls | Fix mock hoisting order, ensure `vi.mock` is properly defined before imports |
| `anthropic.test.ts` | Mock responses missing required scene fields | Add complete mock scene data matching `BatchOutputSchema` in `lib/anthropic.ts` |

### Next Steps (Iteration 1 Fix)

1. Create a helper function `createMockGeneratedScene()` that returns only the 8 fields expected by `lib/anthropic.ts` BatchOutputSchema
2. Update `anthropic.test.ts` mock responses to use complete scene data
3. Verify reroll test mock setup is correct
