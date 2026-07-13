# Wave 1: Sequential Testing Phase

**Date**: 2026-07-03
**Status**: STARTING

## Testing Protocol (Expand Phase 2)

Per Expand pipeline protocol: "Each sub-plan runs ONLY its own scoped tests, NOT the full suite."

### Test Sequence

**Step 1: Install Dependencies**
```bash
npm install
```
Install new dependencies added by both sub-plans.

**Step 2: Test Sub-Plan A (API Client Infrastructure)**
Run ONLY Sub-Plan A's scoped tests:
```bash
npm test -- tests/ai-clients/
```
Expected: 211 tests passing

**Step 3: Test Sub-Plan B (Hybrid Key Management)**
Run ONLY Sub-Plan B's scoped tests:
```bash
npm test -- tests/key-storage/ tests/integration/key-management.test.ts
```
Expected: 73 tests passing

**Success Criteria**:
- All Sub-Plan A tests pass (211/211)
- All Sub-Plan B tests pass (73/73)
- No regressions in existing 478 tests (will verify in full regression at end of Wave 4)

**If Failures**:
- Mark sub-plan as Failed
- Dispatch Debug Loop Agent with failure details
- Fix before proceeding to Wave 2

---

**Beginning sequential testing now...**
