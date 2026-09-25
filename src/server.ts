/** Express server + route handlers. */

import express from 'express';
import bcrypt from 'bcryptjs';
import { pool, initSchema, checkConnection, createUser, getUserByEmail, getUserById, closePool } from './db';
import { signToken, signRefreshToken, verifyToken } from './jwt';
import { issueRefreshToken, validateRefreshToken, revokeRefreshToken, tokenCount } from './tokenStore';

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'user-api', version: '1.0.0' });
});

app.get('/ready', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ready', tokens: tokenCount() });
  } catch (err) {
    res.status(503).json({ status: 'not_ready', error: String(err) });
  }
});

app.post('/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    res.status(400).json({ error: 'email, password, and name required' });
    return;
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    res.status(409).json({ error: 'email already registered' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const id = await createUser(email, passwordHash, name);
  const token = signToken({ sub: id, email });
  const refreshToken = issueRefreshToken(id, email);

  res.status(201).json({ token, refreshToken, user: { id, email, name } });
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'email and password required' });
    return;
  }

  const user = await getUserByEmail(email);
  if (!user) {
    res.status(401).json({ error: 'invalid credentials' });
    return;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'invalid credentials' });
    return;
  }

  const token = signToken({ sub: user.id, email: user.email });
  const refreshToken = issueRefreshToken(user.id, user.email);

  res.json({
    token,
    refreshToken,
    user: { id: user.id, email: user.email, name: user.name },
  });
});

app.post('/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400).json({ error: 'refreshToken required' });
    return;
  }

  const entry = validateRefreshToken(refreshToken);
  if (!entry) {
    res.status(401).json({ error: 'invalid or expired refresh token' });
    return;
  }

  // Issue a new access token + rotate the refresh token.
  revokeRefreshToken(refreshToken);
  const newToken = signToken({ sub: entry.userId, email: entry.email });
  const newRefresh = issueRefreshToken(entry.userId, entry.email);

  res.json({ token: newToken, refreshToken: newRefresh });
});

app.get('/users/:id', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    res.status(401).json({ error: 'missing or malformed Authorization header' });
    return;
  }

  const payload = verifyToken(auth.slice(7));
  if (!payload) {
    res.status(401).json({ error: 'invalid token' });
    return;
  }

  const user = await getUserById(req.params.id);
  if (!user) {
    res.status(404).json({ error: 'user not found' });
    return;
  }

  res.json(user);
});

const port = parseInt(process.env.PORT || '8080', 10);

async function main() {
  await checkConnection();
  await initSchema();
  app.listen(port, () => {
    console.log(`user-api starting on :${port}`);
  });
}

process.on('SIGTERM', async () => {
  await closePool();
  process.exit(0);
});

main().catch((err) => {
  console.error('startup failed:', err);
  process.exit(1);
});
