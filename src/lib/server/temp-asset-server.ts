"use server";

import http from "http";
import { createReadStream, statSync } from "fs";

export const createTempAssetServer = async (filePath: string, mimeType = "video/mp4") => {
  const server = http.createServer((request, response) => {
    if (request.url !== "/asset") {
      response.writeHead(404);
      response.end();
      return;
    }

    try {
      const stats = statSync(filePath);
      const totalSize = stats.size;
      const rangeHeader = request.headers.range;

      if (request.method === "HEAD") {
        response.writeHead(200, {
          "Content-Type": mimeType,
          "Content-Length": totalSize,
          "Accept-Ranges": "bytes",
        });
        response.end();
        return;
      }

      if (rangeHeader) {
        const matches = /bytes=(\d+)-(\d*)/.exec(rangeHeader);
        if (matches) {
          const start = Number(matches[1]);
          const end = matches[2] ? Number(matches[2]) : totalSize - 1;
          const chunkSize = end - start + 1;
          response.writeHead(206, {
            "Content-Type": mimeType,
            "Content-Length": chunkSize,
            "Content-Range": `bytes ${start}-${end}/${totalSize}`,
            "Accept-Ranges": "bytes",
            "Cache-Control": "no-store",
          });
          const stream = createReadStream(filePath, { start, end });
          stream.pipe(response);
          stream.on("error", (error) => {
            console.error("[temp-asset-server] range stream error", error);
            response.destroy(error);
          });
          return;
        }
      }

      response.writeHead(200, {
        "Content-Type": mimeType,
        "Content-Length": totalSize,
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-store",
      });

      const stream = createReadStream(filePath);
      stream.pipe(response);
      stream.on("error", (error) => {
        console.error("[temp-asset-server] stream error", error);
        response.destroy(error);
      });
    } catch (error) {
      console.error("[temp-asset-server] unable to read file", error);
      response.writeHead(500);
      response.end("Asset unavailable.");
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.listen(0, "127.0.0.1", (error?: Error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    throw new Error("Failed to determine temp asset server port.");
  }

  const close = () =>
    new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });

  return {
    url: `http://127.0.0.1:${address.port}/asset`,
    close,
  };
};
