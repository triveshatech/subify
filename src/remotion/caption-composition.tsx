"use client";

import {
  AbsoluteFill,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  Video,
  continueRender,
  delayRender,
} from "remotion";
import { useEffect, useMemo, useState } from "react";
import type { CaptionCompositionProps } from "@/lib/types/captions";
import { CaptionLayer } from "@/remotion/layers/caption-layer";
import { sanitizeSegments } from "@/lib/utils/captions";
import { ensureCaptionFonts } from "../../remotion/fonts";

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
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;
  const normalizedCaptions = useMemo(
    () => sanitizeSegments(captions, { targetDuration: duration }),
    [captions, duration],
  );

  useEffect(() => {
    const handle = delayRender("Loading caption fonts");
    
    ensureCaptionFonts()
      .then(() => {
        setFontsLoaded(true);
        continueRender(handle);
      })
      .catch((error) => {
        console.error("Failed to load caption fonts:", error);
        // Continue anyway with fallback fonts
        setFontsLoaded(true);
        continueRender(handle);
      });
  }, []);

  // Don't render captions until fonts are loaded
  if (!fontsLoaded) {
    return (
      <AbsoluteFill style={{ backgroundColor: "black" }}>
        <Video
          src={resolveVideoSrc(videoSrc)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </AbsoluteFill>
    );
  }

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
