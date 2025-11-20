"use client";

import {
  AbsoluteFill,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  Video,
} from "remotion";
import { useMemo } from "react";
import type { CaptionCompositionProps } from "@/lib/types/captions";
import { CaptionLayer } from "@/remotion/layers/caption-layer";
import { sanitizeSegments } from "@/lib/utils/captions";

const resolveVideoSrc = (videoSrc?: string) => {
  if (!videoSrc) return staticFile("samples/sample-input.mp4");
  if (
    videoSrc.startsWith("http") ||
    videoSrc.startsWith("blob:") ||
    videoSrc.startsWith("file:")
  ) {
    return videoSrc;
  }
  return staticFile(videoSrc.replace(/^\/+/, ""));
};

export const CaptionComposition = ({
  captions,
  videoSrc,
  stylePreset,
  placement,
  duration,
}: CaptionCompositionProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;
  const normalizedCaptions = useMemo(
    () => sanitizeSegments(captions, { targetDuration: duration }),
    [captions, duration],
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <Video
        src={resolveVideoSrc(videoSrc)}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
      <CaptionLayer
        captions={normalizedCaptions}
        currentTime={currentTime}
        stylePreset={stylePreset}
        placement={placement}
      />
    </AbsoluteFill>
  );
};
