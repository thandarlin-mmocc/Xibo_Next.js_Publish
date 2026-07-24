import { authOptions } from "@/lib/auth";
import { canManageFacilities } from "@/lib/authz";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import QRCode from "qrcode";

export const runtime = "nodejs";

/** Protected - generates a QR code (as a data URL) for a location's public report page. */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !canManageFacilities(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.tenantId) {
    return NextResponse.json({ error: "User has no tenant assigned" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}) as any);
  const locationId = (body?.locationId as string | undefined)?.trim();
  if (!locationId) {
    return NextResponse.json({ error: "locationId is required" }, { status: 400 });
  }

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const reportUrl = `${baseUrl}/report/toilet/${session.user.tenantId}/${encodeURIComponent(locationId)}`;
  const dataUrl = await QRCode.toDataURL(reportUrl, { width: 300, margin: 2 });

  return NextResponse.json({ dataUrl, reportUrl });
}
