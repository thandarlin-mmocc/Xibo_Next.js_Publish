import { prisma } from "@/lib/prisma";
import { getAlertableFlights } from "@/lib/flightSync";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Public, unauthenticated - this is the data feed for the FIDS display page
 * (src/app/display/fids), which Xibo's own "webpage" widget points at.
 * Flight info is public-facing by nature; nothing here needs a session.
 */
export async function GET() {
  const [flights, alerts] = await Promise.all([
    prisma.flightSnapshot.findMany({
      orderBy: { scheduledTime: "asc" },
      select: {
        flightKey: true,
        airline: true,
        flightNo: true,
        status: true,
        gate: true,
        scheduledTime: true,
        delayMinutes: true,
        updatedAt: true,
      },
    }),
    getAlertableFlights(),
  ]);

  return NextResponse.json({
    flights,
    alerts: alerts.map((a) => ({
      flightKey: a.flightKey,
      airline: a.airline,
      flightNo: a.flightNo,
      status: a.status,
      gate: a.gate,
      delayMinutes: a.delayMinutes,
    })),
  });
}
