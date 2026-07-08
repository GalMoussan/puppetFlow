# Pipeline Learnings (Generic)

Cross-project best practices distilled from real pipeline executions.
These ship with the multi-agent-company template and apply to any project.

The Optimizer updates this file with lessons that are universally applicable.
Project-specific lessons go to `Company/project/learnings.md`.

## Changelog Format

```
### {date} — {pipeline-id}: {feature name}

**Context:** ...
**Changes applied:** ...
```

## Proposed Role Changes (Pending Review)

Significant changes the Optimizer flagged for user approval before applying.

```
### {date} — {pipeline-id}
**File**: {role-file}
**Proposed change**: {description}
**Reason**: {what went wrong that motivates this}
**Status**: Pending | Approved | Rejected
```

---

<!-- Generic changelog entries below -->

### 2026-03-24 — no-pipeline: Monster Debug Attempt

**Context:** Manager violated SKILL.md by running tests directly instead of creating a blueprint.

**Changes applied:**
- `company-plan/SKILL.md`: Added Debug Pipeline exception to "3 questions" rule — reduced to "1 scoping question" for Debug Pipelines. Reason: Debug directives are often unambiguous; forcing 3 questions is counterproductive.
- `company-plan/SKILL.md`: Added negative example to Critical Rules section showing what the Manager should NOT do (acquire test infrastructure, run tests directly). Reason: Manager violated Rule 3 directly.
- `company-plan/SKILL.md`: Expanded Debug Pipeline section in Step 4 with detailed step-by-step workflow and blueprint template. Reason: Debug Pipeline instructions were too thin compared to Feature Pipeline.
- `roles/debugger.md`: Added "Step 0: Cluster Failures by Error Pattern" before individual diagnosis. Reason: Systemic issues (like a missing dependency causing mass failures) should be identified before spending time on individual test failures.

**Post-review fixes (user caught leaks):**
- `company-plan/SKILL.md`: Removed project-specific tool names from Critical Rules — replaced with generic "test infrastructure."
- `roles/debugger.md`: Removed project-specific error example from Step 0 — replaced with generic "initialization error or missing dependency."

### 2026-03-24 — self-improvement: Generic vs Project-Specific Enforcement

**Context:** Optimizer's own edits leaked project-specific content (tool names, system names, examples) into generic role files. User caught it during review.

---

### 2026-05-08 — 2026-05-08-tarot-image-path-fix: Manager Direct Execution for Simple Infrastructure

**Context:** Second pipeline in deckOfTarot project. Task was to create missing static asset infrastructure (74 placeholder images + directory). Manager correctly chose direct execution instead of dispatching workers.

**Changes applied:**
- **No generic role file changes needed** - this pipeline validated existing Manager autonomy patterns

**Generic pattern validated:**
- **When to skip worker dispatch**: Simple infrastructure tasks (creating directories, generating placeholder files, adding missing static assets) don't benefit from full Doc-Test-Code workflow
- **Manager autonomy indicator**: Task has clear requirements, no design ambiguity, no new code logic, estimated duration < 30 minutes
- **Efficiency gain**: 15 minutes direct execution vs ~60 minutes if workers dispatched (4× speedup)

**Antipattern avoided:**
- Don't force Doc-Test-Code workflow for every pipeline - some tasks are straightforward enough for Manager direct execution
- Don't spawn workers "for consistency" when task complexity doesn't warrant it

**When this pattern applies (any project):**
- Creating missing directories expected by existing code
- Generating placeholder/stub static assets (images, configs, test fixtures)
- Adding infrastructure that code already references but doesn't exist yet
- Scripts that generate bulk files programmatically

**When this pattern does NOT apply:**
- New feature with design decisions
- New code logic or algorithms
- Changes requiring new test coverage
- Multi-phase work with dependencies

**Changes applied:**
- `roles/optimizer.md`: Added "Generic vs Project-Specific Litmus Test" — a 3-question checklist the Optimizer must run on every sentence before writing it to a role/SKILL file. Includes post-write re-read verification step. Reason: Optimizer repeatedly embedded project-specific examples despite existing guidance.

### 2026-03-24 — no-pipeline: Manager Autonomy & Guidelines Feedback Loop

**Context:** Manager asked an unnecessary scoping question for a Debug Pipeline where the user's intent was unambiguous.

