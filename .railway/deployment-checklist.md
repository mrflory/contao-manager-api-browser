# Railway Deployment Checklist

Use this checklist to ensure a smooth deployment to Railway.app.

## Pre-Deployment Checklist

### 1. Code Preparation
- [x] All TypeScript compilation errors resolved
- [x] Build command tested locally (`npm run build:all`)
- [x] Health check endpoint added (`/api/health`)
- [x] Database migrations ready (`prisma/migrations/`)
- [ ] All environment variables documented
- [ ] Secrets generated and stored securely

### 2. Configuration Files
- [x] `railway.json` created with build/deploy config
- [x] `Procfile` created for release commands
- [x] `.railwayignore` created to exclude dev files
- [x] `.env.example` updated with all variables
- [ ] Custom domain DNS configured (optional)

### 3. Security
- [ ] New `TOKEN_MASTER_KEY` generated (64 hex chars)
- [ ] New `JWT_SECRET` generated (128 hex chars)
- [ ] New `JWT_REFRESH_SECRET` generated (128 hex chars)
- [ ] Production secrets never committed to git
- [ ] CORS origins configured for production domain
- [ ] Rate limiting configured appropriately

### 4. Database
- [ ] PostgreSQL service created in Railway
- [ ] `DATABASE_URL` environment variable set
- [ ] Prisma schema reviewed and finalized
- [ ] Migration files tested locally
- [ ] Backup strategy understood

### 5. Environment Variables (Railway)

#### Critical Variables
```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=${{Postgres.DATABASE_URL}}
STORAGE_TYPE=database
TOKEN_MASTER_KEY=<your_64_char_hex>
JWT_SECRET=<your_128_char_hex>
JWT_REFRESH_SECRET=<your_128_char_hex>
APP_URL=https://your-app.up.railway.app
ALLOWED_ORIGINS=https://your-app.up.railway.app
```

#### Optional Variables
```bash
# Email (if using email verification)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=noreply@your-domain.com
```

### 6. Build Verification
- [x] Local build successful (`npm run build:all`)
- [x] Backend compiled to `dist-server/`
- [x] Frontend compiled to `dist/`
- [x] No TypeScript errors
- [ ] Static assets properly generated

### 7. Railway Setup
- [ ] Railway account created
- [ ] GitHub repository connected
- [ ] PostgreSQL service added
- [ ] Environment variables configured
- [ ] Build settings verified
- [ ] Deploy trigger configured (auto-deploy on push)

## Deployment Steps

### Step 1: Generate Secrets
```bash
# Run locally to generate secure keys
node -e "console.log('TOKEN_MASTER_KEY:', require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('JWT_SECRET:', require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET:', require('crypto').randomBytes(64).toString('hex'))"
```

Save these securely in a password manager!

### Step 2: Configure Railway
1. Create new Railway project
2. Add PostgreSQL service
3. Add all environment variables
4. Verify build command: `npm install && npm run build:all`
5. Verify start command: `npm start`

### Step 3: Deploy
1. Push to GitHub repository (or manual deploy in Railway)
2. Monitor deployment logs
3. Wait for build and migrations to complete
4. Check health endpoint

### Step 4: Verify Deployment
```bash
# Replace with your Railway URL
export RAILWAY_URL="https://your-app.up.railway.app"

# Health check
curl $RAILWAY_URL/api/health

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "...",
#   "uptime": 123.45,
#   "environment": "production",
#   "storage": "database"
# }
```

### Step 5: Test Authentication
1. Visit `$RAILWAY_URL/register`
2. Create test user account
3. Verify email (if configured)
4. Login successfully
5. Test site creation

### Step 6: Test Subscription System
1. Login with test user
2. Add first site (should work - free tier allows 2 sites)
3. Add second site (should work - at limit)
4. Try to add third site (should fail - limit reached)
5. Verify premium tabs are disabled (History, Snapshots, Logs)

## Post-Deployment Checklist

### Functionality Testing
- [ ] User registration works
- [ ] User login works
- [ ] JWT token refresh works
- [ ] Site creation with OAuth flow
- [ ] Site management (edit/delete)
- [ ] Subscription limits enforced
- [ ] Premium features restricted
- [ ] Health check responds correctly
- [ ] Database operations successful

### Performance Testing
- [ ] Health check response time < 500ms
- [ ] Site list loads in < 1s
- [ ] Database queries optimized
- [ ] No memory leaks detected
- [ ] CPU usage acceptable under load

### Security Testing
- [ ] HTTPS enforced (automatic with Railway)
- [ ] CORS headers correct
- [ ] Rate limiting active
- [ ] JWT tokens validated
- [ ] SQL injection prevented (Prisma ORM)
- [ ] XSS prevention active
- [ ] CSRF protection enabled

### Monitoring Setup
- [ ] Railway metrics reviewed
- [ ] Deployment logs accessible
- [ ] Error tracking configured
- [ ] Database monitoring enabled
- [ ] Alert notifications set up

## Troubleshooting Guide

### Build Failures
**Symptom**: Deployment fails during build phase

**Solutions**:
1. Check Railway logs for TypeScript errors
2. Verify all dependencies in `package.json`
3. Test build locally: `npm run build:all`
4. Check Node.js version compatibility

### Database Connection Errors
**Symptom**: "Can't reach database server"

**Solutions**:
1. Verify `DATABASE_URL` is set correctly
2. Check PostgreSQL service is running
3. Ensure Railway internal networking enabled
4. Test connection: `npx prisma db pull`

### Migration Errors
**Symptom**: "Prisma migrate deploy failed"

**Solutions**:
1. Check migration files in `prisma/migrations/`
2. Verify Prisma schema syntax
3. Check database permissions
4. Run migrations locally first

### Authentication Failures
**Symptom**: "Invalid JWT token" or "Authentication failed"

**Solutions**:
1. Verify `JWT_SECRET` and `JWT_REFRESH_SECRET` are set
2. Check token expiration settings
3. Clear browser cookies and retry
4. Verify CORS settings allow credentials

### Health Check Failures
**Symptom**: Railway shows service as unhealthy

**Solutions**:
1. Check `/api/health` endpoint manually
2. Verify database connection in health check
3. Review application startup logs
4. Check if server is listening on correct PORT

## Rollback Plan

If deployment fails:

### Option 1: Rollback via Railway
1. Go to **"Deployments"** tab
2. Find last successful deployment
3. Click **"Redeploy"**

### Option 2: Revert Git Commit
1. Revert problematic commit
2. Push to trigger new deployment

### Option 3: Manual Fix
1. Fix issue in code
2. Test locally
3. Deploy fix

## Success Criteria

Deployment is successful when:

- ✅ Health check returns `status: "healthy"`
- ✅ Database connection established
- ✅ User registration/login works
- ✅ Site creation with OAuth flow works
- ✅ Subscription limits enforced correctly
- ✅ Premium features restricted properly
- ✅ No errors in Railway logs
- ✅ Response times acceptable
- ✅ HTTPS working correctly

## Next Steps After Successful Deployment

1. **Update Golive-Tasks.md**: Mark Phase 4 as completed ✅
2. **Plan Phase 5**: Stripe billing integration
3. **Monitor Performance**: Watch Railway metrics for first 24 hours
4. **User Testing**: Create test accounts and validate all workflows
5. **Documentation**: Update README with production URL

---

**Last Updated**: 2025-10-03
**Phase**: 4 - Railway Deployment Testing
**Status**: Ready for deployment 🚀
