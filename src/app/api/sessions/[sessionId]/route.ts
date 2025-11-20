import { NextRequest, NextResponse } from "next/server";
import {
  CAPTION_PLACEMENT_OPTIONS,
  CAPTION_STYLE_PRESETS,
} from "@/lib/constants/captions";
import { readSession, updateSession } from "@/lib/server/session-store";
import type {
  CaptionPlacement,
  CaptionStylePreset,
  CaptionSegment,
} from "@/lib/types/captions";
import { sanitizeSegments } from "@/lib/utils/captions";

const isValidStyle = (value: string): value is CaptionStylePreset =>
  CAPTION_STYLE_PRESETS.some((preset) => preset.id === value);

const isValidPlacement = (value: string): value is CaptionPlacement =>
  CAPTION_PLACEMENT_OPTIONS.some((option) => option.id === value);

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { sessionId } = await context.params;
    const session = await readSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }
    return NextResponse.json(session);
  } catch (error) {
    console.error("[sessions:get]", error);
    return NextResponse.json(
      { error: "Failed to load session." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { sessionId } = await context.params;
    const existing = await readSession(sessionId);
    if (!existing) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }
    const body = await request.json();
    const patch: Partial<{
      stylePreset: CaptionStylePreset;
      placement: CaptionPlacement;
      captions: CaptionSegment[];
    }> = {};

    if (body.stylePreset && isValidStyle(body.stylePreset)) {
      patch.stylePreset = body.stylePreset;
    }

    if (body.placement && isValidPlacement(body.placement)) {
      patch.placement = body.placement;
    }

    if (body.captions?.length) {
      patch.captions = sanitizeSegments(body.captions, {
        targetDuration: existing.duration,
      });
    }

    if (!Object.keys(patch).length) {
      return NextResponse.json(
        { error: "No valid fields provided." },
        { status: 400 },
      );
    }

    const updated = await updateSession(sessionId, patch);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("[sessions:update]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update session." },
      { status: 500 },
    );
  }
}
