import { authOptions } from "@/lib/auth";
import { canManageFacilities, tenantWhere } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { ToiletIssueStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !canManageFacilities(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const where: any = { ...tenantWhere(session.user) };
  if (status && Object.values(ToiletIssueStatus).includes(status as ToiletIssueStatus)) {
    where.status = status as ToiletIssueStatus;
  }

  const issues = await prisma.toiletIssue.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(issues);
}
