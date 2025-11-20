#!/bin/bash
# Startup script to verify bundle exists before starting Next.js

echo "[startup] Checking Remotion bundle..."

if [ ! -d "/app/.remotion-bundle" ]; then
  echo "[startup] ❌ ERROR: .remotion-bundle directory not found!"
  echo "[startup] This means the bundle was not created during build."
  echo "[startup] Checking if we can create it now..."
  
  if [ -f "/app/scripts/bundle-remotion.mjs" ]; then
    echo "[startup] Running bundle script..."
    node /app/scripts/bundle-remotion.mjs
    
    if [ $? -ne 0 ]; then
      echo "[startup] ❌ Bundle script failed!"
      exit 1
    fi
  else
    echo "[startup] ❌ Bundle script not found!"
    exit 1
  fi
fi

if [ ! -f "/app/.remotion-bundle/index.html" ]; then
  echo "[startup] ❌ ERROR: index.html not found in bundle!"
  exit 1
fi

if [ ! -f "/app/.remotion-bundle/bundle.js" ]; then
  echo "[startup] ❌ ERROR: bundle.js not found in bundle!"
  exit 1
fi

echo "[startup] ✓ Remotion bundle verified"
echo "[startup] Bundle contents:"
ls -la /app/.remotion-bundle/

echo "[startup] Starting Next.js..."
exec npm run start
