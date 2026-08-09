# user-api

User authentication + profile service for the **Marketly** e-commerce platform.

Handles registration, login, JWT-based auth, and refresh token rotation.

## Stack

- **Node.js 20** + **TypeScript** + **Express** 4
- **pg** for Postgres
- **bcryptjs** for password hashing
- **jsonwebtoken** for JWT

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/login` | Login + get JWT + refresh token |
| POST | `/auth/refresh` | Rotate refresh token |
| GET | `/users/{id}` | Get user profile (requires Bearer token) |
| GET | `/health` | Liveness probe |
| GET | `/ready` | Readiness probe (checks DB + token count) |

## Local development

```bash
npm install
npm run dev
```

## Tests

```bash
npm test
```
