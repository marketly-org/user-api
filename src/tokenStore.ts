/**
 * Refresh token store.
 *
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
// observability.
export function tokenCount(): number {
  return refreshTokens.size;
}
