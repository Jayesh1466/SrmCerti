import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const template = await prisma.template.findUnique({ where: { id } });
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(template);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  const jsonFields = [
    "logos",
    "seals",
    "signatures",
    "studentNameField",
    "regNumberField",
    "textBlocks",
    "watermark",
    "qrConfig",
  ];
  for (const key of Object.keys(body)) {
    if (jsonFields.includes(key)) {
      data[key] = JSON.stringify(body[key]);
    } else {
      data[key] = body[key];
    }
  }
  const template = await prisma.template.update({ where: { id }, data });
  return NextResponse.json(template);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.template.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
