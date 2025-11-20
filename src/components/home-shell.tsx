"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_PLACEMENT } from "@/lib/constants/captions";
import type {
  CaptionPlacement,
  CaptionStylePreset,
} from "@/lib/types/captions";
import { saveSessionVideo } from "@/lib/client/video-store";
import { uploadFileToTempStore } from "@/lib/client/temp-upload";

const MAX_FILE_SIZE_MB = 300;
const DEFAULT_STYLE_PRESET: CaptionStylePreset = "standard";

export const HomeShell = () => {
  const router = useRouter();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [placement] = useState<CaptionPlacement>(DEFAULT_PLACEMENT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (file: File | null) => {
    setError(null);
    setVideoDuration(null);
    if (!file) {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
      setVideoFile(null);
      setPreviewUrl(null);
      return;
    }

    const fileSizeMb = file.size / (1024 * 1024);
    if (fileSizeMb > MAX_FILE_SIZE_MB) {
      setError(
        `File too large (${fileSizeMb.toFixed(
          1
        )}MB). Please upload a video under ${MAX_FILE_SIZE_MB}MB.`
      );
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setVideoFile(file);
    setPreviewUrl(nextUrl);
  };

  const handleSubmit = async () => {
    if (!videoFile) {
      setError("Upload an .mp4 video before generating captions.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      let requestInit: RequestInit = {};
      try {
        const upload = await uploadFileToTempStore(videoFile);
        requestInit = {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uploadId: upload.uploadId,
            stylePreset: DEFAULT_STYLE_PRESET,
            placement,
            duration: videoDuration,
          }),
        };
      } catch (uploadError) {
        console.warn("Falling back to direct upload", uploadError);
        const formData = new FormData();
        formData.append("file", videoFile);
        formData.append("stylePreset", DEFAULT_STYLE_PRESET);
        formData.append("placement", placement);
        if (videoDuration) {
          formData.append("duration", String(videoDuration));
        }
        requestInit = { body: formData };
      }

      const response = await fetch("/api/sessions", {
        method: "POST",
        ...requestInit,
      });

      if (!response.ok) {
        const message =
          (await response.text()) ||
          "Session creation failed. See server logs for details.";
        throw new Error(message);
      }

      const session = await response.json();
      try {
        await saveSessionVideo(session.id, videoFile);
      } catch (storageError) {
        console.error(storageError);
        throw new Error(
          "We couldn't save your video locally. Please allow storage access or free up disk space and try again."
        );
      }
      router.push(`/studio/${session.id}`);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Unexpected error occurred."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-r from-slate-900/70 to-purple-900/40 p-8 text-white shadow-[0_20px_120px_rgba(99,102,241,0.15)]">
        <div className="relative z-10 max-w-xl space-y-5">
          <h2 className="text-3xl font-semibold sm:text-4xl">
            Automatically generate subtitles that make your video shine.
          </h2>
          <p className="text-base text-white/80">
            Our AI listens, transcribes, and styles your subtitles - so you stay
            focused on creating.
          </p>
          <ul className="space-y-3 text-sm text-white/70">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-purple-500/20 text-xs text-purple-200">
                1
              </span>
              Upload your MP4 up to {MAX_FILE_SIZE_MB}MB.
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-purple-500/20 text-xs text-purple-200">
                2
              </span>
              We generates Hinglish-ready subtitles with seconds.
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-purple-500/20 text-xs text-purple-200">
                3
              </span>
              Perfect for reels, shorts, YouTube, and long-form content.
            </li>
          </ul>
          <div className="flex flex-wrap gap-4 text-sm text-white/70">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                Rating
              </p>
              <p className="mt-1 text-2xl font-semibold text-white">4.6</p>
              <p className="text-xs text-white/60">Based on creator feedback</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                Avg. render
              </p>
              <p className="mt-1 text-2xl font-semibold text-white">68s</p>
              <p className="text-xs text-white/60">per reel length video</p>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex w-1/3 items-center justify-center opacity-60">
          <div className="h-48 w-48 rounded-[32px] bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-300 blur-3xl" />
        </div>
      </section>

      <section className="space-y-6 rounded-[28px] border border-white/10 bg-black/40 p-6 text-white shadow-[0_25px_80px_rgba(0,0,0,0.35)] backdrop-blur">
        <div className="space-y-3">
          <p className="text-lg font-semibold text-white">Upload video</p>
          <p className="text-sm text-white/70">
            Your video stays private. Just drop it in and let the magic happen.
          </p>
        </div>

        <label
          htmlFor="video-upload"
          className="block rounded-2xl border border-dashed border-white/15 bg-white/5 px-5 py-6 text-center transition hover:border-white/40"
        >
          <div className="text-sm font-semibold text-white">
            Drop your video here
          </div>
          <p className="mt-1 text-xs text-white/60">
            MP4 only • Max size {MAX_FILE_SIZE_MB}MB
          </p>
          <input
            id="video-upload"
            type="file"
            accept="video/mp4"
            className="sr-only"
            onChange={(event) =>
              handleFileChange(event.currentTarget.files?.[0] ?? null)
            }
          />
          <button
            type="button"
            className="mt-4 inline-flex items-center justify-center rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-purple-800 shadow"
            onClick={() =>
              document
                .getElementById("video-upload")
                ?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
            }
          >
            Browse files
          </button>
        </label>

        {previewUrl && (
          <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
              Preview
            </p>
            <video
              src={previewUrl}
              controls
              className="mt-3 w-full rounded-xl border border-white/10"
            />
          </div>
        )}
        <div>
          {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            "Uploading & transcribing…"
          ) : (
            <>
              Continue to Studio
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L10.586 11H3a1 1 0 110-2h7.586L7.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </>
          )}
        </button>
      </section>

      <video
        className="hidden"
        src={previewUrl ?? undefined}
        onLoadedMetadata={(event) =>
          setVideoDuration(event.currentTarget.duration)
        }
      />
    </div>
  );
};
