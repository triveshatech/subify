"use client";

import type { CSSProperties } from "react";
import type {
  CaptionPlacement,
  CaptionSegment,
  CaptionStylePreset,
} from "@/lib/types/captions";
import { CAPTION_FONT_STACK } from "../../../remotion/fonts";

type CaptionLayerProps = {
  captions: CaptionSegment[];
  currentTime: number;
  stylePreset: CaptionStylePreset;
  placement: CaptionPlacement;
};

const findActiveCaption = (captions: CaptionSegment[], time: number) =>
  captions.find(
    (segment) => time >= segment.start && time <= segment.end + 0.1,
  );

const placementStyles: Record<CaptionPlacement, CSSProperties> = {
  top: {
    top: 48,
    bottom: "auto",
    transform: "translateX(-50%)",
  },
  middle: {
    top: "50%",
    bottom: "auto",
    transform: "translate(-50%, -50%)",
  },
  bottom: {
    bottom: 48,
    top: "auto",
    transform: "translateX(-50%)",
  },
};

export const CaptionLayer = ({
  captions,
  currentTime,
  stylePreset,
  placement,
}: CaptionLayerProps) => {
  const active = findActiveCaption(captions, currentTime);

  if (!active) {
    return null;
  }

  const basePositionStyle = placementStyles[placement] ?? placementStyles.bottom;

  if (stylePreset === "topBar") {
    return (
      <div
        style={{
          position: "absolute",
          ...basePositionStyle,
          left: "50%",
          width: "90%",
          padding: "18px 32px",
          borderRadius: "999px",
          background:
            "linear-gradient(90deg, rgba(124,58,237,0.95), rgba(59,130,246,0.95))",
          color: "#fff",
          fontSize: 36,
          fontWeight: 700,
          fontFamily: CAPTION_FONT_STACK,
          textAlign: "center",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          boxShadow: "0 15px 70px rgba(76, 29, 149, 0.45)",
        }}
      >
        {active.text}
      </div>
    );
  }

  if (stylePreset === "karaoke") {
    const words = active.words ?? [];
    return (
      <div
        style={{
          position: "absolute",
          ...basePositionStyle,
          left: "50%",
          width: "80%",
          textAlign: "center",
          fontSize: 40,
          fontWeight: 600,
          fontFamily: CAPTION_FONT_STACK,
          lineHeight: 1.4,
          textShadow: "0 6px 30px rgba(0,0,0,0.45)",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            flexWrap: "wrap",
            gap: 8,
            padding: "14px 28px",
            borderRadius: 20,
            backgroundColor: "rgba(0,0,0,0.55)",
            fontFamily: CAPTION_FONT_STACK,
          }}
        >
          {words.map((word) => {
            const progress =
              (currentTime - word.start) / (word.end - word.start || 0.001);
            const clamped = Math.min(Math.max(progress, 0), 1);
            const color =
              clamped >= 1
                ? "#facc15"
                : `rgba(255,255,255,${0.4 + clamped * 0.6})`;
            return (
              <span
                key={`${word.id}-${word.text}`}
                style={{
                  color,
                  transition: "color 0.15s linear",
                }}
              >
                {word.text}
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        ...basePositionStyle,
        left: "50%",
        width: "80%",
        padding: "20px 32px",
        borderRadius: 28,
        backgroundColor: "rgba(0,0,0,0.65)",
        color: "white",
        fontSize: 42,
        fontWeight: 600,
        fontFamily: CAPTION_FONT_STACK,
        textAlign: "center",
        lineHeight: 1.35,
        textShadow: "0 8px 30px rgba(0,0,0,0.6)",
      }}
    >
      {active.text}
    </div>
  );
};
