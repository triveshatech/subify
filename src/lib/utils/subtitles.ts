import type { CaptionSegment } from "@/lib/types/captions";
import { formatSeconds, sanitizeSegments } from "@/lib/utils/captions";

const formatVttTime = (seconds: number) => formatSeconds(seconds).replace(",", ".");

const buildLines = (segment: CaptionSegment) => segment.text.split(/\r?\n/).join("\n");

export const captionsToSrt = (segments: CaptionSegment[]) => {
  const normalized = sanitizeSegments(segments);
  const lines = normalized.map((segment, index) => {
    const start = formatSeconds(segment.start);
    const end = formatSeconds(segment.end);
    return `${index + 1}\n${start} --> ${end}\n${buildLines(segment)}\n`;
  });
  return lines.join("\n").trim() + "\n";
};

export const captionsToVtt = (segments: CaptionSegment[]) => {
  const normalized = sanitizeSegments(segments);
  const body = normalized
    .map((segment) => {
      const start = formatVttTime(segment.start);
      const end = formatVttTime(segment.end);
      return `${start} --> ${end}\n${buildLines(segment)}\n`;
    })
    .join("\n")
    .trim();
  return `WEBVTT\n\n${body}\n`;
};
