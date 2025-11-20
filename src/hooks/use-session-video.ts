"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  deleteSessionExport,
  getSessionExportFile,
  getSessionVideoFile,
  saveSessionExport,
} from "@/lib/client/video-store";

type UseSessionVideoOptions = {
  sessionId: string;
};

export const useSessionMedia = ({ sessionId }: UseSessionVideoOptions) => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(true);

  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [isExportLoading, setIsExportLoading] = useState(true);
  const [exportFileName, setExportFileName] = useState<string | null>(null);
  const [exportFile, setExportFile] = useState<File | null>(null);

  const revokeRef = useRef<(() => void) | null>(null);
  const revokeExportRef = useRef<(() => void) | null>(null);

  const loadVideo = useCallback(async () => {
    setIsVideoLoading(true);
    setVideoError(null);
    try {
      const stored = await getSessionVideoFile(sessionId);
      if (!stored) {
        throw new Error("Original video missing. Please re-upload from the home screen.");
      }
      setVideoFile(stored);
      const nextUrl = URL.createObjectURL(stored);
      if (revokeRef.current) {
        revokeRef.current();
      }
      revokeRef.current = () => URL.revokeObjectURL(nextUrl);
      setVideoUrl(nextUrl);
    } catch (error) {
      console.error("Failed to load stored video", error);
      setVideoFile(null);
      setVideoUrl(null);
      setVideoError(
        error instanceof Error ? error.message : "Failed to read stored video."
      );
    } finally {
      setIsVideoLoading(false);
    }
  }, [sessionId]);

  const loadExport = useCallback(async () => {
    setIsExportLoading(true);
    try {
      const stored = await getSessionExportFile(sessionId);
      if (!stored) {
        if (revokeExportRef.current) {
          revokeExportRef.current();
          revokeExportRef.current = null;
        }
        setExportUrl(null);
        setExportFileName(null);
        setExportFile(null);
        return;
      }
      setExportFile(stored);
      const nextUrl = URL.createObjectURL(stored);
      if (revokeExportRef.current) {
        revokeExportRef.current();
      }
      revokeExportRef.current = () => URL.revokeObjectURL(nextUrl);
      setExportUrl(nextUrl);
      setExportFileName(stored.name);
    } catch (error) {
      console.error("Failed to load stored export", error);
      setExportUrl(null);
      setExportFileName(null);
      setExportFile(null);
    } finally {
      setIsExportLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void loadVideo();
    return () => {
      if (revokeRef.current) {
        revokeRef.current();
      }
    };
  }, [loadVideo]);

  useEffect(() => {
    void loadExport();
    return () => {
      if (revokeExportRef.current) {
        revokeExportRef.current();
      }
    };
  }, [loadExport]);

  const setExportBlob = useCallback(
    async (blob: Blob, fileName: string) => {
      await saveSessionExport(sessionId, blob, fileName);
      await loadExport();
    },
    [loadExport, sessionId],
  );

  const clearExportBlob = useCallback(async () => {
    await deleteSessionExport(sessionId);
    await loadExport();
  }, [loadExport, sessionId]);

  const hasVideo = useMemo(() => Boolean(videoFile && videoUrl), [videoFile, videoUrl]);

  return {
    videoFile,
    videoUrl,
    isVideoLoading,
    videoError,
    reloadVideo: loadVideo,
    hasVideo,
    exportUrl,
    isExportLoading,
    setExportBlob,
    exportFileName,
    exportFile,
    clearExportBlob,
  };
};
