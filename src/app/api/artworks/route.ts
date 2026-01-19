import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { mkdir, writeFile } from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  try {
    const whereClause: any = {};
    if (session.role === "teacher") {
      whereClause.schoolId = session.schoolId;
    }
    if (status) {
      whereClause.status = status;
    }

    const artworks = await prisma.artwork.findMany({
      where: whereClause,
      include: { school: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(artworks);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch artworks" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "teacher") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const nickname = formData.get("nickname") as string;

    if (!file || !title || !nickname) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `${Date.now()}_${file.name.replace(/\s/g, "_")}`;
    const uploadDir = path.join(process.cwd(), "public/uploads");
    await mkdir(uploadDir, { recursive: true });
    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, buffer);

    const artwork = await prisma.artwork.create({
      data: {
        schoolId: session.schoolId,
        title,
        nickname,
        imagePath: `/uploads/${filename}`,
        status: "pending",
      },
    });

    return NextResponse.json(artwork);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
