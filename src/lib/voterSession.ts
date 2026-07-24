import { cookies } from "next/headers";
import crypto from "crypto";

const VOTER_COOKIE = "voter_session";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Read-only - safe to call from a Server Component. */
export async function getVoterSessionId(): Promise<string | null> {
  const store = await cookies();
  return store.get(VOTER_COOKIE)?.value ?? null;
}

/**
 * Gets the existing anonymous-voter cookie or creates one. Mutates cookies,
 * so this may only be called from a Route Handler or Server Action, not a
 * Server Component render.
 */
export async function ensureVoterSessionId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(VOTER_COOKIE)?.value;
  if (existing) return existing;

  const id = crypto.randomUUID();
  store.set(VOTER_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: ONE_YEAR_SECONDS,
    path: "/",
  });
  return id;
}
