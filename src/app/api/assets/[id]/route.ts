import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import { isFileReferenced } from "@/lib/cleanup";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const asset = await prisma.asset.findUnique({ where: { id } });
  if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  await prisma.asset.delete({ where: { id } });
  // Templates embed the image URL directly, so keep the file while any template still uses it.
  const inUse = await isFileReferenced(asset.filePath, { assetId: id });
  if (!inUse) await storage.remove(asset.filePath);
  return NextResponse.json({ ok: true, fileKept: inUse });
}
