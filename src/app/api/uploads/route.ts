import { NextRequest, NextResponse } from "next/server";
import {
  createTempUploadFromFile,
  deleteTempUpload,
} from "@/lib/server/temp-upload-store";
import { validateUploadFile } from "@/lib/server/transcription";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Expected `file` in multipart form data." },
        { status: 400 },
      );
    }

    validateUploadFile(file);

    const upload = await createTempUploadFromFile(file);

    return NextResponse.json({
      uploadId: upload.id,
      fileName: upload.fileName,
      mimeType: upload.mimeType,
      size: upload.size,
      lastModified: upload.lastModified,
      expiresAt: upload.expiresAt,
    });
  } catch (error) {
    console.error("[uploads:handle]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to store upload." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get("id");
    if (!uploadId) {
      return NextResponse.json({ error: "Missing upload id." }, { status: 400 });
    }
    await deleteTempUpload(uploadId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[uploads:delete]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete upload." },
      { status: 500 },
    );
  }
}
