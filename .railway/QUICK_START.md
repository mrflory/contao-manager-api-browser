# Railway Deployment Quick Start

5-minute guide to deploy Contao Manager API Browser to Railway.

## Prerequisites

- Railway account (sign up at [railway.app](https://railway.app))
- GitHub account
- This repository forked/cloned

## Quick Deployment Steps

### 1. Create Railway Project (2 minutes)

1. **Login to Railway**: [railway.app/dashboard](https://railway.app/dashboard)
2. **New Project** → **Deploy from GitHub repo**
3. **Select repository**: `contao-manager-api-browser`
4. Railway auto-detects Node.js project ✅

### 2. Setup PostgreSQL Database (2 minutes)

**Option A: Neon.tech (Recommended)** ✅
1. Sign up at [neon.tech](https://neon.tech) (free)
2. Create new project: "contao-manager-production"
3. Copy `DATABASE_URL` from dashboard
4. **Why Neon**: Better free tier, auto-scaling, database branching

**Option B: Railway PostgreSQL**
1. **New Service** → **Database** → **PostgreSQL**
2. Copy `DATABASE_URL` from Variables tab
3. **Why Railway**: Single platform, simpler setup

### 3. Configure Environment Variables (2 minutes)

In your **application service** (not database), add these variables:

```bash
# Generate secrets first (run locally):
node -e "console.log('TOKEN_MASTER_KEY:', require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('JWT_SECRET:', require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET:', require('crypto').randomBytes(64).toString('hex'))"
```

**Add to Railway Variables**:

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | Environment |
| `PORT` | `3000` | Server port |
| `DATABASE_URL` | Your Neon connection string OR `${{Postgres.DATABASE_URL}}` | Database connection |
| `STORAGE_TYPE` | `database` | Use database storage |
| `TOKEN_MASTER_KEY` | `<your_64_char_hex>` | Generated above |
| `JWT_SECRET` | `<your_128_char_hex>` | Generated above |
| `JWT_REFRESH_SECRET` | `<your_128_char_hex>` | Generated above |
| `APP_URL` | `https://your-app.up.railway.app` | Your Railway URL |
| `ALLOWED_ORIGINS` | `https://your-app.up.railway.app` | Same as APP_URL |

### 4. Deploy! (5-10 minutes)

Railway will automatically:
1. Install dependencies
2. Run database migrations
3. Build application
4. Start server

Monitor in **Deployments** tab.

## Verify Deployment

### Health Check
```bash
curl https://your-app.up.railway.app/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-03T...",
  "uptime": 123.45,
  "environment": "production",
  "storage": "database"
}
```

### Test Frontend
1. Visit `https://your-app.up.railway.app`
2. Register new user account
3. Login successfully
4. Add a Contao Manager site

## Common Issues

### Build Failed?
- Check **Deployments** logs for errors
- Verify all secrets are set correctly
- Ensure PostgreSQL service is running

### Database Connection Error?
- Verify `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
- Check PostgreSQL service is in same project
- Restart application service

### Authentication Not Working?
- Verify `JWT_SECRET` and `JWT_REFRESH_SECRET` are set
- Check `APP_URL` matches your Railway domain
- Update `ALLOWED_ORIGINS` to match `APP_URL`

## Update Deployed Application

### Method 1: Git Push (Recommended)
```bash
git add .
git commit -m "Update feature"
git push origin main
```
Railway auto-deploys on push! 🚀

### Method 2: Manual Redeploy
1. Go to **Deployments** tab in Railway
2. Click **"Redeploy"** on any commit

## Railway CLI (Optional)

Install Railway CLI for advanced features:

```bash
# Install
npm i -g @railway/cli

# Login
railway login

# Link project
railway link

# View logs
railway logs

# Open in browser
railway open

# Add environment variable
railway variables set KEY=VALUE
```

## Cost Monitoring

Check Railway usage:
1. Go to project **Settings**
2. View **Usage** tab
3. Monitor costs (estimated $10-20/month for small deployment)

## Next Steps

✅ Deployment successful? Great!

Now test:
1. User registration/login
2. Site creation with OAuth
3. Subscription limits (Free tier: 2 sites)
4. Premium feature restrictions

Then proceed to **Phase 5: Billing Integration** in [Golive-Tasks.md](../../Golive-Tasks.md)

## Resources

- **Full Deployment Guide**: [RAILWAY_DEPLOYMENT.md](../RAILWAY_DEPLOYMENT.md)
- **Deployment Checklist**: [deployment-checklist.md](./deployment-checklist.md)
- **Railway Docs**: [docs.railway.app](https://docs.railway.app)
- **Railway Discord**: [discord.gg/railway](https://discord.gg/railway)

---

**Time to Deploy**: ~10 minutes
**Difficulty**: Easy ⭐
**Status**: Production Ready ✅
