# Hostim Deployment Guide (EU Pilot Primary)

This guide deploys the app to Hostim with managed PostgreSQL and migrates data from Neon in one cutover.

## 1. Prerequisites

- Hostim account and project
- Existing Neon `DATABASE_URL` (source)
- Domain (optional for pilot, recommended for passkeys)
- Local tools: `pg_dump`, `pg_restore`, `psql`

## 2. Create Hostim Services

1. Create a new app service from this Git repository.
2. Create a managed PostgreSQL service in the same EU region.
3. Note the new target `DATABASE_URL`.

## 3. Configure Environment Variables

Set these in the Hostim app service:

```bash
NODE_ENV=production
STORAGE_TYPE=database
DATABASE_URL=postgresql://...
TOKEN_MASTER_KEY=<64 hex chars>
BETTER_AUTH_SECRET=<openssl rand -base64 32 output>
APP_URL=https://your-domain.example
FRONTEND_URL=https://your-domain.example
WEBAUTHN_RP_ID=your-domain.example
WEBAUTHN_RP_NAME=Contao Update & Backup Service
TOTP_ISSUER=Contao Manager
ALLOWED_ORIGINS=https://your-domain.example
```

Optional email variables:

```bash
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@your-domain.example
```

## 4. Build/Run Configuration

Use the repository `Dockerfile`.

- Health check path: `/api/health`
- Runtime command (already in Dockerfile): `npx prisma migrate deploy && npm start`
- Port: host platform-provided `PORT` (app already supports this)

## 5. One-Time Neon -> Hostim Data Migration

Run from a trusted workstation:

```bash
export OLD_DATABASE_URL='postgresql://...neon...'
export NEW_DATABASE_URL='postgresql://...hostim...'
```

1. Freeze writes (maintenance window).
2. Backup Neon:

```bash
pg_dump --format=custom "$OLD_DATABASE_URL" > neon_backup.dump
```

3. Restore into Hostim:

```bash
pg_restore --no-owner --no-privileges --clean --if-exists -d "$NEW_DATABASE_URL" neon_backup.dump
```

4. Apply migrations on target:

```bash
npx prisma migrate deploy
```

5. Validate critical table counts:

```bash
psql "$OLD_DATABASE_URL" -c "select 'users', count(*) from users union all select 'sites', count(*) from sites union all select 'sessions', count(*) from sessions union all select 'subscriptions', count(*) from subscriptions union all select 'usage_logs', count(*) from usage_logs;"
psql "$NEW_DATABASE_URL" -c "select 'users', count(*) from users union all select 'sites', count(*) from sites union all select 'sessions', count(*) from sessions union all select 'subscriptions', count(*) from subscriptions union all select 'usage_logs', count(*) from usage_logs;"
```

## 6. Post-Deploy Smoke Checks

1. `GET /api/health` returns `healthy` or `degraded`.
2. Register/login works.
3. Existing users/sites are present.
4. OAuth add site flow works.
5. Workflow actions and logs/history work.
6. Passkey/TOTP works on final domain.

## 7. Rollback

If issues appear after cutover:

1. Repoint DNS to previous stack.
2. Set old stack back to write-enabled.
3. Keep Hostim data for forensic analysis.

## 8. Scale-Up Decision Triggers

Switch from Hostim pilot stack to a mature fallback (for example, Scalingo) if one or more occur:

- Repeated unplanned downtime in a month
- Missing operational controls you need (RBAC, observability, backup policy)
- Support response misses your operational target
