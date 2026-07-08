---
name: company-org
description: "Build and maintain the Company org tree — a persistent recursive hierarchy of division managers that own layered documentation. `bootstrap` derives an initial tree from the project's existing docs; `reorg` audits tree shape and recommends splits/merges; `render` regenerates the human-readable tree map. Use after /company-startup, or whenever the tree needs (re)building."
argument-hint: "bootstrap | reorg [subtree] | render"
---

# Company Org: $ARGUMENTS

You manage the **org tree** — the persistent recursive hierarchy of division Managers that sits on top of the existing Company pipeline. Each node is a folder under `Company/project/org/` containing one `manager.md` (its charter, layered macro doc, and pointers to detail docs). The **directory nesting IS the tree**: a node's children are the immediate subdirectories that contain a `manager.md`. A generated `tree.md` is a human mirror only — never the source of truth.

Read the role files to understand the artifacts you create:
- `Company/roles/ceo.md` — the root node + the `vision.md` artifact.
- `Company/roles/manager.md` — every other node: the `manager.md` schema, charter, macro doc, owned-doc pointers.
- `Company/roles/reorg-specialist.md` — the audit you dispatch for the `reorg` sub-command.

Pick the sub-command from `$ARGUMENTS`: **bootstrap**, **reorg**, or **render**. If none is given, infer: if `Company/project/org/` is missing or empty → `bootstrap`; otherwise ask the user which they want.

---

## Sub-command: `bootstrap`

Builds an initial org tree for a project that already has documentation. Hybrid approach — auto-derive a draft from the existing doc index, then let the user shape the top-level boundaries (their mental model wins). Ship shallow first; let real missions and `reorg` deepen the tree over time.

### Step 0: Check existing state
- If `Company/project/org/` already exists with nodes, **warn the user** — bootstrapping will overwrite the tree. Confirm before proceeding. (A re-bootstrap loses hand-tuned charters/macro docs; prefer `reorg` for an existing tree.)
- Confirm `Company/project/project-guidelines.md` exists (run `/company-startup` first if not) and that `Company/roles/manager.md`, `ceo.md`, `reorg-specialist.md` are present.

