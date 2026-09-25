import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { put, del } from "@vercel/blob";

// Storage provider interface. Files are addressed by the URL returned from save/saveAt:
// a "/uploads/..." path for local disk, or an absolute https URL for Vercel Blob.
export interface StorageProvider {
  // Save under a unique, collision-free name derived from originalName.
  save(buffer: Buffer, subdir: string, originalName: string): Promise<{ url: string; filePath: string }>;
  // Save at an exact path (e.g. "certificates/<project>/RA123.pdf"), overwriting any existing file.
  saveAt(buffer: Buffer, pathname: string, contentType?: string): Promise<{ url: string }>;
  remove(url: string): Promise<void>;
}

const PUBLIC_DIR = path.join(process.cwd(), "public");
const UPLOADS_ROOT = path.join(PUBLIC_DIR, "uploads");

function uniqueFilename(originalName: string) {
  const ext = path.extname(originalName) || "";
  const safeBase = path
    .basename(originalName, ext)
    .replace(/[^a-zA-Z0-9-_]/g, "_")
    .slice(0, 40);
  return `${safeBase}-${randomUUID().slice(0, 8)}${ext}`;
}

class LocalStorageProvider implements StorageProvider {
  async save(buffer: Buffer, subdir: string, originalName: string) {
    const { url } = await this.saveAt(buffer, `${subdir}/${uniqueFilename(originalName)}`);
    return { url, filePath: path.join(UPLOADS_ROOT, url.replace(/^\/uploads\//, "")) };
  }

  async saveAt(buffer: Buffer, pathname: string) {
    const filePath = path.join(UPLOADS_ROOT, pathname);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);
    return { url: `/uploads/${pathname}` };
  }

  async remove(url: string) {
    if (/^https?:\/\//.test(url)) return;
    try {
      await fs.unlink(path.join(PUBLIC_DIR, url.replace(/^\//, "")));
    } catch {
      // ignore missing file
    }
  }
}

// Vercel Blob: used in production, where the serverless filesystem is read-only and ephemeral.
class BlobStorageProvider implements StorageProvider {
  async save(buffer: Buffer, subdir: string, originalName: string) {
    const { url } = await this.saveAt(buffer, `${subdir}/${uniqueFilename(originalName)}`);
    return { url, filePath: url };
  }

  async saveAt(buffer: Buffer, pathname: string, contentType?: string) {
    const blob = await put(pathname, buffer, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType,
      // Regenerated certificates overwrite the same path, so don't let the CDN serve a stale copy for long.
      cacheControlMaxAge: 60,
    });
    return { url: blob.url };
  }

  async remove(url: string) {
    if (!/^https?:\/\//.test(url)) return;
    try {
      await del(url);
    } catch {
      // ignore missing blob
    }
  }
}

// Vercel's filesystem is read-only, so local storage can't work there; fail with an actionable message instead.
class MissingBlobStorageProvider implements StorageProvider {
  private fail(): never {
    throw new Error(
      "File storage is not configured: BLOB_READ_WRITE_TOKEN is missing. Connect a Vercel Blob store to this project (with no custom prefix) and redeploy."
    );
  }
  async save(): Promise<{ url: string; filePath: string }> {
    this.fail();
  }
  async saveAt(): Promise<{ url: string }> {
    this.fail();
  }
  async remove() {}
}

export const storage: StorageProvider = process.env.BLOB_READ_WRITE_TOKEN
  ? new BlobStorageProvider()
  : process.env.VERCEL
    ? new MissingBlobStorageProvider()
    : new LocalStorageProvider();

// Read a stored file's bytes, whichever provider wrote it.
export async function readStoredFile(url: string): Promise<Buffer> {
  if (/^https?:\/\//.test(url)) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  return fs.readFile(path.join(PUBLIC_DIR, url.replace(/^\//, "")));
}
