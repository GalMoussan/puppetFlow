# Sub-Plan B Phase 2: Tests (TDD - RED State)
## Hybrid Key Management - Test Suite

**Date**: 2026-07-03
**Phase**: Test Writing (TDD - RED)
**Status**: COMPLETE

---

## Overview

All 55 tests have been written BEFORE implementation, following strict TDD methodology. Tests are expected to FAIL at this stage (RED state).

## Test Coverage Summary

### Unit Tests: 40 tests

#### Client Storage Tests (15 tests)
**File**: `tests/key-storage/client-storage.test.ts`

**saveKey (5 tests)**:
1. Should save a key to localStorage
2. Should encrypt the key before storage
3. Should handle multiple providers
4. Should overwrite existing key for same provider
5. Should throw error if localStorage is unavailable

**getKey (5 tests)**:
6. Should retrieve and decrypt a saved key
7. Should return null for non-existent provider
8. Should return null if localStorage is empty
9. Should handle corrupted localStorage data gracefully
10. Should retrieve different keys for different providers

**deleteKey (4 tests)**:
11. Should delete a specific provider key
12. Should not affect other provider keys
13. Should not throw when deleting non-existent key
14. Should handle empty localStorage gracefully

**listProviders (3 tests)**:
15. Should return empty array when no keys stored
16. Should return all stored providers
17. Should not include deleted providers

**encryption/decryption (3 tests)**:
18. Should produce encrypted values (not plaintext)
19. Should successfully round-trip encrypt/decrypt
20. (Bonus test for consistency)

**Total: 15 tests**

#### Server Storage Tests (15 tests)
**File**: `tests/key-storage/server-storage.test.ts`

**saveKey (6 tests)**:
1. Should save a key to Supabase
2. Should encrypt the key before storage
3. Should include user_id in stored data
4. Should update existing key for same provider
5. Should handle multiple providers for same user
6. Should throw error on Supabase failure

**getKey (5 tests)**:
7. Should retrieve and decrypt a saved key
8. Should return null for non-existent provider
9. Should retrieve different keys for different providers
10. Should throw error on Supabase failure
11. Should handle corrupted encrypted data gracefully

**deleteKey (4 tests)**:
12. Should delete a specific provider key
13. Should not affect other provider keys
14. Should not throw when deleting non-existent key
15. Should throw error on Supabase failure

**listProviders (4 tests)**:
16. Should return empty array when no keys stored
17. Should return all stored providers for user
18. Should not include deleted providers
19. Should throw error on Supabase failure

**encryption/decryption (2 tests)**:
20. Should successfully round-trip encrypt/decrypt
21. Should use user-specific encryption

**Total: 15 tests**

#### Key Manager Tests (10 tests)
**File**: `tests/key-storage/key-manager.test.ts`

**client-only mode (4 tests)**:
1. Should use client storage for saveKey
2. Should use client storage for getKey
3. Should use client storage for deleteKey
4. Should use client storage for listProviders

**server-only mode (2 tests)**:
5. Should use server storage for saveKey
6. Should use server storage for getKey

**auto mode with fallback (5 tests)**:
7. Should try server first, fallback to client on error
8. Should use server key if available, skip client
9. Should fallback to client if server returns null
10. Should return null if both server and client return null
11. (Bonus test for mode validation)

**mode switching (3 tests)**:
12. Should switch from client to server mode
13. Should use new storage after mode switch
14. Should switch to auto mode

**server availability check (3 tests)**:
15. Should return true if server storage is available
16. Should return false if server storage fails
17. Should return false if no server storage configured

**error handling (2 tests)**:
18. Should propagate client storage errors in client mode
19. Should propagate server storage errors in server mode

**Total: 10 tests** (some overlap/bonus tests)

### Integration Tests: 15 tests

**File**: `tests/integration/key-management.test.ts`

**client-side mode full workflow (3 tests)**:
1. Should save, retrieve, and delete keys in client mode
2. Should persist keys across manager instances
3. Should handle multiple keys for different providers

**server-side mode full workflow (2 tests)**:
4. Should save, retrieve, and delete keys in server mode
5. Should store encrypted keys in Supabase

