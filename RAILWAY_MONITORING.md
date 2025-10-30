# Railway Monitoring & SIGTERM Guide

This guide helps you understand Railway's behavior and distinguish between normal restarts and actual problems.

## ⚠️ IMPORTANT: Railway's "Crashed" Label is Misleading!

Railway's UI shows the old container as **"Crashed"** after every deployment, even though this is **completely normal**. Here's what's actually happening:

```
You: git push origin main
Railway: Detects new code → Builds new container
Railway: Sends SIGTERM to old container (graceful shutdown)
Railway UI: Labels old container as "Crashed" ❌ (This is misleading!)
Reality: Old container shut down gracefully ✅ (This is normal!)
```

**Bottom line**: If you see "Crashed" after pushing code, and the new deployment is running fine, **ignore it - this is normal Railway behavior!**

## Understanding SIGTERM on Railway

### What is SIGTERM?

`SIGTERM` (Signal Terminate) is a **graceful shutdown signal** sent by Railway to your application. It's **NOT an error** - it's how Railway politely asks your app to shut down.

### Normal SIGTERM Scenarios (Not Errors) ✅

1. **New Deployment**
   - You pushed code to GitHub
   - Railway detects changes and redeploys
   - Sends SIGTERM to old container, starts new one
   - **Expected behavior**: App restarts cleanly

2. **Railway Platform Maintenance**
   - Railway repositions containers across infrastructure
   - Auto-scaling adjustments
   - Load balancing optimizations
   - **Expected behavior**: Occasional restarts (few times per day)

3. **Environment Variable Changes**
   - You updated environment variables in Railway dashboard
   - Railway restarts to apply new configuration
   - **Expected behavior**: Immediate restart after changes

4. **Manual Restart**
   - You clicked "Restart" in Railway dashboard
   - **Expected behavior**: Controlled restart

### Problematic SIGTERM Scenarios (Actual Errors) ❌

1. **Rapid Restart Loop**
   - Container restarts every few seconds/minutes
   - Indicates startup failure or crash
   - **Check**: Logs show errors before SIGTERM

2. **Health Check Failures**
   - `/api/health` endpoint timing out or returning 503
   - Railway assumes app is unhealthy and restarts
   - **Check**: Health endpoint not responding within 60s

3. **Memory Exhaustion**
   - App uses too much memory
   - Railway kills container with SIGTERM
   - **Check**: Memory usage before restart

4. **Unhandled Exceptions**
   - Application crashes due to uncaught errors
   - Node.js exits, Railway restarts
   - **Check**: Error stack traces in logs

## How to Identify the Cause

### Step 1: Check Logs Before SIGTERM

Look at the logs **immediately before** the SIGTERM message:

```bash
railway logs
```

#### Normal Restart Pattern:
```
✓ Server running on http://localhost:3000
✓ Health check: /api/health
[... application running normally ...]
========================================
SIGTERM received - Starting graceful shutdown
Uptime: 3600s
Memory usage: 150MB
========================================
✓ HTTP server closed
✓ Database connection closed cleanly
✓ Graceful shutdown complete
```

#### Problem Pattern:
```
✓ Server running on http://localhost:3000
[ERROR] Unhandled error: ...
[ERROR] Database connection timeout
npm error signal SIGTERM  ← Forced shutdown due to error
```

### Step 2: Check Deployment Timeline

Look at Railway's deployment timeline:

**Normal Deployment Pattern:**
```
12:00:00 - You pushed to GitHub
12:00:05 - Railway starts building new container
12:01:30 - New container ready, Railway sends SIGTERM to old container
12:01:31 - Old container shows "Crashed" ← IGNORE THIS! It's normal!
12:01:32 - New container running successfully
```

**Problem Pattern:**
```
12:00:00 - Container starts
12:00:30 - Container shows "Crashed" ← No new deployment!
12:00:35 - Container restarts automatically
12:01:00 - Container shows "Crashed" again ← Restart loop!
```

### Step 3: Check Uptime

The improved logging now shows uptime on shutdown:

- **High uptime (hours/days)**: Likely normal Railway maintenance
- **Low uptime (seconds/minutes)**: Likely startup or health check failure