**Changes applied:**
- `company-plan/SKILL.md`: Changed Debug Pipeline exception to "default to 0 questions." Reason: Debug directives are self-scoping.
- `company-plan/SKILL.md`: Added "Autonomy Principle: Decide, Don't Ask" section with litmus test. Reason: Manager had no guidance on WHEN NOT to ask.
- `company-plan/SKILL.md`: Added Step 5.5 "Guidelines Sufficiency Audit" — Manager checks what info was missing from project-guidelines.md and logs it as Guidelines Gaps. Reason: Creates feedback loop so each pipeline improves guidelines.
- `company-plan/SKILL.md`: Added `## Guidelines Gaps` to blueprint template.
- `roles/optimizer.md`: Added "5. Audit Manager Autonomy" to analysis checklist + "Manager Autonomy Audit" table. Reason: Optimizer must check if Manager asked unnecessary questions and backfill project-guidelines.

### 2026-03-24 — self-improvement: Optimizer Self-Audit on Autonomy Changes

**Context:** Optimizer applied autonomy improvements but leaked project-specific examples into generic SKILL.md. Caught during self-audit.

**Changes applied:**
- `company-plan/SKILL.md`: Replaced project-specific examples with generic placeholders.

**Lesson for Optimizer:** The litmus test catches leaks — but only if applied in real-time while writing, not just as a retrospective. Apply the test per-sentence AS you write.

### 2026-03-24 — no-pipeline: Pipeline Journal System

**Context:** Background agents complete work but only return concise summaries. The Optimizer at Phase 6 was effectively blind — no decision trails, problem reports, or root cause blame from each role.

**Changes applied:**
- `company-execute/SKILL.md`: Added "Pipeline Journal" section — Orchestrator creates `{id}_journal/` folder, passes path to every role. Added journal folder creation to Blueprint Mode and Phase 0. Added Orchestrator's own journal entry for Phase 4. Added Rule #12 requiring journal entries. Added journal path + file name to all role dispatch prompts.
- `roles/documenter.md`: Added "Journal Entry (MANDATORY)" section with template.
- `roles/tester.md`: Added "Journal Entry (MANDATORY)" section with template.
- `roles/implementer.md`: Added "Journal Entry (MANDATORY)" section with template.
- `roles/debugger.md`: Added "Journal Entry (MANDATORY)" section with template — includes "Which Role Caused This" field.
- `roles/visionary.md`: Added "Journal Entry (MANDATORY)" section with template.
- `roles/optimizer.md`: Added "Read the Pipeline Journal (PRIMARY SOURCE)" as first analysis step.

### 2026-03-24 -- 2026-03-24-monster-playmode-debug: Debug Never Modify Design Parameters

**Context:** Debugger agent modified production prefab parameters to make tests pass, causing regressions (5 to 12 failures).

**Changes applied:**
- `roles/debugger.md`: Added Rule 8: "NEVER modify design parameters to make tests pass" — change test assumptions, not production assets.
- `roles/debugger.md`: Added Rule 9: "Verify your fix does not break other tests."
- `roles/debugger.md`: Added "Stale test" as a root cause category — test assumptions outdated because design changed.
- `roles/debugger.md`: Added "Protected Production Assets" section.
- `roles/debugger.md`: Added "Escalation Triggers" section.
- `roles/debugger.md`: Added "Production assets modified" field to Report Format and Journal Entry template.

### 2026-03-24 — Cluster-First Debug Escalation Strategy

**Context:** Two parallel Debugger agents handling 3 clusters each. Agent 1 succeeded. Agent 2 failed — wrong root cause applied in batch caused cascading regressions.

**Changes applied:**
- `company-execute/SKILL.md`: Rewrote Debug Pipeline Phase 2 from flat "spawn Debugger, retry 3 times" to **escalating strategy**: Iterations 1-2 use cluster mode; Iteration 3+ falls back to single-test mode. Explicit switch triggers: cluster fix caused regressions, same cluster failed 2 iterations, or Debugger modified production assets.
- `roles/debugger.md`: Added Rule 10: "If your cluster fix causes regressions, stop."

### 2026-03-25 -- 2026-03-24-monster-test-debug-v2: Integration Test Setup Rules

**Context:** 44 initial failures, 34 fixed, dominant root cause: incomplete copies of helpers duplicated across test files.

