export type WordTiming = {
  id?: number;
  start: number;
  end: number;
  text: string;
};

export type CaptionSegment = {
  id: number;
  start: number;
  end: number;
  text: string;
  words?: WordTiming[];
};

export type CaptionStylePreset = "standard" | "topBar" | "karaoke";
export type CaptionPlacement = "top" | "middle" | "bottom";

export type CaptionResponse = {
  segments: CaptionSegment[];
  language?: string;
  duration?: number;
};

export type CaptionCompositionProps = {
  captions: CaptionSegment[];
  videoSrc: string;
  stylePreset: CaptionStylePreset;
  placement: CaptionPlacement;
  fps: number;
  duration?: number;
  width?: number;
  height?: number;
};

export type SessionVideoMetadata = {
  name?: string;
  size?: number;
  type?: string;
  lastModified?: number;
};

export type CaptionSession = {
  id: string;
  captions: CaptionSegment[];
  stylePreset: CaptionStylePreset;
  placement: CaptionPlacement;
  duration: number;
  language?: string;
  videoMetadata?: SessionVideoMetadata;
  createdAt: string;
  updatedAt: string;
};
