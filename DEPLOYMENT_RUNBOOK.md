# Deployment Runbook (Provider-Neutral)

This runbook applies to any managed EU PaaS + managed PostgreSQL provider.

## Runtime Contract

- Build artifacts: `dist/` and `dist-server/`
- Start sequence: `npx prisma migrate deploy && npm start`
- Health endpoint: `GET /api/health`
- Required DB env: `DATABASE_URL`

## Required Environment Variables

- `NODE_ENV=production`
- `STORAGE_TYPE=database`
- `DATABASE_URL`
- `TOKEN_MASTER_KEY`
- `BETTER_AUTH_SECRET`
- `APP_URL`
- `FRONTEND_URL`
- `WEBAUTHN_RP_ID`
- `ALLOWED_ORIGINS`

## Cutover Checklist

1. Confirm DB backups exist and restore was tested.
2. Freeze writes on old stack.
3. Import DB into target.
4. Deploy application.
5. Run smoke tests:
- `/api/health`
- login and session persistence
- site CRUD
- workflow execution
- passkey/TOTP auth
6. Switch DNS.
7. Monitor error rate and restarts for 48-72h.

## Rollback Checklist

1. Repoint DNS to old stack.
2. Re-enable old write path.
3. Record incident details and root cause.
4. Schedule reattempt with remediation items.
