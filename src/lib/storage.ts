import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

// Storage provider interface — local filesystem implementation now,
// structured so it can be swapped for an S3 (or other cloud) provider later
// by implementing the same interface.
export interface StorageProvider {
  save(buffer: Buffer, subdir: string, originalName: string): Promise<{ url: string; filePath: string }>;
  remove(url: string): Promise<void>;
}

const PUBLIC_DIR = path.join(process.cwd(), "public");
const UPLOADS_ROOT = path.join(PUBLIC_DIR, "uploads");

class LocalStorageProvider implements StorageProvider {
  async save(buffer: Buffer, subdir: string, originalName: string) {
    const dir = path.join(UPLOADS_ROOT, subdir);
    await fs.mkdir(dir, { recursive: true });
    const ext = path.extname(originalName) || "";
    const safeBase = path
      .basename(originalName, ext)
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .slice(0, 40);
    const filename = `${safeBase}-${randomUUID().slice(0, 8)}${ext}`;
    const filePath = path.join(dir, filename);
    await fs.writeFile(filePath, buffer);
    const url = `/uploads/${subdir}/${filename}`;
    return { url, filePath };
  }

  async remove(url: string) {
    const rel = url.replace(/^\//, "");
    const filePath = path.join(PUBLIC_DIR, rel);
    try {
      await fs.unlink(filePath);
    } catch {
      // ignore missing file
    }
  }
}

export const storage: StorageProvider = new LocalStorageProvider();

// Resolve a public URL (e.g. "/uploads/templates/foo.png") to an absolute
// filesystem path, for server-side reads (pdf generation etc).
export function resolvePublicPath(url: string): string {
  const rel = url.replace(/^\//, "");
  return path.join(PUBLIC_DIR, rel);
}

export const GENERATED_DIR = path.join(PUBLIC_DIR, "uploads", "certificates");
