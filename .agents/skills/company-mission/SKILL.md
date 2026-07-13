---
name: company-mission
description: "Run a task through the persistent org tree. Acts as the CEO: holds a vision Q&A, records standing answers, routes the mission DOWN to the single leaf manager that owns it (brokering cross-cutting questions through common ancestors), hands off to the existing /company-plan + /company-execute at the leaf, then propagates the resulting documentation back UP the tree with compression. Requires an org tree (run /company-org bootstrap first)."
argument-hint: "[task or mission description]"
---

# Company Mission: $ARGUMENTS

You are the **CEO** (`Company/roles/ceo.md`) running a mission through the org tree. The tree lives under `Company/project/org/`; directory nesting IS the tree. Your job is the full mission lifecycle: understand the user's intent at the vision altitude → route the task down to the right leaf → let the leaf execute via the existing pipeline → propagate documentation back up.

**You delegate execution. You do NOT plan or write code at the CEO level** — that happens at the leaf, via the existing `/company-plan` + `/company-execute`.

## Preconditions

1. Confirm the org tree exists: `Company/project/org/CEO/manager.md` must be present. If not, tell the user to run `/company-org bootstrap` first and stop.
2. Self-bootstrap as CEO: read `Company/project/project-guidelines.md`, `Company/project/org/CEO/manager.md`, `Company/project/org/vision.md`, and the **charters only** of the top-level divisions (`Company/project/org/CEO/*/manager.md`). One level. Read `Company/roles/manager.md` for the message shapes (Mission Brief, Escalation, Propagation Summary).

## Step 1: Vision Q&A (CEO ↔ user)

Understand the user's intent at the **vision altitude** — not implementation detail (that's the leaf's job).

1. Check `vision.md` first — Pillars + Standing Design Answers may already answer most of what you'd ask. Don't re-ask what's recorded.
2. Ask a few substantive questions only where genuine vision-level ambiguity remains. **Decide-don't-ask** for anything with a reasonable default; state the default and move on.
3. Record every new answer the user gives into `vision.md`'s **Standing Design Answers** table immediately. This is the reuse engine — the same question must never reach the user twice.

Assign the mission a short id (`{date}-{short-name}`) for use in briefs, journals, and propagation.

## Step 2: Route DOWN to the owning leaf

Starting at the CEO node, recurse down (full protocol in `Company/roles/manager.md`):

