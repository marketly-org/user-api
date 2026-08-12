/**
 * Refresh token store.
 *
 * under load with a small heap), the Node.js process hits its memory limit
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
}

const refreshTokens = new Map<string, TokenEntry>();

export function issueRefreshToken(userId: string, email: string): string {
  const token = randomUUID();
  refreshTokens.set(token, {
    userId,
    email,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  return token;
}

export function validateRefreshToken(token: string): TokenEntry | null {
  const entry = refreshTokens.get(token);
  if (!entry) {
    return null;
  }
  if (entry.expiresAt < Date.now()) {
    refreshTokens.delete(token);
    return null;
  }
  return entry;
}

export function revokeRefreshToken(token: string): void {
  refreshTokens.delete(token);
}

// Returns the current number of stored tokens. Used by /health for
// observability — if this number grows monotonically, the leak is
// active.
export function tokenCount(): number {
  return refreshTokens.size;
}
