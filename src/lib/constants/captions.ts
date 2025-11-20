import type {
  CaptionPlacement,
  CaptionSegment,
  CaptionStylePreset,
} from "@/lib/types/captions";
import { sanitizeSegments } from "@/lib/utils/captions";

export const DEFAULT_FPS = 30;
export const DEFAULT_VIDEO_DIMENSIONS = {
  width: 1280,
  height: 720,
};

export const CAPTION_STYLE_PRESETS: {
  id: CaptionStylePreset;
  label: string;
  description: string;
}[] = [
  {
    id: "standard",
    label: "Standard/Subtle",
    description: "Clean and minimal captions that fit any video style.",
  },
  {
    id: "karaoke",
    label: "Pop/Karaoke",
    description: "Word-by-word highlight that tracks the speech rhythm.",
  },
  {
    id: "topBar",
    label: "News Bar",
    description: "Solid bar-styled captions ideal for commentary or breakdown videos.",
  },
];

export const CAPTION_PLACEMENT_OPTIONS: {
  id: CaptionPlacement;
  label: string;
  description: string;
}[] = [
  {
    id: "bottom",
    label: "Bottom-center",
    description: "The classic subtitle placement - clean and easy to read.",
  },
  {
    id: "middle",
    label: "Center Overlay",
    description: "Place your captions in the center of your video for emphasis.",
  },
  {
    id: "top",
    label: "Top-center",
    description: "Center your captions at the top for a cleaner look.",
  },
];

export const DEFAULT_PLACEMENT: CaptionPlacement = "bottom";

export const SAMPLE_CAPTIONS: CaptionSegment[] = sanitizeSegments([
  {
    id: 0,
    start: 0,
    end: 2.6,
    text: "Namaste dosto, welcome back to the channel!",
  },
  {
    id: 1,
    start: 2.6,
    end: 5.2,
    text: "Aaj hum ek quick Hinglish caption demo dekh rahe hain.",
  },
  {
    id: 2,
    start: 5.2,
    end: 8.1,
    text: "Video pe subtitles overlay karna super easy hai.",
  },
  {
    id: 3,
    start: 8.1,
    end: 11.5,
    text: "Chaliye, captions ko teen styles mein preview karte hain.",
  },
]);
