# Remotion Rendering Fix for Railway Deployment

## Problem Analysis

When clicking "Export" on Railway deployment, the application was failing with:

```
Error while getting compositions: Tried to go to http://localhost:3000/index.html
and verify that it is a Remotion project by checking if window.getStaticCompositions
is defined. However, the function was undefined...
```

### Root Causes Identified

1. **Port Conflict**: Remotion's bundler was trying to access `http://localhost:3000`, which is the Next.js server, not the Remotion bundle server.

2. **"use client" Directive**: The Remotion entry file (`remotion/Root.tsx`) had a `"use client"` directive that could interfere with server-side bundling.

3. **Insufficient Logging**: Limited debugging information made it hard to trace where the bundling process was failing.

4. **Environment Configuration**: Missing production-specific environment variables for Remotion.

5. **Webpack Mode**: The webpack configuration wasn't explicitly setting production mode.

## Solutions Implemented

### 1. Removed "use client" from Remotion Entry Files

**Files Modified:**

- `remotion/Root.tsx`
- `remotion/CaptionComposition.tsx`

**Why:** The "use client" directive is a Next.js convention that's unnecessary for Remotion's server-side bundling. Remotion compositions can use React hooks without this directive.

### 2. Enhanced Environment Configuration

**File:** `src/lib/server/remotion-renderer.ts`

Added critical environment variables:

```typescript
process.env.REMOTION_HEADLESS = "true";
process.env.REMOTION_BUILD_MODE = "production"; // In production
```

**Why:** These ensure Remotion runs in headless mode suitable for server environments and uses production optimizations.

### 3. Improved Webpack Configuration

Added explicit webpack mode setting:

```typescript
config.mode =
  process.env.NODE_ENV === "production" ? "production" : "development";
```

**Why:** Ensures webpack builds the bundle with appropriate optimizations for the environment.

### 4. Added Comprehensive Logging

Enhanced logging throughout the bundling and rendering process:

- Bundle creation location and type
- Composition selection details
- Render progress with frame counts
- Error stack traces

**Why:** Better debugging capabilities for production issues.

### 5. Disabled Minification in Production

```typescript
...(process.env.NODE_ENV === "production" && {
  minify: false,
}),
```

**Why:** Remotion's code can have issues with aggressive minification. Disabling it prevents runtime errors.

## Industry-Standard Best Practices Applied

### 1. **Separation of Concerns**

- Remotion bundle runs on its own port (auto-assigned)
- Next.js server remains on port 3000
- No port conflicts

### 2. **Proper Error Handling**

```typescript
.catch((error) => {
  console.error("[remotion] Failed to select composition:", error);
  console.error("[remotion] Serve URL was:", serveUrl);
  throw new Error(`Failed to load Remotion composition: ${error.message}`);
});
```

### 3. **Environment-Aware Configuration**

- Different settings for development vs production
- Headless mode for server environments
- Proper temp directory usage

### 4. **Logging & Observability**

- Structured logging with `[remotion]` prefix
- Detailed progress tracking
- Error context preservation

### 5. **Resource Management**

- Temp files properly cleaned up
- Bundle caching disabled in serverless (prevents permission issues)
- Explicit data directory configuration

## Testing the Fix

### Local Testing

```bash
npm run build
npm run start
```

Then test the export functionality.

### Production Deployment (Railway)

1. Push changes to your repository
2. Railway will auto-deploy
3. Monitor logs for `[remotion]` prefixed messages
4. Test export functionality

### Expected Log Output (Success)

```
[remotion] Starting bundle process...
[remotion] Entry point: /app/remotion/Root.tsx
[remotion] Public dir: /app/public
[remotion] Node env: production
[remotion] Bundle created at: http://localhost:[random-port]
[remotion] Bundle type: HTTP server
[remotion] Selecting composition from: http://localhost:[random-port]
[remotion] Composition selected: {...}
[remotion] Starting media render to: /tmp/...
[remotion][render] 25.0% complete (frame 150/600)
[remotion][render] 50.0% complete (frame 300/600)
[remotion][render] 75.0% complete (frame 450/600)
[remotion][render] 100.0% complete (frame 600/600)
[remotion] Render completed successfully
```

## Additional Considerations

### If Issues Persist

1. **Check Chromium Installation**

   ```bash
   # In Docker container
   which chromium || which chromium-browser
   ```

2. **Verify FFmpeg**

   ```bash
   ffmpeg -version
   ```

3. **Check Temp Directory Permissions**

   ```bash
   ls -la /tmp/remotion-*
   ```

4. **Memory Issues**
   - Increase Railway container memory
   - Reduce video resolution/FPS if needed

### Performance Optimization

For production at scale, consider:

- **Remotion Lambda**: AWS Lambda-based rendering (official solution)
- **Queue System**: Redis/Bull for job processing
- **CDN**: CloudFront/CloudFlare for video delivery
- **Database**: PostgreSQL for session persistence

## Related Files Changed

1. `src/lib/server/remotion-renderer.ts` - Main bundler/renderer logic
2. `remotion/Root.tsx` - Entry point (removed "use client")
3. `remotion/CaptionComposition.tsx` - Composition wrapper (removed "use client")

## References

- [Remotion Server-Side Rendering](https://www.remotion.dev/docs/ssr)
- [Remotion Bundle API](https://www.remotion.dev/docs/bundle)
- [Railway Deployment Docs](https://docs.railway.app/)
