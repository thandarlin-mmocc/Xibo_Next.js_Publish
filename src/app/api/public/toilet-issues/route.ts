import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { AuditAction } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const ISSUE_TYPES = ["NO_TISSUE", "SMELL", "LEAK", "DIRTY"] as const;

/** Public, unauthenticated - anyone who scans the location's QR code can report an issue. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}) as any);
  const { tenantId, locationId, type, note } = body;

  if (!tenantId || !locationId) {
    return NextResponse.json({ error: "tenantId and locationId are required" }, { status: 400 });
  }
  if (!ISSUE_TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid issue type" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    return NextResponse.json({ error: "Unknown location" }, { status: 404 });
  }

  const issue = await prisma.toiletIssue.create({
    data: {
      locationId,
      type,
      note: typeof note === "string" ? note.slice(0, 500) : null,
      tenantId,
    },
  });

  await logAudit({
    action: AuditAction.TOILET_ISSUE_CREATE,
    tenantId,
    target: `ToiletIssue:${issue.id}`,
    metadata: { locationId, type },
  });

  return NextResponse.json({ success: true, id: issue.id });
}