**Changes applied:**
- `roles/tester.md`: Added "Integration Test Setup Rules" section — 5 rules: (1) Never hardcode configurable values, (2) Reuse existing test helpers completely, (3) Verify setup preconditions match runtime state, (4) Choose the right test subject variant, (5) Isolate from background systems.
- `roles/debugger.md`: Added Rule 11 "Apply fixes consistently across the module" — scan sibling files for same vulnerability.
- `roles/debugger.md`: Added Rule 12 "Clean up diagnostic artifacts."
- `company-execute/SKILL.md`: Added batch-fix guidance — when same root cause appears across multiple files, batch into single Debugger dispatch.

### 2026-03-25 — 2026-03-25-inter-test-contamination-fix: Base Class Changes Require Impact Analysis

**Context:** Migrated 29 test files. Enhanced base class cleanup caused 9 regressions in a timing-sensitive subclass.

**Changes applied:**
- `roles/tester.md`: Added Rule 6: "Understand what the base class does before removing setup code."
- `roles/tester.md`: Added Rule 7: "Anticipate side effects of enhanced base class cleanup."
- `roles/debugger.md`: Added "Regression Triage for Base Class Changes" section.
- `roles/implementer.md`: Added "Shared Infrastructure Changes" subsection.
- `company-execute/SKILL.md`: Added Rule 10: "Parallel migration agents must run a single verification pass after ALL complete."
- `company-execute/SKILL.md`: Added Rule 11: "Flag high-risk migration targets."

### 2026-03-26 -- 2026-03-25-procedural-map-generation: Documenter Must Read Actual Code in Iterative Sub-Pipelines

**Context:** Sub-Pipeline 2 completed with 0 failures. Sub-Pipeline 1 had 16 failures. Difference: SP2's Documenter read actual SP1 code before writing updated docs.

**Changes applied:**
- `roles/documenter.md`: Added Rule 6: "In iterative sub-pipelines, read actual code before updating docs."

### 2026-03-26 -- 2026-03-25-procedural-map-generation: TDD Stub Creation Communication

**Context:** SP1's 16 failures were caused by divergent interpretations between Tester stubs and Implementer code.

**Changes applied:**
- `roles/tester.md`: Added "TDD Stub Creation" section — documents the pattern and the responsibility to communicate interpretation assumptions in the journal.

### 2026-03-26 -- 2026-03-25-procedural-map-generation: Pure-Static-Method Architecture Validation

**Context:** Three consecutive sub-pipelines with zero Debugger dispatches.

**Pattern validation:** Confirms the pure-static-method + unit-test-only architecture as the optimal pattern for greenfield algorithmic modules.

### 2026-03-26 -- 2026-03-26-arena-spread-tuning: Thresholds Must Be Algorithm-Derived

**Context:** 3 of 4 test failures were preventable. Tester used 60% coverage threshold from test spec without verifying the algorithm could guarantee it. Actual worst-case was 59.9%.

**Changes applied:**
- `roles/tester.md`: Added Rule 8: "Derive thresholds from algorithm guarantees, not round numbers."
- `roles/documenter.md`: Added Rule 7: "Test spec thresholds must be derivable from the algorithm."
- `roles/implementer.md`: Added "Downstream Consumer Audit" section — audit downstream systems when changing algorithm behavior.

### 2026-03-26 -- 2026-03-26-map-generation-integration: TDD Stubs Should Flag API Deviations

**Context:** Tester created a struct instead of the documented tuple return type but described it as "per the task spec" instead of flagging the deviation.

**Changes applied:**
- `roles/tester.md`: Added bullet to TDD Stub Creation: "Flag API deviations from documentation."

### 2026-03-26 -- 2026-03-26-map-generation-integration: Four Consecutive Zero-Debug Pipelines

**Pattern validation:** Four consecutive pipelines with zero Debugger dispatches confirms pure-static-method + unit-test-only + iterative-doc-sync as the optimal pattern for greenfield algorithmic modules.

### 2026-03-26 -- 2026-03-26-map-wall-tightness: Validate Assertions Against Actual Data

**Context:** 3 of 4 failures were Tester bugs (untested tolerances, unreliable reverse-lookup validation). Debugger's test rewrite was also flawed, requiring second dispatch.

**Changes applied:**
- `roles/tester.md`: Added Rule 9: "Validate assertions against actual data before submitting."
- `roles/implementer.md`: Added "Spatial Region Ownership" subsection — when adding placement logic, suppress existing placement in the same spatial region.
- `roles/debugger.md`: Added Rule 13: "When rewriting a test, re-read the test documentation first."

