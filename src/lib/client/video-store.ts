"use client";

const DB_NAME = "subify-media";
const DB_VERSION = 1;
const VIDEO_STORE = "videos";
const EXPORT_STORE = "exports";

type VideoRecord = {
  id: string;
  file: Blob;
  name?: string;
  type?: string;
  size?: number;
  lastModified?: number;
  createdAt: number;
};

type ExportRecord = VideoRecord;

const getIndexedDB = (): IDBFactory => {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is not available on the server.");
  }
  if (!("indexedDB" in window)) {
    throw new Error("IndexedDB is not supported in this browser.");
  }
  return window.indexedDB;
};

const wrapRequest = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
  });

const openDatabase = async () => {
  const indexedDB = getIndexedDB();
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains(VIDEO_STORE)) {
      db.createObjectStore(VIDEO_STORE, { keyPath: "id" });
    }
    if (!db.objectStoreNames.contains(EXPORT_STORE)) {
      db.createObjectStore(EXPORT_STORE, { keyPath: "id" });
    }
  };
  return wrapRequest<IDBDatabase>(request);
};

const toFile = (record: VideoRecord | undefined | null) => {
  if (!record?.file) {
    return null;
  }
  const { file, name, type, lastModified } = record;
  return new File([file], name ?? "video.mp4", {
    type: type ?? file.type,
    lastModified: lastModified ?? Date.now(),
  });
};

const persistRecord = async (storeName: string, data: VideoRecord | ExportRecord) => {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to persist record."));
    tx.objectStore(storeName).put(data);
  });
};

const readRecord = async (storeName: string, id: string) => {
  const db = await openDatabase();
  const tx = db.transaction(storeName, "readonly");
  return wrapRequest<VideoRecord | undefined>(tx.objectStore(storeName).get(id));
};

const deleteRecord = async (storeName: string, id: string) => {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to delete record."));
    tx.objectStore(storeName).delete(id);
  });
};

export const saveSessionVideo = async (sessionId: string, file: File) => {
  await persistRecord(VIDEO_STORE, {
    id: sessionId,
    file,
    name: file.name,
    type: file.type,
    size: file.size,
    lastModified: file.lastModified,
    createdAt: Date.now(),
  });
};

export const getSessionVideoFile = async (sessionId: string) => {
  const record = await readRecord(VIDEO_STORE, sessionId);
  return toFile(record);
};

export const deleteSessionVideo = async (sessionId: string) => {
  await deleteRecord(VIDEO_STORE, sessionId);
};

export const saveSessionExport = async (sessionId: string, blob: Blob, fileName: string) => {
  await persistRecord(EXPORT_STORE, {
    id: sessionId,
    file: blob,
    name: fileName,
    type: blob.type || "video/mp4",
    size: blob.size,
    lastModified: Date.now(),
    createdAt: Date.now(),
  });
};

export const getSessionExportFile = async (sessionId: string) => {
  const record = await readRecord(EXPORT_STORE, sessionId);
  return toFile(record);
};

export const deleteSessionExport = async (sessionId: string) => {
  await deleteRecord(EXPORT_STORE, sessionId);
};