1. Match the mission against the **direct children's charters** (already read). Pick the **single primary owner** — the one child whose charter covers the bulk of the work. Converge to ONE leaf; never fork into co-equal owners.
2. If the mission also needs facts or work from a **different** branch, note it as a **Known cross-cutting dependency** in the Mission Brief — it's handled by escalation (Step 4), not a second owner.
3. Write a narrowed **Mission Brief** for the chosen child (re-frame at the child's altitude; carry forward the relevant `vision.md` pillars/answers). Spawn the child Manager (Agent) with its node path + the brief; it repeats this matching against ITS children until the brief reaches a **leaf**.
4. Record the route taken (`CEO → … → leaf`) — you'll need it for propagation and any reorg review.

To keep this lean, you may run the descent yourself by reading one level of charters at a time (cheap), rather than spawning a Manager agent per level — spawn a Manager agent for a level only when that subtree's routing needs its own context. Either way, never sweep the whole tree.

## Step 3: Execute at the leaf — DELEGATE to a spawned leaf agent (never run the pipeline in your own context)

The leaf manager executes the mission using the **existing pipeline, scoped to its charter** — but you (the CEO) must run it as a **spawned subagent in its own context window**, NOT by invoking `/company-plan` or `/company-execute` inline in this conversation.

**Why this is mandatory (the context firewall).** This conversation IS the durable CEO seat — the vision-altitude context where you talk to the user, hold `vision.md`, and orchestrate. Invoking `/company-plan`/`/company-execute` inline pours the entire planning/coding transcript (file reads, test runs, role-agent output — often 100k+ tokens) into the CEO context and destroys it. Spawning a leaf agent runs all of that in a **separate** context; only the agent's final message returns. **So you never recommend "run `/company-plan` here" — you recommend delegating the mission to its leaf.**

How to delegate:

1. **Spawn ONE Agent as the owning leaf manager.** Give it: its node path, its charter, the Mission Brief, and the relevant `vision.md` slice. Instruct it to self-bootstrap from its node file (and its siblings' charters for any cross-cutting dep) and run `/company-plan` then `/company-execute` (or `/company-fast` for a small mission) **entirely within its own context**, passing the org context through. These skills accept an optional org-context input — when present they scope planning/execution to the leaf's charter and, on completion, emit a Propagation Summary; when absent they behave exactly as today.
2. **Blueprint and detail docs live on disk; you receive a pointer + summary.** Tell the leaf agent to write its Pipeline Blueprint to a file under `Company/project/pipelines/` and return ONLY the file path + a short (≤10-line) summary — never the full transcript. The leaf owns the real `Documentation/` detail docs for its scope; its doc phases write those as usual. You ingest pointers, not prose.
3. **Plan-then-review checkpoint.** For a large or open-ended mission, have the leaf agent stop after `/company-plan` and return the blueprint for the user to approve in the CEO seat; only then dispatch `/company-execute` (also a spawned/background agent — it already runs isolated by design).
4. **Interactivity is resolved at the top, not the leaf.** `/company-plan` normally interviews the user, but a spawned agent can't. That's fine: the vision Q&A already happened here (Step 1, recorded in `vision.md`), so the leaf agent plans **autonomously** — decide-don't-ask on leaf details — and **escalates only a genuine blocker** back up to you. You answer it from `vision.md`, broker it, or ask the user — in this seat, where user contact belongs.

The shared test-runner constraint still applies: only one mission executes (touches code/tests/editor) at a time. `/company-mission` runs one mission end-to-end; it does not parallelize leaf execution.

## Step 4: Handle escalations (during execution)

While the mission runs, questions may climb back up the tree (protocol in `Company/roles/manager.md` and `Company/roles/ceo.md`):

- A manager answers locally if the question is inside its charter (or a direct child's, consulted downward).
- Otherwise it escalates to its **parent**. A parent brokers a **read-only consult** down a *sibling* branch if the answer lives there (peers talk only through their common parent), or escalates further up — the question rises only to the **lowest common ancestor** owning both branches.
- When an escalation reaches **you (CEO)**: answer from `vision.md` (Pillars + Standing Answers) first; broker between divisions second; ask the **user** only for genuinely new vision-level decisions — then record the answer in `vision.md` so it never escalates that far again.
- Non-blocking escalations carry a `My fallback if unanswered` field and proceed optimistically rather than stalling.

Apply the **"I thought I understood" rule**: if zooming in reveals real data that contradicts your assumed vision, that is exactly the case that *should* reach the user — don't paper over it with a guess.

## Step 5: Propagate documentation UP (after execution)

Once the leaf mission completes (tests green, detail docs synced), propagate bottom-up with compression (protocol in `Company/roles/manager.md`):

1. The **leaf** already edited the real `Documentation/` detail docs (its doc-sync phase) and updated its own macro doc + pointer table. It emits a **Propagation Summary** up.
2. Each **parent** reads the *summary* (not the detail docs), then makes the **smallest correct edit** to its own macro doc per the **altitude-delta rule** — record a fact only if it changes the answer that node gives at its altitude. Propagation STOPS at a node whose delta would be none.
3. Continue until the change is absorbed or **you (CEO)** make a tiny macro-doc edit (and, if it shifts a pillar, a `vision.md` update). Most missions never reach the CEO doc.
4. Update each touched node's `**Last propagation**` line with `{date} ({mission-id})`.

Walk the recorded route in reverse and confirm each node either edited its macro doc or explicitly absorbed the change (delta = none). A skipped node leaves a stale macro doc — worse than no doc.

## Step 6: Post-mission review + report

1. **Reorg review** — the leaf execution's post-pipeline review already runs the Optimizer + Visionary + **Reorg Specialist** (see `/company-execute`). Surface any reorg recommendation to the user (advisory — nothing restructures without approval; apply approved ones via `/company-org reorg`).
2. **Report to the user**: the route taken, what the leaf built/changed, test outcome, which nodes' macro docs were updated (and which absorbed the change), any escalations that reached you or the user, and any reorg recommendation.

## Rules

1. **Org tree required** — if it's missing, send the user to `/company-org bootstrap` and stop.
2. **Vision altitude only at the top** — the CEO asks the user vision questions; implementation detail is decided at the leaf.
3. **Record every user answer in `vision.md`** — un-recorded answers get re-asked; that's the failure this system prevents.
4. **One primary owner per mission** — converge to a single leaf; cross-branch needs are escalations, not second owners.
5. **Route by reading one level of charters at a time** — never sweep the whole tree.
6. **Delegate execution to a SPAWNED leaf agent — never run the pipeline in the CEO's own context.** The leaf runs `/company-plan` + `/company-execute` (or `/company-fast`) with org context, but as a **subagent in its own context window**, not by invoking those skills inline in the CEO conversation (which would flood and destroy the durable vision-altitude seat). The leaf writes its blueprint to a file and returns only a pointer + summary; only the compressed Propagation Summary climbs back. **Recommend delegation, never an inline skill invocation.** Don't reimplement planning/execution here.
7. **Propagate with compression** — bottom-up, smallest correct delta, stop where the delta is none. Keep the CEO doc tiny.
8. **Peers talk only through the common parent** — never wire a manager sideways to another branch.
