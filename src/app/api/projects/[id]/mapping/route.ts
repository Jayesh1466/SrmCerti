import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateRows, ParsedRow } from "@/lib/excel";

// body: { datasetId, mapping: { student_name: "Name", registration_number: "Reg No", ...custom } }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { datasetId, mapping } = body;
  if (!datasetId || !mapping) {
    return NextResponse.json({ error: "Missing datasetId or mapping" }, { status: 400 });
  }

  const dataset = await prisma.studentDataset.findUnique({ where: { id: datasetId } });
  if (!dataset || dataset.projectId !== id) {
    return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
  }

  const rows: ParsedRow[] = JSON.parse(dataset.rows);
  const { errors, duplicateCount, missingCount } = validateRows(rows, mapping);

  await prisma.studentDataset.update({
    where: { id: datasetId },
    data: { errors: JSON.stringify(errors) },
  });

  await prisma.certificateProject.update({
    where: { id },
    data: {
      columnMapping: JSON.stringify(mapping),
      status: errors.length === 0 ? "ready" : "draft",
    },
  });

  return NextResponse.json({
    totalRows: rows.length,
    validRows: rows.length - new Set(errors.map((e) => e.rowIndex)).size,
    errorCount: errors.length,
    duplicateCount,
    missingCount,
    errors: errors.slice(0, 100),
  });
}
