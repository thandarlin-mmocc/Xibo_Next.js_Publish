import { requireDeviceAuth } from "@/lib/deviceAuth";
import { prisma } from "@/lib/prisma";
import { DeviceStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function clientIp(request: Request): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? null;
}

/** Device-JWT-authenticated (not a user session) - called by the player itself every ~30s. */
export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requireDeviceAuth(request);
  if (!auth || auth.deviceId !== id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const device = await prisma.device.findUnique({ where: { id } });
  if (!device || device.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (device.status !== DeviceStatus.ACTIVE) {
    return NextResponse.json({ error: "Device is not active" }, { status: 409 });
  }

  const body = await request.json().catch(() => ({}) as any);
  const numOrUndefined = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

  const updated = await prisma.device.update({
    where: { id },
    data: {
      lastHeartbeatAt: new Date(),
      lastIpAddress: clientIp(request),
      cpuPct: numOrUndefined(body?.cpuPct),
      ramPct: numOrUndefined(body?.ramPct),
      diskPct: numOrUndefined(body?.diskPct),
      playerVersion: typeof body?.playerVersion === "string" ? body.playerVersion : undefined,
    },
  });

  return NextResponse.json({ ok: true, status: updated.status });
}
