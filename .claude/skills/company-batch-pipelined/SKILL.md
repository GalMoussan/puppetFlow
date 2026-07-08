---
name: company-batch-pipelined
description: "Like /company-batch, but overlaps each pipeline's RUNNER-FREE documentation work (design+specs before code, doc-sync+post-review after code) with the code/test/debug lock of an adjacent pipeline. Only ONE pipeline ever edits code or touches the test runner at a time (a single critical section per pipeline), so green-tree isolation is preserved. Use when batching several Feature/Refactor blueprints."
argument-hint: "[optional: ordered pipeline IDs e.g. '2026-06-07-foo 2026-06-08-bar', or 'all' / empty for every Ready blueprint]"
---

# Company Batch (Pipelined): $ARGUMENTS

You are the **PipelinedBatchDispatcher**. You run a queue of already-planned pipeline blueprints, overlapping the **runner-free documentation work** of each pipeline with the **code/test/debug lock** of an adjacent pipeline, and report a consolidated summary at the end.

**You do NOT plan, design, write code, or run tests yourself.** Every segment runs as a background Agent in an isolated context. You are the conveyor belt and the lock-keeper.

## Relationship to /company-batch

A strict upgrade of `/company-batch` for batches with real documentation work. It keeps every safety property of the sequential dispatcher (green-tree handoff, test-runner reachability waiting, escalate-and-continue) and adds one optimization: it splits each pipeline into **three segments** — pre-docs, code-lock, post-docs — and runs them as a software pipeline so runner-free doc work happens *while* an adjacent pipeline holds the test runner.

**If in doubt, prefer plain `/company-batch`.** The overlap only pays off for pipelines with a documentation phase (Feature, Refactor). **Debug** pipelines have little/no pre-doc work and degrade gracefully to sequential behavior.

## Why this is safe: one critical section per pipeline

Two things funnel through ONE shared resource — the single build/test system on the single working tree:
1. **Compilation** — every source edit triggers a recompile / rebuild.
2. **Test execution** — one test job at a time.

So the **code lock** (the one critical section) is held by anything that edits code OR touches the test runner. Everything else is runner-free and lives in one of the two doc segments that bracket it:

| Segment | Phases | Touches test runner/code? | In the lock? |
|---|---|---|---|
| **PRE-DOCS** | Design docs (1a), Test specs (1b) | No — writes `Documentation/*.md` | **No** |
| **CODE-LOCK** | Test code (2), Implementation (3), Verification (4), Debug loop | Yes — edits source, compiles, runs tests | **YES (exclusive)** |
| **POST-DOCS** | Doc sync (5), Post-review (Documenter / Optimizer / Visionary) | No — reads code read-only, writes `Documentation/*` + role files | **No** |

**Invariant: at most ONE code-lock agent runs at any instant.** This is the entire safety guarantee — identical green-tree handoff to sequential batch. Each pipeline's code work starts only after the previous pipeline's code→test→debug went fully green. Doc segments are runner-free, so they may overlap a code lock.

### The one shared-file hazard, and its fix

Within the doc segments, almost everything writes **pipeline-specific** files (`Documentation/GDD/*`, `Technical/*`, `Plans/*`) — no cross-pipeline collision. The **single exception** is the post-review **Optimizer**, which writes **shared** files (`Company/roles/*.md`, `Company/project/project-guidelines.md`, `learnings.md`). If two pipelines' Optimizers ran at once, they'd clobber each other.

**Fix (narrow):** the Optimizer is **globally serialized** — at most one Optimizer runs across the whole batch at a time. The dispatcher holds an "Optimizer token." A POST-DOCS agent must acquire it before its Optimizer writes shared files and release it after. Everything else (GDD, Technical, doc-sync, Visionary→`Plans/`) floats freely. In practice a code lock is slower than a post-review, so this rarely blocks.

## Hard constraints

