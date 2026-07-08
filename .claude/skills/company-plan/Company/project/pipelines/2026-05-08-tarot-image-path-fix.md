# Pipeline: Fix Tarot Card Image Path Mismatch

**ID**: 2026-05-08-tarot-image-path-fix
**Status**: Ready
**Module(s)**: data/cards.ts, card loading system
**Created**: 2026-05-08 14:35 PST

## Design Summary

The Deck of Tarot video carousel displays a black screen in Safari because the app expects still images at `public/stills/1.jpg` through `public/stills/73.jpg` with numeric naming, but the actual files are at `cards/Still-cards/` with descriptive names (AnimalSoul.png, Death.png, etc.) in PNG format.

This pipeline implements Option A (Map & Copy approach): creating a mapping system that connects card IDs (1-73) to descriptive filenames, updating the cards data structure to reference the correct file paths, and serving PNG files directly without conversion.

## Design Decisions

### Q: How should we handle the 74th card?
**A**: Automatically pick first 73 alphabetically
- Sort all 74 PNG files alphabetically
- Use first 73 for card IDs 1-73
- Ignore the 74th file

### Q: For the card ID to filename mapping approach?
**A**: Add stillFilename field to cards array (Recommended)
- Each Card object will have a `stillFilename` property (e.g., 'AnimalSoul.png')
- Type-safe and centralized in data/cards.ts
- Easy to maintain and validate

### Q: File format handling?
**A**: Serve PNG directly (Recommended)
- Update stillUrl to use `/cards/Still-cards/{filename}.png` format
- No conversion needed - faster to implement
- Preserves original file quality

### Q: Naming mismatches between video and still files?
**A**: Manual mapping for mismatches
- Create explicit mappings for files where video/still names don't match
- Examples: TheBrook.mp4 ↔ TheBrother.png, TheBuisnessman.mp4 ↔ TheBusinessman.png
- Ensures correct video-still pairing

## Pipeline Type: Feature
## Full Test Suite: No (scoped testing only)

## Task Breakdown

### Phase 1a: Design Documentation (Documenter)
- [ ] Update Technical Doc: Document the card asset loading system changes
  - Current state: numeric IDs, JPG format, public/stills/ location
  - New state: descriptive filenames, PNG format, cards/Still-cards/ location
  - Mapping structure and rationale
- [ ] Update Architecture Doc: Asset path resolution flow
  - How stillUrl is constructed
  - How stillFilename maps to actual files
  - Next.js static asset serving from cards/ directory

### Phase 1b: Test Specifications (Tester)
- [ ] Test spec for cards data generation script
  - Scenario: Generate cards array with correct stillFilename mappings
  - Scenario: Handle alphabetical sorting for first 73 files
  - Scenario: Validate all files exist
  - Scenario: Handle video/still naming mismatches
- [ ] Test spec for card data integrity
  - Scenario: All cards have valid stillFilename
  - Scenario: All stillUrl paths point to existing PNG files
  - Scenario: ID sequence is 1-73 without gaps

### Phase 2: Test Code (Tester)
- [ ] Unit tests: `data/cards-generator.test.ts`
  - Test alphabetical sorting of PNG files
  - Test first 73 selection logic
  - Test mismatch mapping application
  - Test stillUrl generation from stillFilename
  - Test file existence validation
- [ ] Integration tests: `data/cards-integration.test.ts`
  - Test cards array structure and types
  - Test that all stillUrl paths resolve to real files
  - Test that card count is exactly 73
  - Test that no duplicates exist in stillFilename values

### Phase 3: Implementation (Implementer)
- [ ] Create mapping generation script: `scripts/generateCardMapping.ts`
  - List all files in cards/Still-cards/ and cards/Video-cards/
  - Sort still filenames alphabetically
  - Take first 73 still filenames
  - Create manual mismatch mapping for video files
  - Generate Card array with stillFilename and videoFilename fields
  - Output to data/cards.ts
