import { prisma } from "@/lib/prisma";
import { listDisplays } from "@/lib/xibo";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * SPECULATIVE - depends on src/lib/xibo.ts's listDisplays(), which is itself
 * unverified against a real Xibo instance (see the "UNVERIFIED" section in
 * that file). This endpoint's auth gate and upsert logic are real and ready;
 * the Xibo call inside listDisplays needs the Week 1 spike run first.
 *
 * Wire to Vercel Cron (see vercel.json) once real Xibo credentials are in
 * place: GET this URl with `Authorization: Bearer $CRON_SECRET`.
 *
 * Displays aren't mapped to a tenant automatically - Xibo has no concept of
 * our tenants. New rows land with tenantId null; assigning them to a tenant
 * is a manual step (not yet built) once there's more than one airport tenant
 * to disambiguate.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const displays = await listDisplays();

    const results = await Promise.all(
      displays.map((d) =>
        prisma.xiboDisplayHealth.upsert({
          where: { displayId: d.displayId },
          create: {
            displayId: d.displayId,
            displayName: d.displayName,
            status: d.online ? "ONLINE" : "OFFLINE",
            lastSeenAt: d.online ? new Date() : undefined,
            lastSyncAt: new Date(),
          },
          update: {
            displayName: d.displayName,
            status: d.online ? "ONLINE" : "OFFLINE",
            lastSeenAt: d.online ? new Date() : undefined,
            lastSyncAt: new Date(),
          },
        }),
      ),
    );

    return NextResponse.json({ success: true, count: results.length });
  } catch (error: any) {
    console.error("Display health cron failed:", error);
    return NextResponse.json(
      { error: "Display health sync failed", message: error?.message },
      { status: 500 },
    );
  }
}
