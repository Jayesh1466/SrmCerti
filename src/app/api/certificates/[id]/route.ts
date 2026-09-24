import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cert = await prisma.certificate.findUnique({ where: { id } });
  if (!cert) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(cert);
}
