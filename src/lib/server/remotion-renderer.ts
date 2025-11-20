import "server-only";

import fs from "fs";
import os from "os";
import path from "path";
import type { CaptionCompositionProps } from "@/lib/types/captions";

const ROOT_DIR = process.cwd();
const REMOTION_DIR = path.join(ROOT_DIR, "remotion");
const REMOTION_ENTRY = path.join(REMOTION_DIR, "Root.tsx");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const SRC_DIR = path.join(ROOT_DIR, "src");
const REMOTION_CACHE_DIR = path.join(os.tmpdir(), "remotion-cache");
const REMOTION_BUNDLER_FAVICON = path.join(
  ROOT_DIR,
  "node_modules",
  "@remotion",
  "bundler",
  "favicon.ico",
);
const REMOTION_FAVICON_FALLBACK = path.join(
  ROOT_DIR,
  "assets",
  "remotion-bundler-favicon.ico",
);
let bundlerFaviconPatched = false;

// Disable Remotion Studio (not needed for server-side rendering)
if (!process.env.REMOTION_STUDIO_ENABLED) {
  process.env.REMOTION_STUDIO_ENABLED = "false";
}
if (!process.env.REMOTION_DISABLE_CACHE) {
  process.env.REMOTION_DISABLE_CACHE = "true";
}
if (!process.env.REMOTION_CACHE_LOCATION) {
  process.env.REMOTION_CACHE_LOCATION = REMOTION_CACHE_DIR;
}
// Prevent Remotion from trying to write to node_modules/.remotion in serverless environments
if (!process.env.REMOTION_DATA_DIR) {
  process.env.REMOTION_DATA_DIR = path.join(os.tmpdir(), "remotion-data");
}
// Force Remotion to use production mode for bundling
if (process.env.NODE_ENV === "production") {
  process.env.REMOTION_BUILD_MODE = "production";
}
// Ensure Remotion doesn't try to open browser or use development features
process.env.REMOTION_HEADLESS = "true";

type RendererModule = typeof import("@remotion/renderer");
type BundlerModule = typeof import("@remotion/bundler");

type MutableWebpackConfig = {
  resolve?: {
    alias?: Record<string, string>;
    extensions?: string[];
    [key: string]: unknown;
  };
  externals?: unknown[];
  plugins?: unknown[];
  [key: string]: unknown;
};

type RemotionModules = {
  bundle: BundlerModule["bundle"];
  renderMedia: RendererModule["renderMedia"];
  selectComposition: RendererModule["selectComposition"];
};

let remotionModulesPromise: Promise<RemotionModules> | null = null;
let serveUrlPromise: Promise<string> | null = null;

const patchBundlerFaviconCopy = () => {
  if (bundlerFaviconPatched) return;
  bundlerFaviconPatched = true;
  const originalCopy = fs.copyFileSync.bind(fs);
  fs.copyFileSync = ((source: fs.PathLike, destination: fs.PathLike, mode?: number) => {
    const sourcePath = typeof source === "string" ? source : source.toString();
    if (sourcePath.includes("@remotion/bundler/favicon.ico")) {
      try {
        return originalCopy(source, destination, mode);
      } catch (error) {
        const nodeError = error as NodeJS.ErrnoException;
        if (
          nodeError.code !== "ENOENT" &&
          nodeError.code !== "ENOTDIR" &&
          nodeError.code !== "EISDIR"
        ) {
          throw error;
        }
        const fallbackSource = fs.existsSync(REMOTION_FAVICON_FALLBACK)
          ? REMOTION_FAVICON_FALLBACK
          : null;
        if (fallbackSource) {
          console.warn(
            `[remotion] Missing bundler favicon at ${REMOTION_BUNDLER_FAVICON}, copying fallback asset instead.`,
          );
          return originalCopy(fallbackSource, destination, mode);
        }
        console.warn(
          `[remotion] Missing bundler favicon at ${REMOTION_BUNDLER_FAVICON}, writing empty placeholder to keep bundling going.`,
        );
        fs.writeFileSync(destination, Buffer.alloc(0));
        return;
      }
    }
    return originalCopy(source, destination, mode);
  }) as typeof fs.copyFileSync;
};

const loadRemotionModules = () => {
  if (!remotionModulesPromise) {
    remotionModulesPromise = (async () => {
      patchBundlerFaviconCopy();
      const [{ bundle }, renderer] = await Promise.all([
        import("@remotion/bundler"),
        import("@remotion/renderer"),
      ]);
      const { renderMedia, selectComposition } = renderer;
      return { bundle, renderMedia, selectComposition };
    })().catch((error) => {
      remotionModulesPromise = null;
      throw error;
    });
  }
  return remotionModulesPromise;
};

