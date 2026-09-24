import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ZipArchive } from "archiver";
import { resolvePublicPath } from "@/lib/storage";
import { PassThrough } from "stream";
import { promises as fs } from "fs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await prisma.certificateProject.findUnique({ where: { id } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const certificates = await prisma.certificate.findMany({
    where: { projectId: id, status: "generated" },
  });
  if (certificates.length === 0) {
    return NextResponse.json({ error: "No generated certificates to download" }, { status: 400 });
  }

  const archive = new ZipArchive({ zlib: { level: 9 } });
  const passthrough = new PassThrough();
  archive.pipe(passthrough);

  (async () => {
    for (const cert of certificates) {
      if (!cert.filePath) continue;
      const absPath = resolvePublicPath(cert.filePath);
      try {
        const buf = await fs.readFile(absPath);
        archive.append(buf, { name: `${cert.regNumber.replace(/[^a-zA-Z0-9-_]/g, "_")}.pdf` });
      } catch {
        // skip unreadable file
      }
    }
    archive.finalize();
  })();

  const safeName = project.name.replace(/[^a-zA-Z0-9-_]/g, "_") || "certificates";

  // Convert Node PassThrough stream to a web ReadableStream for NextResponse
  const webStream = new ReadableStream({
    start(controller) {
      passthrough.on("data", (chunk) => controller.enqueue(chunk));
      passthrough.on("end", () => controller.close());
      passthrough.on("error", (err) => controller.error(err));
    },
  });

  return new NextResponse(webStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${safeName}.zip"`,
    },
  });
}
