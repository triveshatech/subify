#!/usr/bin/env node
/**
 * Pre-bundle Remotion project during Docker build
 * This creates a static bundle that can be served without webpack-dev-server
 */

import { bundle } from "@remotion/bundler";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const REMOTION_ENTRY = path.join(ROOT_DIR, "remotion", "Root.tsx");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const BUNDLE_OUTPUT = path.join(ROOT_DIR, ".remotion-bundle");

console.log("[bundle-remotion] Starting build...");
console.log("[bundle-remotion] Entry:", REMOTION_ENTRY);
console.log("[bundle-remotion] Output:", BUNDLE_OUTPUT);
console.log("[bundle-remotion] CWD:", process.cwd());
console.log("[bundle-remotion] Node version:", process.version);

// Verify entry file exists
if (!fs.existsSync(REMOTION_ENTRY)) {
  console.error("[bundle-remotion] ❌ Entry file not found:", REMOTION_ENTRY);
  process.exit(1);
}

// Verify public dir exists (create if not)
if (!fs.existsSync(PUBLIC_DIR)) {
  console.log("[bundle-remotion] Creating public directory:", PUBLIC_DIR);
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

const applyWebpackAlias = (config) => {
  const SRC_DIR = path.join(ROOT_DIR, "src");

  // Preserve existing configuration
  config.resolve = config.resolve || {};
  config.resolve.alias = {
    ...(config.resolve.alias || {}),
    "@": SRC_DIR,
  };
  
  // Don't override extensions, let Remotion handle it
  // Don't set mode, let Remotion handle it
  // Don't add plugins that might interfere
  
  return config;
};

try {
  console.log("[bundle-remotion] Calling bundle() with options:", {
    entryPoint: REMOTION_ENTRY,
    outDir: BUNDLE_OUTPUT,
    publicDir: PUBLIC_DIR,
    enableCaching: false,
  });

  const bundleLocation = await bundle({
    entryPoint: REMOTION_ENTRY,
    outDir: BUNDLE_OUTPUT,
    publicDir: PUBLIC_DIR,
    webpackOverride: applyWebpackAlias,
    enableCaching: false,
  });

  console.log("[bundle-remotion] ✅ Bundle returned:", bundleLocation);
  console.log("[bundle-remotion] Expected output dir:", BUNDLE_OUTPUT);
  
  // The bundle() function returns the output directory path
  // Verify it matches what we expect
  if (bundleLocation !== BUNDLE_OUTPUT) {
    console.warn("[bundle-remotion] Warning: returned location differs from outDir");
    console.warn("[bundle-remotion] Returned:", bundleLocation);
    console.warn("[bundle-remotion] Expected:", BUNDLE_OUTPUT);
  }
  
  // Verify the bundle was created in the expected location
  const indexHtml = path.join(BUNDLE_OUTPUT, "index.html");
  const bundleJs = path.join(BUNDLE_OUTPUT, "bundle.js");
  
  if (!fs.existsSync(indexHtml)) {
    console.error("[bundle-remotion] ❌ index.html not created at:", indexHtml);
    console.error("[bundle-remotion] Checking returned location:", path.join(bundleLocation, "index.html"));
    if (fs.existsSync(path.join(bundleLocation, "index.html"))) {
      console.error("[bundle-remotion] Found at returned location! This is a path mismatch.");
    }
    process.exit(1);
  }
  
  if (!fs.existsSync(bundleJs)) {
    console.error("[bundle-remotion] ❌ bundle.js not created at:", bundleJs);
    process.exit(1);
  }
  
  // Check if bundle.js contains getStaticCompositions
  const bundleContent = fs.readFileSync(bundleJs, "utf8");
  if (bundleContent.includes("getStaticCompositions")) {
    console.log("[bundle-remotion] ✓ bundle.js contains getStaticCompositions");
  } else {
    console.error("[bundle-remotion] ❌ bundle.js missing getStaticCompositions!");
    console.error("[bundle-remotion] Bundle size:", bundleContent.length);
    process.exit(1);
  }
  
  // List bundle contents
  const files = fs.readdirSync(BUNDLE_OUTPUT);
  console.log("[bundle-remotion] Bundle files:", files);
  
  process.exit(0);
} catch (error) {
  console.error("[bundle-remotion] ❌ Bundle failed:", error);
  console.error("[bundle-remotion] Error stack:", error.stack);
  process.exit(1);
}
