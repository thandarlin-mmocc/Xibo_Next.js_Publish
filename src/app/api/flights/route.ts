import { authOptions } from "@/lib/auth";
import { canManageFlights } from "@/lib/authz";
import { logAudit, requestMeta } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { syncFlightSnapshot } from "@/lib/flightSync";
import { AuditAction } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !canManageFlights(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const flights = await prisma.flightSnapshot.findMany({
    orderBy: { scheduledTime: "asc" },
  });
  return NextResponse.json(flights);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !canManageFlights(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}) as any);
  const { flightKey, airline, flightNo, status, gate, scheduledTime, delayMinutes } = body;

  if (!flightKey || typeof flightKey !== "string") {
    return NextResponse.json({ error: "flightKey is required" }, { status: 400 });
  }

  const snapshot = await syncFlightSnapshot(
    {
      flightKey,
      airline,
      flightNo,
      status,
      gate,
      scheduledTime: scheduledTime ? new Date(scheduledTime) : null,
      delayMinutes: typeof delayMinutes === "number" ? delayMinutes : null,
    },
    "manual",
  );

  await logAudit({
    action: AuditAction.FLIGHT_SNAPSHOT_UPDATE,
    actorId: session.user.id,
    tenantId: session.user.tenantId,
    target: `FlightSnapshot:${snapshot.flightKey}`,
    metadata: { status: snapshot.status, gate: snapshot.gate },
    ...requestMeta(request),
  });

  return NextResponse.json(snapshot);
}
