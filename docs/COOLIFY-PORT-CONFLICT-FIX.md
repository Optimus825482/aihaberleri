# Coolify Port Conflict Fix

## ❌ Problem

Deployment failed with error:

```
Error response from daemon: driver failed programming external connectivity on endpoint app-ts440coscgg48g8osgkcs8o8-143952342114:
Bind for 0.0.0.0:3000 failed: port is already allocated
```

## ✅ Good News

**The build was successful!** ✅

- Docker image built correctly
- All 30 pages compiled
- No build errors
- Redis skip working as expected

The issue is only with starting the container - an old container is still using port 3000.

## 🔧 Solution Options

### Option 1: Stop Old Containers via Coolify UI (Recommended)

1. Go to Coolify Dashboard
2. Navigate to your application
3. Click on "Containers" or "Resources" tab
4. Find any running containers with name containing `app-ts440coscgg48g8osgkcs8o8`
5. Click "Stop" or "Remove" on old containers
6. Click "Deploy" again

### Option 2: Force Cleanup via Coolify Server SSH

If you have SSH access to the Coolify server:

```bash
# SSH into Coolify server
ssh user@your-coolify-server

# Find containers using port 3000
docker ps -a | grep 3000

# Stop all containers for this project
docker stop $(docker ps -a -q --filter name=ts440coscgg48g8osgkcs8o8)

# Remove stopped containers
docker rm $(docker ps -a -q --filter name=ts440coscgg48g8osgkcs8o8)

# Or use docker-compose to clean up
cd /artifacts/qkscw4kkgcsw8wsckgcc0k0o
docker compose down

# Then redeploy from Coolify UI
```

### Option 3: Change Port Mapping (Alternative)

If you want to use a different port, modify `docker-compose.coolify.yaml`:

```yaml
services:
  app:
    ports:
      - "3001:3000" # Change external port to 3001
```

But this requires updating your reverse proxy configuration too.

## 🚀 Recommended Steps

### Step 1: Clean Up Old Containers

**Via Coolify UI:**

1. Go to your application in Coolify
2. Look for "Force Cleanup" or "Remove Old Containers" option
3. Click it to remove old containers

**Or via SSH:**

```bash
# Connect to Coolify server
ssh user@your-server

# Execute cleanup inside the Coolify container
docker exec qkscw4kkgcsw8wsckgcc0k0o bash -c "
  cd /artifacts/qkscw4kkgcsw8wsckgcc0k0o &&
  docker compose down --remove-orphans
"
```

### Step 2: Redeploy

1. Go to Coolify Dashboard
2. Navigate to your application
3. Click "Deploy" button
4. Monitor the logs

### Step 3: Verify Deployment

After successful deployment:

```bash
# Check if container is running
docker ps | grep app-ts440coscgg48g8osgkcs8o8

# Check application logs
docker logs -f app-ts440coscgg48g8osgkcs8o8-[container-id]

# Test health endpoint
curl http://localhost:3000/api/health
# or
curl https://aihaberleri.org/api/health
```

## 📊 Expected Successful Deployment Log

After cleanup and redeployment, you should see:

```
Container app-ts440coscgg48g8osgkcs8o8-[new-id]  Creating
Container app-ts440coscgg48g8osgkcs8o8-[new-id]  Created
Container app-ts440coscgg48g8osgkcs8o8-[new-id]  Starting
Container app-ts440coscgg48g8osgkcs8o8-[new-id]  Started
Container app-ts440coscgg48g8osgkcs8o8-[new-id]  Healthy

✅ Deployment successful
```

## 🔍 Why This Happened

This typically occurs when:

1. Previous deployment didn't complete cleanup
2. Container crashed but wasn't removed
3. Manual stop didn't remove the container
4. Port binding persisted from old container

## 🛡️ Prevention

To prevent this in future deployments:

1. **Always use Coolify's built-in deployment** - it handles cleanup
2. **Don't manually stop containers** - use Coolify UI
3. **Enable "Force Cleanup"** option in Coolify if available
4. **Use health checks** - Coolify will auto-remove unhealthy containers

## 📝 Coolify Configuration Check

Ensure your Coolify application settings have:

```yaml
# Health check configuration
healthcheck:
  test:
    [
      "CMD",
      "node",
      "-e",
      "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})",
    ]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s

# Cleanup policy
deploy:
  restart_policy:
    condition: on-failure
    max_attempts: 3
  update_config:
    order: start-first # Start new container before stopping old one
```

## ✅ Success Criteria

Deployment is successful when you see:

1. ✅ Old containers stopped and removed
2. ✅ New container created
3. ✅ New container started
4. ✅ Health check passing
5. ✅ Application accessible via URL
6. ✅ No port conflict errors

## 🆘 If Problem Persists

If the port conflict persists after cleanup:

1. **Check for other services using port 3000:**

   ```bash
   # On Coolify server
   netstat -tulpn | grep 3000
   # or
   lsof -i :3000
   ```

2. **Kill the process using the port:**

   ```bash
   # Find process ID
   lsof -ti:3000

   # Kill the process
   kill -9 $(lsof -ti:3000)
   ```

3. **Restart Docker daemon:**

   ```bash
   systemctl restart docker
   ```

4. **Contact Coolify support** with the deployment logs

## 📞 Quick Fix Command

If you have SSH access, run this one-liner:

```bash
ssh user@coolify-server "docker exec qkscw4kkgcsw8wsckgcc0k0o bash -c 'cd /artifacts/qkscw4kkgcsw8wsckgcc0k0o && docker compose down --remove-orphans && docker compose up -d'"
```

---

**Status:** ✅ Build Successful, ⚠️ Deployment Blocked by Port Conflict  
**Solution:** Clean up old containers and redeploy  
**Estimated Fix Time:** 2-5 minutes  
**Last Updated:** 2026-01-25
