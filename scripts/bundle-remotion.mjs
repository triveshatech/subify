#!/usr/bin/env node
/**
 * Pre-bundle Remotion project during Docker build
 * This creates a static bundle that can be served without webpack-dev-server
 */

import { bundle } from "@remotion/bundler";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const REMOTION_ENTRY = path.join(ROOT_DIR, "remotion", "Root.tsx");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const BUNDLE_OUTPUT = path.join(ROOT_DIR, ".remotion-bundle");

console.log("[bundle-remotion] Starting build...");
console.log("[bundle-remotion] Entry:", REMOTION_ENTRY);
console.log("[bundle-remotion] Output:", BUNDLE_OUTPUT);

const applyWebpackAlias = (config) => {
  const SRC_DIR = path.join(ROOT_DIR, "src");

  config.resolve = config.resolve || {};
  config.resolve.alias = {
    ...(config.resolve.alias || {}),
    "@": SRC_DIR,
    react: path.join(ROOT_DIR, "node_modules", "react"),
    "react-dom": path.join(ROOT_DIR, "node_modules", "react-dom"),
  };
  config.resolve.extensions = [
    ...new Set([
      ...(config.resolve.extensions || []),
      ".ts",
      ".tsx",
      ".js",
      ".jsx",
      ".mjs",
    ]),
  ];

  config.mode = "production";
  config.plugins = config.plugins || [];

  // Ignore studio modules
  const ignorePlugin = {
    apply(compiler) {
      if (compiler?.hooks?.normalModuleFactory?.tap) {
        compiler.hooks.normalModuleFactory.tap("IgnoreStudioPlugin", (nmf) => {
          if (nmf?.hooks?.beforeResolve?.tap) {
            nmf.hooks.beforeResolve.tap("IgnoreStudioPlugin", (resolveData) => {
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

try {
  const bundleLocation = await bundle({
    entryPoint: REMOTION_ENTRY,
    outDir: BUNDLE_OUTPUT,
    publicDir: PUBLIC_DIR,
    webpackOverride: applyWebpackAlias,
    enableCaching: false,
  });

  console.log("[bundle-remotion] ✅ Bundle created at:", bundleLocation);
  process.exit(0);
} catch (error) {
  console.error("[bundle-remotion] ❌ Bundle failed:", error);
  process.exit(1);
}
