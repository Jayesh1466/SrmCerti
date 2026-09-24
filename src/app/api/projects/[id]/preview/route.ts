import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateCertificatePdf, generateCertificateId } from "@/lib/pdf";
import { buildRowData } from "@/lib/rowData";
import type { ParsedRow } from "@/lib/excel";

// GET ?rowIndex=0 -> renders a live PDF preview for that student row using current template config
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rowIndex = Number(req.nextUrl.searchParams.get("rowIndex") || "0");

  const project = await prisma.certificateProject.findUnique({
    where: { id },
    include: { template: true, datasets: true },
  });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const dataset = project.datasets[project.datasets.length - 1];
  if (!dataset) return NextResponse.json({ error: "No dataset uploaded" }, { status: 400 });

  const rows: ParsedRow[] = JSON.parse(dataset.rows);
  const row = rows[rowIndex];
  if (!row) return NextResponse.json({ error: "Row not found" }, { status: 404 });

  const mapping: Record<string, string> = JSON.parse(project.columnMapping || "{}");
  const data = buildRowData(row, mapping);
  const template = project.template;

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
    certificateId: generateCertificateId(),
    verifyBaseUrl: req.nextUrl.origin,
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: { "Content-Type": "application/pdf" },
  });
}
