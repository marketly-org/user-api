/**
 * Refresh token store.
 *
 * Under load with a small heap, the Node.js process hits its memory limit
 * and gets OOMKilled by the kernel.
 *
 * The fix is one of:
 *   1. Add a TTL to each entry + a periodic cleanup interval.
 *   2. Use an LRU cache (e.g. lru-cache npm package) with a max size.
 *   3. Store refresh tokens in Redis (the right fix for production).
 *
 * For the minimal fix, option 1 is sufficient: set a setTimeout that
 * deletes the entry after REFRESH_EXPIRY, and cap the Map at a max size
 * (e.g. 10000 entries) with FIFO eviction.
 */

import { randomUUID } from 'crypto';

interface TokenEntry {
  userId: string;
  email: string;
  expiresAt: number;
  timeoutId: NodeJS.Timeout;
}

const MAX_TOKENS = 10000;
const TOKEN_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

const refreshTokens = new Map<string, TokenEntry>();

function evictOldestTokenIfNeeded() {
  if (refreshTokens.size >= MAX_TOKENS) {
    // Evict the oldest token (FIFO)
    const oldestKey = refreshTokens.keys().next().value;
    if (oldestKey) {
      const oldestEntry = refreshTokens.get(oldestKey);
      if (oldestEntry) {
        clearTimeout(oldestEntry.timeoutId);
      }
      refreshTokens.delete(oldestKey);
    }
  }
}

export function issueRefreshToken(userId: string, email: string): string {
  evictOldestTokenIfNeeded();

  const token = randomUUID();
  const expiresAt = Date.now() + TOKEN_TTL;

  const timeoutId = setTimeout(() => {
    refreshTokens.delete(token);
  }, TOKEN_TTL);

  refreshTokens.set(token, {
    userId,
    email,
    expiresAt,
    timeoutId,
  });

  return token;
}

export function validateRefreshToken(token: string): TokenEntry | null {
  const entry = refreshTokens.get(token);
  if (!entry) {
    return null;
  }
  if (entry.expiresAt < Date.now()) {
    clearTimeout(entry.timeoutId);
    refreshTokens.delete(token);
    return null;
  }
  return entry;
}

export function revokeRefreshToken(token: string): void {
  const entry = refreshTokens.get(token);
  if (entry) {
    clearTimeout(entry.timeoutId);
  }
  refreshTokens.delete(token);
}

// Returns the current number of stored tokens. Used by /health for
// observability — if this number grows monotonically, the leak is
// active.
export function tokenCount(): number {
  return refreshTokens.size;
}
