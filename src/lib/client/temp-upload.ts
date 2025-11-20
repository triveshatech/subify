"use client";

export type TempUploadResponse = {
  uploadId: string;
  fileName: string;
  mimeType: string;
  size: number;
  lastModified: number;
  expiresAt: number;
};

export const uploadFileToTempStore = async (file: File): Promise<TempUploadResponse> => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch("/api/uploads", {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const message =
      (await response.text()) ||
      "Upload failed before processing. Please try again with a smaller file.";
    throw new Error(message);
  }
  return (await response.json()) as TempUploadResponse;
};

export const deleteTempUpload = async (uploadId: string) => {
  await fetch(`/api/uploads?id=${encodeURIComponent(uploadId)}`, {
    method: "DELETE",
  }).catch(() => undefined);
};
