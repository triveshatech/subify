import "server-only";

import os from "os";
import path from "path";
import http from "http";
import fs from "fs";
import { createReadStream } from "fs";
import type { CaptionCompositionProps } from "@/lib/types/captions";

const ROOT_DIR = process.cwd();
const BUNDLE_DIR = path.join(ROOT_DIR, ".remotion-bundle");

// Configure Remotion for server-side rendering
process.env.REMOTION_STUDIO_ENABLED = "false";
process.env.REMOTION_DISABLE_CACHE = "true";
process.env.REMOTION_CACHE_LOCATION = path.join(os.tmpdir(), "remotion-cache");
process.env.REMOTION_DATA_DIR = path.join(os.tmpdir(), "remotion-data");
process.env.REMOTION_HEADLESS = "true";

if (process.env.NODE_ENV === "production") {
  process.env.REMOTION_BUILD_MODE = "production";
}

type RendererModule = typeof import("@remotion/renderer");

let rendererPromise: Promise<RendererModule> | null = null;
let staticServerPromise: Promise<{ url: string; close: () => Promise<void> }> | null = null;

const loadRenderer = () => {
  if (!rendererPromise) {
    rendererPromise = import("@remotion/renderer").catch((error) => {
      rendererPromise = null;
      throw error;
    });
  }
  return rendererPromise;
};

const getMimeType = (filePath: string): string => {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
  };
  return mimeTypes[ext] || "application/octet-stream";
};

const startStaticServer = async () => {
  if (!staticServerPromise) {
    staticServerPromise = (async () => {
      console.log("[remotion] Starting static server for bundle:", BUNDLE_DIR);

      // Verify bundle directory exists
      if (!fs.existsSync(BUNDLE_DIR)) {
        throw new Error(
          `Bundle directory not found: ${BUNDLE_DIR}. Run 'node scripts/bundle-remotion.mjs' first.`
        );
      }

      // Verify critical files exist
      const indexHtml = path.join(BUNDLE_DIR, "index.html");
      const bundleJs = path.join(BUNDLE_DIR, "bundle.js");
      
      if (!fs.existsSync(indexHtml)) {
        throw new Error(`Bundle index.html not found at: ${indexHtml}`);
      }
      
      if (!fs.existsSync(bundleJs)) {
        throw new Error(`Bundle bundle.js not found at: ${bundleJs}`);
      }

      // List bundle contents for debugging
      const bundleContents = fs.readdirSync(BUNDLE_DIR);
      console.log("[remotion] Bundle directory contents:", bundleContents);

      // Verify bundle.js contains getStaticCompositions
      const bundleJsContent = fs.readFileSync(bundleJs, "utf8");
      if (!bundleJsContent.includes("getStaticCompositions")) {
        console.error("[remotion] WARNING: bundle.js does not contain getStaticCompositions!");
        console.error("[remotion] Bundle.js size:", bundleJsContent.length, "bytes");
        console.error("[remotion] First 500 chars:", bundleJsContent.substring(0, 500));
      } else {
        console.log("[remotion] ✓ bundle.js contains getStaticCompositions");
      }

      const server = http.createServer((req, res) => {
        // Parse URL and remove query strings
        const urlPath = (req.url || "/").split("?")[0];
        let filePath = path.join(BUNDLE_DIR, urlPath);

        // Default to index.html for directory requests
        if (filePath.endsWith("/") || fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
          filePath = path.join(filePath, "index.html");
        }

        // Security: prevent directory traversal
        const normalizedPath = path.normalize(filePath);
        if (!normalizedPath.startsWith(BUNDLE_DIR)) {
          console.error("[remotion] Forbidden path:", urlPath);
          res.writeHead(403);
          res.end("Forbidden");
          return;
        }

        console.log("[remotion] Serving:", urlPath, "->", path.relative(BUNDLE_DIR, filePath));

        fs.stat(filePath, (err, stats) => {
          if (err || !stats.isFile()) {
            console.error("[remotion] File not found:", filePath, err?.message);
            res.writeHead(404);
            res.end("Not Found");
            return;
          }

          const mimeType = getMimeType(filePath);
          res.writeHead(200, {
            "Content-Type": mimeType,
            "Content-Length": stats.size,
            "Cache-Control": "no-cache",
            "Access-Control-Allow-Origin": "*",
          });

          const stream = createReadStream(filePath);
          stream.pipe(res);
          stream.on("error", (streamErr) => {
            console.error("[remotion] Stream error:", streamErr);
            res.destroy();
          });
        });
      });

      await new Promise<void>((resolve, reject) => {
        server.listen(0, "127.0.0.1", (err?: Error) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        throw new Error("Failed to get server port");
      }

      const url = `http://127.0.0.1:${address.port}`;
      console.log("[remotion] Static server started at:", url);

      return {
        url,
        close: () =>
          new Promise<void>((resolve, reject) => {
            server.close((err) => {
              if (err) reject(err);
              else resolve();
            });
          }),
      };
    })().catch((error) => {
      console.error("[remotion] Static server failed:", error);
      staticServerPromise = null;
      throw error;
    });
  }

  return staticServerPromise;
};

export const renderCaptionVideo = async (
  props: CaptionCompositionProps,
  outputLocation: string,
) => {
  try {
    console.log("[remotion] Starting render process...");
    console.log("[remotion] Bundle directory:", BUNDLE_DIR);
    console.log("[remotion] Input props:", {
      videoSrc: props.videoSrc,
      captionCount: props.captions.length,
      duration: props.duration,
      fps: props.fps,
      dimensions: `${props.width}x${props.height}`,
    });

    const [renderer, staticServer] = await Promise.all([
      loadRenderer(),
      startStaticServer(),
    ]);

    const { url: serveUrl } = staticServer;

    console.log("[remotion] Selecting composition from:", serveUrl);

    const composition = await renderer.selectComposition({
      serveUrl,
      id: "CaptionComposition",
      inputProps: props,
    });

    console.log("[remotion] Composition selected:", {
      id: composition.id,
      width: composition.width,
      height: composition.height,
      fps: composition.fps,
      durationInFrames: composition.durationInFrames,
    });

    console.log("[remotion] Starting media render to:", outputLocation);

    await renderer.renderMedia({
      serveUrl,
      composition,
      codec: "h264",
      audioCodec: "aac",
      outputLocation,
      inputProps: props,
      overwrite: true,
      onProgress: (progress) => {
        const percentage = (progress.progress * 100).toFixed(1);
        console.log(
          `[remotion][render] ${percentage}% complete (frame ${progress.renderedFrames}/${progress.encodedFrames})`
        );
      },
    });

    console.log("[remotion] Render completed successfully");
  } catch (error) {
    console.error("[remotion] Render failed with error:", error);
    if (error instanceof Error) {
      console.error("[remotion] Error message:", error.message);
      console.error("[remotion] Error stack:", error.stack);
    }
    throw error;
  }
};

// Cleanup on process exit
process.on("beforeExit", async () => {
  if (staticServerPromise) {
    try {
      const server = await staticServerPromise;
      await server.close();
      console.log("[remotion] Static server closed");
    } catch (error) {
      console.error("[remotion] Failed to close static server:", error);
    }
  }
});