- [ ] Update Card type in `data/cards.ts`
  - Add `stillFilename: string` field (e.g., "AnimalSoul.png")
  - Add `videoFilename: string` field (e.g., "AnimalSoul.mp4" or "TheBrook.mp4")
  - Update `stillUrl` to use `/cards/Still-cards/${stillFilename}` format
  - Keep existing fields: id, name, videoBlobPath, sourceFilename
- [ ] Update cards array generation
  - Replace generic Array.from with actual mapped cards
  - Each card has unique stillFilename from sorted list
  - Each card has correct videoFilename (handling mismatches)
  - Validate: exactly 73 cards, no duplicates
- [ ] Update Next.js configuration if needed
  - Verify that `/cards/Still-cards/` is accessible as static assets
  - Add to `public/` or configure Next.js static file serving

### Phase 4: Verification (pipeline tests only)
- [ ] Unit tests: data/cards-generator.test.ts
- [ ] Integration tests: data/cards-integration.test.ts
- [ ] Manual verification: Load app at localhost:3002
  - Verify first card displays (no black screen)
  - Navigate through carousel (left/right arrows)
  - Verify all 73 cards load correctly
  - Test in Safari specifically (original bug environment)

### Phase 5: Doc Sync
- [ ] Update README if asset structure is documented
- [ ] Update Technical Doc with actual implementation details
- [ ] Update Architecture Doc if static asset serving changed

### Phase 6: Post-Pipeline Review
- [ ] Optimizer retrospective: What went well, what could improve
- [ ] Visionary strategic review: Future asset management strategy

## Context for Agents

### Key Files to Read

#### Implementer:
- `data/cards.ts` - Current Card type and cards array structure
- `cards/Still-cards/` directory listing - All PNG files with descriptive names
- `cards/Video-cards/` directory listing - All MP4 files with descriptive names
- `next.config.ts` or `next.config.js` - Static asset serving configuration
- `components/card/CardSlide.tsx` - How cards are rendered (uses card.stillUrl)

#### Tester:
- `data/cards.ts` - Structure to test
- `tests/` directory - Existing test patterns
- `package.json` - Test framework configuration (likely Vitest)

#### Documenter:
- `Documentation/architecture/` - Architecture docs
- `Documentation/design-docs/` - Technical design docs
- `README.md` - User-facing documentation

### Patterns to Follow

**TypeScript Patterns:**
- Immutable data structures (no mutations)
- Explicit types for all Card fields
- Strict null checks

**File Generation Pattern:**
- Generate mapping script as one-time setup tool
- Output TypeScript source file (data/cards.ts) with explicit array
- Don't use dynamic file loading at runtime - bake mapping into code

**Testing Pattern:**
- Unit tests for pure functions (sorting, mapping logic)
- Integration tests for file system validation
- Manual verification for UI rendering

### Known Gotchas

1. **Alphabetical sorting locale**: Use `.sort()` without locale for consistency
2. **File name case sensitivity**: macOS is case-insensitive but Linux/production might not be
3. **Next.js static assets**: Files in `public/` are served from root `/`, but `cards/` might need configuration
4. **Video/still mismatch count**: There are naming discrepancies (TheBrook vs TheBrother, TheBuisnessman vs TheBusinessman)
5. **74 vs 73 files**: Must confirm which file is the 74th after sorting to understand what's excluded

### Learnings Applied

**From project-guidelines.md** (not found - guidelines gap noted):
- None available - this is the first pipeline, so no prior learnings exist yet

## Guidelines Gaps

**Information needed but not found in project-guidelines.md:**
1. **Test framework**: Assumed Vitest based on common Next.js setup, but not explicitly confirmed
2. **Static asset serving**: How Next.js is configured for serving files outside `public/`
3. **Script execution**: How to run generation scripts (npm scripts, direct ts-node, etc.)
4. **File validation**: Whether there's an existing pattern for validating asset files exist
5. **Manual mismatch mapping location**: Where to store the video↔still mismatch mappings (inline in script, separate JSON, etc.)

The Optimizer will backfill these into project-guidelines.md after execution.

## Execution Log

_(Empty - will be filled by /company-execute)_