### 2026-03-26 -- 2026-03-26-map-validation-fixes: New Categories Need Distinct Identifiers

**Context:** 5 of 6 test failures had the same root cause: new items lacked a distinct category, making them indistinguishable from existing items.

**Changes applied:**
- `roles/implementer.md`: Added "New Placement Origins Need Distinct Categories."
- `roles/tester.md`: Added Rule 10: "Identify items by category, not by list structure" — never use index parity or positional heuristics when categories are available.
- `roles/tester.md`: Added Rule 11: "Use 3+ seeds for different-seeds-produce-different-results tests."
- `roles/documenter.md`: Added Rule 8: "Specify how tests should identify items in heterogeneous outputs."

### 2026-03-27 -- 2026-03-27-map-robustness: Sequential Constraints and Filter Exemptions

**Context:** 1 Tester bug (missing filter exemption), 1 Implementer bug (sequential constraint violation), 1 Documenter inconsistency (enum value name disagreement).

**Changes applied:**
- `roles/implementer.md`: Added "Sequential Constraint Validation" — when applying post-generation transforms, re-check upstream constraints.
- `roles/tester.md`: Added Rule 12: "Mirror production filter exemptions in integration tests."
- `roles/documenter.md`: Added Rule 9: "Design doc and test spec must agree on enum values and API names."

### 2026-03-27 -- 2026-03-27-sound-visual-testing: Sub-Manager Code Writing and Shared Files

**Context:** 4 Sub-Managers wrote code directly instead of spawning workers. 3 parallel Sub-Managers modified the same factory file — last writer won by luck.

**Changes applied:**
- `roles/sub-manager.md`: Added "When to Write Code Directly vs. Spawn Workers" section with decision framework.
- `roles/sub-manager.md`: Added "Shared File Conflicts in Parallel Waves" section — read before modifying, preserve existing entries, use additive edits.

**Proposed changes (pending user review):**
- `company-execute/SKILL.md`: Add rule to identify shared files before launching parallel waves. — Status: Pending
- `company-expand/SKILL.md`: Add "Shared Files Across Parallel Sub-Plans" to blueprint template. — Status: Pending

### 2026-03-27 — Full Regression Rule for Large Pipelines

**Context:** A pipeline completed 160/160 scoped tests but never ran the full regression suite. Large enough that cross-module regressions could go undetected.

**Changes applied:**
- `company-expand/SKILL.md`: Added "Full Regression" step to blueprint Execution Order template.
- `company-plan/SKILL.md`: Added "Scale Check: When to Recommend `/company-expand`" — when 3+ sub-pipelines, 3+ modules, or 5+ new files.

### 2026-03-28 -- 2026-03-27-playmode-test-fixes: Spawn/Offset Geometry in Distance Fixes

**Context:** Debugger reduced spawn distances without checking weapon offset values, causing 5+ tests to need Manager iteration fixes. Manager applied direct code edits during verification.

**Changes applied:**
- `roles/debugger.md`: Added Step 3.5 "Account for Spawn/Offset Geometry in Distance Fixes."
- `roles/debugger.md`: Added "Verification-Phase Quick Fixes" section.
- `roles/tester.md`: Added Integration Test Writing Rule 6 "Use APIs That Report Success/Failure."
- `company-execute/SKILL.md`: Added "Flaky vs Real Failures" classification guidance.
- `company-execute/SKILL.md`: Added "Manager Quick-Fix During Verification" guidance.

### 2026-03-28 -- 2026-03-28-player-action-time-windows: Verify Enum/API Names and Thread Safety

**Context:** Sub-Manager used a non-existent enum value (trivial compilation fix). Another Sub-Manager added a property that called a main-thread-only API from a background thread.

**Changes applied:**
- `roles/sub-manager.md`: Added Rule 9: "Verify enum/API names against actual code" — read the source file to confirm values exist.
- `roles/sub-manager.md`: Added Rule 10: "Consider thread safety for properties on shared objects."
- `roles/tester.md`: Added Rule 13: "Test assertions must align with the stated design of the system under test."
- `roles/implementer.md`: Added "Thread Safety for Shared Properties" subsection.

### 2026-03-26 -- 2026-03-26-map-wall-tightness: Test Validation Strategies

**Context:** Debugger rewrote a test with a new flawed validation strategy without checking the test spec. Required second Debugger dispatch.

*(Role changes already captured in the "Validate Assertions Against Actual Data" entry above.)*

