# Visionary Recommendations (Generic)

Cross-project strategic patterns and architectural recommendations distilled from real pipeline executions.
These ship with the multi-agent-company template and apply to any project.

The Visionary adds entries here when the recommendation is a universally applicable pattern.
Project-specific recommendations go to `Company/project/recommendations.md`.

## Format

Each entry follows:
```
### {date} — {pipeline-id}: {feature name}
**Priority**: {Critical | High | Medium | Low}
**Category**: {Architecture | Tooling | Conventions | Process | Tech Debt}
**Recommendation**: {what to do}
**Rationale**: {why — evidence from pipelines}
**Effort**: {Small | Medium | Large}
**Impact**: {what improves}
```

---

<!-- Generic recommendations below -->

### 2026-03-26 — Distilled: Extract Pure Logic into Static Methods for Unit Testing

**Priority**: High
**Category**: Architecture
**Recommendation**: When a class mixes framework/runtime dependencies with business logic, extract the logic into `public static` pure methods that take all inputs as parameters and return outputs with no side effects. This enables fast, reliable unit tests without requiring runtime infrastructure (scene loading, framework initialization, etc.).
**Rationale**: Four consecutive pipelines with zero Debugger dispatches used this pattern. The pure-static-method + unit-test-only architecture is confirmed as the optimal pattern for greenfield algorithmic modules. Contrast with integration-test-dependent tests, which have produced 5 dedicated fix pipelines.
**Effort**: Small per method extraction
**Impact**: Dramatically reduces test flakiness and debug iteration count for new modules.

---

### 2026-03-26 — Distilled: When a Technical Doc Exceeds ~500 Lines, Split into Focused Sub-Documents

**Priority**: Medium
**Category**: Conventions
**Recommendation**: Technical documentation files should stay under ~500 lines. When a doc grows past this, split it into focused sub-documents (one per subsystem) with a parent index document linking them. Agents waste context tokens reading a 1500-line doc when they only need one subsystem's 200 lines.
**Rationale**: Three separate Documenters independently flagged a 1725-line technical doc as problematic. Reading required 8+ chunks. Updates were error-prone because insertion points were scattered throughout the monolith.
**Effort**: Medium per split (must update cross-references)
**Impact**: Reduces agent context waste, makes doc updates less error-prone.

---

### 2026-03-26 — Distilled: Config Struct Alignment with Implementation

**Priority**: High
**Category**: Architecture
**Recommendation**: When a config struct/class declares fields for tuning, the implementation MUST read from those fields, not from internal hardcoded constants. Audit periodically: for every field in the config, verify there is at least one consumer in the implementation. For every internal constant in the implementation, consider whether it should be in the config.
**Rationale**: Across 6 pipelines, a config struct accumulated fields that implementations ignored while using their own hardcoded constants. The gap between config and behavior widened with each pipeline, creating a user-facing bug: UI sliders that have no effect.
**Effort**: Small (periodic audit pass)
**Impact**: Designer-facing tools actually work. Prevents growing disconnect between config and behavior.

---

### 2026-03-26 — Distilled: Validation Logic Belongs in Runtime Code, Not Editor Code

**Priority**: Medium
**Category**: Architecture
**Recommendation**: When an editor tool needs to validate data before acting on it, place the validator in the runtime/main assembly so it can be tested with unit tests without editor/tooling assembly references. The editor tool calls the validator but does not own it.
**Rationale**: Discovered when editor-time validation logic needed testing but was embedded in an editor-only class, making it untestable by the standard test assembly.
**Effort**: Small (move class, update references)
**Impact**: Keeps validation logic testable.

---

### 2026-03-27 — Distilled: Algorithms Delivered Without Integration — Pipeline Anti-Pattern

