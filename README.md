# Subify - AI Captioning Studio

Subify lets creators upload short-form video, generate Hinglish captions with OpenAI Whisper, style them in Remotion, and export both the rendered MP4 and clean subtitle files (SRT/VTT). Everything runs on a local-first storage model so raw videos never touch the deployment filesystem.

## Highlights

- **Next.js 16 + App Router** with server actions for uploads, session storage, and Remotion rendering.
- **OpenAI Whisper (gpt-4o-mini-transcribe)** for super accurate Hinglish transcripts with segment + word timing.
- **Remotion studio** exposes three caption presets, three placements, and a real-time preview powered by `@remotion/player`.
- **Download hub** offers MP4, `.srt`, `.vtt`, or a zipped bundle, no re-rendering required.
- **Local-first privacy**: uploads stay inside the browser’s IndexedDB and are streamed to the server only during transcription/export.

## Architecture Snapshot

| Concern | Implementation |
| --- | --- |
| UI / Routing | Next.js App Router, React Server Components, Tailwind CSS v4 |
| Rendering | Remotion (`@remotion/player`, `@remotion/renderer`) |
| Speech-to-Text | OpenAI Whisper via `openai` SDK |
| Persistence | JSON session store under `storage/` + browser IndexedDB for raw media |
| Deployment Target | Dockerized Node.js 20 (Railway or any container host) |

## Prerequisites

- Node.js 20+
- npm 10+
- OpenAI account + Whisper API key (`OPENAI_API_KEY`)

## Setup

```bash
git clone <repo>
cd Subify
npm install
cp .env.local   # provide OPENAI_API_KEY
npm run dev
```

Visit `http://localhost:3000` and drop an `.mp4` (≤300 MB) to get started.

## Workflow

1. **Upload** - the landing page validates the file, stores it in IndexedDB, streams the file to `/api/uploads` (which writes to `/tmp` inside the container), and POSTs the upload id to `/api/sessions` for Whisper transcription. If the temp upload endpoint is unavailable the app falls back to direct multipart form posts.
2. **Studio** - `/studio/[sessionId]` loads captions, lets you switch styles/placements, and previews everything in Remotion.
3. **Export** - clicking *Export MP4* triggers the same temp upload flow and sends the upload id to `/api/sessions/[id]/export`. Remotion renders the composition on the server and streams the MP4 back; the resulting blob is cached locally.
4. **Download hub** - after export the app redirects to `/download/[sessionId]` where you can grab:
   - MP4 with burned-in captions
   - `.srt` and `.vtt` sidecar files (generated client-side)
   - A `.zip` bundle containing MP4 + both subtitle formats

You can always hop back into the studio to change styles and export again.

## Subtitle generation

Sanitized `CaptionSegment`s feed two helpers (`captionsToSrt`, `captionsToVtt`) in `src/lib/utils/subtitles.ts`. They normalize timestamps, handle multiline content, and ensure WebVTT + SRT specs are met. The helpers power both individual downloads and the bundle workflow.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Next.js locally with hot reload.
| `npm run build` / `npm start` | Production build + serve.
| `npm run lint` | ESLint across the entire project.
| `npm run render:sample` | CLI Remotion render using `assets/sample-captions.json` → `out/sample-output.mp4`.

## Deployment notes

- **Environment** - set `OPENAI_API_KEY` (required) and optionally `SUBIFY_STORAGE_ROOT` if you want session JSON to live somewhere other than `/app/storage`. Railway variables work out of the box.
- **Storage** - the repo ships with empty `storage/sessions/.gitkeep` and `storage/renders/.gitkeep`. At runtime these directories persist caption metadata only; raw uploads never land here.
- **Uploads** - `/api/uploads` now streams files directly to the container’s `/tmp` directory and returns a short-lived `uploadId`. API routes consume the id, move the file into their own temp workspace, and delete both source + render artifacts when finished. Nothing ever touches `/public`.
- **Static assets** - sample media lives in `assets/` + `public/samples/` strictly for demos/testing.
- **Cleaning** - no generated exports or session JSONs are committed, keeping the repo production-ready.

Once deployed, the workflow remains identical: uploads stay local to the browser, Whisper runs inside your serverless region, and rendered MP4/subtitle downloads are delivered through the download hub.

## Running in Docker / Railway

1. Build locally: `docker build -t subify .`
2. Run the container: `docker run -p 3000:3000 --env OPENAI_API_KEY=sk-... subify`
3. On Railway, connect the repo, let it detect the `Dockerfile`, and set `OPENAI_API_KEY` (plus optional vars like `SUBIFY_STORAGE_ROOT`). The app binds to `${PORT:-3000}` automatically.

FFmpeg comes pre-installed in the image, uploads/render artifacts live exclusively under `/tmp`, and the production container only executes `npm run start` at runtime.


## Contribution

We welcome contributions to enhance our Subify. Please submit pull requests with detailed descriptions of proposed changes.

## Contact Us

For any questions, feedback, or collaboration opportunities, feel free to reach out to us:

- Mandapudi. Shiva Rama Krishna  
- **Email**: shivachowdary753@gmail.com

We’d love to hear your thoughts and suggestions on the project!

Happy captioning! 🎬
