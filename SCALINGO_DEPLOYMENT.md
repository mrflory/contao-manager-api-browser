# Scalingo Deployment Guide (EU Fallback)

Use this when you outgrow the pilot setup and want a more mature EU-hosted PaaS baseline.

## 1. Create Services

1. Create a Scalingo app from this repository.
2. Add PostgreSQL add-on in the same region.
3. Capture `SCALINGO_POSTGRESQL_URL` (or configured DB URL).

## 2. Configure Environment Variables

```bash
NODE_ENV=production
STORAGE_TYPE=database
DATABASE_URL=${SCALINGO_POSTGRESQL_URL}
TOKEN_MASTER_KEY=<64 hex chars>
BETTER_AUTH_SECRET=<openssl rand -base64 32 output>
APP_URL=https://your-domain.example
FRONTEND_URL=https://your-domain.example
WEBAUTHN_RP_ID=your-domain.example
WEBAUTHN_RP_NAME=Contao Update & Backup Service
TOTP_ISSUER=Contao Manager
ALLOWED_ORIGINS=https://your-domain.example
```

## 3. Deploy Command

Use container deploy via `Dockerfile` or equivalent buildpack config with:

- Build: `npm ci && npx prisma generate && npm run build:all`
- Start: `npx prisma migrate deploy && npm start`
- Health check: `/api/health`

## 4. Migration From Hostim/Neon

1. Export source DB:

```bash
pg_dump --format=custom "$SOURCE_DATABASE_URL" > source_backup.dump
```

2. Restore into Scalingo DB:

```bash
pg_restore --no-owner --no-privileges --clean --if-exists -d "$DATABASE_URL" source_backup.dump
```

3. Run:

```bash
npx prisma migrate deploy
```

4. Execute the same smoke tests from `HOSTIM_DEPLOYMENT.md`.