### Step 1: Auto-cluster from the doc index (research only — no writes)
Spawn a **Documenter** agent (background) to read the project's documentation index and propose a draft clustering. Tell it to self-bootstrap (`Company/roles/documenter.md` + project guidelines) and to:
- Read the master doc index (e.g. `Documentation/README.md`) and the plan-module folder names (e.g. `Documentation/Plans/*`). The index's section headers and module folder names are strong grouping signals.
- Propose a **draft of 4–7 top-level divisions** (typical shapes: an AI/agent division, a game-flow/levels division, a combat division, a visual/animation division, a UI/menus division, an audio division, an infrastructure/tooling division — adapt to THIS project's docs).
- For each division, list which docs (by path) would belong to it, and a candidate sub-clustering one level down.
- Return a structured proposal: divisions → candidate children → doc assignments. **No file writes** — this is a research pass.

### Step 2: CEO vision Q&A → seed `vision.md`
Acting as the **CEO** (`Company/roles/ceo.md`), interview the user at the vision altitude. Ask a few substantive questions (North Star, the non-negotiable Pillars, any standing design answers worth recording now). Decide-don't-ask for anything with a reasonable default. Then write `Company/project/org/vision.md` using the schema in `ceo.md` (North Star, Pillars, Standing Design Answers table — seeded with whatever the user just told you, Open Vision Questions).

Present the Step-1 draft division boundaries to the user and **let them confirm or redraw the top level.** The user's mental model of the project trumps the auto-cluster. Lock the top-level divisions before generating anything.

### Step 3: Recurse to the right depth
For each confirmed division, sub-cluster its docs into children. **Stop subdividing a branch when a candidate leaf owns a coherent ~3–8 doc set answerable in one macro page.** Don't over-deepen — ship depth-1 (CEO + divisions) first if the project is small; let `reorg` and real missions grow depth where it's actually needed. Branching factor ~3–7 per internal node is the target.

### Step 4: Generate the tree (bottom-up)
Create the folder structure and `manager.md` files under `Company/project/org/CEO/...`. Generate macro docs **bottom-up** so each level is a true compression of the one below:
1. **Leaves first.** For each leaf, write its `manager.md`: `Kind: leaf`, charter (what it owns AND its boundary with named siblings), an `## Owned Detail Docs` pointer table (the slice of the doc index it claims — `Doc | Path | Layer`), and a macro doc summarizing its detail docs into the answerable invariants at leaf altitude. You may spawn a Documenter per division to draft macro docs from the detail docs it owns (parallel, background — they only read + return text; YOU write the files, since background workers may lack write permission in new directories).
2. **Internal nodes next.** Each internal `manager.md` (`Kind: internal`) summarizes its children's macro docs — a summary-of-summaries. Usually an empty Owned Detail Docs table (children own the details).
3. **CEO last and smallest.** `Company/project/org/CEO/manager.md` (`Kind: root`): charter = the whole project; macro doc = the project at its highest altitude (the smallest doc in the tree).

Fill every node's metadata lines (`Node path`, `Parent`, `Kind`, `Subordinates`, `Last propagation: none yet`).

### Step 5: Coverage check (loss-less ownership)
Verify that **every doc in the master index is owned by exactly one leaf** — no orphans, no double-ownership. Spawn a Documenter (or do it directly) to diff the union of all leaf `Owned Detail Docs` pointer tables against the master index. Report:
- **Orphans** (docs in the index owned by no leaf) → propose which leaf should claim each.
- **Double-owned** (a doc claimed by 2+ leaves) → assign to the single best owner.
Fix assignments until coverage is clean, or surface the remaining ambiguous ones to the user.

### Step 6: Render and present
Generate `Company/project/org/tree.md` (see `render` below). Present to the user: the tree shape, the division charters, the coverage-check result, and a note that the tree starts shallow and deepens via `/company-org reorg` + real `/company-mission` runs.

### Step 7: Register the tree
Ensure `Company/project/project-guidelines.md` has an `## Org Tree` section pointing agents at `Company/project/org/` (add it if missing — see the Phase-1 registration this skill ships with).

---

## Sub-command: `reorg [subtree]`

Audit the tree's shape and recommend splits/merges. **Advisory only** — you present recommendations; the user approves; only then do you perform the mechanical restructuring.

1. Spawn the **Reorg Specialist** (`Company/roles/reorg-specialist.md`, background). Scope: the whole tree, or the named `[subtree]` if given. It reads node charters, macro docs, pointer tables, and any propagation/escalation history, and returns recommendation blocks (split / merge / re-draw boundary), each with trigger evidence, proposed change, doc reassignment, cost/benefit, and confidence. A clean bill of health is a valid result.
2. **Present every recommendation to the user.** Nothing restructures without approval.
3. For each **approved** recommendation, perform the mechanics (as a Manager step):
   - Split: create the new child folders; move the relevant `Owned Detail Docs` rows and macro-summary slices DOWN into the new children; re-summarize the parent's macro doc (smaller, at-altitude).
   - Merge: fold the child's pointers + macro content into the survivor; remove the merged folder.
   - Re-draw: move the disputed pointers/scope across the sibling boundary.
4. Re-run the **coverage check** (every detail-doc pointer lands on exactly one node — name any orphan risk) and re-render `tree.md`.

This sub-command also runs as part of the **post-mission review** (the Reorg Specialist is a reviewer alongside Optimizer + Visionary in `/company-execute`); the on-demand form here is for auditing the whole tree between missions.

---

## Sub-command: `render`

Regenerate `Company/project/org/tree.md` — a human-readable mirror of the tree (NOT read for routing). Walk `Company/project/org/`, and for each node emit an indented line with its name, `Kind`, a one-line charter summary, and its owned-doc count. Example shape:

```markdown
# Org Tree (generated — do not edit; run `/company-org render`)

- CEO (root) — whole project
  - Backend (internal) — server-side services
    - Auth (leaf, 4 docs) — authentication & sessions
    - Payments (leaf, 6 docs) — billing & transactions
  - Frontend (internal) — client UI
    - Dashboard (leaf, 5 docs) — main app views & routing
    - Notifications (leaf, 3 docs) — in-app & push alerts
```

Always regenerate `tree.md` after `bootstrap` or any approved `reorg`. Treat it as disposable output.

---

## Rules

1. **Directory nesting IS the tree** — never author a separate adjacency manifest. `tree.md` is a generated mirror, regenerated from the folders, never read for routing.
2. **No duplication** — node files hold charter + lossy macro summary + pointers. Detail-doc prose lives once, in the project's `Documentation/`. Never copy it into a node.
3. **Bottom-up generation** — leaves first, then internal summaries-of-summaries, CEO last and smallest. A macro doc must be a true compression of the layer below.
4. **Loss-less coverage** — every indexed doc owned by exactly one leaf. Orphans and double-ownership are bugs; fix or surface them.
5. **User shapes the top level** — auto-cluster proposes; the user confirms/redraws division boundaries before generation.
6. **Ship shallow, deepen on demand** — don't over-build depth up front. `reorg` + real missions grow the tree where scope actually demands it.
7. **Reorg is advisory** — recommend, get user approval, then restructure. Never split/merge unprompted.
8. **You write the files** — background workers research and return text; new directories may exceed their write permissions, so the org skill writes node files itself.
