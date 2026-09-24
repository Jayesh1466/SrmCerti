import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Gets or creates the single CertificateProject backing a template's
// "upload data & generate" workflow, so admins can generate certificates
// directly from the template page without a separate Projects concept.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: templateId } = await params;
  const template = await prisma.template.findUnique({ where: { id: templateId } });
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  let project = await prisma.certificateProject.findUnique({ where: { templateId } });

  if (!project) {
    try {
      project = await prisma.certificateProject.create({
        data: {
          name: `${template.name} Certificates`,
          templateId,
          status: "draft",
        },
      });
    } catch {
      // Unique constraint on templateId: another concurrent request created it first.
      project = await prisma.certificateProject.findUnique({ where: { templateId } });
      if (!project) throw new Error("Failed to get or create project");
    }
  }

  return NextResponse.json(project);
}
