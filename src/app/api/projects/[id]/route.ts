import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await prisma.certificateProject.findUnique({
    where: { id },
    include: { template: true, certificates: true, datasets: true, jobs: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(project);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.certificate.deleteMany({ where: { projectId: id } });
  await prisma.generationJob.deleteMany({ where: { projectId: id } });
  await prisma.studentDataset.deleteMany({ where: { projectId: id } });
  await prisma.certificateProject.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
