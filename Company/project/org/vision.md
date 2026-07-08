# Vision: PuppetFlow

## North Star

Enable non-technical creators to compose validated, production-ready AI video prompts through visual flowcharts, eliminating prompt engineering trial-and-error.

## Pillars

1. **Domain Purity**: Business logic in `packages/domain/` has zero framework dependencies — pure TypeScript, fully testable, deterministic compilation.

2. **Rule Enforcement**: The 15 prompt-engineering rules (R1-R15) are encoded as testable assertions with automated linting, not optional guidelines.

3. **TDD Mandatory**: Tests exist before implementation. RED → GREEN → REFACTOR. No exceptions.

4. **Export = API Parity**: The scaffold exported for Claude Code is byte-identical to what the API path uses. Both paths produce the same creative briefs.

5. **Single Source of Truth**: The visual graph IS the prompt specification. No hidden state, no out-of-band configuration.

## Standing Design Answers

| Question | Answer | Rationale |
|----------|--------|-----------|
| Package manager? | pnpm | Fast, disk-efficient, strict dependency resolution |
| Batch size? | Always 5 scenes | Cross-scene variety constraints require full batch context |
| Handshake threshold? | 80% similarity | Strict enough for extend-chain continuity, configurable per edge |
| Client-side API calls? | Never | ANTHROPIC_API_KEY is server-side only |
| State management? | Zustand for canvas, React Query for API | Simple, predictable, minimal boilerplate |
| Test framework? | Vitest (unit), Playwright (E2E) | Fast, modern, good DX |
| Deployment? | Vercel with basic auth | Simple, integrated with Next.js |

## Open Vision Questions

- How should theme packs be versioned when the underlying rules evolve?
- Should there be a "preview" mode that generates 1 scene before committing to full batch?
- What's the migration path if we need to support different AI video backends beyond the current Grok Imagine pipeline?
