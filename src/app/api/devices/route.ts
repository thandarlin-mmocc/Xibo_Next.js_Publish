import { authOptions } from "@/lib/auth";
import { canManageDevices, tenantWhere } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { DeviceStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Fleet view - only devices already claimed into a tenant. A PENDING device
 * has no tenantId yet, so it never appears here; claiming happens via
 * POST /api/devices/approve using the on-screen registration code instead of
 * a browsable list (see that route's comment for why).
 */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !canManageDevices(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const where: any = { ...tenantWhere(session.user), deletedAt: null };
  if (status && Object.values(DeviceStatus).includes(status as DeviceStatus)) {
    where.status = status;
  }

  const devices = await prisma.device.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(devices);
}
