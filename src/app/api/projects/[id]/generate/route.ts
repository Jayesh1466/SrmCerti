import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/db";
import { generateCertificatePdf, sanitizeFilename, generateCertificateId } from "@/lib/pdf";
import { storage } from "@/lib/storage";
import { buildRowData } from "@/lib/rowData";
import type { ParsedRow } from "@/lib/excel";

// Upper bound for a generation batch on Vercel (seconds).
export const maxDuration = 300;

async function runGeneration(jobId: string, projectId: string, verifyBaseUrl: string) {
  const project = await prisma.certificateProject.findUnique({
    where: { id: projectId },
    include: { template: true, datasets: true },
  });
  if (!project) return;

  const template = project.template;
  const dataset = project.datasets[project.datasets.length - 1];
  if (!dataset) {
    await prisma.generationJob.update({ where: { id: jobId }, data: { status: "failed" } });
    return;
  }

  const rows: ParsedRow[] = JSON.parse(dataset.rows);
  const mapping: Record<string, string> = JSON.parse(project.columnMapping || "{}");
  const errorRowIndexes = new Set((JSON.parse(dataset.errors || "[]") as { rowIndex: number }[]).map((e) => e.rowIndex));

  const validRows = rows
    .map((row, idx) => ({ row, idx }))
    .filter(({ idx }) => !errorRowIndexes.has(idx));


  let completed = 0;
  let failed = 0;

  for (const { row } of validRows) {
    const data = buildRowData(row, mapping);
    const studentName = data.student_name || "Unknown";
    const regNumber = data.registration_number || `NA-${Math.random().toString(36).slice(2, 8)}`;
    const certificateId = generateCertificateId();

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
        verifyBaseUrl,
      });

      const filename = `${sanitizeFilename(regNumber)}.pdf`;
      const { url: publicPath } = await storage.saveAt(pdfBuffer, `certificates/${projectId}/${filename}`, "application/pdf");

      await prisma.certificate.create({
        data: {
          certificateId,
          projectId,
          studentName,
          regNumber,
          data: JSON.stringify(data),
          filePath: publicPath,
          status: "generated",
        },
      });
      completed++;
    } catch (err) {
      await prisma.certificate.create({
        data: {
          certificateId,
          projectId,
          studentName,
          regNumber,
          data: JSON.stringify({ ...data, error: String(err) }),
          status: "failed",
        },
      });
      failed++;
    }

    await prisma.generationJob.update({
      where: { id: jobId },
      data: { completed, failed },
    });
  }

  await prisma.generationJob.update({
    where: { id: jobId },
    data: { status: failed > 0 && completed === 0 ? "failed" : "completed" },
  });
  await prisma.certificateProject.update({
    where: { id: projectId },
    data: { status: "completed" },
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await prisma.certificateProject.findUnique({
    where: { id },
    include: { datasets: true },
  });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const dataset = project.datasets[project.datasets.length - 1];
  if (!dataset) return NextResponse.json({ error: "No dataset uploaded" }, { status: 400 });

  const rows: ParsedRow[] = JSON.parse(dataset.rows);
  const errorRowIndexes = new Set((JSON.parse(dataset.errors || "[]") as { rowIndex: number }[]).map((e) => e.rowIndex));
  const total = rows.length - errorRowIndexes.size;

  // clear previous certificates for a clean regeneration run
  await prisma.certificate.deleteMany({ where: { projectId: id } });

  const job = await prisma.generationJob.create({
    data: { projectId: id, total, completed: 0, failed: 0, status: "running" },
  });

  await prisma.certificateProject.update({ where: { id }, data: { status: "generating" } });

  const origin = req.nextUrl.origin;

  // Runs after the response is sent; after() keeps a serverless function alive until it finishes
  // (bounded by maxDuration). The client polls GET /api/projects/[id]/jobs/[jobId] for progress.
  after(() =>
    runGeneration(job.id, id, origin).catch(async (err) => {
      console.error("Generation failed", err);
      await prisma.generationJob.update({ where: { id: job.id }, data: { status: "failed" } });
    })
  );

  return NextResponse.json({ jobId: job.id, total });
}
