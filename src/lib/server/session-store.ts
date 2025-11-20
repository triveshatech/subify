import "server-only";

import { promises as fs } from "fs";
import os from "os";
import path from "path";
import type {
  CaptionSession,
  CaptionPlacement,
  CaptionStylePreset,
  CaptionSegment,
  SessionVideoMetadata,
} from "@/lib/types/captions";

const STORAGE_ROOT = (() => {
  if (process.env.SUBIFY_STORAGE_ROOT) {
    return process.env.SUBIFY_STORAGE_ROOT;
  }
  if (process.env.VERCEL) {
    return path.join(os.tmpdir(), "subify-storage");
  }
  return path.join(process.cwd(), "storage");
})();
const SESSIONS_DIR = path.join(STORAGE_ROOT, "sessions");

const ensureDir = async (dir: string) => {
  await fs.mkdir(dir, { recursive: true });
};

const sessionPath = (id: string) => path.join(SESSIONS_DIR, `${id}.json`);

export const ensureStorage = async () => {
  await ensureDir(SESSIONS_DIR);
};

export const readSession = async (id: string): Promise<CaptionSession | null> => {
  try {
    const file = await fs.readFile(sessionPath(id), "utf8");
    return JSON.parse(file) as CaptionSession;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
};

export const saveSession = async (session: CaptionSession) => {
  await ensureStorage();
  await fs.writeFile(sessionPath(session.id), JSON.stringify(session, null, 2), "utf8");
};

type SessionUpdate = Partial<
  Pick<
    CaptionSession,
    "captions" | "stylePreset" | "placement" | "duration" | "language" | "videoMetadata"
  >
>;

export const updateSession = async (id: string, patch: SessionUpdate) => {
  const existing = await readSession(id);
  if (!existing) {
    throw new Error("Session not found.");
  }
  const updated: CaptionSession = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await saveSession(updated);
  return updated;
};

export const createSessionRecord = ({
  id,
  captions,
  stylePreset,
  placement,
  duration,
  language,
  videoMetadata,
}: {
  id: string;
  captions: CaptionSegment[];
  stylePreset: CaptionStylePreset;
  placement: CaptionPlacement;
  duration: number;
  language?: string;
  videoMetadata?: SessionVideoMetadata;
}): CaptionSession => {
  const now = new Date().toISOString();
  return {
    id,
    captions,
    stylePreset,
    placement,
    duration,
    language,
    videoMetadata,
    createdAt: now,
    updatedAt: now,
  };
};
