// Browser-side helper for POST /api/upload that turns failures into readable messages.

// Vercel rejects serverless request bodies over 4.5 MB before our route runs; leave room for form overhead.
export const MAX_UPLOAD_BYTES = 4.4 * 1024 * 1024;

export interface UploadResult {
  url: string;
  filePath: string;
  width?: number;
  height?: number;
  orientation?: string;
}

export async function uploadFile(file: File, subdir: string): Promise<UploadResult> {
  if (file.size > MAX_UPLOAD_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    throw new Error(`"${file.name}" is ${mb} MB; the limit is 4.4 MB. Compress or resize the image and try again.`);
  }

  const form = new FormData();
  form.append("file", file);
  form.append("subdir", subdir);
  const res = await fetch("/api/upload", { method: "POST", body: form });

  if (res.status === 413) {
    throw new Error(`"${file.name}" is too large to upload. Keep images under 4.4 MB.`);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.url) {
    throw new Error(data?.error || `Upload failed (HTTP ${res.status}).`);
  }
  return data as UploadResult;
}
