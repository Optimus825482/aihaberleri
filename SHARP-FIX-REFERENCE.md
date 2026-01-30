# Sharp Native Binary Fix - Quick Reference

## Problem
Worker ve app container'larında sharp modülü linux-x64 runtime için yüklenemiyor:
```
Error: Could not load the "sharp" module using the linux-x64 runtime
```

## Root Cause
- Sharp, platform-specific native binaries içerir (C++ addons)
- Windows'ta build edilen sharp, Linux container'ında çalışmaz
- npm install `--os` ve `--cpu` parametreleri npm v7+'da deprecated
- Doğru parametreler: `--platform=linux --arch=x64`

## Solution Applied

### 1. Dockerfile Changes
**Both Dockerfile and Dockerfile.worker updated:**

```dockerfile
# Stage 1 (deps): Install sharp with legacy-peer-deps
RUN npm install --legacy-peer-deps sharp@0.33.5

# Stage 3 (runner): Rebuild sharp for Linux
RUN rm -rf ./node_modules/sharp && \
    npm install --legacy-peer-deps --include=optional --platform=linux --arch=x64 sharp@0.33.5 && \
    chown -R <user>:nodejs ./node_modules/sharp
```

### 2. Runtime Dependencies
**Added to both containers:**
```dockerfile
libvips-dev   # Sharp image processing library (development files)
libvips42     # Sharp runtime library
```

### 3. Key Differences from Previous Attempts

| Old Approach | New Approach | Why |
|-------------|--------------|-----|
| `--os=linux --cpu=x64` | `--platform=linux --arch=x64` | Deprecated vs current npm syntax |
| Install once | Install → Copy → Rebuild | Ensures Linux-specific binaries |
| No `--include=optional` | With `--include=optional` | Includes all platform binaries |

## Deployment Steps

### Local Testing (Optional)
```powershell
# Build without cache
docker-compose build --no-cache worker

# Test worker
docker-compose up worker
docker-compose logs -f worker
```

### Production Deployment (Coolify)
```powershell
# Run the automated script
.\fix-sharp-deployment.ps1

# OR manually:
docker-compose -f docker-compose.coolify.yaml build --no-cache
docker-compose -f docker-compose.coolify.yaml up -d
```

### Verify Fix
```powershell
# Check if sharp loads correctly
docker-compose exec worker npx tsx -e "require('sharp'); console.log('Sharp OK')"

# Should output: "Sharp OK"
# No error about linux-x64 runtime
```

## Troubleshooting

### If Error Persists
1. **Check libvips installation:**
   ```bash
   docker-compose exec worker ldconfig -p | grep vips
   # Should show libvips.so.42
   ```

2. **Verify sharp version:**
   ```bash
   docker-compose exec worker npm list sharp
   # Should show sharp@0.33.5
   ```

3. **Check sharp binary:**
   ```bash
   docker-compose exec worker ls -la node_modules/sharp/build/Release/
   # Should contain sharp-linux-x64.node
   ```

4. **Nuclear option (full rebuild):**
   ```powershell
   docker-compose down -v
   docker system prune -af
   docker-compose build --no-cache
   docker-compose up -d
   ```

## Related Files
- `Dockerfile` - Main app container
- `Dockerfile.worker` - Worker container
- `docker-compose.coolify.yaml` - Production compose file
- `next.config.js` - Sharp file tracing config
- `.github/copilot-instructions.md` - Sharp documentation (line ~150)

## Prevention
- Always use `--platform=linux --arch=x64` for cross-platform builds
- Include `libvips-dev` + `libvips42` in production images
- Rebuild sharp in runner stage AFTER copying node_modules
- Test with: `docker-compose exec <service> node -e "require('sharp')"`

## NPM Command Evolution
```bash
# ❌ Deprecated (npm v7+)
npm install --os=linux --cpu=x64 sharp

# ✅ Current (npm v8+)
npm install --platform=linux --arch=x64 sharp

# ✅ With all options
npm install --legacy-peer-deps --include=optional --platform=linux --arch=x64 sharp@0.33.5
```

## Success Indicators
✅ Worker starts without sharp errors
✅ `docker-compose logs worker` shows no "Could not load sharp" errors
✅ News agent jobs complete successfully
✅ Image optimization works in Next.js

## Monitoring
```powershell
# Real-time worker logs
docker-compose -f docker-compose.coolify.yaml logs -f worker

# Check for sharp-related errors
docker-compose logs worker 2>&1 | Select-String "sharp"
```

---

**Last Updated:** 2026-01-30 18:15
**Status:** ✅ Fixed - Deployed to production
**Affected Services:** app, worker
