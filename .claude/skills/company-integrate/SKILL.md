---
name: company-integrate
description: "Integrate an existing feature into the Company Doc-Test-Code lifecycle. Reads existing code, writes documentation, documents tests with scenarios, implements tests, runs them against existing code, and fixes only what fails. Use for features built before the documentation and testing workflow was established."
argument-hint: "[feature or system name]"
---

# Company Integrate: $ARGUMENTS

This workflow brings an existing, already-working feature into the documentation and testing system. You are NOT building new code — you are understanding what exists, documenting it truthfully, writing tests that describe its actual intended behavior, and then verifying the implementation passes. Fix only what the tests reveal as broken.

## Context Dump

If the user asks you to "dump your context" or "save your progress", invoke `/dump-context {module}`. This saves your state so another session can resume later.

## Workflow (strict order — do NOT skip steps)

### Step 0: Load Context

Before reading any code, orient yourself:

1. **Read project guidelines** (`Company/project/project-guidelines.md`) — project conventions, test infrastructure, tools, documentation structure, error handling rules, and common gotchas.
2. **Read the project documentation index** — scan the documentation structure defined in project guidelines for entries related to this feature (GDD, Technical, Testing docs).
3. **Scan for module context.** Identify which module(s) this feature belongs to based on the project's architecture overview. For each potentially related doc, read at least the header and table of contents to confirm relevance. Don't read full docs yet — just enough to map the feature to module(s).
4. **Check for existing module skills.** Look in `.claude/skills/module-*/SKILL.md` for any module that covers this feature. If one exists, note it for Step 1.

**Output of this step**: A list of 1+ modules that this feature touches, with a brief reason for each.

**If the feature spans 2+ modules — STOP AND DISCUSS with the user:**
- List every module the feature touches and why (e.g., "Module A for the core logic, Module B for the side effects, Module C for the UI interaction").
- Ask: Is this the right decomposition? Should some of these be merged, or should the feature live primarily in one module with light integration into others?
- Ask: Should a new module skill (`.claude/skills/module-*/SKILL.md`) be created to track the cross-module feature, or does the feature naturally belong to one primary module?
- **Wait for the user's answer** before proceeding to Step 1.

If the feature maps cleanly to a single module, proceed directly to Step 1.

### Step 1: Understand What Exists

Read the existing code thoroughly before writing anything.

1. **Load module context.** If a module skill was identified in Step 0, read it first for the document chain and known gotchas. Read the design and technical docs identified in Step 0.
2. **Find all relevant source files.** Use Glob/Grep to locate every class, enum, and method involved in this feature. Read them completely — don't skim.
3. **Trace the integration points.** How does this feature connect to other systems in the project? What methods call into it? What does it call out to?
4. **Identify the public API.** What methods/properties are the entry points? Which ones are pure (no side effects, no framework dependencies) vs. which ones need a running scene or runtime context?
5. **Note any existing tests.** Check the project's test directories (defined in project guidelines) for anything that already covers this feature.

### Step 2: Write Feature Documentation (DRAFT)

Document what the code ACTUALLY DOES, not what you wish it did. Misalignments between intent and implementation are noted as "Known Issues" — they are not silently corrected.

Follow the documentation structure and naming conventions defined in `Company/project/project-guidelines.md`.

1. **Design doc** (GDD or equivalent): What the feature does from the player/user's perspective. Rules, behaviors, edge cases. If a design doc already exists, update it to match reality. If the code contradicts the design doc, add a "Known Issues / Misalignments" section documenting the discrepancy. Follow the project's no-hardcoded-numbers convention — point to config/source files as the source of truth, do not duplicate specific values.

2. **Technical doc**: Classes, methods, hooks, file locations, integration points. This is a map of the code as it exists today.

### Step 2b: Review Checkpoint — STOP AND ASK THE USER

**Do NOT proceed past this point without user approval.**

Present the documentation you wrote and ask for review. Specifically:

1. **Show a summary** of what you documented — the key behaviors, rules, values, and edge cases you found in the code. Keep it concise but complete.