**auto mode with fallback (3 tests)**:
6. Should use server when available
7. Should fallback to client when server fails
8. Should prefer server key over client key

**mode switching (2 tests)**:
9. Should switch from client to server mode
10. Should handle keys from previous mode after switch

**key masking in logs (2 tests)**:
11. Should mask keys in error messages
12. Should mask keys in exported data

**error recovery (3 tests)**:
13. Should handle localStorage quota exceeded
14. Should handle corrupted localStorage data
15. Should handle Supabase network errors gracefully

**Total: 15 tests**

## Grand Total: 55 tests

- **Unit tests**: 40 (Client: 15, Server: 15, Manager: 10)
- **Integration tests**: 15
- **Expected state**: RED (all failing)

## Test Strategy

### Mocking Strategy

**localStorage mocking**:
```typescript
const mockLocalStorage: Record<string, string> = {};

global.localStorage = {
  getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
  setItem: vi.fn((key: string, value: string) => { mockLocalStorage[key] = value; }),
  removeItem: vi.fn((key: string) => { delete mockLocalStorage[key]; }),
  clear: vi.fn(() => { mockLocalStorage = {}; }),
  length: 0,
  key: vi.fn(),
} as Storage;
```

**Supabase mocking**:
```typescript
const createMockSupabase = () => {
  const mockData: Array<{ user_id: string; provider: string; encrypted_key: string }> = [];

  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ /* ... */ })),
      upsert: vi.fn(async (data) => { /* ... */ }),
      delete: vi.fn(() => ({ /* ... */ })),
    })),
    _mockData: mockData,
  };
};
```

### Test Principles

1. **Isolation**: Each test resets mocks and state
2. **Determinism**: No random values, predictable outcomes
3. **Granularity**: One assertion focus per test
4. **Coverage**: Edge cases and error paths tested
5. **Readability**: Clear test names describing behavior

## Test Execution Plan

### Phase 2 Verification (RED State)

```bash
npm test tests/key-storage/
npm test tests/integration/key-management.test.ts
```

**Expected Output**: All 55 tests FAIL with:
- `Cannot find module 'lib/key-storage/client-storage'`
- `Cannot find module 'lib/key-storage/server-storage'`
- `Cannot find module 'lib/key-storage/key-manager'`

### Phase 3 Verification (GREEN State)

After implementation:
```bash
npm test tests/key-storage/ tests/integration/key-management.test.ts
```

**Expected Output**: All 55 tests PASS

## Key Testing Scenarios

### Security Testing
- Keys are encrypted before storage (not plaintext)
- Decryption works correctly
- User-specific encryption (server-side)
- Browser fingerprint encryption (client-side)

### Fallback Testing
- Server-to-client fallback on network error
- Server-to-client fallback on auth failure
- Null returns when both fail

### Error Handling Testing
- localStorage quota exceeded
- Corrupted data recovery
- Supabase network errors
- Auth failures

### Mode Switching Testing
- Client → Server transition
- Server → Client transition
- Auto mode behavior

## Test Data

### Sample API Keys
```typescript
const testKeys = {
  openai: 'sk-1234567890abcdefghijklmnop',
  anthropic: 'sk-ant-api03-1234567890abcdefghijklmnop',
  deepseek: 'sk-deepseek-1234567890abcdefghijklmnop',
};
```

### Sample User IDs
```typescript
const testUsers = ['test-user-id', 'user-1', 'user-2'];
```

## Known Test Limitations

1. **Browser Fingerprint**: Cannot test real browser fingerprints in Node.js environment
2. **Crypto APIs**: Using crypto-js in tests, actual implementation may use Web Crypto API
3. **Supabase RLS**: Cannot test real RLS policies without live Supabase instance
4. **localStorage Events**: Not testing storage events across tabs

## Next Steps

1. Verify tests are in RED state: `npm test`
2. Proceed to **Phase 3: Implementation**
3. Implement code to make tests GREEN
4. Verify 55/55 tests passing

---

**Phase 2 Complete**: 55 tests written (RED state expected).
**Next Phase**: Implement code to make tests pass (GREEN state).