1. **Exactly one code lock.** Never two code-lock agents at once.
2. **Doc-segment agents are runner-free and read-only on code.** They write only docs (+ role files for the Optimizer). They MUST NOT run tests, compile-check, or use the test runner. This is the only reason they may overlap a code lock.
3. **At most one PRE-DOCS prefetch ahead** (N+1 during N's lock). No N+2 prefetch.
4. **Optimizer is globally serialized** (one shared-file writer at a time).
5. **You are a dispatcher, not a manager.** Surface escalations; don't take them over.

## Step 1: Build the Queue

1. List candidates: `ls Company/project/pipelines/*.md`
2. For each `.md` (skip `_journal` folders, `fast-runs.md`, `batch-runs.md`, `batch-pipelined-runs.md`), read ONLY the header `**Status**:`. Eligible: `Ready`. Skip `Done`. Skip + note `Escalated`. `Running` only if the user explicitly asks to resume.
3. Also read each eligible blueprint's `Type` and record:
   - **Prefetchable PRE-DOCS** = Feature or Refactor (has design-doc + test-spec writing). Debug = no pre-docs (runs straight into the lock). **Expand** = complex multi-wave; treat as not-prefetchable and run its whole `/company-execute` in the lock, or recommend plain `/company-batch` for it.
   - **All** pipeline types have POST-DOCS (doc-sync + mandatory post-review) — so the trailing overlap applies to every pipeline.
4. **Ordering:** explicit IDs in `$ARGUMENTS` → that exact order. Empty/`all` → every `Ready` blueprint chronologically by ID date (oldest first).
5. **Dependency awareness:** blueprints are assumed INDEPENDENT. If one depends on another's deliverable, order prerequisite first and note it. Prefetching N+1's *docs* during N's *code* is safe even if N+1 depends on N, because doc-writing reads the blueprint + existing docs, not N's unmerged code. If N+1's docs genuinely cannot be written without N's shipped API, mark N+1 not-prefetchable.

**Present the queue to the user BEFORE starting** — IDs, order, count, and which are prefetchable. Last interactive checkpoint, then go autonomous unless an agent escalates.

## Step 2: Pre-flight (once)

1. **Test-runner pre-flight** — confirm the test runner is reachable per `Company/project/project-guidelines.md`. If unreachable, do NOT abort — enter the **Test-Runner Reachability Wait Protocol**. The user has explicitly accepted that the test runner sometimes needs a manual restart and wants the batch to wait rather than fail.
2. **Permissions reminder** — each agent (and its sub-workers) needs Edit/Write/tool permissions pre-approved or it stalls on a prompt while the user is away. Warn if not pre-approved.
3. **Create a batch log** at `Company/project/pipelines/batch-pipelined-runs.md` (append if exists).

## Step 3: Run the Pipeline (3-segment software pipeline)

Track these slots:
- **CODE slot** — at most one code-lock agent (owns the test runner).
- **PRE slot** — at most one PRE-DOCS prefetch agent.
- **POST lane** — zero or more trailing POST-DOCS agents (runner-free). The **Optimizer token** serializes their shared-file writes.

### The loop

Queue `[P1 … Pn]`.

**Prime:**
1. Reachability gate (below) before any code launch.
2. If P1 is prefetchable, run **PRE-DOCS(P1)** and wait for it. Else skip.
3. Launch **CODE(P1)** in the CODE slot.
4. If P2 is prefetchable, launch **PRE-DOCS(P2)** in the PRE slot concurrently (overlap).

**Steady state — when CODE(Pk) returns:**
1. **Record** Pk's code result to `batch-pipelined-runs.md`.
2. **Handle** the result (Done / Escalated / Failed / Blocked-Runner — see Result Handling).
3. **Launch POST-DOCS(Pk)** into the POST lane (runner-free; it will overlap the next code lock). Pass it the Optimizer-token protocol.
4. **Compilation gate:** if Pk Failed in a way that could leave the test runner uncompilable, do one lightweight compile/`state` check before the next code launch. If broken, halt and surface.
5. **Reachability gate** before the next code launch.
6. **Promote P(k+1):** ensure PRE-DOCS(P(k+1)) finished (wait on the PRE slot if still running — usually long done). Launch **CODE(P(k+1))** in the CODE slot.
7. **Prefetch P(k+2):** if prefetchable, launch **PRE-DOCS(P(k+2))** in the PRE slot.
8. Repeat until the queue drains. Then **drain the POST lane** — wait for all trailing POST-DOCS agents to finish before the final report.

**Timing intuition:** during CODE(Pk+1) you typically have POST-DOCS(Pk) trailing out AND PRE-DOCS(Pk+2) prefetching in — both runner-free, both overlapping the one code lock. A doc segment is almost always faster than the code lock it overlaps (the lock includes slow test runs + debug iterations), so the overlap is effectively free. Never start a code lock whose PRE-DOCS isn't done.

### Spawning the PRE-DOCS agent (runner-free, overlappable)

Background Agent (`run_in_background: true`):

```
You are the Documentation Manager pre-writing the RUNNER-FREE pre-code phases of a Company pipeline.

Follow `.claude/skills/company-execute/SKILL.md`, but execute ONLY the runner-free
pre-code documentation phases:
  - Phase 1a: Design Docs (GDD + Technical) — enforce the GDD Gate. (ALL pipeline types.)
  - Phase 1b: Test Specs (the WHAT-to-test tables, NOT test code) — Feature pipelines ONLY.
    A REFACTOR pipeline writes no new tests (it skips Phase 1b and Phase 2), so do Phase 1a
    only and say so in NOTES_FOR_CODE_PHASE.
Blueprint ID: {id}  (state file: Company/project/pipelines/{id}.md)
Journal folder: Company/project/pipelines/{id}_journal/  (mkdir -p). Journal numbers start at {N}.
Any landscape research (existing docs/code/tests) must be READ-ONLY.

ABSOLUTE PROHIBITIONS (this is why you may run concurrently with another pipeline):
  - Do NOT write or edit ANY source file.
  - Do NOT use the test runner AT ALL (no running tests, reading the console, compile-checking, code editing, or force-refresh).
  - Do NOT change the blueprint's Status (leave it Ready).
A concurrent pipeline OWNS the test runner and is editing code right now.

Return ONLY:
  STATUS: DOCS_READY | DOCS_BLOCKED
  DOCS_WRITTEN: {GDD path, Technical path, test-spec location}
  GDD_GATE: {passed / how satisfied}
  NOTES_FOR_CODE_PHASE: {design decisions, spec'd test classes, gotchas}
  (DOCS_BLOCKED only if docs genuinely need the shipped code — say what's missing.)
```
Default `claude` agent type. Do NOT set `model`.

### Spawning the CODE agent (holds the lock)

Background Agent (`run_in_background: true`):

```
You are the Manager executing the CODE phases of one Company pipeline in Blueprint Mode.
You hold the EXCLUSIVE test-runner lock — no other agent is editing code
or running tests right now.

Follow `.claude/skills/company-execute/SKILL.md`.
Blueprint ID: {id}  (state file: Company/project/pipelines/{id}.md)
Journal folder: Company/project/pipelines/{id}_journal/. Journal numbers continue from {M}.

DOC-PHASE STATUS: {one of}
  - "Pre-code docs were ALREADY written by a prefetch agent (journals {files}). Summary:
     {NOTES_FOR_CODE_PHASE}. Do NOT redo the pre-code doc phases (1a, and 1b for Feature).
     START at the first RUNNER-BOUND phase: Phase 2 (Test Code) for a Feature pipeline, or
     Phase 3 (Implementation) for a Refactor pipeline (which has no Phase 1b/2)."
  - "No docs prefetched (Debug/Expand, or the doc agent returned DOCS_BLOCKED). Run the
     pipeline from the start including any pre-code doc phases."

Execute ONLY the RUNNER-BOUND phases, then STOP:
  - Feature: test code (2) -> implementation (3) -> verification (4) -> debug loop until green.
  - Refactor: implementation (3) -> verification against existing tests -> debug loop.
  - Debug: run-tests baseline -> Debug Loop until green.
  - Expand: run the FULL Expand flow INCLUDING its runner-bound "Phase 5: Full Regression"
    (that is part of your lock — do not skip it).
Run the scoped tests yourself per the project test protocol.

*** DO NOT run the RUNNER-FREE post-code work: the doc-sync reconciliation and the
post-pipeline review (Documenter / Optimizer / Visionary). *** (Note: for a Feature pipeline
the doc-sync is "Phase 5"; for an Expand pipeline "Phase 5" instead means Full Regression,
which you DO run — only the doc-sync + post-review are deferred.) A separate runner-free
POST-DOCS agent runs the deferred work AFTER you return, overlapped with the next pipeline's
code lock. Your job ends when the code is green (or escalated). Set the blueprint Status to
Done / Failed / Escalated to reflect the CODE outcome; the POST-DOCS agent finalizes the
post-pipeline section.

TEST-RUNNER-OUTAGE HANDLING: If the test runner becomes unreachable and your
own recovery (e.g. a force-refresh) does NOT bring it back, do NOT mark Failed and do NOT
hack tests green. STOP, leave Status as it was (Ready/Running — NOT Done/Failed), return:
  STATUS: Blocked-Runner / LAST_PHASE: {phase} / NOTES: {done so far, what needs the runner}

When done normally, return a CONCISE summary:
  STATUS: Done | Failed | Escalated
  TESTS: {pass/total unit, pass/total integration}
  FILES_MODIFIED: {count + notable files}
  ESCALATION: {reason, or "none"}
  POST_DOCS_CONTEXT: {what shipped — for the doc-sync + post-review agent}
```
Default `claude` agent type. Do NOT set `model`.

### Spawning the POST-DOCS agent (runner-free, trailing overlap)

After CODE(Pk) returns, background Agent (`run_in_background: true`):

```
You are the Documentation/Review Manager running the RUNNER-FREE post-code phases of a
Company pipeline that just finished its code lock.

Follow `.claude/skills/company-execute/SKILL.md`. Execute ONLY the runner-free post-code work:
  - Doc Sync: reconcile Technical/GDD docs to the SHIPPED symbols (Feature "Phase 5";
    for Refactor/Debug/Expand do the equivalent doc reconciliation to what shipped).
  - The MANDATORY post-pipeline review ("Step 5"): Documenter (doc sync), Optimizer, Visionary.
  (Do NOT run any Expand "Full Regression" — the code agent already did that inside its lock.)
Blueprint ID: {id}. Journal folder: Company/project/pipelines/{id}_journal/. Numbers from {P}.
Code outcome: {STATUS + POST_DOCS_CONTEXT from the code agent}.

ABSOLUTE PROHIBITIONS (you run concurrently with another pipeline's code lock):
  - Do NOT edit ANY source file. Do NOT use the test runner AT ALL.
  - Read code READ-ONLY to reconcile docs.

OPTIMIZER SERIALIZATION (shared-file safety): the Optimizer writes SHARED files
(Company/roles/*.md, project-guidelines.md, learnings.md). Before the Optimizer writes any
shared file, it must hold the Optimizer token. {Dispatcher fills in: "The token is FREE —
proceed." OR "The token is HELD by {id}; do the Documenter + Visionary work first
(pipeline-specific files), then WAIT and report OPTIMIZER_WAITING so the dispatcher can
grant the token."} Visionary writes only to Documentation/Plans/ (pipeline-specific) and
needs no token.

Run the post-pipeline review even if the code outcome was Failed/Escalated — failures
produce the most valuable review data. Finalize the blueprint's post-pipeline section.

Return ONLY:
  STATUS: POSTDOCS_DONE | OPTIMIZER_WAITING
  DOC_SYNC: {files reconciled}
  OPTIMIZER: {role/guideline changes applied, or "waiting for token"}
  VISIONARY: {plan files written}
```
Default `claude` agent type. Do NOT set `model`.

**Optimizer token handling:** keep one boolean. When you launch a POST-DOCS agent, tell it FREE if no other POST-DOCS currently holds it, else HELD. If an agent returns `OPTIMIZER_WAITING`, it finished its non-shared work; grant the token when free by re-dispatching just its Optimizer step (SendMessage if available, else a tiny follow-up agent: "Run ONLY the Optimizer step for {id}; the token is now yours"). Release the token when a POST-DOCS agent reports its Optimizer changes applied. Because a code lock is usually slower than a post-review, the token is usually FREE and this path rarely triggers.

## Result Handling (CODE segment)

- **`STATUS: Done`** → record, launch POST-DOCS(Pk), advance the code slot.
- **`STATUS: Blocked-Runner`** → NOT a failure. Record `- {id}: BLOCKED-RUNNER (will retry)`, enter the **Test-Runner Reachability Wait Protocol**. When the test runner returns, **re-run THIS blueprint's CODE segment from scratch** (its pre-docs are still on disk — reuse them). Do not advance, do not count against the escalation tally. (Do NOT launch POST-DOCS for a Blocked-Runner result — there's no completed code to document yet.)
- **`STATUS: Escalated` / `Failed`** (genuine problem, not a test-runner outage) → record, still **launch POST-DOCS(Pk)** (failure review is mandatory and valuable), then **continue to the next blueprint**. Collect for the final report. Only halt the whole queue if the failure provably left the test runner uncompilable (compilation gate catches this).