### Step 4: Check Memory Usage

The shutdown logs now show memory usage:

- **Normal**: 100-300MB for this application
- **High**: >500MB indicates potential memory leak
- **OOM**: Railway may kill container if exceeding limits

### Step 5: Check Health Endpoint

Manually test the health endpoint:

```bash
curl https://your-app.railway.app/api/health
```

**Expected responses:**

**Healthy:**
```json
{
  "status": "healthy",
  "database": "connected",
  "uptime": 123.45,
  "environment": "production",
  "storage": "database"
}
```

**Degraded (but still 200 OK):**
```json
{
  "status": "degraded",
  "database": "disconnected",
  "uptime": 123.45
}
```

**Unhealthy (503 error):**
```json
{
  "status": "unhealthy",
  "error": "Application error"
}
```

## Common Restart Patterns

### Pattern 1: Once Daily Restart
```
[Day 1] 02:15 AM - SIGTERM (Railway maintenance)
[Day 2] 02:10 AM - SIGTERM (Railway maintenance)
[Day 3] 02:20 AM - SIGTERM (Railway maintenance)
```
**Diagnosis**: ✅ Normal - Railway platform maintenance
**Action**: None required

### Pattern 2: After Every Push
```
[12:00 PM] git push origin main
[12:01 PM] SIGTERM (New deployment)
[12:05 PM] git push origin main
[12:06 PM] SIGTERM (New deployment)
```
**Diagnosis**: ✅ Normal - CI/CD working correctly
**Action**: None required

### Pattern 3: Frequent Random Restarts
```
[12:00 PM] SIGTERM
[12:05 PM] SIGTERM
[12:08 PM] SIGTERM
[12:10 PM] SIGTERM
```
**Diagnosis**: ❌ Problem - Health check failing or app crashing
**Action**: Check health endpoint and error logs

### Pattern 4: Neon.tech Database Issues
```
[Health check] Database health check timeout
[Warning] Consecutive failures: 3
[Status] Degraded mode activated
[Later] SIGTERM (Railway restart after prolonged degradation)
```
**Diagnosis**: ⚠️ External - Neon.tech temporary outage
**Action**: Monitor Neon.tech status, app will recover automatically

## Monitoring Your Application

### 1. Railway Dashboard Metrics

Check these in Railway:
- **CPU Usage**: Should stay under 50% normally
- **Memory Usage**: Should stay under 300MB
- **Restart Count**: Normal = 1-3 per day, Problem = 10+ per day
- **Deployment Status**: Green = healthy, Red = failing

### 2. Application Health Checks

**Automated Monitoring** (Railway runs this):
```bash
# Every 60 seconds
curl https://your-app.railway.app/api/health
```

**Manual Testing**:
```bash
# Health check
curl https://your-app.railway.app/api/health

# Database status
curl https://your-app.railway.app/api/database/status

# Response time test
curl -w "\nTime: %{time_total}s\n" https://your-app.railway.app/api/health
```

### 3. Database Connection Monitoring

