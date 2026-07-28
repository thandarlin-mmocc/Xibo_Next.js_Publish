import { issueTokenPair } from "@/lib/deviceAuth";
import { prisma } from "@/lib/prisma";
import { DeviceStatus } from "@prisma/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Public - polled by an unregistered player every few seconds while its
 * registration code is on screen. Tokens are handed out exactly once: the
 * claim (`claimedAt`) is set via an atomic conditional update, so a retried
 * or duplicated poll after the first successful claim can never mint a
 * second token pair for the same registration.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const registrationCode = typeof body?.registrationCode === "string" ? body.registrationCode.trim() : "";

  if (!registrationCode) {
    return NextResponse.json({ error: "registrationCode is required" }, { status: 400 });
  }

  const registration = await prisma.deviceRegistration.findUnique({
    where: { registrationCode },
    include: { device: true },
  });

  if (!registration) {
    return NextResponse.json({ status: "invalid" });
  }

  if (registration.expiresAt < new Date()) {
    return NextResponse.json({ status: "expired" });
  }

  const { device } = registration;

  if (device.status === DeviceStatus.PENDING) {
    return NextResponse.json({ status: "pending" });
  }

  if (device.status === DeviceStatus.REJECTED) {
    return NextResponse.json({ status: "rejected" });
  }

  if (device.status === DeviceStatus.SUSPENDED) {
    return NextResponse.json({ status: "suspended" });
  }

  // ACTIVE: claim exactly once.
  const claim = await prisma.deviceRegistration.updateMany({
    where: { id: registration.id, claimedAt: null },
    data: { claimedAt: new Date() },
  });

  if (claim.count === 0) {
    // Already claimed by an earlier poll - don't reissue, force re-registration.
    return NextResponse.json({ status: "expired" });
  }

  const { accessToken, refreshToken } = await issueTokenPair(device.id);

  return NextResponse.json({
    status: "approved",
    deviceId: device.id,
    name: device.name,
    accessToken,
    refreshToken,
  });
}
