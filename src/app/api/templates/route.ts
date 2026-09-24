import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const templates = await prisma.template.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    name,
    backgroundPath,
    width,
    height,
    orientation,
    logos,
    seals,
    signatures,
    studentNameField,
    regNumberField,
    textBlocks,
    watermark,
    qrConfig,
    status,
  } = body;

  if (!name || !backgroundPath || !width || !height) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const template = await prisma.template.create({
    data: {
      name,
      backgroundPath,
      width,
      height,
      orientation: orientation || "landscape",
      logos: JSON.stringify(logos ?? []),
      seals: JSON.stringify(seals ?? []),
      signatures: JSON.stringify(signatures ?? []),
      studentNameField: JSON.stringify(studentNameField ?? {}),
      regNumberField: JSON.stringify(regNumberField ?? {}),
      textBlocks: JSON.stringify(textBlocks ?? []),
      watermark: JSON.stringify(watermark ?? { enabled: false }),
      qrConfig: JSON.stringify(qrConfig ?? { enabled: false }),
      status: status || "complete",
    },
  });

  return NextResponse.json(template);
}
