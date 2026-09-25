import { NextRequest, NextResponse } from "next/server";
import { getPrivateBlob } from "@/lib/storage";

// Serves files from a private Vercel Blob store (URLs stored as /api/files/<pathname>).
// Sign-in is enforced by src/proxy.ts like every other /api route.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const result = await getPrivateBlob(path.map(decodeURIComponent).join("/"));
  if (!result) return NextResponse.json({ error: "File not found" }, { status: 404 });

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType,
      "Content-Length": String(result.blob.size),
      "Cache-Control": "private, max-age=60",
    },
  });
}
