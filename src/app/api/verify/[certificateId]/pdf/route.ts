import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readStoredFile } from "@/lib/storage";
import { certificateFilename } from "@/lib/pdf";

// Public (like /verify): serves the PDF of a valid certificate so the verification page can show it.
// Works whichever storage holds the file (local disk, public or private Vercel Blob).
export async function GET(req: NextRequest, { params }: { params: Promise<{ certificateId: string }> }) {
  const { certificateId } = await params;
  const cert = await prisma.certificate.findUnique({
    where: { certificateId },
    select: { status: true, filePath: true, regNumber: true, studentName: true, certificateId: true },
  });
  if (!cert || cert.status !== "generated" || !cert.filePath) {
    return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
  }

  let bytes: Buffer;
  try {
    bytes = await readStoredFile(cert.filePath);
  } catch {
    return NextResponse.json({ error: "Certificate file unavailable" }, { status: 404 });
  }

  const download = req.nextUrl.searchParams.has("download");
  const filename = certificateFilename(cert);
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
