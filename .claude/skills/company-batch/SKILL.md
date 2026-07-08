---
name: company-batch
description: "Batch-execute multiple ready pipeline blueprints back-to-back while the user is away. Each blueprint runs in its OWN fresh context (as an isolated background Agent), sequentially, because the test runner is a single shared resource. Use after planning several features with /company-plan."
argument-hint: "[optional: ordered pipeline IDs e.g. '2026-06-07-foo 2026-06-08-bar', or 'all' / empty for every Ready blueprint]"
---

# Company Batch: $ARGUMENTS

You are the **BatchDispatcher**. Your ONLY job is to run a queue of already-planned pipeline blueprints, each in its own fresh context, one at a time, and report a consolidated summary at the end.

**You do NOT plan, design, write code, or run tests yourself.** Each blueprint is executed by a dedicated background Agent that runs the full `/company-execute` process in an isolated context window. You are the conveyor belt, not the worker.

## Why this skill exists

Running `/company-execute A` then `/company-execute B` in the same conversation makes B inherit all of A's context bloat. This dispatcher gives **each plan a clean context**: every execution runs as a separate background Agent. When it finishes you receive a short summary (not the bloat), then you launch the next one.

## Hard constraints

1. **Sequential only — never parallel.** The test runner is a single shared resource. Two pipelines running tests at once will corrupt each other's runs (`/company-execute` itself forbids two test-tool workers concurrently). Launch execution Agent N+1 ONLY after Agent N has fully returned.
2. **Each blueprint = one fresh background Agent.** Do not execute a blueprint inline in your own context.
3. **You are a dispatcher, not a manager.** Do not read production code, test code, or diagnose failures. If an execution Agent escalates, surface it — don't take over its job.

## Step 1: Build the Queue

Determine which blueprints to run, in order.

1. List candidate blueprints:
   ```bash
   ls Company/project/pipelines/*.md
   ```
2. For each `.md` file (skip `_journal` folders and `fast-runs.md`), read ONLY its header to find the `**Status**:` line. Eligible statuses:
   - `Ready` (from `/company-plan` or `/company-expand`) — eligible
   - `Running` — eligible ONLY if the user explicitly asks to resume it; otherwise skip and note it (may be a stuck/abandoned run)
   - `Done` — skip (already complete)
   - `Escalated` — skip and note it (needs user decision, not a re-run)
3. **Ordering:**
   - If `$ARGUMENTS` lists explicit pipeline IDs → run in exactly that order (this also lets the user encode dependencies: put the prerequisite first).
   - If `$ARGUMENTS` is empty or `all` → run every `Ready` blueprint in **chronological order by ID date** (oldest first), since IDs are `{date}-{name}`.
4. **Dependency awareness:** These blueprints are assumed INDEPENDENT. If you notice in a blueprint's Design Summary that it depends on another blueprint's deliverable, order the prerequisite first and note the inferred dependency. If two blueprints have a hard ordering dependency that the user's order contradicts, flag it before starting rather than running them in a broken order.

**Present the queue to the user BEFORE starting** (IDs, order, count). This is the last interactive checkpoint before you go autonomous — it's cheap insurance against running the wrong set. Then proceed without further questions unless an execution Agent escalates.

## Step 2: Pre-flight (once, before the queue)

