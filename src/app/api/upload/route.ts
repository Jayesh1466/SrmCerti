import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { imageSize } from "image-size";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const subdir = (form.get("subdir") as string) || "assets";
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  let url: string;
  let filePath: string;
  try {
    ({ url, filePath } = await storage.save(buffer, subdir, file.name));
  } catch (err) {
    console.error("Upload failed", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not store the file" }, { status: 500 });
  }

  let width: number | undefined;
  let height: number | undefined;
  try {
    const dims = imageSize(buffer);
    width = dims.width;
    height = dims.height;
  } catch {
    // not an image (e.g. pdf) — dims left undefined
  }

  return NextResponse.json({
    url,
    filePath,
    width,
    height,
    orientation: width && height ? (width >= height ? "landscape" : "portrait") : undefined,
  });
}
