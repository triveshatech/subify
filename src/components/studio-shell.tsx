"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Player } from "@remotion/player";
import {
  CAPTION_PLACEMENT_OPTIONS,
  CAPTION_STYLE_PRESETS,
  DEFAULT_FPS,
  DEFAULT_VIDEO_DIMENSIONS,
} from "@/lib/constants/captions";
import type {
  CaptionPlacement,
  CaptionSession,
  CaptionStylePreset,
} from "@/lib/types/captions";
import { CaptionComposition } from "@/remotion/caption-composition";
import { useSessionMedia } from "@/hooks/use-session-video";
import { uploadFileToTempStore } from "@/lib/client/temp-upload";

type StudioShellProps = {
  initialSession: CaptionSession;
};

type ExportState = "idle" | "rendering" | "error" | "completed";

export const StudioShell = ({ initialSession }: StudioShellProps) => {
  const router = useRouter();
  const [session, setSession] = useState<CaptionSession>(initialSession);
  const [saveState, setSaveState] = useState<{
    isSaving: boolean;
    message: string | null;
  }>({ isSaving: false, message: null });
  const [exportState, setExportState] = useState<ExportState>("idle");
  const [exportError, setExportError] = useState<string | null>(null);
  const [renderProgress, setRenderProgress] = useState(0);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const resetProgressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const {
    videoFile,
    videoUrl,
    isVideoLoading,
    videoError,
    hasVideo,
    setExportBlob,
  } = useSessionMedia({ sessionId: session.id });

  const durationInFrames = useMemo(
    () => Math.ceil(session.duration * DEFAULT_FPS) || DEFAULT_FPS * 10,
    [session.duration]
  );

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (resetProgressTimeoutRef.current) {
        clearTimeout(resetProgressTimeoutRef.current);
      }
    };
  }, []);

  const beginProgressEmulation = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    setRenderProgress(0);
    progressIntervalRef.current = setInterval(() => {
      setRenderProgress((previous) => {
        if (previous >= 95) return previous;
        const increment = Math.random() * 7 + 2;
        return Math.min(previous + increment, 95);
      });
    }, 350);
  };

  const stopProgressEmulation = (isSuccessful: boolean) => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setRenderProgress(isSuccessful ? 100 : 0);
    if (resetProgressTimeoutRef.current) {
      clearTimeout(resetProgressTimeoutRef.current);
    }
    if (isSuccessful) {
      resetProgressTimeoutRef.current = setTimeout(
        () => setRenderProgress(0),
        1200
      );
    } else {
      resetProgressTimeoutRef.current = null;
    }
  };

  const updateSessionField = async (
    payload: Partial<Pick<CaptionSession, "stylePreset" | "placement">>
  ) => {
    setSaveState({ isSaving: true, message: "Saving changes..." });
    setSession((current) => ({ ...current, ...payload }));

    try {
      const response = await fetch(`/api/sessions/${session.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const next = (await response.json()) as CaptionSession;
      setSession(next);
      setSaveState({ isSaving: false, message: "Saved" });
    } catch (error) {
      console.error(error);
      setSaveState({
        isSaving: false,
        message:
          error instanceof Error ? error.message : "Failed to save changes.",
      });
    }
  };

  const handleStyleChange = (style: CaptionStylePreset) => {
    if (style === session.stylePreset) return;
    void updateSessionField({ stylePreset: style });
  };

  const handlePlacementChange = (placement: CaptionPlacement) => {
    if (placement === session.placement) return;
    void updateSessionField({ placement });
  };

  const handleExport = async () => {
    if (!videoFile) {
      setExportState("error");
      setExportError(
        "Original video missing in this browser. Re-upload it from the home page to export."
      );
      return;
    }
    setExportState("rendering");
    setExportError(null);
    beginProgressEmulation();
    try {
      let requestInit: RequestInit = {};
      try {
        const upload = await uploadFileToTempStore(videoFile);
        requestInit = {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uploadId: upload.uploadId,
          }),
        };
      } catch (uploadError) {
        console.warn("Falling back to direct export upload", uploadError);
        const formData = new FormData();
        formData.append("file", videoFile);
        requestInit = { body: formData };
      }

      const response = await fetch(`/api/sessions/${session.id}/export`, {
        method: "POST",
        ...requestInit,
      });
      if (!response.ok) {
        const message =
          (await response.text()) || "Export failed. Please try again.";
        throw new Error(message);
      }
      const blob = await response.blob();
      const safeName =
        session.videoMetadata?.name?.replace(/\.[^.]+$/, "") ??
        `subify-${session.id.slice(0, 6)}`;
      await setExportBlob(blob, `${safeName}-captions.mp4`);
      setExportState("completed");
      stopProgressEmulation(true);
      router.push(`/download/${session.id}`);
      return;
    } catch (error) {
      console.error(error);
      stopProgressEmulation(false);
      setExportState("error");
      setExportError(error instanceof Error ? error.message : "Export failed.");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
      <section className="space-y-6 rounded-2xl bg-white/5 p-6 backdrop-blur">
        <div className="space-y-3">
          <p className="text-lg font-semibold text-white/80">
          Caption Style
          </p>
          <div className="grid gap-3">
            {CAPTION_STYLE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleStyleChange(preset.id)}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  session.stylePreset === preset.id
                    ? "border-purple-400 bg-purple-500/10 text-white"
                    : "border-white/10 bg-white/5 text-white/70 hover:border-white/30"
                }`}
              >
                <p className="text-sm font-semibold">{preset.label}</p>
                <p className="text-xs text-white/60">{preset.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-lg font-semibold text-white/80">
            Caption Position
          </p>
          <div className="grid gap-3">
            {CAPTION_PLACEMENT_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => handlePlacementChange(option.id)}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  session.placement === option.id
                    ? "border-indigo-400 bg-indigo-500/10 text-white"
                    : "border-white/10 bg-white/5 text-white/70 hover:border-white/30"
                }`}
              >
                <p className="text-sm font-semibold">{option.label}</p>
                <p className="text-xs text-white/60">{option.description}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl bg-black/30 p-4 shadow-2xl shadow-purple-950/30 lg:p-6">
        <div className="flex flex-col gap-2 rounded-2xl border border-white/5 bg-black/40 p-4">
          <p className="text-lg font-semibold text-purple-200">Preview</p>
          <p className="text-sm text-white/70">
            See how your edited video will look before exporting.
          </p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-black/40 p-3">
          {isVideoLoading ? (
            <div className="flex h-[420px] items-center justify-center rounded-xl border border-white/5 text-sm text-white/70">
              Loading your video from secure browser storage…
            </div>
          ) : videoError ? (
            <div className="flex h-[420px] flex-col items-center justify-center gap-3 rounded-xl border border-red-500/30 bg-red-500/5 p-6 text-center text-sm text-red-200">
              <p className="font-semibold">Video unavailable</p>
              <p>{videoError}</p>
              <Link
                href="/"
                className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white transition hover:border-white/40"
              >
                Go back & re-upload
              </Link>
            </div>
          ) : videoUrl ? (
            <Player
              component={CaptionComposition}
              durationInFrames={durationInFrames}
              fps={DEFAULT_FPS}
              compositionWidth={DEFAULT_VIDEO_DIMENSIONS.width}
              compositionHeight={DEFAULT_VIDEO_DIMENSIONS.height}
              controls
              style={{
                width: "100%",
                borderRadius: "1rem",
                overflow: "hidden",
                background: "#000",
              }}
              inputProps={{
                captions: session.captions,
                fps: DEFAULT_FPS,
                videoSrc: videoUrl,
                stylePreset: session.stylePreset,
                placement: session.placement,
                duration: session.duration,
                width: DEFAULT_VIDEO_DIMENSIONS.width,
                height: DEFAULT_VIDEO_DIMENSIONS.height,
              }}
            />
          ) : (
            <div className="flex h-[420px] items-center justify-center rounded-xl border border-white/10 text-sm text-white/70">
              Video ready state unknown. Please reload the page.
            </div>
          )}
        </div>
        {saveState.message && (
          <p className="text-xs text-white/60">
            {saveState.isSaving ? saveState.message : `Status: ${saveState.message}`}
          </p>
        )}

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleExport}
            disabled={exportState === "rendering" || !hasVideo}
            className="relative flex h-14 w-full items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white/5 text-base font-semibold text-white shadow-[0_10px_40px_rgba(99,102,241,0.25)] transition hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <span
              className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500 via-indigo-500 to-fuchsia-500"
              style={{
                width:
                  exportState === "rendering"
                    ? `${Math.max(renderProgress, 12)}%`
                    : "100%",
                transition:
                  exportState === "rendering" ? "width 0.3s ease" : "none",
              }}
            />
            <span className="relative z-10 mix-blend-lighten">
              {exportState === "rendering"
                ? `Exporting ${Math.round(renderProgress)}%…`
                : "Export Video"}
            </span>
          </button>
          {exportState === "completed" && (
            <p className="text-xs text-emerald-200">
              Exported! Redirecting you to the download hub…
            </p>
          )}
          {exportState === "error" && exportError && (
            <p className="text-xs text-red-300">{exportError}</p>
          )}
        </div>
      </section>
    </div>
  );
};
