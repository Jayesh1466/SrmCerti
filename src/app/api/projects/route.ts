import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const projects = await prisma.certificateProject.findMany({
    orderBy: { createdAt: "desc" },
    include: { template: true, certificates: true, datasets: true },
  });
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, templateId } = body;
  if (!name || !templateId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const project = await prisma.certificateProject.create({
    data: { name, templateId, status: "draft" },
  });
  return NextResponse.json(project);
}
