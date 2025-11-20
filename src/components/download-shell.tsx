"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import JSZip from "jszip";
import type { CaptionSession } from "@/lib/types/captions";
import { useSessionMedia } from "@/hooks/use-session-video";
import { captionsToSrt, captionsToVtt } from "@/lib/utils/subtitles";

type DownloadShellProps = {
  session: CaptionSession;
};

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const baseFileName = (session: CaptionSession) =>
  session.videoMetadata?.name?.replace(/\.[^.]+$/, "") ??
  `subify-${session.id.slice(0, 6)}`;

export const DownloadShell = ({ session }: DownloadShellProps) => {
  const { exportFile, exportFileName, isExportLoading } = useSessionMedia({
    sessionId: session.id,
  });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isBundling, setIsBundling] = useState(false);
  const baseName = useMemo(() => baseFileName(session), [session]);

  const srtContent = useMemo(
    () => captionsToSrt(session.captions),
    [session.captions]
  );
  const vttContent = useMemo(
    () => captionsToVtt(session.captions),
    [session.captions]
  );

  const ensureExport = () => {
    if (!exportFile) {
      setStatusMessage(
        "Video not found in this browser. Please return to the studio and re-export."
      );
      return false;
    }
    setStatusMessage(null);
    return true;
  };

  const handleDownloadVideo = () => {
    if (!ensureExport() || !exportFile) {
      return;
    }
    downloadBlob(exportFile, exportFileName ?? `${baseName}.mp4`);
  };

  const handleDownloadSubtitle = (format: "srt" | "vtt") => {
    const content = format === "srt" ? srtContent : vttContent;
    const blob = new Blob([content], {
      type: "text/plain;charset=utf-8",
    });
    downloadBlob(blob, `${baseName}.${format}`);
  };

  const handleDownloadBundle = async () => {
    if (!ensureExport() || !exportFile) {
      return;
    }
    setIsBundling(true);
    setStatusMessage("Packaging video + captions…");
    try {
      const zip = new JSZip();
      const mp4Name = exportFileName ?? `${baseName}.mp4`;
      zip.file(mp4Name, await exportFile.arrayBuffer());
      zip.file(`${baseName}.srt`, srtContent);
      zip.file(`${baseName}.vtt`, vttContent);
      const bundle = await zip.generateAsync({ type: "blob" });
      downloadBlob(bundle, `${baseName}-bundle.zip`);
      setStatusMessage("Bundle ready! Saved to your device.");
    } catch (error) {
      console.error("Failed to create bundle", error);
      setStatusMessage("Unable to create bundle. Please try again.");
    } finally {
      setIsBundling(false);
    }
  };

  return (
    <div className="grid gap-7">
      <section className="rounded-[32px] border border-white/10 bg-gradient-to-r from-slate-900/70 to-purple-900/40 p-8 text-white shadow-[0_35px_120px_rgba(79,70,229,0.35)]">
        <p className="text-xs uppercase tracking-[0.4em] text-indigo-200/80">
          Subify
        </p>
        <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">
          Your export is ready to download !
        </h1>
        <p className="mt-4 text-base text-white/80 sm:text-lg">
          Grab your finished video, clean subtitle files, or a complete bundle
          for easy sharing.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <article className="flex flex-col rounded-3xl border border-white/10 bg-black/50 p-6 text-white backdrop-blur">
          <div className="space-y-2">
            <p className="text-lg font-semibold">Video with subtitles</p>
            <ul className="text-sm text-white/70 list-disc pl-5 space-y-1">
              <li>Download your MP4 with subtitles perfectly baked in.</li>{" "}
              <li>Ideal for instant posting and sharing.</li>
            </ul>
          </div>
          <button
            type="button"
            onClick={handleDownloadVideo}
            disabled={isExportLoading || !exportFile}
            className="mt-auto inline-flex items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 px-4 py-3 text-sm font-semibold text-slate-900 shadow-[0_20px_65px_rgba(16,185,129,0.45)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isExportLoading ? "Loading…" : "Download MP4"}
          </button>
        </article>

        <article className="flex flex-col rounded-3xl border border-white/10 bg-black/50 p-6 text-white backdrop-blur">
          <div className="space-y-2">
            <p className="text-lg font-semibold">Subtitle files (SRT & VTT)</p>
            <ul className="text-sm text-white/70 list-disc pl-5 space-y-1">
              <li>Get clean subtitle files for editors and platforms.</li>
            </ul>
          </div>
          <div className="mt-auto grid gap-3 ">
            <button
              type="button"
              onClick={() => handleDownloadSubtitle("srt")}
              className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/30 "
            >
              Download .srt
            </button>
            <button
              type="button"
              onClick={() => handleDownloadSubtitle("vtt")}
              className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/30"
            >
              Download .vtt
            </button>
          </div>
        </article>

        <article className="flex flex-col rounded-3xl border border-white/10 bg-black/50 p-6 text-white backdrop-blur">
          <div className="space-y-2">
            <p className="text-lg font-semibold">Everything bundle</p>
            <ul className="text-sm text-white/70 list-disc pl-5 space-y-1">
              <li>Get a ZIP containing the MP4 + both subtitle formats.</li>
              <li>Best for delivering files to clients or teams.</li>
            </ul>
          </div>
          <button
            type="button"
            onClick={handleDownloadBundle}
            disabled={isBundling || isExportLoading || !exportFile}
            className="mt-auto inline-flex items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-r from-purple-500 via-indigo-500 to-fuchsia-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_20px_65px_rgba(99,102,241,0.45)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isBundling ? "Creating bundle…" : "Download bundle"}
          </button>
        </article>
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/40 p-6 text-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-base font-semibold">Need to make adjustments?</p>
            <p className="text-sm text-white/70">
             Hop back into the studio to tweak styling, reposition captions, or regenerate subtitles anytime.
            </p>
          </div>
          <Link
            href={`/studio/${session.id}`}
            className="inline-flex items-center justify-center rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white transition hover:border-white/40"
          >
            Return to studio
          </Link>
        </div>
        {statusMessage && (
          <p className="mt-4 text-sm text-amber-200">{statusMessage}</p>
        )}
      </section>
    </div>
  );
};