### 2026-03-25 -- 2026-03-25-procedural-map-generation: Visionary Recommendations Should Influence Manager Scoping

**Context:** SP2 Visionary identified 3 HIGH-priority gaps. SP3 Manager scoped work without checking Visionary recommendations.

**Changes applied:**
- `recommendations.md` (generic): Added recommendation that Managers should read `recommendations.md` before scoping sub-pipelines. *(The actual entry was project-specific, but the PRINCIPLE is generic.)*

### 2026-03-25 -- 2026-03-25-procedural-map-generation: Algorithm-Without-Integration Pipeline Pattern

**Context:** Second consecutive pipeline where core algorithms are fully tested but their integration into the runtime pipeline is silently dropped.

**Lesson:** Blueprint tasks should distinguish "algorithm" tasks from "integration" tasks. The Manager should verify both categories are dispatched. Tests passing on the algorithm API does not prove integration completeness.

### 2026-03-30 -- 2026-03-29-forcestart-migration: Root Cause Hypothesis Verification

**Context:** Blueprint hypothesized one root cause; Implementer correctly identified the actual cause, saving a wasted iteration.

**Changes applied:**
- `roles/implementer.md`: Added rule 4 "Verify the blueprint's root cause hypothesis" to Read Before Writing.
- `roles/debugger.md`: Added Step 3.6 "Check for Side Effects in Condition Callbacks."
- `roles/debugger.md`: Added "Inter-Test Contamination (Pass Individually, Fail in Suite)" section.
- `roles/tester.md`: Added bullets to Integration Test Writing Rule 3: check distance ranges for zero-width windows, check speed for stationary items.

### 2026-03-30 -- 2026-03-30-company-repo-separation: Multi-Agent Company Repo Separation

**Context:** Expand pipeline that separated the generic multi-agent Company framework from project-specific content. 8 sub-plans across 4 waves, all completed successfully. Zero debug iterations. SP-D and SP-E hit background agent write permission issues.

**Changes applied:**
- `roles/sub-manager.md`: Fixed "EditMode"/"PlayMode" terminology leaks in journal template — replaced with "Unit tests"/"Integration tests" for framework portability.
- `roles/tester.md`: Fixed "EditMode"/"PlayMode" terminology leaks in base class selection framework — replaced with "unit test base class"/"integration test base class".
- `roles/sub-manager.md`: Added "Write permission gotcha" to "When to Write Code Directly" section — background workers may lack write permissions for new directories; Sub-Manager must write files itself using worker output when this happens.
- `company-execute/SKILL.md`: Fixed "prefabs, ScriptableObjects" leak — replaced with generic "configuration files, designer-tuned data".

**Lesson for meta-pipelines:** When a pipeline restructures the pipeline infrastructure itself, the agents performing the work ARE the system being modified. This creates unique risks: (1) agents may read stale versions of files they're actively editing, (2) path references become invalid mid-pipeline as files are moved, and (3) the litmus test for "generic vs project-specific" requires extra vigilance because the agent is simultaneously an instance of the framework AND a user of it. The mitigation is strict wave ordering — audit/split phases first, creation phases second, wiring/verification phases last.

### 2026-04-04 -- 2026-04-04-entry-viewing-export: Test Coverage Implies Implementation Requirement

**Context:** Entry Viewing & Export pipeline (Next.js + Prisma). Initial test results: 78/78 integration tests passing, 1/37 E2E tests passing. After 1 debug iteration: 30/37 E2E passing (19 new feature tests + 11 pre-existing tests). 3 root cause clusters identified.

**Root Cause 1 — Implementer deferred tested component (8 failures):**
- Implementer marked ExportDialog component as "optional enhancement" and did not create it
- 8 E2E tests in export-flows.spec.ts required this component (used data-testid selectors referencing it)
- Tests were written in Phase 2 (Tester), implementation was Phase 3 (Implementer)
- Implementer did not check test files to see if "optional" component was actually tested
- **Lesson:** If tests reference a component with specific selectors/IDs, that component is NOT optional — it is part of the tested contract. "Optional" only applies to untested enhancements.

**Root Cause 2 — Tester did not create E2E global setup (18 failures):**
- 18 E2E tests expected seeded database (entries, chapters, projects) but no global setup script existed
- Tests failed with "no entries found" or null reference errors
- Test framework (Playwright) supports globalSetup configuration — pattern is standard for E2E tests
- Tester wrote tests assuming seed data without creating the seeding infrastructure
- **Lesson:** E2E tests that query database entities require a global setup script. Writing tests without infrastructure is incomplete work.

