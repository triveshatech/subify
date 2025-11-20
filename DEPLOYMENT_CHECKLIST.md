# Deployment Checklist - Remotion Bundle Fix

## Changes Made

###  1. Enhanced Bundle Script (`scripts/bundle-remotion.mjs`)
- ✅ Added verification that entry file exists
- ✅ Added verification that bundle.js contains getStaticCompositions
- ✅ Added detailed logging of bundle creation
- ✅ Added file listing of bundle output
- ✅ Exits with error if bundle is invalid

### 2. Enhanced Static Server (`src/lib/server/remotion-renderer-new.ts`)
- ✅ Added logging for each file served
- ✅ Added bundle directory verification
- ✅ Added verification that bundle.js contains getStaticCompositions
- ✅ Fixed MIME type handling
- ✅ Added CORS headers
- ✅ Fixed path normalization for subdirectories

### 3. Startup Script (`scripts/startup.sh`)
- ✅ Verifies bundle exists before starting Next.js
- ✅ Can create bundle at runtime if missing (fallback)
- ✅ Lists bundle contents for debugging
- ✅ Fails fast if bundle is invalid

### 4. Updated Dockerfile
- ✅ Makes startup script executable
- ✅ Verifies bundle was created during build
- ✅ Uses startup script instead of direct npm start
- ✅ Fails build if bundle missing

## Expected Railway Build Logs

```
[bundle-remotion] Starting build...
[bundle-remotion] Entry: /app/remotion/Root.tsx
[bundle-remotion] Output: /app/.remotion-bundle
[bundle-remotion] ✅ Bundle returned: /app/.remotion-bundle
[bundle-remotion] ✓ bundle.js contains getStaticCompositions
[bundle-remotion] Bundle files: [ 'index.html', 'bundle.js', ... ]
```

## Expected Runtime Logs

```
[startup] Checking Remotion bundle...
[startup] ✓ Remotion bundle verified
[startup] Bundle contents:
-rw-r--r-- 1 root root ... index.html
-rw-r--r-- 1 root root ... bundle.js
[startup] Starting Next.js...

[remotion] Starting static server for bundle: /app/.remotion-bundle
[remotion] Bundle directory contents: [ 'index.html', 'bundle.js', ... ]
[remotion] ✓ bundle.js contains getStaticCompositions
[remotion] Static server started at: http://127.0.0.1:XXXXX
[remotion] Serving: / -> index.html
[remotion] Serving: /bundle.js -> bundle.js
[remotion] Composition selected: {id: "CaptionComposition", ...}
[remotion][render] 25.0% complete
```

## Deployment Steps

```bash
# 1. Commit all changes
git add .
git commit -m "Fix: Enhanced Remotion bundle verification and logging"
git push

# 2. Monitor Railway build logs for:
- [bundle-remotion] Starting build...
- [bundle-remotion] ✓ bundle.js contains getStaticCompositions
- [bundle-remotion] Bundle files: [...]

# 3. Monitor Railway runtime logs for:
- [startup] ✓ Remotion bundle verified
- [remotion] Static server started at: http://127.0.0.1:XXXXX
- [remotion] Serving: / -> index.html
- [remotion] Serving: /bundle.js -> bundle.js

# 4. Test export
- If logs show "Serving: /" and "Serving: /bundle.js" → bundle is being served ✅
- If logs show "window.remotion_projectName = app" → bundle.js not loading ❌
- If logs show "window.remotion_projectName = subify" → correct bundle! ✅
```

## Troubleshooting

### If Bundle Not Created During Build

Check Railway build logs for:
```
[bundle-remotion] ❌ Bundle failed:
```

Possible causes:
- webpack error
- Missing dependencies
- Out of memory

### If Bundle Not Found at Runtime

Check logs for:
```
[startup] ❌ ERROR: .remotion-bundle directory not found!
```

This means the build didn't create it. The startup script will try to create it at runtime as fallback.

### If bundle.js Not Loading

Check logs for:
```
[remotion] Serving: /bundle.js -> bundle.js
```

If missing, the static server isn't receiving the request.

Also check:
```
[remotion] ✓ bundle.js contains getStaticCompositions
```

If this shows a warning, the bundle is corrupted.

### If Still Shows "window.remotion_projectName = app"

This means Chromium is loading Next.js instead of the bundle.

Possible causes:
1. Static server not starting (check for "Static server started at")
2. Wrong URL being passed (check "Selecting composition from")
3. Static server returning wrong files (check "Serving:" logs)

## Files Changed

1. ✅ `scripts/bundle-remotion.mjs` - Enhanced logging & verification
2. ✅ `scripts/startup.sh` - NEW - Startup verification
3. ✅ `src/lib/server/remotion-renderer-new.ts` - Enhanced logging & verification
4. ✅ `Dockerfile` - Use startup script, verify bundle
5. ✅ `.dockerignore` - Already correct (excludes local bundle)

## Key Indicators of Success

| Indicator | Good ✅ | Bad ❌ |
|-----------|---------|--------|
| Build logs show bundle-remotion | Yes | No / Error |
| bundle.js contains getStaticCompositions | Yes | No / Warning |
| Startup verifies bundle | Yes | Error / Not found |
| Static server starts | Port assigned | Error |
| Files being served | Shows "Serving: /bundle.js" | No logs |
| projectName in error | "subify" | "app" |
| Render completes | Progress to 100% | Composition error |

## Next Steps After Deployment

1. Check build logs for bundle creation
2. Check startup logs for bundle verification
3. Test export and watch logs for:
   - Static server startup
   - File serving logs
   - Composition selection
4. If errors persist, the logs will now pinpoint exact failure point