1. **Test-runner pre-flight** — confirm the test runner is reachable per `Company/project/project-guidelines.md` (the batch is useless if every pipeline's verification phase will fail to reach the test runner). If it's unreachable, do NOT abort — enter the **Test-Runner Reachability Wait Protocol** (below): park and wait for the user to bring the test runner back, then proceed. The user has explicitly accepted that the test runner sometimes needs a manual restart to stabilize and wants the batch to wait rather than fail.
2. **Permissions reminder** — each execution Agent (and its own sub-workers) needs Edit/Write/tool permissions pre-approved, or it will stall on a permission prompt while you're away. If permissions aren't pre-approved, warn the user before launching.
3. **Create a batch log** at `Company/project/pipelines/batch-runs.md` (append if it exists) to record the run.

## Step 3: Run the Queue (sequential)

For each blueprint `{id}` in the queue, in order:

0. **Reachability gate** — before launching, verify the test runner is reachable (lightweight `state` / project test-tool check per project guidelines). If it is NOT reachable, enter the **Test-Runner Reachability Wait Protocol** (below) and do not launch until it returns. This means a test-runner outage between two pipelines parks the queue at the boundary instead of burning an execution Agent that would immediately hit a dead test runner.
1. **Mark start** — append to `batch-runs.md`: `- {id}: STARTED`.
2. **Spawn a background execution Agent** (`run_in_background: true`) with this prompt:
   ```
   You are the Manager executing a single Company pipeline in Blueprint Mode.

   Read and follow the full process in `.claude/skills/company-execute/SKILL.md`.
   Execute the pipeline blueprint with ID: {id}
   (state file: Company/project/pipelines/{id}.md)

   This is Blueprint Mode — the blueprint already exists with Status: Ready.
   Run it end to end: execute every phase, run the scoped tests yourself per the
   project test protocol, dispatch your own sub-workers (Documenter/Tester/
   Implementer/Debug Loop) as the skill directs, and complete the MANDATORY
   post-pipeline review (Documenter + Optimizer + Visionary).

   TEST-RUNNER-OUTAGE HANDLING (important): If at ANY point the test runner becomes unreachable (the test runner needs a manual restart to
   stabilize, not responding, jobs not dispatching) and your own recovery
   attempts (e.g. a force-refresh) do NOT bring it back, do NOT mark the pipeline
   Failed or apply any workaround to get tests "passing". Instead STOP, leave
   the blueprint's Status as it was (Ready/Running — NOT Done/Failed), and
   return immediately with:
     STATUS: Blocked-Runner
     LAST_PHASE: {the phase you reached}
     NOTES: {what's done so far, what still needs the test runner}
   The dispatcher will wait for the user to restore the test runner and then RE-RUN this
   same blueprint from scratch. A clean re-run is preferred over a partial
   result, so it is fine that re-running repeats earlier phases.

   When done normally, update the blueprint's Status to Done / Failed /
   Escalated and return a CONCISE structured summary ONLY (no full context):
     STATUS: Done | Failed | Escalated
     TESTS: {pass/total unit, pass/total integration}
     FILES_MODIFIED: {count + notable files}
     ESCALATION: {reason, or "none"}
   ```
   - Use the default `claude` agent type (it can spawn its own sub-workers and use the test tools).
   - Do NOT set `model` — let it inherit.
3. **Wait for it to fully return.** Do not launch the next blueprint until this Agent completes. While waiting you are idle by design — do NOT start diagnosing or reading the pipeline's files.
4. **Record the result** — append the Agent's structured summary to `batch-runs.md`:
   `- {id}: {STATUS} — {tests} — {files} — {escalation}`.
5. **Result handling:**
   - `STATUS: Done` → record and move to the next blueprint.
   - `STATUS: Blocked-Runner` → this is NOT a failure. The pipeline did not finish because the test runner went down. Record `- {id}: BLOCKED-RUNNER (will retry)`, then enter the **Test-Runner Reachability Wait Protocol**. When the test runner returns, **re-run THIS SAME blueprint from step 0** (do not advance the queue, do not count it against the escalation tally). The blueprint's Status is still Ready/Running, so a fresh execution Agent picks it up cleanly.
   - `STATUS: Escalated` or `Failed` (a genuine pipeline problem, not a test-runner outage) → record it, but **continue to the next blueprint** (the whole point of batch mode is unattended throughput; one escalation should not block the rest). Collect all escalations for the final report.
   - The ONLY reason to halt the entire queue early is if a blueprint's failure provably poisons the shared state for following blueprints (e.g. it left the test runner in a broken/uncompilable state). If you suspect that, do a single lightweight test-runner/compilation pre-flight before the next launch; if broken, halt and surface to the user with what's left in the queue.

## Test-Runner Reachability Wait Protocol

Invoked from pre-flight, the per-blueprint reachability gate, or a `Blocked-Runner` result. The user has explicitly chosen WAITING over failing: the test runner sometimes needs a manual restart to stabilize, and they will resume it when they notice.

1. **Announce the park** — tell the user plainly: which blueprint is waiting, what's already done in the queue, and that the batch is paused pending the test runner coming back. Append `- PAUSED: test runner unreachable, waiting to resume {id}` to `batch-runs.md`.
2. **Try your own recovery ONCE** — attempt the project's documented recovery (e.g. the test runner's force-refresh/recovery command per project guidelines / MEMORY). If that restores reachability, resume immediately — no need to wait for the user.
3. **If recovery doesn't work, WAIT — do not abort, do not escalate the batch.** Poll the test runner's reachability on an interval until it comes back. Use `ScheduleWakeup` with a delay sized to the situation: a few minutes (e.g. 240s) keeps you responsive if the user is nearby; longer (e.g. 1200s+) if they may be away a while. Re-check on each wake. Emit a brief heartbeat to `batch-runs.md` on each poll so there's a visible trail (`- still waiting on the test runner @ {poll N}`).
4. **Wait indefinitely by default.** Do NOT give up and fail the remaining queue because the test runner is down — the user asked for "be left stuck, wait for me to resume, and continue." The only thing that ends the wait is (a) the test runner becoming reachable → resume the queue exactly where it parked, or (b) the user telling you to stop/skip.
5. **On resume** — append `- RESUMED: the test runner reachable, continuing {id}` to `batch-runs.md` and continue: re-run the parked blueprint (if it was `Blocked-Runner` or never launched) or proceed to the next.

## Step 4: Final Report

After the queue drains, give the user ONE consolidated summary:

```markdown
## Batch Run Complete — {N} pipelines

| Pipeline | Status | Tests | Notes |
|----------|--------|-------|-------|
| {id-1}   | Done   | 15/15, 11/11 | — |
| {id-2}   | Escalated | 12/14 | {one-line reason} |
| ...      | ...    | ...   | ... |

**Done:** {count}   **Escalated/Failed:** {count}
**Needs your attention:** {list of escalated IDs + their options}
```

For every Escalated/Failed pipeline, give the user the options the execution Agent surfaced so they can decide next steps (re-run with a fix, adjust the blueprint, etc.).

## Rules

1. **Sequential, always.** Never two execution Agents at once.
2. **Fresh context per plan** is the entire purpose — always spawn a background Agent, never execute inline.
3. **You don't diagnose.** Dispatch, wait, record, repeat. Investigation is the execution Agent's job.
4. **Don't stop the queue on a single escalation** — record and continue, unless shared state is provably broken.
5. **A test-runner outage parks the queue, it does NOT fail it.** Never mark a pipeline Failed because the test runner was unreachable, never let an execution Agent hack tests green to dodge a dead runner. Wait (indefinitely) for the user to restore the test runner, then re-run the parked blueprint. This is the user's explicit instruction.
6. **Present the queue before starting**, then run autonomously to the end.
7. **One consolidated report** at the end — the user walked away expecting a single landing summary, not a play-by-play. Note any test-runner pauses that occurred so they understand wall-clock gaps.
