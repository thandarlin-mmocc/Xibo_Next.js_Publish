import { prisma } from "@/lib/prisma";

/**
 * Common shape any flight-data source normalizes into before reaching
 * syncFlightSnapshot - a real provider integration (AviationStack,
 * FlightAware, a direct airport feed, etc.) and manual staff entry both
 * funnel through here, so downstream code never cares where the data came
 * from. Pick a real provider later by writing one function that produces
 * this shape and calling syncFlightSnapshot per flight - nothing else changes.
 */
export type NormalizedFlight = {
  flightKey: string;
  airline?: string | null;
  flightNo?: string | null;
  status?: string | null; // "SCHEDULED" | "BOARDING" | "DELAYED" | "DEPARTED" | "CANCELLED"
  gate?: string | null;
  scheduledTime?: Date | null;
  estimatedTime?: Date | null;
  actualTime?: Date | null;
  delayMinutes?: number | null;
};

export async function syncFlightSnapshot(
  flight: NormalizedFlight,
  providerName: string,
  raw?: unknown,
) {
  return prisma.flightSnapshot.upsert({
    where: { flightKey: flight.flightKey },
    create: {
      flightKey: flight.flightKey,
      airline: flight.airline,
      flightNo: flight.flightNo,
      status: flight.status,
      gate: flight.gate,
      scheduledTime: flight.scheduledTime,
      estimatedTime: flight.estimatedTime,
      actualTime: flight.actualTime,
      delayMinutes: flight.delayMinutes,
      providerName,
      providerRaw: raw as any,
      providerUpdatedAt: new Date(),
    },
    update: {
      airline: flight.airline,
      flightNo: flight.flightNo,
      status: flight.status,
      gate: flight.gate,
      scheduledTime: flight.scheduledTime,
      estimatedTime: flight.estimatedTime,
      actualTime: flight.actualTime,
      delayMinutes: flight.delayMinutes,
      providerName,
      providerRaw: raw as any,
      providerUpdatedAt: new Date(),
    },
  });
}

const ALERT_STATUSES = new Set(["BOARDING", "DELAYED", "CANCELLED"]);
const ALERT_WINDOW_MS = 15 * 60 * 1000;

/**
 * Flights worth calling out on the public display right now - either an
 * attention-worthy status, or a gate/status change in the last 15 minutes
 * (driven off FlightSnapshot.updatedAt directly; no separate event table
 * needed for a broadcast display - that only matters once per-subscriber
 * push/SMS delivery is built, which awaits a vendor choice).
 */
export async function getAlertableFlights() {
  const since = new Date(Date.now() - ALERT_WINDOW_MS);
  const recent = await prisma.flightSnapshot.findMany({
    where: { updatedAt: { gte: since } },
    orderBy: { updatedAt: "desc" },
  });
  return recent.filter((f) => f.status && ALERT_STATUSES.has(f.status));
}
