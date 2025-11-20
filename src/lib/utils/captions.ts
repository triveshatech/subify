import type { CaptionSegment, WordTiming } from "@/lib/types/captions";

const MAX_SEGMENT_DURATION = 4.5;
const MAX_SEGMENT_CHARS = 84;
const MAX_SEGMENT_WORDS = 14;
const DURATION_TOLERANCE_RATIO = 0.05;
const DURATION_TOLERANCE_MIN_SECONDS = 0.5;

export const clampNumber = (value: number, min = 0, max = Number.POSITIVE_INFINITY) =>
  Math.min(Math.max(value, min), max);

export const roundToMillis = (value: number) => Math.round(value * 1000) / 1000;

export const formatSeconds = (value: number) => {
  const date = new Date(value * 1000);
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  const ms = String(date.getUTCMilliseconds()).padStart(3, "0");
  return `${hh}:${mm}:${ss},${ms}`;
};

export const calculateDurationFromCaptions = (
  captions: CaptionSegment[],
  fallback = 10,
) => {
  if (!captions.length) return fallback;
  const maxEnd = Math.max(...captions.map((segment) => segment.end));
  return roundToMillis(Math.max(maxEnd, fallback));
};

export const ensureWordTimings = (segment: CaptionSegment): CaptionSegment => {
  if (segment.words?.length) {
    return {
      ...segment,
      words: segment.words.map((word, idx) => ({
        id: word.id ?? idx,
        start: clampNumber(word.start, segment.start, segment.end),
        end: clampNumber(word.end, segment.start, segment.end),
        text: word.text,
      })),
    };
  }

  const words = segment.text.split(/\s+/).filter(Boolean);
  const segmentDuration = Math.max(segment.end - segment.start, 0.01);
  const perWord = segmentDuration / words.length;
  const generatedWords: WordTiming[] = words.map((word, index) => {
    const start = roundToMillis(segment.start + perWord * index);
    const end = roundToMillis(start + perWord);
    return { id: index, text: word, start, end };
  });

  return { ...segment, words: generatedWords };
};

const shouldSplitSegment = (segment: CaptionSegment) => {
  const duration = segment.end - segment.start;
  return (
    Boolean(segment.words && segment.words.length > 1) &&
    (segment.text.length > MAX_SEGMENT_CHARS ||
      duration > MAX_SEGMENT_DURATION ||
      (segment.words?.length ?? 0) > MAX_SEGMENT_WORDS)
  );
};

const chunkSegmentByWords = (segment: CaptionSegment): CaptionSegment[] => {
  if (!segment.words || segment.words.length <= 1) {
    return [segment];
  }

  const chunks: CaptionSegment[] = [];
  let buffer: WordTiming[] = [];

  const pushChunk = () => {
    if (!buffer.length) return;
    const chunkText = buffer.map((word) => word.text).join(" ").trim();
    const chunk: CaptionSegment = {
      ...segment,
      start: roundToMillis(buffer[0].start),
      end: roundToMillis(buffer[buffer.length - 1].end),
      text: chunkText,
      words: buffer,
    };
    chunks.push(chunk);
    buffer = [];
  };

  const exceedsLimits = (candidate: WordTiming[]) => {
    if (!candidate.length) return false;
    const duration = candidate[candidate.length - 1].end - candidate[0].start;
    const charCount = candidate.map((word) => word.text).join(" ").length;
    return (
      duration > MAX_SEGMENT_DURATION ||
      charCount > MAX_SEGMENT_CHARS ||
      candidate.length > MAX_SEGMENT_WORDS
    );
  };

  for (const word of segment.words) {
    const nextBuffer = buffer.concat(word);
    if (buffer.length && exceedsLimits(nextBuffer)) {
      pushChunk();
    }
    buffer.push(word);
  }

  pushChunk();
  return chunks;
};

const retimeSegments = (
  segments: CaptionSegment[],
  targetDuration?: number,
): CaptionSegment[] => {
  if (!targetDuration || !Number.isFinite(targetDuration) || targetDuration <= 0) {
    return segments;
  }

  const actualDuration = calculateDurationFromCaptions(segments);
  if (!Number.isFinite(actualDuration) || actualDuration <= 0) {
    return segments;
  }

  const tolerance =
    Math.max(targetDuration * DURATION_TOLERANCE_RATIO, DURATION_TOLERANCE_MIN_SECONDS);
  if (Math.abs(actualDuration - targetDuration) <= tolerance) {
    return segments;
  }

  const scale = targetDuration / actualDuration;
  if (!Number.isFinite(scale) || scale <= 0) {
    return segments;
  }

  const scaleTime = (value: number) => roundToMillis(value * scale);

  return segments.map((segment) => ({
    ...segment,
    start: scaleTime(segment.start),
    end: scaleTime(segment.end),
    words: segment.words?.map((word, index) => ({
      ...word,
      id: Number.isFinite(word.id) ? word.id : index,
      start: scaleTime(word.start),
      end: scaleTime(word.end),
    })),
  }));
};

type SanitizeOptions = {
  targetDuration?: number;
};

export const sanitizeSegments = (
  segments: CaptionSegment[],
  options?: SanitizeOptions,
): CaptionSegment[] => {
  const normalized = segments
    .filter((segment) => segment.text.trim().length > 0)
    .map((segment, index) =>
      ensureWordTimings({
        ...segment,
        id: Number.isFinite(segment.id) ? segment.id : index,
        start: roundToMillis(clampNumber(segment.start)),
        end: roundToMillis(clampNumber(segment.end)),
        text: segment.text.trim(),
      }),
    )
    .sort((a, b) => a.start - b.start);

  const exploded = normalized.flatMap((segment) =>
    shouldSplitSegment(segment) ? chunkSegmentByWords(segment) : [segment],
  );

  const retimed = retimeSegments(exploded, options?.targetDuration);

  return retimed.map((segment, index) => ({
    ...segment,
    id: index,
    start: roundToMillis(segment.start),
    end: roundToMillis(segment.end),
    text: segment.text.trim(),
  }));
};
