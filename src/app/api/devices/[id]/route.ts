import { authOptions } from "@/lib/auth";
import { logAudit, requestMeta } from "@/lib/audit";
import { canManageDevices, tenantWhere } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { AuditAction, DeviceStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const ASSIGNABLE_STATUSES: DeviceStatus[] = [DeviceStatus.ACTIVE, DeviceStatus.SUSPENDED, DeviceStatus.REJECTED];

/** Rename or suspend/reactivate/reject an already-claimed device. Tenant-scoped like every other device route. */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session || !canManageDevices(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const device = await prisma.device.findFirst({
    where: { id, ...tenantWhere(session.user), deletedAt: null },
  });
  if (!device) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}) as any);
  const data: { name?: string; status?: DeviceStatus } = {};

  if (typeof body?.name === "string" && body.name.trim()) {
    data.name = body.name.trim();
  }
  if (typeof body?.status === "string") {
    if (!ASSIGNABLE_STATUSES.includes(body.status as DeviceStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    data.status = body.status as DeviceStatus;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await prisma.device.update({ where: { id }, data });

  if (data.status === DeviceStatus.REJECTED || data.status === DeviceStatus.SUSPENDED) {
    const { ipAddress, userAgent } = requestMeta(request);
    await logAudit({
      action: AuditAction.DEVICE_REJECT,
      actorId: session.user.id,
      tenantId: device.tenantId,
      target: `Device:${device.id}`,
      metadata: { status: data.status },
      ipAddress,
      userAgent,
    });
  }

  return NextResponse.json(updated);
}