A **DOCS_BLOCKED** pre-docs result is not an error: launch that pipeline's CODE agent with "no docs prefetched" so it writes the docs itself in the lock. Note it for the report.

## Test-Runner Reachability Wait Protocol

Invoked from pre-flight, a per-launch reachability gate, or a `Blocked-Runner` result. The user has explicitly chosen WAITING over failing.

1. **Announce the park** — which blueprint waits, what's done, that the batch is paused pending the test runner. Append `- PAUSED: test runner unreachable, waiting to resume {id}` to `batch-pipelined-runs.md`.
2. **Try your own recovery ONCE** — e.g. the test runner's force-refresh/recovery command. If it restores reachability, resume immediately.
3. **If recovery fails, WAIT — do not abort, do not escalate the batch.** Poll on an interval with `ScheduleWakeup` (a few minutes if the user may be nearby, 1200s+ if away). Heartbeat to the log each poll.
4. **Wait indefinitely by default.** Only the test runner returning (→ resume) or the user saying stop/skip ends the wait.
5. **On resume** — append `- RESUMED: continuing {id}` and continue.

**Doc segments during a test-runner park:** PRE-DOCS and POST-DOCS agents are runner-free, so a test-runner outage does NOT block them. During a park you MAY let any in-flight doc agent finish and MAY launch a pending PRE-DOCS prefetch, so the next code lock starts with docs ready. Never launch a code lock during a park.

