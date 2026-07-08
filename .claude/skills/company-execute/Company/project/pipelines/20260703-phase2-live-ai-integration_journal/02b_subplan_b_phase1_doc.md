# Sub-Plan B Phase 1: Documentation
## Hybrid Key Management - Technical Design

**Date**: 2026-07-03
**Phase**: Documentation
**Status**: COMPLETE

---

## Overview

Sub-Plan B implements a hybrid key storage system that supports both client-side (localStorage) and server-side (Supabase) storage modes with encryption, graceful fallback, and unified interface.

## Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                      KeyManager                              │
│  (Unified interface with fallback logic)                     │
└──────────────┬──────────────────────────┬────────────────────┘
               │                          │
               ▼                          ▼
    ┌──────────────────┐      ┌──────────────────────┐
    │ ClientKeyStorage │      │ ServerKeyStorage     │
    │  (localStorage)  │      │    (Supabase)        │
    └──────────────────┘      └──────────────────────┘
               │                          │
               ▼                          ▼
        ┌────────────┐            ┌──────────────┐
        │ XOR Encrypt│            │ AES-256      │
        │ (Browser)  │            │ (Server)     │
        └────────────┘            └──────────────┘
```

### Component Responsibilities

1. **KeyStorage Interface**: Abstract interface for key operations
   - `saveKey(provider, key)`: Store encrypted key
   - `getKey(provider)`: Retrieve and decrypt key
   - `deleteKey(provider)`: Remove key
   - `listProviders()`: Get all stored providers

2. **ClientKeyStorage**: localStorage implementation
   - XOR encryption with browser fingerprint
   - Synchronous operations (wrapped in Promise for consistency)
   - No auth required
   - Keys persist only in current browser

3. **ServerKeyStorage**: Supabase implementation
   - AES-256 encryption with user-specific key
   - Asynchronous operations
   - Requires authentication
   - Keys sync across devices

4. **KeyManager**: Unified facade with fallback
   - Tries server-side first (if available)
   - Falls back to client-side on error
   - Transparent to consumers
   - Handles mode switching

## Storage Modes

### Client-Side Mode (Default)

**Pros**:
- No auth required
- Instant setup
- Works offline
- No server dependency

**Cons**:
- Keys don't sync across devices
- Lost on browser data clear
- Less secure (XOR obfuscation only)

**Encryption**: XOR with browser fingerprint (not cryptographically secure, just obfuscation)

### Server-Side Mode (Optional)

**Pros**:
- Keys sync across devices
- More secure (AES-256)
- Centralized management
- Audit trail possible

**Cons**:
- Requires Supabase auth
- Network dependency
- Slightly slower

**Encryption**: AES-256 with user-specific encryption key derived from auth token

## Data Flow

### Save Key Flow
```
User Input → KeyManager.saveKey()
    ↓
  Try ServerKeyStorage.saveKey()
    ↓ (if fails)
  Fallback to ClientKeyStorage.saveKey()
    ↓
  Encrypt key
    ↓
  Store (localStorage or Supabase)
```

### Get Key Flow
```
KeyManager.getKey()
    ↓
  Try ServerKeyStorage.getKey()
    ↓ (if succeeds)
  Return decrypted key
    ↓ (if fails)
  Fallback to ClientKeyStorage.getKey()
    ↓
  Return decrypted key
```

## Security Model

### Threat Model

**Protected Against**:
- Casual viewing of keys in DevTools
- Accidental exposure in logs/exports
- Cross-device access (client-side mode)
- Unauthorized database access (RLS policies)

**NOT Protected Against**:
- Determined attacker with DevTools access (client-side)
- XSS attacks with code execution
- Compromised browser extensions
- Physical access to unlocked device

### Key Masking

All keys are masked in logs and exports:
- Format: `sk-...abc123` (first 3 chars + last 6 chars)
- Applied at: Logger, Export functions, UI display

### Encryption Details

**Client-Side (XOR)**:
```typescript
function encrypt(key: string): string {
  const fingerprint = getBrowserFingerprint();
  const xored = xor(key, fingerprint);
  return btoa(xored); // Base64 encode
}

function getBrowserFingerprint(): string {
  // Combine navigator properties for semi-stable fingerprint
  return `${navigator.userAgent}|${navigator.language}|${screen.width}x${screen.height}`;
}
```

**Server-Side (AES-256)**:
```typescript
function encrypt(key: string, userId: string): string {
  const encryptionKey = deriveUserKey(userId);
  return AES.encrypt(key, encryptionKey).toString();
}

function deriveUserKey(userId: string): string {
  // Derive from user ID + environment secret
  return sha256(userId + process.env.ENCRYPTION_SECRET);
}
```

## Database Schema

### Supabase Table: `api_keys`

```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'deepseek')),
  encrypted_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
```

### Row Level Security (RLS)

```sql
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own keys"
  ON api_keys
  FOR ALL
  USING (auth.uid() = user_id);
```

## API Design

### Types

```typescript
export type Provider = 'openai' | 'anthropic' | 'deepseek';

export interface KeyStorage {
  saveKey(provider: Provider, key: string): Promise<void>;
  getKey(provider: Provider): Promise<string | null>;
  deleteKey(provider: Provider): Promise<void>;
  listProviders(): Promise<Provider[]>;
}

export interface KeyManagerConfig {
  mode: 'client' | 'server' | 'auto';
  supabaseClient?: SupabaseClient;
  userId?: string;
}

export interface StoredKey {
  provider: Provider;
  encryptedKey: string;
  createdAt: string;
  updatedAt: string;
}
```

### KeyManager API

```typescript
class KeyManager {
  constructor(config: KeyManagerConfig);

