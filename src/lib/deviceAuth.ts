import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { jwtVerify, SignJWT } from "jose";

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes - short-lived, stateless, never revoked individually
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days - persisted, rotated on every use

function secret(): Uint8Array {
  const value = process.env.DEVICE_JWT_SECRET;
  if (!value) throw new Error("DEVICE_JWT_SECRET is not configured");
  return new TextEncoder().encode(value);
}

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function randomToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/** 6-character, single-use, human-typeable registration code (e.g. "K7QX2P"). */
export function generateRegistrationCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I - avoids transcription errors
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += alphabet[crypto.randomInt(alphabet.length)];
  }
  return code;
}

export async function signAccessToken(deviceId: string): Promise<string> {
  return new SignJWT({ deviceId, type: "device_access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(secret());
}

export async function verifyAccessToken(token: string): Promise<{ deviceId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.type !== "device_access" || typeof payload.deviceId !== "string") return null;
    return { deviceId: payload.deviceId };
  } catch {
    return null;
  }
}

/** Verifies the `Authorization: Bearer <token>` header on a device-facing request. */
export async function requireDeviceAuth(
  request: Request,
): Promise<{ deviceId: string } | null> {
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  return verifyAccessToken(token);
}

/** Issues a fresh access+refresh pair, persisting only the refresh token's hash. */
export async function issueTokenPair(
  deviceId: string,
  rotatedFromId?: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = await signAccessToken(deviceId);
  const refreshToken = randomToken();

  await prisma.deviceToken.create({
    data: {
      deviceId,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      rotatedFromId,
    },
  });

  return { accessToken, refreshToken };
}

/**
 * Exchanges a valid, unexpired, unrevoked refresh token for a new pair,
 * revoking the old one atomically - a replayed old refresh token (e.g. after
 * a real rotation already happened) is immediately rejected.
 */
export async function rotateRefreshToken(
  rawRefreshToken: string,
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const tokenHash = hashToken(rawRefreshToken);
  const existing = await prisma.deviceToken.findUnique({ where: { tokenHash } });

  if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
    return null;
  }

  await prisma.deviceToken.update({
    where: { id: existing.id },
    data: { revokedAt: new Date() },
  });

  return issueTokenPair(existing.deviceId, existing.id);
}