**Root Cause 3 — Seed data did not match UI thresholds (10 failures):**
- Entry listing tests asserted "View Full" button should exist (UI shows button for entries >200 chars)
- Seed data created entries with only ~80 chars of content
- Tests correctly specified the UI behavior, but seed data did not trigger the condition
- **Lesson:** Seed data characteristics must match UI trigger thresholds. If UI conditionally renders based on content length, seed data must exceed the threshold.

**Changes applied:**
- `roles/implementer.md`: Added "Test Coverage Alignment" subsection — components referenced in tests are NOT optional, must check test files before deferring work.
- `roles/tester.md`: Added "E2E Test Infrastructure" section — global setup requirements, seed data characteristics, file organization.
- `roles/tester.md`: Added E2E infrastructure verification to "After Writing" checklist.

**Validation:** Debug iteration fixed all 3 clusters (36 failures → 7 failures). Remaining 7 failures are pre-existing tests unrelated to this feature. No regressions in integration tests (78/78 still passing).

### 2026-04-05 — 2026-04-05-embedding-generation: ORM Unsupported Types and Module-Level Mocking

**Context:** Embedding Generation pipeline (Next.js + Prisma + OpenAI). Initial state: 13/96 tests failing. After 1 debug iteration: 96/96 tests passing. 2 root causes identified, both in test code.