  // Core operations (use fallback logic)
  saveKey(provider: Provider, key: string): Promise<void>;
  getKey(provider: Provider): Promise<string | null>;
  deleteKey(provider: Provider): Promise<void>;
  listProviders(): Promise<Provider[]>;

  // Mode management
  setMode(mode: 'client' | 'server'): void;
  getMode(): 'client' | 'server';
  isServerAvailable(): Promise<boolean>;

  // Migration
  migrateToServer(): Promise<void>; // Copy client keys to server
  migrateToClient(): Promise<void>; // Copy server keys to client
}
```

## File Structure

```
lib/key-storage/
├── types.ts                 # Interfaces and types
├── client-storage.ts        # localStorage implementation
├── server-storage.ts        # Supabase implementation
├── key-manager.ts           # Unified facade
└── encryption.ts            # Encryption utilities

app/api/keys/
└── route.ts                 # Next.js API route (CRUD operations)

supabase/migrations/
└── 20260703_create_api_keys_table.sql

components/settings/
└── ApiKeyManager.tsx        # UI component

tests/key-storage/
├── client-storage.test.ts   # 15 tests
├── server-storage.test.ts   # 15 tests
├── key-manager.test.ts      # 10 tests
└── encryption.test.ts       # 5 tests (bonus)

tests/integration/
└── key-management.test.ts   # 15 tests
```

## Implementation Plan

### Phase 2: Tests (TDD)

1. Write unit tests for `ClientKeyStorage` (15 tests)
   - Save/get/delete operations
   - Encryption/decryption
   - Error handling
   - localStorage mocking

2. Write unit tests for `ServerKeyStorage` (15 tests)
   - Save/get/delete operations
   - Supabase mocking
   - Auth validation
   - RLS testing

3. Write unit tests for `KeyManager` (10 tests)
   - Fallback logic
   - Mode switching
   - Migration operations
   - Error propagation

4. Write integration tests (15 tests)
   - Full client-side workflow
   - Full server-side workflow
   - Fallback scenarios
   - Key masking verification
   - Mode migration

**Total: 55 tests** (RED - all should fail initially)

### Phase 3: Implementation

1. Create type definitions (`types.ts`)
2. Implement encryption utilities (`encryption.ts`)
3. Implement `ClientKeyStorage` (make 15 tests pass)
4. Implement `ServerKeyStorage` (make 15 tests pass)
5. Implement `KeyManager` (make 10 tests pass)
6. Create Supabase migration
7. Create Next.js API route
8. Build UI component
9. Verify integration tests pass (15 tests)

**Total: 55 tests GREEN**

### Phase 4: Completion

1. Final verification
2. Documentation
3. Return STATUS: READY_FOR_TESTING

## Dependencies

### New Packages
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.38.4",
    "crypto-js": "^4.2.0"
  },
  "devDependencies": {
    "@types/crypto-js": "^4.2.1"
  }
}
```

### Existing Packages
- `next` (API routes)
- `react` (UI component)
- `zustand` (state management, if needed)
- `vitest` (testing)
- `@testing-library/react` (component testing)

## UI Component Design

### ApiKeyManager Component

**Features**:
- Mode toggle (client vs server)
- Key input fields (one per provider)
- Masked key display
- Save/delete buttons
- Status indicators (saved, unsaved, error)
- Migration buttons (when switching modes)

**States**:
- `mode`: 'client' | 'server'
- `keys`: Record<Provider, string>
- `savedKeys`: Record<Provider, boolean>
- `errors`: Record<Provider, string>
- `isServerAvailable`: boolean

**User Flow**:
1. User selects mode (client or server)
2. If server mode + no auth → show auth prompt
3. User enters API keys for each provider
4. Keys are masked after entry (show `sk-...abc123`)
5. Save button → encrypt and store
6. Delete button → confirm and remove
7. Migration prompt when switching modes

## Error Handling

### Client-Side Errors
- localStorage full → show error, suggest clearing data
- localStorage disabled → show error, suggest enabling
- Decryption failure → clear corrupted key, show warning

### Server-Side Errors
- Supabase unreachable → fallback to client-side
- Auth expired → prompt re-login
- RLS violation → show error, suggest re-auth
- Network timeout → retry with exponential backoff

### Fallback Strategy
```typescript
async getKey(provider: Provider): Promise<string | null> {
  if (this.serverStorage) {
    try {
      const key = await this.serverStorage.getKey(provider);
      if (key) return key;
    } catch (error) {
      console.warn('Server storage unavailable, using client fallback');
      // Don't throw, fall through to client storage
    }
  }

  return this.clientStorage.getKey(provider);
}
```

## Success Criteria

- [ ] All 55 tests passing (40 unit + 15 integration)
- [ ] Keys can be saved/retrieved in both modes
- [ ] Fallback works when server unavailable
- [ ] Keys are encrypted at rest (client and server)
- [ ] Keys are masked in logs and exports
- [ ] RLS policies prevent unauthorized access
- [ ] UI component functional and user-friendly
- [ ] Migration between modes works correctly

## Known Gotchas

1. **Zustand + Testing**: Use direct `getState()` instead of `renderHook()`
2. **Async localStorage**: Wrap in Promise for API consistency
3. **Supabase Mocking**: Use `vi.mock()` with manual mock implementation
4. **Browser Fingerprint**: Changes on window resize → key lost (document limitation)
5. **AES-256 in Browser**: crypto-js is client-side only, use Web Crypto API for production

## Next Steps

Proceed to **Phase 2: Tests** - Write all 55 tests BEFORE implementation (TDD workflow).

---

**Phase 1 Complete**: Technical design documented.
**Next Phase**: Write 55 tests (RED state).
