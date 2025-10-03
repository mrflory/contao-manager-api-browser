# Railway Deployment Guide

This guide covers deploying the Contao Manager API Browser to Railway.app with PostgreSQL database support.

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **GitHub Repository**: Fork or clone this repository
3. **Database**: Railway provides PostgreSQL as a managed service

## Phase 4.1: Railway Platform Setup

### Step 1: Create New Railway Project

1. Log in to [Railway Dashboard](https://railway.app/dashboard)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Authorize Railway to access your GitHub account
5. Select your `contao-manager-api-browser` repository
6. Railway will automatically detect the Node.js project

### Step 2: PostgreSQL Database Setup

You have two options for the database:

#### Option A: Neon.tech PostgreSQL (Recommended) ✅

**Why Neon**: Serverless architecture, auto-scaling, database branching, better free tier (0.5GB + 191.9 compute hours), time-travel queries, auto-suspend when inactive

1. **Create Neon Account**: Visit [neon.tech](https://neon.tech) and sign up (free)
2. **Create Database Project**:
   - Click "Create Project"
   - Name: "contao-manager-production"
   - Region: Choose closest to your users (us-east-1 recommended)
3. **Copy Connection String**:
   - Copy the `DATABASE_URL` from Neon dashboard
   - Format: `postgresql://username:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require`
   - Save this for Step 3

**Cost**: Free tier covers most small deployments. Scales automatically with usage.

#### Option B: Railway PostgreSQL

**Why Railway**: Single platform simplicity, unified billing and monitoring

1. In your Railway project, click **"New Service"**
2. Select **"Database"** → **"PostgreSQL"**
3. Railway provisions PostgreSQL instance automatically
4. Copy the **DATABASE_URL** from Variables tab

**Cost**: ~$5-10/month for small deployments

**💡 Recommendation**: Use **Neon.tech** for better features, cost efficiency, and development workflow (database branching for staging/testing environments)

### Step 3: Configure Environment Variables

In your Railway application service (not the database):

1. Click on your application service
2. Go to **"Variables"** tab
3. Click **"New Variable"** and add the following:

#### Required Variables

```bash
# Node Environment
NODE_ENV=production
PORT=3000

# Database Configuration (REQUIRED for Phase 1+)
# If using Neon.tech: Paste your Neon connection string directly
DATABASE_URL=postgresql://username:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
# If using Railway PostgreSQL: Use the Railway reference
# DATABASE_URL=${{Postgres.DATABASE_URL}}

# Storage Configuration
STORAGE_TYPE=database

# Token Encryption (CRITICAL - Generate new keys!)
TOKEN_MASTER_KEY=<generate_64_character_hex_key>

# JWT Authentication Secrets (CRITICAL - Generate new keys!)
JWT_SECRET=<generate_128_character_hex_key>
JWT_REFRESH_SECRET=<generate_128_character_hex_key>

# Application URL (Update with your Railway domain)
APP_URL=https://your-app.up.railway.app

# CORS Configuration
ALLOWED_ORIGINS=https://your-app.up.railway.app
```

#### Generate Secrets

Run these commands locally to generate secure keys:

```bash
# TOKEN_MASTER_KEY (64 hex characters = 32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# JWT_SECRET (128 hex characters = 64 bytes)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# JWT_REFRESH_SECRET (128 hex characters = 64 bytes)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

#### Optional Variables (Email Configuration)

Only add these if you want email verification and password reset functionality:

```bash
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=noreply@your-domain.com
```

### Step 4: Configure Build Settings

Railway should automatically detect the build configuration from `railway.json`, but verify:

1. **Build Command**: `npm install && npm run build:all`
2. **Start Command**: `npm start`
3. **Install Command**: `npm install`

If needed, override in the **"Settings"** tab:

- **Build Command**: `npm install && npm run build:all`
- **Start Command**: `npm start`

### Step 5: Database Migration

Railway automatically runs Prisma migrations before starting the application via the `startCommand` in `railway.json`:

```
"startCommand": "npx prisma migrate deploy && npm start"
```

This ensures the database schema is up-to-date before the application starts.

### Step 6: Deploy

1. Click **"Deploy"** or push changes to your GitHub repository
2. Railway will automatically:
   - Install dependencies (`npm install`)
   - Run Prisma migrations (`npx prisma migrate deploy`)
   - Build the application (`npm run build:all`)
   - Start the server (`npm start`)

Monitor deployment logs in the **"Deployments"** tab.

## Phase 4.2: Application Deployment Testing

### Verify Deployment

1. **Health Check**: Visit `https://your-app.up.railway.app/api/health`
   - Should return: `{ "status": "healthy", ... }`

2. **Database Connection**: Check health endpoint for database connectivity
   ```json
   {
     "status": "healthy",
     "timestamp": "2025-10-03T...",
     "uptime": 123.45,
     "environment": "production",
     "storage": "database"
   }
   ```

3. **Frontend**: Visit `https://your-app.up.railway.app/`
   - Should load React application
   - Register/login functionality should work

### Testing Checklist

- [ ] Health check endpoint responds
- [ ] Database connection successful
- [ ] User registration works
- [ ] User login/logout works
- [ ] Site creation with OAuth flow
- [ ] Site management (add/edit/delete)
- [ ] Subscription limits enforced (Free tier: 2 sites)
- [ ] Premium features restricted (History, Snapshots, Logs tabs)

### Common Issues

#### Database Connection Errors

**Error**: `Can't reach database server`

**Solution**:
1. Verify `DATABASE_URL` is correctly set
2. Check PostgreSQL service is running
3. Ensure Railway internal networking is enabled

#### Build Failures

**Error**: `Build failed: TypeScript compilation errors`

**Solution**:
1. Check deployment logs for specific errors
2. Verify all dependencies are in `package.json`
3. Test build locally: `npm run build:all`

#### Migration Errors

**Error**: `Prisma migrate deploy failed`

**Solution**:
1. Check database permissions
2. Verify Prisma schema is correct
3. Run migrations locally first: `npx prisma migrate deploy`

## Phase 4.3: Production Validation

### Performance Testing

```bash
# Load testing with Apache Bench (install locally)
ab -n 1000 -c 10 https://your-app.up.railway.app/api/health

# Monitor response times
curl -w "\nTime: %{time_total}s\n" https://your-app.up.railway.app/api/health
```

### Security Validation

- [ ] HTTPS enabled (automatic with Railway)
- [ ] CORS configured correctly
- [ ] Rate limiting active
- [ ] JWT tokens secure
- [ ] Database credentials encrypted

### Monitoring Setup

Railway provides built-in monitoring:

1. **Metrics**: View CPU, Memory, Network usage in Railway dashboard
2. **Logs**: Real-time logs in **"Deployments"** tab
3. **Alerts**: Set up notifications in Railway settings

### Custom Domain (Optional)

1. Go to **"Settings"** tab in your Railway service
2. Click **"Add Custom Domain"**
3. Add your domain (e.g., `contao-manager.yourdomain.com`)
4. Update DNS records as instructed by Railway
5. Update environment variables:
   ```bash
   APP_URL=https://contao-manager.yourdomain.com
   ALLOWED_ORIGINS=https://contao-manager.yourdomain.com
   ```

## Backup and Disaster Recovery

### Database Backups

Railway PostgreSQL includes automatic backups:

1. Go to PostgreSQL service
2. Click **"Backups"** tab
3. Backups are taken automatically every 24 hours
4. Restore from backup if needed

### Manual Backup

```bash
# Export database (run locally with Railway DATABASE_URL)
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Import database
psql $DATABASE_URL < backup_20251003.sql
```

### Application Rollback

Railway keeps deployment history:

1. Go to **"Deployments"** tab
2. Find previous successful deployment
3. Click **"Redeploy"** to rollback

## Cost Estimation

Railway pricing (as of 2025):

- **Hobby Plan**: $5/month (includes $5 usage credit)
- **Pro Plan**: $20/month (includes $20 usage credit)

**Estimated Monthly Cost**:
- PostgreSQL: ~$5-10/month (1GB database, light usage)
- Application: ~$5-10/month (512MB RAM, moderate traffic)
- **Total**: ~$10-20/month for small deployments

## Scaling Considerations

### Horizontal Scaling

Railway supports multiple replicas:

1. Go to **"Settings"** tab
2. Increase **"Replicas"** count
3. Railway handles load balancing automatically

### Vertical Scaling

Upgrade resources:

1. Go to **"Settings"** tab
2. Increase **"Memory"** allocation
3. Increase **"CPU"** allocation

### Database Scaling

For larger deployments:

1. Upgrade PostgreSQL plan in Railway
2. Consider external database (Neon.tech, Supabase)
3. Implement connection pooling (already configured via Prisma)

## Next Steps

After successful Railway deployment:

1. **Phase 5**: Implement Stripe billing integration
2. **Phase 6**: Separate subscription service architecture
3. **Phase 7**: Production hardening and optimization

## Support

- **Railway Documentation**: [docs.railway.app](https://docs.railway.app)
- **Railway Discord**: [discord.gg/railway](https://discord.gg/railway)
- **Project Issues**: [GitHub Issues](https://github.com/mrflory/contao-manager-api-browser/issues)

---

**Deployment Status**: Ready for Phase 4 deployment testing ✅

**Configuration Files**:
- `railway.json` - Railway build/deploy configuration
- `Procfile` - Process definitions (web, release)
- `.railwayignore` - Files excluded from deployment
- `RAILWAY_DEPLOYMENT.md` - This deployment guide

**Health Check**: `GET /api/health` - Railway monitors this endpoint