Check Neon.tech status:
- **Neon Dashboard**: [neon.tech/dashboard](https://neon.tech)
- **Connection Pool**: Monitor active connections
- **Query Performance**: Check slow queries

### 4. Log Analysis

Look for these patterns in logs:

**Good Signs** ✅:
```
✓ Database connection established successfully
✓ Server running on http://localhost:3000
✓ Graceful shutdown complete
```

**Warning Signs** ⚠️:
```
⚠️ Continuing with degraded mode (database unavailable)
[Health check] Database health check timeout
Consecutive failures: 3
```

**Error Signs** ❌:
```
✗ Database connection failed
Failed to start server
Unhandled error
npm error signal SIGTERM (with errors before it)
```

## Recommended Actions by Scenario

### Scenario 1: App Working Fine, Occasional SIGTERM

**What you see:**
- App accessible and functional
- SIGTERM appears 1-3 times per day
- Uptime shows hours before restart
- Clean graceful shutdown logs

**Action**: ✅ **Nothing - This is normal!**

### Scenario 2: Frequent Restarts (10+ per day)

**What you see:**
- Multiple SIGTERMs in short period
- Low uptime (minutes) before each restart
- Health check failures in logs

**Actions**:
1. Check health endpoint manually
2. Review error logs before SIGTERMs
3. Check Neon.tech status
4. Increase Railway resources if needed
5. Check for memory leaks in application code

### Scenario 3: Database Degraded Mode

**What you see:**
- "Database unavailable" errors
- Degraded mode activated
- Health returns `"status": "degraded"`

**Actions**:
1. Check [Neon.tech Status](https://neonstatus.com)
2. Verify `DATABASE_URL` is correct
3. Test database connection manually:
   ```bash
   psql $DATABASE_URL -c "SELECT 1"
   ```
4. Wait for Neon.tech recovery (usually < 5 min)
5. App will auto-recover when DB comes back

### Scenario 4: Memory Issues

**What you see:**
- Increasing memory usage over time
- SIGTERM with high memory usage (>500MB)
- Railway kills container

**Actions**:
1. Check for memory leaks in code
2. Review Prisma connection pooling
3. Increase Railway memory limit temporarily
4. Profile application memory usage

## Setting Up Alerts

### Railway Webhooks (Recommended)

1. Go to Railway project settings
2. Add webhook for deployment events
3. Send to Slack/Discord/Email for notifications

### External Monitoring (Optional)

Consider these services for production:
- **UptimeRobot**: Free HTTP monitoring
- **Better Uptime**: Comprehensive monitoring
- **Sentry**: Error tracking and alerting
- **LogDNA**: Log aggregation and search

## Current Configuration Summary

Your app is configured with:

✅ **Health Check**: 60-second timeout, returns 200 even when degraded
✅ **Graceful Shutdown**: Clean DB disconnect on SIGTERM
✅ **Database Monitoring**: 3-failure threshold before marking unhealthy
✅ **Restart Policy**: 5 retries on failure
✅ **Degraded Mode UI**: Full-page error when DB unavailable

## Expected Restart Frequency

**Normal Production App**:
- **0-3 restarts/day**: Excellent (Railway maintenance only)
- **3-5 restarts/day**: Normal (some DB hiccups)
- **5-10 restarts/day**: Concerning (investigate)
- **10+ restarts/day**: Problem (requires immediate attention)

## Quick Diagnostic Checklist

When you see SIGTERM, check these in order:

1. [ ] **Was it after a deployment?** → Normal ✅
2. [ ] **Is the app still accessible?** → If yes, probably normal ✅
3. [ ] **What was the uptime?** → If hours, probably normal ✅
4. [ ] **Are there errors before SIGTERM?** → If yes, investigate ❌
5. [ ] **Is health endpoint working?** → Test manually
6. [ ] **Is Neon.tech having issues?** → Check status page
7. [ ] **How many restarts today?** → If <5, probably normal ✅

## Getting Help

If you're experiencing frequent problematic restarts:

1. **Collect logs**: `railway logs > railway-logs.txt`
2. **Check health**: `curl https://your-app.railway.app/api/health`
3. **Monitor for pattern**: Note timestamps of restarts
4. **Review this guide**: Identify which scenario matches
5. **Check external services**: Neon.tech, Railway status
6. **Ask for help**: Include logs and pattern analysis

---

## TL;DR - Quick Answer

### "I pushed code and Railway shows 'Crashed' - is this bad?"

**NO!** This is completely normal. Railway labels the old container as "Crashed" every time you deploy new code. As long as:
- ✅ New deployment is running
- ✅ App is accessible
- ✅ No restart loop happening

**→ You can ignore the "Crashed" label!**

### "How do I know if there's a real problem?"

Look for these warning signs:
- ❌ Multiple crashes **without deployments**
- ❌ Restart loop (crashes every few minutes)
- ❌ App not accessible after restart
- ❌ Error logs before SIGTERM
- ❌ Health endpoint returning 503

### "What's the takeaway?"

Railway's UI is misleading - **"Crashed" during deployment = normal shutdown**. Only worry if you see crashes when you didn't deploy anything.

---

**Remember**: SIGTERM itself is not an error - it's Railway's way of gracefully shutting down your app. The **context** before the SIGTERM determines if it's normal or problematic!
