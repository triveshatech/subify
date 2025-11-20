import { NextRequest, NextResponse } from "next/server";
import { transcribeToCaptions, validateUploadFile } from "@/lib/server/transcription";

export const runtime = "nodejs";
export const maxDuration = 300;

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

    try {
      validateUploadFile(file);
    } catch (validationError) {
      return NextResponse.json(
        { error: validationError instanceof Error ? validationError.message : "Invalid file." },
        { status: 400 },
      );
    }

    const result = await transcribeToCaptions(file);

    return NextResponse.json({
      segments: result.segments,
      language: result.language,
      duration: result.duration,
    });
  } catch (error) {
    console.error("[generate-captions]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate captions.",
      },
      { status: 500 },
    );
  }
}
