import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseSpreadsheet, autoDetectColumns } from "@/lib/excel";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await prisma.certificateProject.findUnique({ where: { id } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const { headers, rows } = parseSpreadsheet(buffer, file.name);
  if (headers.length === 0) {
    return NextResponse.json({ error: "Could not parse spreadsheet or it is empty" }, { status: 400 });
  }

  const autoDetected = autoDetectColumns(headers);

  const dataset = await prisma.studentDataset.create({
    data: {
      projectId: id,
      rows: JSON.stringify(rows),
      errors: JSON.stringify([]),
    },
  });

  return NextResponse.json({
    datasetId: dataset.id,
    headers,
    rowCount: rows.length,
    preview: rows.slice(0, 5),
    autoDetected,
  });
}