const applyWebpackAlias = (config: MutableWebpackConfig) => {
  config.resolve ??= {};
  config.resolve.alias = {
    ...(config.resolve.alias ?? {}),
    "@": SRC_DIR,
    react: path.join(ROOT_DIR, "node_modules", "react"),
    "react-dom": path.join(ROOT_DIR, "node_modules", "react-dom"),
  };
  config.resolve.extensions = Array.from(
    new Set([...(config.resolve.extensions ?? []), ".ts", ".tsx", ".js", ".jsx", ".mjs"]),
  );
  
  // Ensure webpack processes modules correctly
  config.mode = process.env.NODE_ENV === "production" ? "production" : "development";
  
  // Add plugin to ignore @remotion/studio (dev-only dependency not needed for rendering)
  config.plugins = config.plugins || [];
  
  // Create an IgnorePlugin to exclude @remotion/studio modules
  // This avoids issues in serverless environments where studio files don't exist
  const ignorePlugin = {
    apply(compiler: { hooks?: { normalModuleFactory?: { tap?: (name: string, handler: (nmf: unknown) => void) => void } } }) {
      if (compiler?.hooks?.normalModuleFactory?.tap) {
        compiler.hooks.normalModuleFactory.tap("IgnoreStudioPlugin", (nmf: unknown) => {
          const nmfHooks = nmf as { hooks?: { beforeResolve?: { tap?: (name: string, handler: (resolveData: { request?: string }) => unknown) => void } } };
          if (nmfHooks?.hooks?.beforeResolve?.tap) {
            nmfHooks.hooks.beforeResolve.tap("IgnoreStudioPlugin", (resolveData: { request?: string }) => {
              if (resolveData?.request?.includes("@remotion/studio")) {
                return false;
              }
            });
          }
        });
      }
    },
  };
  
  config.plugins.push(ignorePlugin);
  
  return config;
};

const bundleRemotionProject = async () => {
  if (!serveUrlPromise) {
    serveUrlPromise = loadRemotionModules()
      .then(async ({ bundle }) => {
        // Preload fonts before bundling to ensure they're available
        try {
          const { ensureCaptionFonts } = await import("../../../remotion/fonts");
          await ensureCaptionFonts();
        } catch (error) {
          console.warn("[remotion] Font preload failed, continuing with fallback", error);
        }

        // Ensure public directory exists to prevent bundler errors
        const fs = await import("fs");
        if (!fs.existsSync(PUBLIC_DIR)) {
          fs.mkdirSync(PUBLIC_DIR, { recursive: true });
        }

        console.log("[remotion] Starting bundle process...");
        console.log("[remotion] Entry point:", REMOTION_ENTRY);
        console.log("[remotion] Public dir:", PUBLIC_DIR);
        console.log("[remotion] Node env:", process.env.NODE_ENV);

        // The bundler typings still expect the legacy positional arguments signature.
        // Cast to `any` so we can use the modern options object without type noise.
        const bundleLocation = await (bundle as unknown as (options: Record<string, unknown>) => Promise<string>)({
          entryPoint: REMOTION_ENTRY,
          publicDir: PUBLIC_DIR,
          webpackOverride: applyWebpackAlias,
          enableCaching: false,
          cacheDir: REMOTION_CACHE_DIR,
          // Important: Don't specify a port, let Remotion find an available one
          // This ensures we're not conflicting with Next.js on port 3000
          ...(process.env.NODE_ENV === "production" && {
            minify: false, // Minification can cause issues with Remotion
          }),
        });

        console.log("[remotion] Bundle created at:", bundleLocation);
        console.log("[remotion] Bundle type:", bundleLocation.startsWith("http") ? "HTTP server" : "File path");
        return bundleLocation;
      })
      .catch((error) => {
        console.error("[remotion] Bundle failed:", error);
        serveUrlPromise = null;
        throw error;
      });
  }

  return serveUrlPromise;
};

export const renderCaptionVideo = async (
  props: CaptionCompositionProps,
  outputLocation: string,
) => {
  try {
    console.log("[remotion] Starting render process...");
    
    const [modules, serveUrl] = await Promise.all([
      loadRemotionModules(),
      bundleRemotionProject(),
    ]);

    console.log("[remotion] Selecting composition from:", serveUrl);
    console.log("[remotion] Input props:", {
      videoSrc: props.videoSrc,
      captionCount: props.captions.length,
      duration: props.duration,
      fps: props.fps,
      dimensions: `${props.width}x${props.height}`,
    });

    const composition = await modules.selectComposition({
      serveUrl,
      id: "CaptionComposition",
      inputProps: props,
    }).catch((error) => {
      console.error("[remotion] Failed to select composition:", error);
      console.error("[remotion] Serve URL was:", serveUrl);
      throw new Error(`Failed to load Remotion composition: ${error.message}`);
    });

    console.log("[remotion] Composition selected:", {
      id: composition.id,
      width: composition.width,
      height: composition.height,
      fps: composition.fps,
      durationInFrames: composition.durationInFrames,
    });

    console.log("[remotion] Starting media render to:", outputLocation);

    await modules.renderMedia({
      serveUrl,
      composition,
      codec: "h264",
      audioCodec: "aac",
      outputLocation,
      inputProps: props,
      overwrite: true,
      onProgress: (progress) => {
        const percentage = (progress.progress * 100).toFixed(1);
        console.log(`[remotion][render] ${percentage}% complete (frame ${progress.renderedFrames}/${progress.encodedFrames})`);
      },
    });

    console.log("[remotion] Render completed successfully");
  } catch (error) {
    console.error("[remotion] Render failed with error:", error);
    if (error instanceof Error) {
      console.error("[remotion] Error stack:", error.stack);
    }
    throw error;
  }
};
