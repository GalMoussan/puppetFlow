# Phase 3 Implementation: compiler.ts

**Module**: `packages/domain/compiler.ts`
**Status**: Complete
**Timestamp**: 2026-07-09

## What Was Implemented

Graph to scaffold markdown compiler with block assembly and template generation.

### Types
- `ThemePack`: Series theme pack with festival info, characters, stages, etc.
- `CharacterDefinition`: Character with name, description, and verbatim lockText
- `BlockDefinition`: Block library entry with id, type, promptFragment, lane, defaultPinned
- `CompilerError`: Custom error with type, nodeId, and message

### Error Types
- `missing_block`: Block definition not found for node
- `unresolved_placeholder`: {{placeholder}} not in combo
- `invalid_graph`: Missing required lanes or invalid structure
- `invalid_lane`: Invalid lane reference

### Core Functions

**Block Resolution:**
- `resolveBlockFragment(node, blockDefs)`: Override wins over library

**Placeholder Substitution:**
- `injectComboPlaceholders(template, combo)`: Substitute all {{placeholder}} tokens

**Loop Directives:**
- `injectLoopDirectives(template, stage, loopMode)`: Add loop anchor (IMAGE) and mirror directive (EXTEND_END) when enabled

**Character Locks:**
- `injectCharacterLocks(template, characters)`: Append verbatim lock text

**Stage Templates:**
- `compileStageTemplate(stage, blocks, combo)`: Compile ordered blocks for a stage

**Main Compiler:**
- `compile(graph, themePack, combos, blockDefs)`: Full scaffold generation

### Scaffold Structure

1. **Header**: `# Scaffold for {themePack.name}`
2. **Theme Pack Canon**: Festival name, universe rules, characters
3. **Rulebook Directives**: R1-R14 rule descriptions (skip advisory R15)
4. **Combo Assignments**: Per-scene combo details
5. **Per-Stage Templates**: GLOBAL + stage blocks assembled with structure hints
6. **Output Schema**: JSON schema instructions

## Key Design Decisions

1. **GLOBAL blocks inject into all stages**: Content from GLOBAL lane appears in every stage template.

2. **Order property for sorting**: Nodes sorted by `order` within each lane before assembly.

3. **Override wins over library**: `node.overrides.promptFragment` takes precedence.

4. **Pinned blocks bypass parameterization**: Pinned content appears verbatim without placeholder substitution.

5. **Loop directives only when enabled**: `loopMode: false` produces no loop anchor or mirror text.

6. **Character locks appended**: Lock text added at end of IMAGE template content.

7. **Deterministic output**: Same inputs always produce identical scaffold.

8. **LF line endings**: All CRLF normalized to LF.

9. **Validation before compile**: Check all nodes reference valid block definitions.

## Deviations from Test Expectations

None. The implementation:
- Returns complete markdown scaffold as string
- Is pure and deterministic
- Includes Theme Pack Canon section with festival name and characters
- Includes Rulebook Directives section with R1, R2 mentions
- Includes Combo Assignments section for each scene
- Includes Per-Stage Templates (IMAGE, VIDEO_START, EXTEND_MIDDLE, EXTEND_END)
- Includes Output Schema Instructions
- Assembles GLOBAL blocks into all stage templates
- Orders blocks within lane by node.order
- Pinned blocks appear in all scenes verbatim
- Override promptFragment wins over library
- Injects loop anchor in IMAGE and mirror directive in END when loopMode=true
- Does not inject loop directives when loopMode=false
- Character locks appear verbatim in IMAGE section
- Substitutes {{stageArea}}, {{festivalMoment}}, {{camera.start}}, etc.
- Throws CompilerError for missing block definitions
- Throws CompilerError for unresolved placeholders
- Error includes nodeId for debugging
- Throws CompilerError for invalid graph structure
- Uses LF line endings

## Public API Exported

```typescript
// Types
export interface ThemePack { id, name, festivalName, universeRules, characters, ... }
export interface CharacterDefinition { name, description, lockText }
export interface BlockDefinition { id, type, name, promptFragment, lane, defaultPinned }
export class CompilerError extends Error {
  type: "missing_block" | "unresolved_placeholder" | "invalid_graph" | "invalid_lane"
  nodeId: string | null
}

// Functions
export function resolveBlockFragment(node, blockDefs): string
export function injectComboPlaceholders(template, combo): string
export function injectLoopDirectives(template, stage, loopMode): string
export function injectCharacterLocks(template, characters): string
export function compileStageTemplate(stage, blocks, combo): string
export function compile(graph, themePack, combos, blockDefs): string
```
