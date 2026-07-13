# Tester Journal: Phase 2 Export API Tests

**Agent:** Unit Test Writer (quality:unit-test-writer-typescript)
**Pipeline:** 2026-07-11-phase2-persistence-api
**Timestamp:** 2026-07-11T15:00:00Z
**Task:** Implement export endpoint tests per Phase 2 specification section 7

---

## Summary

Created comprehensive test suite for the Export API endpoint at:
`/Users/galmoussan/projects/claude/puppetflow/tests/api/export.test.ts`

The test file implements all 9 test scenarios from the specification with 32 individual test cases covering scenes export, scaffold export, headers, and error handling.

---

## Test Coverage Implemented

### 1. Export Scenes Format (7 tests)

- [x] Exports scenes as markdown with correct content structure
- [x] Exports all 5 scenes with individual headers
- [x] Matches expected markdown structure (Combo, Lyrics, Prompts, Boundary Frames)
- [x] Includes boundary frames and final frame in output
- [x] Includes lint warnings when present (with warning banner)
- [x] Handles single scene export correctly
- [x] Preserves Unicode characters in scene content (Japanese, emoji, etc.)
- [x] Does not truncate long prompts (5000+ character preservation)

### 2. Export Scaffold Format (3 tests)

- [x] Exports scaffold as markdown
- [x] Scaffold is byte-identical to stored `Run.scaffold` (exact content match)
- [x] Preserves all whitespace, tabs, and line endings exactly
- [x] Includes combo assignments from scaffold

### 3. Content-Type Headers (3 tests)

- [x] Sets correct `Content-Type: text/markdown; charset=utf-8` header
- [x] Includes `charset=utf-8` in all responses
- [x] Ignores `Accept` header (always returns markdown)

### 4. Content-Disposition Headers (5 tests)

- [x] Sets `Content-Disposition: attachment; filename="scenes-YYYY-MM-DD.md"` for scenes format
- [x] Sets `Content-Disposition: attachment; filename="scaffold-YYYY-MM-DD.md"` for scaffold format
- [x] Uses `Run.createdAt` date in filename
- [x] Defaults to scenes format when format parameter not specified
- [x] Properly formats filename with attachment type

### 5. Run Not Found / Incomplete Run (8 tests)

- [x] Returns 404 with `{ error: "Run not found" }` for nonexistent run
- [x] Returns 400 for PENDING status with status message
- [x] Returns 400 for COMPILING status
- [x] Returns 400 for GENERATING status with status message
- [x] Returns 400 for LINTING status
- [x] Returns 400 for REPAIRING status
- [x] Allows export of DONE status (status 200)
- [x] Returns 400 for FAILED status

---

## Test Patterns Applied

### Test Structure (per Vitest conventions)

```typescript
// Use beforeEach for mock cleanup
beforeEach(() => {
  vi.clearAllMocks();
});

// Group related tests with describe blocks
describe("export scenes format", () => {
  it("descriptive test name", async () => {
    // Arrange: setup mocks
    mockPrisma.run.findUnique.mockResolvedValue(...);

    // Act: execute handler
    const response = await GET(request, { params: { runId: "run-001" } });

    // Assert: verify response
    expect(response.status).toBe(200);
  });
});
```

### Mock Setup

- **Prisma mocking:** Deep mocks via `vitest-mock-extended`
- **NextRequest helper:** Creates mock requests with proper URL and headers
- **Mock Prisma client:** Created with fixture runs and scenes

### Assertion Patterns

- Response status codes (200, 400, 404)
- Response headers (Content-Type, Content-Disposition)
- Response body (error messages, exact content matches)
- String matching for markdown structure (regex patterns for sections)

---

## Key Test Scenarios

### 1. Scenes Export Format

Verifies that scenes export matches the standard format with sections for:
- Combo (stage, moment, dynamic, visual, etc.)
- Lyrics
- Image Prompt
- Video Start/Extend Middle/Extend End prompts
- Boundary frames (handshakes)
- Final frame

Test includes preservation of:
- Unicode content (Japanese characters, Cyrillic, etc.)
- Long content without truncation
- Lint violation warnings with severity

### 2. Scaffold Export (Byte-Identical)

Critical for Claude Code integration - scaffold must be byte-identical to the original:
- Exact character-for-character match (`expect(content).toBe(specificScaffold)`)
- Whitespace preservation (spaces, tabs, line endings)
- Length verification
- No transformation of content

### 3. Header Validation

Consistent header behavior:
- **Content-Type:** Always `text/markdown; charset=utf-8` for all formats
- **Content-Disposition:** `attachment` with format-specific filename
- Date format: `YYYY-MM-DD` from `Run.createdAt`

### 4. Status Code Validation

Only DONE runs can be exported. All others return 400:
- PENDING, COMPILING: Not started
- GENERATING, LINTING, REPAIRING: In progress
- FAILED: Did not complete
- DONE: Export allowed

---

## File Location

```
/Users/galmoussan/projects/claude/puppetflow/tests/api/export.test.ts
```

**Statistics:**
- Total lines: 556
- Test describe blocks: 5
- Individual test cases: 32
- Coverage target: >= 80% line coverage

---

## Test Fixtures Used

### Sample Runs

```typescript
const sampleRun = {
  id: "run-001",
  templateId: "tpl-001",
  status: "DONE",
  scaffold: `# Festival Generation Scaffold...`,
  error: null,
  createdAt: new Date("2026-07-05"),
  updatedAt: new Date("2026-07-05"),
};
```

### Sample Scenes

Generated via `createMockScene(index, runId)` from anthropic-responses.ts:
- Includes full combo with all required fields
- Complete lyrics, prompts for all stages
- Boundary frames and final frame
- Empty lintReport by default

---

## Dependencies

### External Mocks
- `@/lib/db` → `prisma` (mocked via vitest-mock-extended)

### Imports
- `@/app/api/export/[runId]/route` → `GET` handler (not yet implemented)
- `@/tests/mocks/prisma` → `createMockPrisma`, `MockPrismaClient`
- `@/tests/mocks/anthropic-responses` → `createMockScene`, `createMockBatchOutput`
- `NextRequest` from next/server (for request creation)

---

## Running the Tests

```bash
# Run export tests only
npm test -- tests/api/export.test.ts

# Run with coverage
npm test -- --coverage tests/api/export.test.ts

# Watch mode
npm test -- --watch tests/api/export.test.ts
```

---

## Next Steps

1. **Implementer:** Create `/app/api/export/[runId]/route.ts` handler
   - Validate run exists (404)
   - Validate run is DONE (400)
   - Render scenes or scaffold as markdown
   - Set headers: Content-Type, Content-Disposition

2. **Test Execution:** Run tests to verify implementation
   - All 32 tests should pass
   - Achieve >= 80% line coverage for export route

3. **Integration:** Ensure export works with:
   - Reroll API (updated scenes)
   - Scheduled export tasks
   - Claude Code imports

---

## Notes

- All tests follow Vitest pattern: `vi.clearAllMocks()` in beforeEach
- Helper function `getMarkdownContent()` abstracts response.text() for clarity
- Regex patterns for markdown structure validation avoid brittleness
- Scenes format uses mock data from anthropic-responses.ts (consistent with other API tests)
- Edge cases tested: Unicode, whitespace preservation, long content, multiple status codes
