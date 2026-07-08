# Node: RunExperience

**Node path**: CEO/RunExperience
**Parent**: CEO
**Kind**: leaf
**Subordinates**: none
**Last propagation**: none yet

## Charter

**Owns**: Everything after the user clicks "Run" — the execution and output experience:
- Run modal with configuration options
- SSE progress visualization
- Run viewer page with scene cards
- Scene card interactions (copy, reroll, expand)
- Export functionality (download .md)
- Run history list
- Error states and retry UX

**Boundaries**:
- Canvas editor and block manipulation → `Canvas`
- API calls and SSE connection → `API`
- Linting and validation logic → `Domain`
- Auth, deployment → `Infrastructure`

## Macro Doc

The Run Experience transforms a compiled graph into visible, usable output — 5 scene cards ready for copy/export.

### Core Invariants

1. **Progress Transparency**: Every stage of generation is visible. Users see: Compiling → Generating (1/5, 2/5...) → Linting → Complete.
2. **Scene Independence**: Each scene card is self-contained. Copy copies only that scene. Reroll regenerates only that scene.
3. **Violation Visibility**: If linting found issues, they're displayed on the scene card with severity badges.
4. **One-Click Export**: "Export All" produces the exact `scenes/[date].md` format used by the scheduled task.
5. **History Persistence**: All runs are saved. Users can revisit any past run.

### Run Modal Options

| Option | Type | Purpose |
|--------|------|---------|
| Loop Mode | Toggle | Inject closure directives for looping videos |
| Variety Lookback | Number | How many past runs to check for collision |
| Similarity Threshold | Slider | Handshake strictness (default 80%) |

### Scene Card Anatomy

```
┌──────────────────────────────────────┐
│ Scene 1                    [▼ Expand]│
├──────────────────────────────────────┤
│ 🎤 Lyrics: "Shika! Shilshul!..."     │
│ 🖼️ Image: "Festival crowd..."        │
│ 🎬 Video Start: "Camera surges..."   │
│ 🔄 Extend Middle: "Puppets twist..." │
│ 🎬 Extend End: "Crowd explodes..."   │
├──────────────────────────────────────┤
│ [Copy] [Reroll] │ ⚠️ R3 violation    │
└──────────────────────────────────────┘
```

### State Flow

```
Idle → [Click Run] → Configuring → [Confirm] → Running
  ↓
Streaming (SSE progress updates)
  ↓
Complete → Viewing → [Copy/Reroll/Export]
```

### Error Handling

| Error | UX |
|-------|-----|
| API timeout | Retry button, partial results shown |
| Lint failure (soft) | Warning badge, scene still usable |
| Lint failure (hard) | Error badge, reroll suggested |
| Rate limit | "Another run in progress" message |

## Owned Detail Docs

| Doc | Path | Layer |
|-----|------|-------|
| Features (Run features) | `puppetflow-docs/product/features.md` | Product |
| Roadmap (Run enhancements) | `puppetflow-docs/product/roadmap.md` | Product |
| Phase 4 Tasks | `puppetflow-docs/tasks/phase-4/` | Task |
