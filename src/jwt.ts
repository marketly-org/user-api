/** JWT signing + verification helpers. */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod';
const JWT_EXPIRY = '15m';
const REFRESH_EXPIRY = '7d';

export function signToken(payload: object): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function signRefreshToken(payload: object): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_EXPIRY });
}

export function verifyToken(token: string): object | null {
  try {
    return jwt.verify(token, JWT_SECRET) as object;
  } catch {
    return null;
  }
}