**Priority**: High
**Category**: Process
**Recommendation**: After all sub-pipelines complete, verify that every new public API has at least one caller in the production pipeline. Blueprint tasks should distinguish "algorithm" tasks from "integration" tasks, and the Manager must verify both categories are dispatched. Tests passing on an algorithm's API does not prove integration completeness.
**Rationale**: Two consecutive pipelines delivered fully tested algorithms with zero callers in the production pipeline. The pattern occurs because (a) Tester writes tests against the algorithm API, (b) Implementer makes tests pass, (c) verification checks test count, not integration completeness. Integration tasks appear in the blueprint but are never dispatched because all tests pass without them.
**Effort**: Small (add integration verification checklist)
**Impact**: Ensures each pipeline produces end-to-end value, not disconnected components.

---

### 2026-03-27 — Distilled: Visionary Recommendations Must Influence Manager Scoping

**Priority**: High
**Category**: Process
**Recommendation**: Future Managers should read `recommendations.md` before scoping sub-pipelines. Visionary analysis is wasted if the Manager doesn't incorporate it into the next sub-pipeline's scope.
**Rationale**: A Visionary identified 3 HIGH-priority gaps. The next Manager scoped only work from the original blueprint without checking recommendations.
**Effort**: Small (add to Manager checklist)
**Impact**: Prevents accumulation of unaddressed architectural gaps across sub-pipelines.

---

### 2026-03-27 — Distilled: Sub-Managers Can Write Code Directly for Uniform Patterns

**Priority**: Medium
**Category**: Process
**Recommendation**: When all files follow a uniform pattern (e.g., N classes implementing the same interface with scenario-specific details), the Sub-Manager should write code directly instead of spawning workers. When files are tightly coupled and inconsistency would cause compilation failures, write directly. When distinct Doc/Test/Code phases would benefit from role specialization, spawn workers.
**Rationale**: 4 Sub-Managers independently decided to write code directly rather than spawning workers, and all made the right call. Spawning a worker for each of 37 identical files would have been pure overhead.
**Effort**: N/A (decision framework, not implementation)
**Impact**: Reduces overhead for repetitive file creation tasks.

---

### 2026-03-27 — Distilled: Shared Files Across Parallel Waves Need Coordination

**Priority**: High
**Category**: Process
**Recommendation**: When multiple sub-plans in the same wave all modify the same file (e.g., a factory, registry, or enum), the Manager must identify these shared files at dispatch time and warn each Sub-Manager. Sub-Managers must read the file before modifying and preserve all existing entries.
**Rationale**: 3 parallel Sub-Managers modified the same factory file. The last writer happened to include all entries by luck. If it had only written its own entries, the other sub-plans' entries would have been lost.
**Effort**: Small (identification at planning time, additive edits at execution time)
**Impact**: Prevents data loss in parallel execution.

---

### 2026-03-28 — Distilled: Flaky vs Real Failure Classification

**Priority**: Medium
**Category**: Process
**Recommendation**: Establish a framework for distinguishing flaky tests from real failures during pipeline verification. A test that fails intermittently with no code change should be classified as flaky and tracked separately from deterministic failures. Flaky tests should not block pipeline completion but must be logged for future investigation.
**Rationale**: Pipelines wasted debug iterations on intermittent tests that passed on re-run. Without a classification framework, every failure was treated as real.
**Effort**: Small (add classification guidance to pipeline execution docs)
**Impact**: Prevents wasting debug iterations on intermittent failures.

---

### 2026-03-28 — Distilled: Manager Quick-Fix During Verification

**Priority**: Medium
**Category**: Process
**Recommendation**: During verification, when the Manager encounters a single-value fix (wrong distance constant, missing flag, off-by-one threshold), it is appropriate to apply the fix directly without spawning a Debugger agent. Document the fix in the pipeline state. Reserve Debugger agents for multi-file or root-cause-unclear failures.
**Rationale**: Multiple pipelines had the Manager spawn Debugger agents for trivial fixes that took more time to dispatch than to apply directly.
**Effort**: N/A (process guidance)
**Impact**: Faster pipeline completion for trivial fixes.

---

### 2026-03-28 — Distilled: Dormant-by-Default for New Configurable Systems

