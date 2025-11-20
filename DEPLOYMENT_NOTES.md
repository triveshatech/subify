# Video Rendering on Railway - Operations Notes

## Current Status

Remotion exports now run inside a long-lived Dockerized Node 20 server (Railway). Uploads and renders stream through `/tmp`, so nothing touches `/public` or user code directories. The Remotion compositor binaries ship in `node_modules` and are available at runtime.

## Deployment Requirements

1. **Linux-native compositor packages**
   - `@remotion/compositor-linux-x64-gnu` stays in `optionalDependencies`. Railway’s Debian-based build installs it so the renderer can execute.
   - `next.config.ts` still lists all Remotion native packages in `serverExternalPackages` / `outputFileTracingIncludes`, ensuring the compositor + fonts are bundled.
2. **Node.js runtime**
   - The Dockerfile builds the Next.js app and launches `next start -p ${PORT:-3000}`. Railway auto-injects `PORT`, so no extra config is required.
   - FFmpeg installs via `apt-get` inside the image. No separate buildpack is needed.
3. **Temp storage**
   - `/api/uploads` writes inbound files to `os.tmpdir()` and records them in an in-memory map. Session creation + export routes copy each upload into their own temp working directory, render, stream the MP4, and delete every intermediate file.
   - `REMOTION_DATA_DIR` / `REMOTION_CACHE_LOCATION` default to `/tmp` within `remotion-renderer.ts`, so Remotion never tries to write into read-only paths.
4. **Fonts and assets**
   - `remotion/fonts.ts` runs before bundling to ensure caption fonts exist.
   - The bundler favicon fallback + manual output tracing remain, preventing `ENOENT` errors.

## Redeploy Checklist

1. `npm ci && npm run lint && npm run build`
2. `docker build -t subify .`
3. Push the new image (or let Railway rebuild from Git). Verify a real export from `/studio/:sessionId` and watch the logs for `[remotion]` progress.

## Troubleshooting

| Symptom | Likely Cause | Fix |
| --- | --- | --- |
| `ENOENT .../compositor-linux-x64-gnu/remotion` | Docker layer cached without optional deps | Delete `node_modules` locally, reinstall, rebuild the Docker image so optional deps are copied in |
| `Missing uploaded video reference` | `/api/uploads` temp id expired | Re-upload from the client; uploads expire after ~30 minutes |
| `Socket hang up` / timeout | Render exceeded container resources | Scale the Railway service (more CPU/RAM) or reduce resolution/FPS |

## Alternatives

If Railway resources become a bottleneck, consider Remotion Lambda, Render.com, or a bare VM. The code paths already rely on OS temp directories, so moving between hosts only requires supplying `OPENAI_API_KEY`.
