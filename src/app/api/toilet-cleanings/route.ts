import { authOptions } from "@/lib/auth";
import { canLogCleaning, canManageFacilities, tenantWhere } from "@/lib/authz";
import { logAudit, requestMeta } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { AuditAction } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Known locations (from past issues or cleanings) with their last-cleaned time, for the staff tablet UI. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !canManageFacilities(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantFilter = tenantWhere(session.user);

  const [issueLocations, cleaningLocations, recentCleanings] = await Promise.all([
    prisma.toiletIssue.findMany({
      where: tenantFilter,
      distinct: ["locationId"],
      select: { locationId: true },
    }),
    prisma.toiletCleaningLog.findMany({
      where: tenantFilter,
      distinct: ["locationId"],
      select: { locationId: true },
    }),
    prisma.toiletCleaningLog.findMany({
      where: tenantFilter,
      orderBy: { cleanedAt: "desc" },
      take: 200,
    }),
  ]);

  const locations = Array.from(
    new Set([
      ...issueLocations.map((l) => l.locationId),
      ...cleaningLocations.map((l) => l.locationId),
    ]),
  ).sort();

  const lastCleanedByLocation: Record<string, string> = {};
  for (const log of recentCleanings) {
    if (!lastCleanedByLocation[log.locationId]) {
      lastCleanedByLocation[log.locationId] = log.cleanedAt.toISOString();
    }
  }

  return NextResponse.json({ locations, lastCleanedByLocation });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !canLogCleaning(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.tenantId) {
    return NextResponse.json({ error: "User has no tenant assigned" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}) as any);
  const locationId = (body?.locationId as string | undefined)?.trim();
  if (!locationId) {
    return NextResponse.json({ error: "locationId is required" }, { status: 400 });
  }

  const log = await prisma.toiletCleaningLog.create({
    data: {
      locationId,
      cleanedBy: session.user.name ?? session.user.email ?? session.user.id,
      tenantId: session.user.tenantId,
    },
  });

  await logAudit({
    action: AuditAction.TOILET_CLEAN,
    actorId: session.user.id,
    tenantId: session.user.tenantId,
    target: `ToiletCleaningLog:${log.id}`,
    metadata: { locationId },
    ...requestMeta(request),
  });

  return NextResponse.json(log);
}