**Priority**: Medium
**Category**: Architecture
**Recommendation**: When adding new configurable time windows, delays, or optional behaviors to existing systems, default all serialized fields to 0. Guard activation with `> 0` checks so the system is dormant (inactive) until a designer tunes the value. Tests should respect dormancy — config-read tests assert `>= 0` (valid), not `> 0` (active).
**Rationale**: A pipeline produced 6 sub-plans with zero debug iterations because all new systems defaulted to dormant. Real complexity only surfaces when systems are activated. This pattern keeps existing behavior unchanged by default.
**Effort**: Small (discipline in field declaration)
**Impact**: Prevents accidental activation of half-implemented features. Enables incremental designer tuning.

---

### 2026-03-29 — Distilled: Pre-Existing Failure Accountability

**Priority**: Medium
**Category**: Conventions
**Recommendation**: No pipeline may close with more pre-existing test failures than the last pipeline that ran the full suite. Each pipeline must compare failure count to the documented baseline. New failures (even if not caused by the pipeline) must be investigated or explicitly documented with a reason for deferral. The baseline is updated after each successful verification.
**Rationale**: Failure count was stable/growing across 4+ pipelines because each pipeline correctly identified failures as "pre-existing" and moved on. Without downward pressure, the count only grows.
**Effort**: Small (add baseline tracking to pipeline verification)
**Impact**: Creates accountability that prevents silent failure accumulation.

---

### 2026-03-30 — Distilled: Condition/Callback Functions Must Be Pure Queries

**Priority**: High
**Category**: Architecture
**Recommendation**: Functions registered as condition callbacks, state queries, or filter predicates must be pure — no side effects, no state mutations, no triggering of other behaviors. If a state transition is needed when a condition changes, separate the transition logic into a dedicated update method called once per frame, not inside the condition check.
**Rationale**: A production bug was caused by a condition callback that contained a side effect (starting a behavior). The callback was invoked multiple times per evaluation cycle across different behavior evaluations, causing interference. Took extensive debugging across 2 pipeline iterations to diagnose.
**Effort**: Small (convention + doc comment on callback registration APIs)
**Impact**: Prevents a subtle class of bugs where multiple evaluations of the same condition cause unintended state changes.

---

### 2026-03-30 — Visionary Review: Repo Separation Residual Contamination

**Priority**: High
**Category**: Conventions
**Recommendation**: Run a final purity pass on `Company/learnings.md` and `Company/recommendations.md`. Both files still contain "EditMode" and "PlayMode" references (Unity-specific terminology) instead of the generic "unit test" and "integration test" equivalents adopted everywhere else. Specifically: learnings.md lines ~148 and ~168 reference "EditMode-only architecture"; recommendations.md lines ~31 and ~63 reference "EditMode" in rationale and recommendation text. Replace all occurrences with the generic equivalents established by SP-B.
**Rationale**: The SP-B sub-plan correctly genericized all 4 company skills and the SP-A sub-plan cleaned all 8 role files. But the SP-C sub-plan (split learnings/recommendations) rewrote these files from scratch using distilled content — and the distilled content reintroduced the Unity-specific terminology that SP-B had removed. The contamination survived because SP-C ran in parallel with SP-A/SP-B (Wave 1) rather than after them, so there was no final verification pass across all files.
**Effort**: Small (4 string replacements)
**Impact**: Completes the genericization. Without this fix, a Python developer reading the generic template would encounter "EditMode" and "PlayMode" — terms they don't recognize — in the framework's own learnings and recommendations files.

---

### 2026-03-30 — Visionary Review: company-execute Still References "prefabs, ScriptableObjects"

**Priority**: Medium
**Category**: Conventions
**Recommendation**: In `.claude/skills/company-execute/SKILL.md`, line ~139 contains "prefabs, ScriptableObjects" — Unity-specific asset types. Replace with generic terminology such as "production assets, configuration files." This was likely missed because the SP-B verification grep searched for standalone "prefab" but the word appeared inside a parenthetical list.
**Rationale**: The SP-B journal reported 0 occurrences of forbidden terms across all files, but the grep may have been case-sensitive or the replacement was incomplete for this specific instance.
**Effort**: Small (1 string replacement)
**Impact**: Removes the last Unity-specific term from the company skills.

