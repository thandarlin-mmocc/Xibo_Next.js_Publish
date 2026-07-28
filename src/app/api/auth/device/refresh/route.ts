import { rotateRefreshToken } from "@/lib/deviceAuth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Public (auth is the refresh token itself) - exchanges a valid refresh token for a new access+refresh pair. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const refreshToken = typeof body?.refreshToken === "string" ? body.refreshToken : "";

  if (!refreshToken) {
    return NextResponse.json({ error: "refreshToken is required" }, { status: 400 });
  }

  const pair = await rotateRefreshToken(refreshToken);
  if (!pair) {
    return NextResponse.json({ error: "Invalid or expired refresh token" }, { status: 401 });
  }

  return NextResponse.json(pair);
}
