import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ certificateId: string }> }) {
  const { certificateId } = await params;
  const cert = await prisma.certificate.findUnique({
    where: { certificateId },
    include: { project: true },
  });
  if (!cert || cert.status !== "generated") {
    return NextResponse.json({ valid: false }, { status: 404 });
  }
  const data = JSON.parse(cert.data || "{}");
  return NextResponse.json({
    valid: true,
    certificateId: cert.certificateId,
    studentName: cert.studentName,
    regNumber: cert.regNumber,
    eventName: data.event_name || null,
    organization: data.organization || null,
    date: data.date || null,
    projectName: cert.project.name,
    issuedAt: cert.createdAt,
  });
}
