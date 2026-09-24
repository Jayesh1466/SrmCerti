import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type");
  const assets = await prisma.asset.findMany({
    where: type ? { type } : undefined,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(assets);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type, name, filePath, width, height } = body;
  if (!type || !name || !filePath) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const asset = await prisma.asset.create({ data: { type, name, filePath, width, height } });
  return NextResponse.json(asset);
}
