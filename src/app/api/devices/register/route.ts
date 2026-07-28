import { generateRegistrationCode } from "@/lib/deviceAuth";
import { prisma } from "@/lib/prisma";
import { DeviceStatus } from "@prisma/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const REGISTRATION_TTL_MS = 15 * 60 * 1000;

function clientIp(request: Request): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? null;
}

/**
 * Public - a brand-new player has no credentials yet. Idempotent per
 * deviceUid: a player that restarts before being claimed reuses its existing
 * Device row and simply gets a fresh registration code.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const deviceUid = typeof body?.deviceUid === "string" ? body.deviceUid.trim() : "";

  if (!deviceUid) {
    return NextResponse.json({ error: "deviceUid is required" }, { status: 400 });
  }

  const device = await prisma.device.upsert({
    where: { deviceUid },
    update: {},
    create: { deviceUid, status: DeviceStatus.PENDING },
  });

  // Already-approved devices don't re-register - the player should be using
  // its stored refresh token instead. Surfacing this distinctly lets the
  // player recover (e.g. show "already registered, contact admin to reset").
  if (device.status === DeviceStatus.ACTIVE) {
    return NextResponse.json({ error: "Device is already active" }, { status: 409 });
  }

  let registrationCode = generateRegistrationCode();
  // Extremely unlikely collision on a unique 6-char code; retry a few times rather than fail the request.
  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await prisma.deviceRegistration.findUnique({ where: { registrationCode } });
    if (!existing) break;
    registrationCode = generateRegistrationCode();
  }

  const expiresAt = new Date(Date.now() + REGISTRATION_TTL_MS);
  await prisma.deviceRegistration.create({
    data: {
      deviceId: device.id,
      registrationCode,
      ipAddress: clientIp(request),
      expiresAt,
    },
  });

  return NextResponse.json({ registrationCode, expiresAt });
}