---

### 2026-03-30 — Visionary Review: Open-Source Onboarding Gap — No Automated Verification

**Priority**: High
**Category**: Tooling
**Recommendation**: Create a `scripts/verify-purity.sh` script that greps all generic Company files (roles, learnings, recommendations, skills) for a maintained list of forbidden project-specific terms. Run it as part of any future separation or genericization pipeline. The forbidden terms list should include at minimum: Unity, MCP, EditMode, PlayMode, MagiciansLog, prefab, ScriptableObject, MonoBehaviour, Assets/, and any other framework-specific terms added over time. The script should exit non-zero if any matches are found.
**Rationale**: This pipeline had 8 sub-plans and 8 journal entries, yet residual contamination survived because verification was manual (visual inspection and ad-hoc greps). A 20-line shell script would have caught the 6 remaining instances instantly. The contamination pattern is predictable: content is rewritten/distilled, and the person doing the distillation unconsciously uses the specific terms they're most familiar with.
**Effort**: Small (1 script, ~20 lines)
**Impact**: Makes genericization mechanically verifiable. Any future Optimizer edits that leak project-specific terms into role files would be caught immediately.

---

### 2026-03-30 — Visionary Review: Missing CONTRIBUTING.md for the Company Framework Itself

**Priority**: Medium
**Category**: Process
**Recommendation**: Before open-source publication, create a `CONTRIBUTING.md` that explains: (1) how to propose changes to role files (the Optimizer's litmus test is the standard), (2) how to add new skills, (3) how to submit learnings from other projects back to the template, (4) the generic-vs-project-specific boundary rule, and (5) the expected format for examples. This document should also explain the philosophy — that role files are living documents improved by the Optimizer after every pipeline run, and that external contributions should follow the same evidence-based standard (no rule without a pipeline failure that motivated it).
**Rationale**: The README explains the system well for users, but says nothing about contributing to the framework itself. Open-source projects without contribution guidelines get PRs that don't match the project's standards.
**Effort**: Small (1 document)
**Impact**: Sets expectations for external contributors. Prevents rule inflation where well-intentioned but untested rules dilute the role files.

---

### 2026-03-30 — Visionary Review: Versioning Strategy for the Company Framework

**Priority**: Medium
**Category**: Process
**Recommendation**: Adopt semantic versioning for the Company framework template. Tag releases (e.g., v1.0.0 for the initial open-source publication). Breaking changes to the loading chain (new required files, renamed paths, changed skill arguments) are major versions. New role rules, new learnings, new skills are minor versions. Typo fixes and wording improvements are patches. Document a lightweight upgrade guide for each minor/major release explaining what changed and how to merge upstream improvements into existing projects.
**Rationale**: Once the template is cloned into 5+ projects, those projects will diverge. Without versioning, there is no way to communicate "the Optimizer learned something valuable in project X, here's how to get it into your project." The two-tier learnings system is designed for this, but the mechanics of pulling upstream generic improvements into a downstream project are undefined.
**Effort**: Medium (versioning discipline + upgrade guides per release)
**Impact**: Enables the cross-project learning loop that the system's architecture promises but does not yet deliver.

---

### 2026-03-30 — Visionary Review: Example Could Be Stronger with a Non-Unity Project

**Priority**: Low
**Category**: Process
**Recommendation**: After publication, add a second example in `examples/` from a different technology stack (e.g., a Python web API, a Rust CLI tool, or a TypeScript full-stack app). The evil-magicians example is excellent for showing depth and maturity, but a prospective user of a different technology might struggle to see themselves in it — the project-guidelines.md is 340 lines of Unity-specific content. A minimal example (50-100 line project-guidelines, 1 pipeline) from a different stack would demonstrate universality.
**Rationale**: The litmus test for genericization is "would this apply to a Python web API?" But the only example is Unity/C#. Prospective users might assume the framework is game-development-specific.
**Effort**: Medium (requires running the Company on a different project for at least 2-3 pipelines)
**Impact**: Demonstrates universality. Reduces adoption friction for non-game developers.
