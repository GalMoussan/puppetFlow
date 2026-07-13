# Phase 3 Implementation: exporter.ts

**Module**: `packages/domain/exporter.ts`
**Status**: Complete
**Timestamp**: 2026-07-09

## What Was Implemented

Batch output to markdown format converter for scheduled task files.

### Types
- `ExportMetadata`: runId, model, loopMode, generatedAt for YAML frontmatter
- `PromptStage`: IMAGE | VIDEO_START | EXTEND_MIDDLE | EXTEND_END

### Metadata Formatting
- `formatMetadataFrontmatter(metadata)`: Generates valid YAML frontmatter
- `escapeYamlValue(value)`: Escapes special characters in YAML values

### Combo Formatting
- `formatComboChips(combo)`: Formats combo as inline badges with pipe separators

### Content Formatting
- `formatLyricsBlock(lyrics)`: Wraps lyrics in ```lyrics code fence
- `formatPromptSection(stage, prompt)`: Formats prompt with ### header
- `formatBoundaryFrameCallout(transition, frame)`: Formats as blockquote
- `formatFinalFrameCallout(frame)`: Formats as bold label

### Export Functions
- `exportBatch(scenes, runDate, metadata?)`: Main export function
- `exportScaffold(scaffold, metadata?)`: Export scaffold with optional metadata
- `parseExportedMarkdown(markdown)`: Parse for round-trip testing

## Key Design Decisions

1. **YAML frontmatter optional**: Only included when metadata is provided.

2. **Scene numbering from 1**: Scenes displayed as "Scene 1", "Scene 2", etc. (1-indexed for humans).

3. **Horizontal rules between scenes**: `---` separators for readability.

4. **Section order preserved**: Combo -> Lyrics -> IMAGE -> VIDEO_START -> Boundary1 -> EXTEND_MIDDLE -> Boundary2 -> EXTEND_END -> Final Frame -> Notes

5. **Notes section conditional**: Only included when scene.notes is non-null and non-empty.

6. **No trailing whitespace**: Each line is trimmed before output.

7. **Single trailing newline**: File ends with exactly one newline character.

8. **LF line endings**: Uses `\n` throughout, no CRLF.

9. **Language as code**: Uses "hi"/"ja" directly, not expanded names.

10. **Camera moves in chips**: Shows all three camera moves with pipe separators.

## Output Format

```markdown
---
runId: run-20240315-001
model: claude-sonnet-4-6
loopMode: false
generatedAt: 2024-03-15T14:30:00.000Z
---

# Scenes for 2024-03-15

## Scene 1

**Stage:** Main Stage | **Moment:** Sunset Arrival | ...

### Lyrics

```lyrics
[Intro]
Festival energy rises...
```

### IMAGE Prompt

...

### VIDEO_START Prompt

...

> **Boundary Frame (START -> MIDDLE)**
>
> Shika stage-left, strings taut...

### EXTEND_MIDDLE Prompt

...

> **Boundary Frame (MIDDLE -> END)**
>
> Both puppets centered...

### EXTEND_END Prompt

...

**Final Frame:** Peak energy frozen tableau...

---

## Scene 2

...
```

## Deviations from Test Expectations

None. The implementation matches all test requirements:
- Date header in YYYY-MM-DD format
- Scenes numbered from 1
- Combo chips with pipe separators
- Lyrics in code fence with `lyrics` tag
- All prompt sections in correct order
- Boundary frames as blockquotes
- Final frame as bold label
- Notes omitted when null/empty
- YAML frontmatter only when metadata provided
- LF line endings, no trailing whitespace

## Public API Exported

```typescript
// Types
export interface ExportMetadata { runId, model, loopMode, generatedAt }
export type PromptStage = "IMAGE" | "VIDEO_START" | "EXTEND_MIDDLE" | "EXTEND_END"

// Formatting functions
export function formatMetadataFrontmatter(metadata: ExportMetadata): string
export function formatComboChips(combo: ComboAssignment): string
export function formatLyricsBlock(lyrics: string): string
export function formatPromptSection(stage: PromptStage, prompt: string): string
export function formatBoundaryFrameCallout(transition: string, frame: string): string

// Export functions
export function exportBatch(scenes: Scene[], runDate: Date, metadata?: ExportMetadata): string
export function exportScaffold(scaffold: string, metadata?: ExportMetadata): string
export function parseExportedMarkdown(markdown: string): { metadata?, sceneCount }
```
