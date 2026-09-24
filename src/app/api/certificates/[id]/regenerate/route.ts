import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateCertificatePdf, sanitizeFilename, generateCertificateId } from "@/lib/pdf";
import { storage } from "@/lib/storage";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cert = await prisma.certificate.findUnique({
    where: { id },
    include: { project: { include: { template: true } } },
  });
  if (!cert) return NextResponse.json({ error: "Certificate not found" }, { status: 404 });

  const template = cert.project.template;
  const data = JSON.parse(cert.data || "{}");
  const certificateId = cert.certificateId || generateCertificateId();

  try {
    const pdfBuffer = await generateCertificatePdf({
      backgroundUrl: template.backgroundPath,
      pageWidth: template.width,
      pageHeight: template.height,
      logos: JSON.parse(template.logos),
      seals: JSON.parse(template.seals),
      signatures: JSON.parse(template.signatures),
      studentNameField: JSON.parse(template.studentNameField),
      regNumberField: JSON.parse(template.regNumberField),
      textBlocks: JSON.parse(template.textBlocks),
      watermark: JSON.parse(template.watermark),
      qrConfig: JSON.parse(template.qrConfig),
      data,
      certificateId,
      verifyBaseUrl: req.nextUrl.origin,
    });

    const filename = `${sanitizeFilename(cert.regNumber)}.pdf`;
    const { url: publicPath } = await storage.saveAt(pdfBuffer, `certificates/${cert.projectId}/${filename}`, "application/pdf");

    const updated = await prisma.certificate.update({
      where: { id },
      data: { filePath: publicPath, status: "generated" },
    });
    return NextResponse.json(updated);
  } catch (err) {
    await prisma.certificate.update({ where: { id }, data: { status: "failed" } });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
