/** Postgres connection pool. */

import { Pool } from 'pg';

const connectionString = process.env.USER_DATABASE_URL;
if (!connectionString) {
  throw new Error('USER_DATABASE_URL is required');
}

const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export async function checkHealth(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

export async function initSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function createUser(email: string, passwordHash: string, name: string): Promise<string> {
  const result = await pool.query(
    'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id',
    [email, passwordHash, name],
  );
  return result.rows[0].id;
}

export async function getUserByEmail(email: string): Promise<{ id: string; email: string; password_hash: string; name: string; created_at: Date } | null> {
  const result = await pool.query(
    'SELECT id, email, password_hash, name, created_at FROM users WHERE email = $1',
    [email],
  );
  return result.rows[0] || null;
}

export async function getUserById(id: string): Promise<{ id: string; email: string; name: string; created_at: Date } | null> {
  const result = await pool.query(
    'SELECT id, email, name, created_at FROM users WHERE id = $1',
    [id],
  );
  return result.rows[0] || null;
}

export async function closePool(): Promise<void> {
  await pool.end();
}

export { pool };