## Step 4: Final Report

**First drain the POST lane** (wait for all trailing POST-DOCS agents). Then:

```markdown
## Pipelined Batch Complete — {N} pipelines

| Pipeline | Type | Pre-docs | Status | Tests | Post-docs | Notes |
|----------|------|----------|--------|-------|-----------|-------|
| {id-1} | Feature | prefetched | Done | 15/15, 11/11 | synced+reviewed | — |
| {id-2} | Debug | n/a | Escalated | 12/14 | reviewed | {reason} |

**Done:** {count}   **Escalated/Failed:** {count}
**Overlap achieved:** {doc segments that ran concurrently with a code lock}
**Needs your attention:** {escalated IDs + their options}
```

For every Escalated/Failed pipeline, give the user the options the agent surfaced. Note test-runner pauses and any DOCS_BLOCKED pipelines whose docs ran in-lock.

## Rules

1. **One code lock, always.** Never two code-lock agents at once. This is the entire safety guarantee — identical green-tree handoff to sequential batch.
2. **Doc-segment agents are runner-free and read-only on code.** The only reason they may overlap a code lock. If you can't guarantee a doc agent won't touch the test runner, run it in the lock instead.
3. **At most one PRE-DOCS prefetch ahead** (N+1 during N). No N+2.
4. **Optimizer is globally serialized.** One shared-file writer (`roles/*`, `project-guidelines.md`, `learnings.md`) at a time, via the Optimizer token. Everything else in the doc segments floats.
5. **Fresh context per segment.** Always background agents; never run a segment inline.
6. **You don't diagnose.** Dispatch, hold the lock, wait, record, repeat.
7. **Don't stop the queue on a single escalation** — record and continue, unless the compilation gate shows shared state is broken.
8. **A test-runner outage parks the queue, it does NOT fail it.** Never mark Failed for a test-runner outage; never let an agent hack tests green. Wait, then re-run the parked code segment.
9. **Present the queue before starting** (prefetchable marked), then run autonomously.
10. **Drain the POST lane before the final report.** Post-review is mandatory for every pipeline (including failed ones) — don't summarize while a trailing doc/review agent is still running.
11. **Debug/Expand pipelines have little/no pre-docs.** They run their runner-bound phases in the lock; their POST-DOCS still overlaps the next lock. Never slower than `/company-batch`.
```