2. **List ambiguities and open questions.** While reading the code you will have found things that are unclear — behaviors that might be intentional or accidental, values that might be wrong, interactions that seem odd. Ask about ALL of them. Examples:
   - "Behavior X resets state to Y — is that the intended design, or should it do Z?"
   - "Phase 2 triggers on condition A — is there a minimum threshold, or is it purely event-based?"
   - "The effect applies for N seconds — is that the right duration?"

3. **Flag any Known Issues / Misalignments** you found between the code and existing design documentation. Ask which version is correct.

4. **Wait for the user to:**
   - Approve the documentation as-is, OR
   - Answer your questions and request changes, OR
   - Add behaviors or rules you missed

5. **After approval**, update the documentation with the user's answers and corrections, then proceed to Step 3.

This checkpoint exists because the documentation becomes the source of truth for all tests that follow. Getting it wrong here means writing wrong tests.

### Step 3: Write Test Documentation

Create or update the test specification doc following the project's testing documentation conventions (see project guidelines for naming and location).

**Header** — link to source docs:
```markdown
# [Feature] Tests

**Design Source**: `{path to design doc}`
**Technical Source**: `{path to technical doc}`
**Test Location**: `{paths to test directories}`
**Status**: [count] planned
```

**For each test**, document in a table with scenario and what is checked:

| Test | Scenario | What Is Checked |
|------|----------|-----------------|
| `MethodName_Scenario_Expected` | Full description of what we set up and what operation we perform | What we assert and why this matters |

The scenario column is critical — it should be detailed enough that someone reading only the test doc understands the test without looking at code.

Organize into the **three tiers** (per project guidelines):

#### Tier 1: Logic Tests (Unit Tests)
Pure calculations via public static methods. No runtime context or scene.
- Look at the feature's code for methods that CAN be tested in isolation (pure math, no framework dependencies)
- If no public static pure method exists but the logic is testable, document a **Code Requirement** note: "This test requires extracting [logic] into a public static method." The extraction happens in Step 5 (fixing), not here.

#### Tier 2: Simple Integration Tests
Real runtime context, API-level operations, immediate state checks.
- Grant/configure through public APIs, call methods directly, check state
- Tests the feature's integration with the project's systems without letting the full pipeline run

#### Tier 3: Full-Scale Integration Tests
Real runtime context, actual operations, full pipeline, real outcomes.
- Perform the operation as it would happen in actual usage
- Let the system run (yield frames/time as needed)
- Observe the real-world result (state changed, effects applied, output produced, etc.)
- Complete before-action-after flows

**Also document:**
- **Known Discoveries**: Gotchas found while reading the code (e.g., "Class X blocks calls from Y", "pipeline runs in this specific order")
- **Deferred Tests**: Tests you can't write yet, with clear reasons

### Step 4: Implement Tests

Write test code matching the test documentation from Step 3. **All tests MUST follow the project's testing conventions** (see project guidelines for pessimistic testing rules, test base classes, naming conventions, and infrastructure).

- Place tests in the directories defined by project guidelines for unit and integration tests
- Use the project's test base classes and diagnostics infrastructure
- Follow the project's test naming conventions

**Pessimistic testing checklist for every test:**
- Assert preconditions (verify setup state before the action)
- Force the scenario — don't let the test silently pass if the scenario didn't trigger
- No conditional assertions (`if`/`else` that skip checks)
- Assert exact values when the expected value is known
- Behavior tests: verify intermediate steps, not just the final result
- Full-scale tests: check actual system state changed, not just return values
- Assert nothing unexpected happened (no unintended side effects)

If a Tier 1 test requires a public static method that doesn't exist yet, **write the test calling the method as it should be** — it will fail to compile. That's fine. It gets fixed in Step 5.

### Step 5: Run Tests and Fix

This is where company-integrate diverges from building new features. You are NOT writing the feature from scratch. You run the tests against the existing code and fix only what fails.

