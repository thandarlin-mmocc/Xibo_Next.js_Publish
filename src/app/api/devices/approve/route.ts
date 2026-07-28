import { authOptions } from "@/lib/auth";
import { logAudit, requestMeta } from "@/lib/audit";
import { canManageDevices } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { AuditAction, DeviceStatus, UserRole } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Claims a PENDING device by its on-screen registration code - deliberately
 * NOT id-based (there is no browsable cross-tenant "pending devices" list;
 * an admin can only approve a device whose code they were physically shown,
 * the same trust model as pairing a Chromecast). This is what actually
 * assigns the device's tenantId, so it's the one place the ADMIN-vs-everyone
 * tenant-scoping pattern applies here, same as Media/Playlist uploads.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !canManageDevices(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const registrationCode = typeof body?.registrationCode === "string" ? body.registrationCode.trim() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!registrationCode || !name) {
    return NextResponse.json({ error: "registrationCode and name are required" }, { status: 400 });
  }

  let tenantId: string;
  if (session.user.role === UserRole.ADMIN) {
    const requestedTenantId = typeof body?.tenantId === "string" ? body.tenantId.trim() : "";
    if (!requestedTenantId) {
      return NextResponse.json({ error: "tenantId is required for admin approvals" }, { status: 400 });
    }
    const tenant = await prisma.tenant.findUnique({ where: { id: requestedTenantId } });
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 400 });
    }
    tenantId = requestedTenantId;
  } else {
    if (!session.user.tenantId) {
      return NextResponse.json({ error: "User has no tenant assigned" }, { status: 400 });
    }
    tenantId = session.user.tenantId;
  }

  const registration = await prisma.deviceRegistration.findUnique({
    where: { registrationCode },
    include: { device: true },
  });

  if (!registration || registration.expiresAt < new Date()) {
    return NextResponse.json({ error: "Registration code not found or expired" }, { status: 404 });
  }

  if (registration.device.status !== DeviceStatus.PENDING) {
    return NextResponse.json({ error: "Device is not pending approval" }, { status: 409 });
  }

  const device = await prisma.device.update({
    where: { id: registration.deviceId },
    data: {
      tenantId,
      name,
      status: DeviceStatus.ACTIVE,
      approvedAt: new Date(),
      approvedById: session.user.id,
    },
  });

  const { ipAddress, userAgent } = requestMeta(request);
  await logAudit({
    action: AuditAction.DEVICE_APPROVE,
    actorId: session.user.id,
    tenantId,
    target: `Device:${device.id}`,
    metadata: { name, deviceUid: device.deviceUid },
    ipAddress,
    userAgent,
  });

  return NextResponse.json(device);
}
