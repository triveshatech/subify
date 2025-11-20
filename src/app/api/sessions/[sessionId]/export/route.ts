import { Buffer } from "buffer";
import { createReadStream } from "fs";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_FPS, DEFAULT_VIDEO_DIMENSIONS } from "@/lib/constants/captions";
import { readSession } from "@/lib/server/session-store";
import type { CaptionCompositionProps } from "@/lib/types/captions";
import { sanitizeSegments } from "@/lib/utils/captions";
import { validateUploadFile } from "@/lib/server/transcription";
import { createTempAssetServer } from "@/lib/server/temp-asset-server";
import {
  copyTempUploadTo,
  deleteTempUpload,
  describeTempUpload,
} from "@/lib/server/temp-upload-store";
import { renderCaptionVideo } from "@/lib/server/remotion-renderer-new";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

const streamFile = (filePath: string, cleanup?: () => Promise<void> | void) => {
  let stream: ReturnType<typeof createReadStream> | null = null;
  const runCleanup = () => {
    if (!cleanup) return;
    return Promise.resolve()
      .then(() => cleanup())
      .catch((error) => {
        console.error("[sessions:export] cleanup failed", error);
      });
  };
  return new ReadableStream<Uint8Array>({
    start(controller) {
      stream = createReadStream(filePath);
      stream.on("data", (chunk) => {
        const payload = chunk instanceof Buffer ? chunk : Buffer.from(chunk);
        controller.enqueue(new Uint8Array(payload));
      });
      stream.on("end", () => {
        controller.close();
        stream?.close();
        void runCleanup();
      });
      stream.on("error", (error) => {
        controller.error(error);
        void runCleanup();
      });
    },
    cancel() {
      stream?.destroy();
      return runCleanup();
    },
  });
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const deleteWithRetries = async (targetPath: string, attempts = 5) => {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      await fs.rm(targetPath, { recursive: true, force: true });
      return;
    } catch (error) {
      if (attempt === attempts - 1) {
        throw error;
      }
      await delay(100 * (attempt + 1));
    }
  }
};

type UploadResolution =
  | { kind: "file"; file: File }
  | { kind: "temp"; uploadId: string };

const resolveExportUpload = async (request: NextRequest): Promise<UploadResolution> => {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await request.json();
    if (!body?.uploadId) {
      throw new Error("Missing uploaded video reference.");
    }
    return { kind: "temp", uploadId: String(body.uploadId) };
  }
  const formData = await request.formData();
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    throw new Error("Expected `file` in form data.");
  }
  return { kind: "file", file };
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { sessionId } = await context.params;
    const session = await readSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }
    const upload = await resolveExportUpload(request);

    let tempUploadMetadata: ReturnType<typeof describeTempUpload> | null = null;
    if (upload.kind === "file") {
      validateUploadFile(upload.file);
    } else {
      tempUploadMetadata = describeTempUpload(upload.uploadId);
      if (!tempUploadMetadata) {
        throw new Error("Uploaded video expired. Please upload it again.");
      }
      // Validate size/type via metadata (size check occurs during upload)
      validateUploadFile({
        size: tempUploadMetadata.size,
        type: tempUploadMetadata.mimeType,
      });
    }

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "subify-export-"));
    let tmpDirActive = true;
    const removeTmpDir = async () => {
      if (!tmpDirActive) return;
      tmpDirActive = false;
      await deleteWithRetries(tmpDir);
    };
    const sourcePath = path.join(tmpDir, "source");
    const outputFile = path.join(tmpDir, `${sessionId}-export.mp4`);

    try {
      if (upload.kind === "file") {
        const buffer = Buffer.from(await upload.file.arrayBuffer());
        await fs.writeFile(sourcePath, buffer);
      } else {
        await copyTempUploadTo(upload.uploadId, sourcePath);
      }
      const assetServer = await createTempAssetServer(
        sourcePath,
        upload.kind === "file"
          ? upload.file.type || "video/mp4"
          : tempUploadMetadata?.mimeType || "video/mp4",
      );

      const props: CaptionCompositionProps = {
        captions: sanitizeSegments(session.captions, {
          targetDuration: session.duration,
        }),
        videoSrc: assetServer.url,
        stylePreset: session.stylePreset,
        placement: session.placement,
        fps: DEFAULT_FPS,
        duration: session.duration,
        width: DEFAULT_VIDEO_DIMENSIONS.width,
        height: DEFAULT_VIDEO_DIMENSIONS.height,
      };

      try {
        await renderCaptionVideo(props, outputFile);
      } finally {
        await assetServer.close();
      }

      const headers = new Headers({
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${path.basename(outputFile)}"`,
        "Cache-Control": "no-store",
      });

      const body = streamFile(outputFile, removeTmpDir);

      return new NextResponse(body, {
        headers,
      });
    } catch (error) {
      await removeTmpDir();
      throw error;
    } finally {
      if (upload.kind === "temp") {
        await deleteTempUpload(upload.uploadId).catch((err) =>
          console.warn("[sessions:export] temp upload cleanup failed", err),
        );
      }
    }
  } catch (error) {
    console.error("[sessions:export]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to render captioned video.",
      },
      { status: 500 },
    );
  }
}