**Process:**
1. Check compilation using the project's compilation verification method (defined in project guidelines). If tests don't compile because a required public static method doesn't exist, make the **minimal extraction** to expose that method. Do not refactor beyond what's needed.
2. Run pre-test cleanup as defined in project guidelines. Run unit tests first (fast feedback on logic tier).
3. If Tier 1 tests fail:
   - Read the failure diagnostics (location defined in project guidelines)
   - Determine: is the test wrong (documenting behavior that doesn't match the code's actual intent) or is the code wrong (bug in existing implementation)?
   - If the test is wrong: fix the test AND update the test documentation to match.
   - If the code is wrong: fix the code. Keep changes minimal — fix the specific bug, don't refactor the surrounding code.
4. Run integration tests using the project's test execution method (batch filter if available).
5. Same failure triage for Tier 2 and Tier 3.

**Key principle: tests describe intended behavior, code is the implementation.** When they disagree, you must decide which one is wrong. The design documentation (Step 2) is the tiebreaker — it records the design intent.

### Step 5b: Note Fragility Observations (conditional)

`/company-integrate` is the skill most likely to surface **false-pass evidence**: you are documenting an existing feature, writing tests against it, and discovering that pre-existing tests (or the absence of them) failed to catch real bugs. Capture this evidence so the project's standing test-fragility research thread can use it.

This step depends on the project running an active test-fragility research thread. Check whether `Company/project/test_fragility_research.md` exists. If it does NOT exist, skip Step 5b entirely.

If it does exist, and during Step 5 you found ANY of the following, append an incident row to `Company/project/test_fragility_research.md` under "Going-Forward Incidents" using the Observation Schema at the top of that file:

- **False-pass discovered**: A pre-existing test was green but, while documenting/testing, you found the production code did not actually behave as the test claimed to verify.
- **Coverage gap revealed**: A behaviour described in the design doc had no test guard, and the code silently broke the documented contract — your new test caught it for the first time.
- **Test/code divergence**: The pre-existing test asserted a return value or count that didn't reflect actual game state, allowing a real bug to ship undetected.
- **Stale infrastructure dependency**: A pre-existing test only passed because of a load-bearing test-infra assumption (e.g., a defensive guard, an order-dependent setUp value) that is undocumented.

If none apply, skip Step 5b silently.

Schema (one row per incident):
```markdown
| {YYYY-MM-DD} | integrate-{feature-name} | `{exact [Test] method name}` | {false-pass\|false-fail\|infra-churn\|chronic-flakiness} | {what the test reported} | {what was actually true} | {hypothesis — point to H1..H7 in the research log if it matches} | {paths to relevant code/doc files} |
```

This step does NOT replace the Optimizer — it is a lightweight observation hook because `/company-integrate` does not run a post-pipeline Optimizer review. The next full-mode Optimizer run will see the appended incidents and may sharpen working hypotheses.

### Step 6: Update Documentation Status

Update the test doc:
- Mark test counts and status (DONE, passing count)
- Record any new Known Discoveries found during testing
- If you fixed code bugs, note them briefly
- If you adjusted tests, update the test tables to reflect what's actually tested

### Step 7: Update Module Skill

If a module skill exists in `.claude/skills/module-*/SKILL.md`, update it with:
- Any new test files added
- New Known Gotchas discovered
- Updated test counts

If Step 0 determined a new module skill should be created (user approved), create it now at `.claude/skills/module-{name}/SKILL.md` following the format of existing module skills.

### Step 8: Update Project-Level Documentation

Update the broader documentation to reflect what was added:

1. **Project documentation index** (per project guidelines):
   - Add entries for any new design, technical, or testing docs created in this workflow
   - Update status of existing entries if they changed (e.g., "Stub" to "Done")
   - Add new test files to the test files list if applicable

2. **Architecture overview** (if one exists per project guidelines):
   - Update the module map if script counts changed significantly
   - Add new enums, data flows, or key patterns if the feature introduced them
   - Add new singletons or base classes to the relevant tables
   - Update existing technical doc references if new ones were created

Only update sections that actually changed — don't rewrite unchanged content.
