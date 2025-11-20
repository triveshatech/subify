import "server-only";

import crypto from "crypto";
import { promises as fs } from "fs";
import os from "os";
import path from "path";

type TempUploadRecord = {
  id: string;
  filePath: string;
  fileName: string;
  mimeType: string;
  size: number;
  lastModified: number;
  createdAt: number;
  expiresAt: number;
};

const UPLOAD_TTL_MS =
  Number.parseInt(process.env.SUBIFY_UPLOAD_TTL_MS ?? "", 10) || 30 * 60 * 1000;
const UPLOAD_DIR = path.join(os.tmpdir(), "subify-upload-cache");

type UploadStore = Map<string, TempUploadRecord>;

declare global {
  // eslint-disable-next-line no-var
  var __subifyTempUploadStore: UploadStore | undefined;
}

const getStore = (): UploadStore => {
  if (!global.__subifyTempUploadStore) {
    global.__subifyTempUploadStore = new Map();
  }
  return global.__subifyTempUploadStore;
};

const purgeExpiredUploads = async () => {
  const store = getStore();
  const now = Date.now();
  const removals: Promise<unknown>[] = [];
  for (const record of store.values()) {
    if (record.expiresAt <= now) {
      store.delete(record.id);
      removals.push(fs.unlink(record.filePath).catch(() => undefined));
    }
  }
  await Promise.all(removals);
};

const ensureUploadDir = async () => {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
};

const writeFileFromBlob = async (file: File, filePath: string) => {
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);
};

export const createTempUploadFromFile = async (file: File): Promise<TempUploadRecord> => {
  await purgeExpiredUploads();
  await ensureUploadDir();
  const id = crypto.randomBytes(16).toString("hex");
  const filePath = path.join(UPLOAD_DIR, `${id}.bin`);
  const now = Date.now();
  try {
    await writeFileFromBlob(file, filePath);
  } catch (error) {
    await fs.unlink(filePath).catch(() => undefined);
    throw error;
  }
  const record: TempUploadRecord = {
    id,
    filePath,
    fileName: file.name || "upload.mp4",
    mimeType: file.type || "video/mp4",
    size: file.size,
    lastModified: file.lastModified ?? now,
    createdAt: now,
    expiresAt: now + UPLOAD_TTL_MS,
  };
  getStore().set(id, record);
  return record;
};

const getTempUpload = (id: string): TempUploadRecord | null => {
  const record = getStore().get(id) ?? null;
  if (!record) {
    return null;
  }
  if (record.expiresAt <= Date.now()) {
    void deleteTempUpload(id);
    return null;
  }
  return record;
};

export const readTempUploadAsFile = async (id: string): Promise<File> => {
  const record = getTempUpload(id);
  if (!record) {
    throw new Error("Upload expired or missing.");
  }
  const buffer = await fs.readFile(record.filePath);
  return new File([buffer], record.fileName, {
    type: record.mimeType,
    lastModified: record.lastModified,
  });
};

export const copyTempUploadTo = async (id: string, destinationPath: string) => {
  const record = getTempUpload(id);
  if (!record) {
    throw new Error("Upload expired or missing.");
  }
  await fs.copyFile(record.filePath, destinationPath);
};

export const deleteTempUpload = async (id: string) => {
  const record = getStore().get(id);
  if (!record) {
    return;
  }
  getStore().delete(id);
  await fs.unlink(record.filePath).catch(() => undefined);
};

export const describeTempUpload = (id: string): Omit<TempUploadRecord, "filePath"> | null => {
  const record = getTempUpload(id);
  if (!record) {
    return null;
  }
  const { filePath: _ignored, ...rest } = record;
  return rest;
};