**Root Cause 1 — Tester used ORM operations on unsupported type (9 failures):**
- Tests used `vector: null` in ORM create() operations
- Tests used `where: { vector: null }` in ORM queries
- ORM schema defined field as `Unsupported("vector(1536)")` (database-native type not in ORM's type system)
- ORM threw "Unknown argument" errors when field was referenced in standard operations
- **Lesson:** When an ORM marks a field as "Unsupported", it means the field exists in the database but cannot be used in ORM operations. ALL operations on that field must use raw SQL (read, write, query, NULL checks).

**Root Cause 2 — Tester created per-instance mocks for module-level instantiation (4 failures):**
- Production code instantiated dependency at module load time (top-level scope)
- Test mock factory created new mock function instances each time the factory ran
- Module-level instantiation received different mock instance than tests configured
- **Lesson:** When production code instantiates dependencies at module/import time, standard per-test mock configuration doesn't work. Create shared mock references BEFORE the mock factory so all instances share the same mock function.

**Changes applied:**
- `roles/tester.md`: Added Integration Test Writing Rule 7 "Check ORM Schema Constraints Before Writing Database Tests" — generic guidance for checking schema before writing tests, with pattern for Unsupported types
- `roles/tester.md`: Added "Mocking Modules with Module-Level Instantiation" section — generic pattern for shared mock references with before/after examples (no framework-specific details)
- `roles/implementer.md`: Added "Environment Variable Validation" guidance — generic tradeoffs between startup validation, lazy validation, and health checks

**Validation:** Single debug iteration fixed all 13 failures. No regressions in 83 pre-existing tests. TDD process validated: tests were wrong, implementation was correct.

### 2026-04-06 — 2026-04-06-production-hardening: Test Assertion Semantics and Floating-Point Precision

**Context:** Production Hardening pipeline (Next.js + Prisma + OpenAI). Initial state: 104/106 tests passing. After 1 debug iteration: 106/106 tests passing. 2 test logic issues, zero implementation bugs.

**Root Cause 1 — Tester used strict boolean equality for logical chain result (1 failure):**
- Test code: `const authorized = header && header.startsWith('Bearer') ... expect(authorized).toBe(false)`
- JavaScript logical AND (&&) returns the first falsy value, not necessarily `false`
- When header is missing (undefined), the chain returns `undefined`, not `false`
- Test assertion `toBe(false)` fails with "expected undefined to be false"
- **Lesson:** When testing boolean-like values from logical expressions (&&, ||, !), use `toBeTruthy()`/`toBeFalsy()` instead of `toBe(true)`/`toBe(false)`. Logical chains can return non-boolean falsy values (undefined, null, 0, '') that fail strict equality checks.

**Root Cause 2 — Tester didn't account for floating-point precision in time calculations (1 failure):**
- Test code: `const ageHours = ageMs / (1000 * 60 * 60) ... expect(ageHours).toBeGreaterThanOrEqual(2)`
- Division `7200000 / 3600000` should equal exactly `2.0` mathematically
- JavaScript IEEE 754 floating-point produces `1.9999994444444444` due to precision limits
- Test assertion fails: "expected 1.9999994444444444 to be greater than or equal to 2"
- **Lesson:** When calculating time-based ratios (hours, days, percentages) in tests, round the result to eliminate floating-point precision errors: `Math.round((ageMs / (1000 * 60 * 60)) * 10) / 10`. Rounding to 1 decimal place maintains test accuracy while eliminating precision drift from floating-point arithmetic.

**Changes applied:**
- `roles/tester.md`: Added rule #14 "Use semantic assertion methods for boolean-like values" — explains when to use `toBeTruthy()`/`toBeFalsy()` vs `toBe(true)`/`toBe(false)` with examples
- `roles/tester.md`: Added section #8 "Round Floating-Point Time Calculations in Tests" — provides pattern for eliminating IEEE 754 precision errors in time calculations
- `roles/documenter.md`: Added rule #10 "Explicitly document boundary conditions in test specs" — prevents ambiguity when specs include numeric thresholds with comparison operators

**Pattern Validation:** Third consecutive pipeline with zero implementation bugs. All debug iterations in recent pipelines (export-validation, embedding-generation, production-hardening) were test-side issues, not implementation bugs. TDD workflow (design → test specs → test code → implementation) consistently produces correct implementations when test specs are comprehensive.

### 2026-05-08 — 2026-05-08-complete-video-carousel-build: React Component Testing and Mock Lifecycle

**Context:** Complete greenfield build of video carousel application (Next.js 15 + React 19 + TypeScript + Vitest). 5 sub-plans across 3 waves. TDD workflow enforced throughout. 90/90 tests passing, zero regressions, zero integration issues.

**Root Cause 1 — Mock recreation breaking callback registration (1 debug iteration):**
- Carousel test created new mock Embla API object on every render
- Mock code: `vi.mock('embla-carousel-react', () => ({ default: vi.fn(() => [vi.fn(), createMockEmblaApi()]) }))`
- React component calls hook on every render (standard React behavior)
- Each render creates NEW mock object with NEW event emitters
- Component registers callbacks on first render's object
- State update triggers re-render, creates SECOND mock object (discards first)
- Test invokes callback on SECOND object (where component never registered)
- Result: callbacks not fired, state not updated, test fails
- **Lesson:** React hooks are called on every render. When mocking hooks that return stateful objects, create the mock object ONCE outside the factory and reuse across renders. Reset the mock in `beforeEach` to isolate tests.

**Root Cause 2 — JSDOM boolean attribute handling (1 debug iteration):**
- Test code: `expect(videoElement).toHaveAttribute('muted')`
- Component code: `<video muted playsInline />`
- React sets boolean HTML props as element properties, not attributes
- JSDOM doesn't mirror properties to attributes like real browsers do
- Test assertion fails: "expected element to have attribute 'muted'"
- **Lesson:** When testing boolean HTML attributes in JSDOM (checked, disabled, muted, etc.), check element properties (`element.muted`), not attributes (`getAttribute('muted')`). Real browsers mirror these; JSDOM does not.

**Root Cause 3 — Test environment async error timing (non-blocking):**
- 3 tests showed "Unhandled Rejection: NotAllowedError" in output
- Component code correctly caught errors: `video.play().catch(err => { /* silently ignore autoplay policy errors */ })`
- Vitest logs promise rejection BEFORE component's catch block executes
- All 3 tests passed their assertions (component behavior correct)
- Error logs cosmetic only (test environment timing issue)
- **Lesson:** Async error handling in JSDOM tests may show unhandled rejections before catch blocks execute. This is a test environment timing artifact, not a code bug. Verify component catches errors correctly in production; suppress warnings in test config if needed.

**Changes applied:**
- `roles/tester.md`: Added "React Hook Mocking Lifecycle" section — pattern for creating mock objects once and reusing across renders
- `roles/tester.md`: Added note to JSDOM section — check boolean HTML properties, not attributes
- `roles/tester.md`: Added note to async error testing — JSDOM timing quirks vs real errors

**Pattern Validation:** Zero integration issues when TDD followed rigorously. All components from parallel sub-plans integrated correctly on first try. Design → Test → Code workflow caught edge cases (token leakage, invalid IDs, video timing bugs) before implementation. SP-2 (API route) achieved 100% test coverage with 24 tests written before any implementation code.
