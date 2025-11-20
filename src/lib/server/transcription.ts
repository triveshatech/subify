import "server-only";

import OpenAI from "openai";
import type { CaptionSegment } from "@/lib/types/captions";
import {
  calculateDurationFromCaptions,
  sanitizeSegments,
} from "@/lib/utils/captions";

const MAX_FILE_SIZE_BYTES = 300 * 1024 * 1024;
const ACCEPTED_MIME = ["video/mp4", "audio/mp4", "audio/mpeg", "audio/mp3"];

const TRANSCRIBE_MODEL =
  process.env.OPENAI_TRANSCRIBE_MODEL?.trim() || "gpt-4o-mini-transcribe";

type WhisperWord = {
  id?: number;
  start?: number;
  end?: number;
  word?: string;
  text?: string;
};

type WhisperSegment = {
  id?: number;
  start?: number;
  end?: number;
  text?: string;
  timing?: {
    start?: number;
    end?: number;
  };
  words?: WhisperWord[];
};

type WhisperVerboseJson = {
  language?: string;
  duration?: number;
  segments?: WhisperSegment[];
  text?: string;
};

const buildClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY.");
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
};

const resolveResponseFormat = () => {
  if (TRANSCRIBE_MODEL.startsWith("whisper")) {
    return "verbose_json" as const;
  }
  return "json" as const;
};

type FileLike = Pick<File, "size" | "type">;

export const validateUploadFile = (file: FileLike) => {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `File exceeds ${Math.floor(MAX_FILE_SIZE_BYTES / 1024 / 1024)}MB limit.`,
    );
  }
  if (file.type && !ACCEPTED_MIME.includes(file.type)) {
    throw new Error(`Unsupported file type: ${file.type}`);
  }
};

export const transcribeToCaptions = async (file: File) => {
  validateUploadFile(file);

  const buffer = Buffer.from(await file.arrayBuffer());
  const readableFile = new File([buffer], file.name || "upload.mp4", {
    type: file.type || "video/mp4",
  });

  const openai = buildClient();
  const responseFormat = resolveResponseFormat();

  const transcription: WhisperVerboseJson =
    await openai.audio.transcriptions.create({
      file: readableFile,
      model: TRANSCRIBE_MODEL,
      response_format: responseFormat,
      temperature: 0.2,
      timestamp_granularities: ["word", "segment"],
    });

  const segmentSource: WhisperSegment[] =
    transcription.segments && transcription.segments.length > 0
      ? transcription.segments
      : transcription.text
        ? [
            {
              id: 0,
              start: 0,
              end: transcription.duration ?? 10,
              text: transcription.text,
            },
          ]
        : [];

  const segments: CaptionSegment[] = segmentSource.map((segment, index) => ({
    id: Number.isFinite(segment.id) ? Number(segment.id) : index,
    start: Number(segment.start ?? segment.timing?.start ?? 0),
    end: Number(segment.end ?? segment.timing?.end ?? 0),
    text: segment.text ?? "",
    words:
      segment.words?.map((word, wordIndex) => ({
        id: Number.isFinite(word.id) ? Number(word.id) : wordIndex,
        text: word.word ?? word.text ?? "",
        start: Number(word.start ?? 0),
        end: Number(word.end ?? 0),
      })) ?? [],
  }));

  const duration =
    Number.isFinite(transcription.duration) && transcription.duration
      ? Number(transcription.duration)
      : calculateDurationFromCaptions(segments);

  return {
    segments: sanitizeSegments(segments, { targetDuration: duration }),
    language: transcription.language ?? "hi-en",
    duration,
  };
};
