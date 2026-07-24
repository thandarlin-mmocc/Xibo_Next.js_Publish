import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import https from "https";
import path from "path";

const ALLOW_INSECURE_TLS = process.env.XIBO_ALLOW_INSECURE_TLS === "true";
if (ALLOW_INSECURE_TLS) {
  console.warn(
    "[xibo] XIBO_ALLOW_INSECURE_TLS=true — TLS certificate verification is DISABLED for Xibo API calls. Only use this against a self-signed LAN/staging CMS.",
  );
}
// Only skip cert verification when explicitly opted in; otherwise use Node's default verifying agent.
const httpsAgent = ALLOW_INSECURE_TLS
  ? new https.Agent({ rejectUnauthorized: false })
  : undefined;

const XIBO_BASE_URL = process.env.XIBO_BASE_URL || "http://cms.example.com";
const CLIENT_ID = process.env.XIBO_CLIENT_ID || "";
const CLIENT_SECRET = process.env.XIBO_CLIENT_SECRET || "";

let accessToken = "";
let tokenExpiry = 0;

async function getAccessToken() {
  const now = Date.now();
  if (accessToken && now < tokenExpiry) return accessToken;

  const formData = new FormData();
  formData.append("grant_type", "client_credentials");
  formData.append("client_id", CLIENT_ID);
  formData.append("client_secret", CLIENT_SECRET);

  try {
    const res = await axios.post(
      `${XIBO_BASE_URL}/api/authorize/access_token`,
      formData,
      { headers: formData.getHeaders(), httpsAgent },
    );

    accessToken = res.data.access_token;
    tokenExpiry = now + res.data.expires_in * 1000 - 10_000;
    return accessToken;
  } catch (error: any) {
    console.error("Xibo token failed:", error?.message);
    console.error("Status:", error?.response?.status);
    console.error("Body:", error?.response?.data);
    throw new Error(`Xibo Auth Failed: ${error?.message ?? "unknown"}`);
  }
}

export async function getPlaylistById(playlistId: number | string) {
  const token = await getAccessToken();
  const res = await axios.get(`${XIBO_BASE_URL}/api/playlist/${playlistId}`, {
    headers: { Authorization: `Bearer ${token}` },
    httpsAgent,
  });
  return res.data;
}

/**
 * Search library media by name (Xibo typically supports a "name" filter param).
 * Returns first match mediaId, or null if none found.
 */

export async function findMediaIdByName(name: string): Promise<number | null> {
  const token = await getAccessToken();

  const res = await axios.get(`${XIBO_BASE_URL}/api/library`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { name }, // Xibo filter
    httpsAgent,
  });

  // Xibo may return { data: [...] } or directly [...]
  const items = Array.isArray(res.data)
    ? res.data
    : (res.data?.data ?? res.data?.items ?? []);
  const first = items?.[0];
  const mediaId = first?.mediaId ?? first?.id;

  const n = typeof mediaId === "string" ? Number(mediaId) : mediaId;
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Upload a file revealing the intended media "name" (deterministic).
 * If the same name already exists, you can search and reuse it.
 */
export async function uploadToXiboLibrary(filePath: string, mediaName: string) {
  const token = await getAccessToken();

  const form = new FormData();

  // Send both to cover CMS variations
  form.append("name", mediaName);
  form.append("name[]", mediaName);

  const ext = path.extname(filePath) || ".jpg";

  form.append("files[]", fs.createReadStream(filePath), {
    filename: `${mediaName}${ext}`, // unique upload filename
  });

  const res = await axios.post(`${XIBO_BASE_URL}/api/library`, form, {
    headers: { Authorization: `Bearer ${token}`, ...form.getHeaders() },
    httpsAgent,
    maxBodyLength: Infinity,
  });

  return res.data;
}

export async function assignToPlaylist(
  playlistId: number | string,
  mediaId: number | string,
  duration = 10,
) {
  const token = await getAccessToken();

  // Xibo wants `media` (not mediaId)
  const body = new URLSearchParams();
  body.append("media[]", String(mediaId)); // ✅ key is media[]
  body.append("duration", String(duration));
  body.append("useDuration", "1");

  try {
    const res = await axios.post(
      `${XIBO_BASE_URL}/api/playlist/library/assign/${playlistId}`,
      body,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        httpsAgent,
      },
    );
    return res.data;
  } catch (error: any) {
    console.error("Xibo Playlist Assign Failed");
    console.error("Status:", error?.response?.status);
    console.error("Body:", JSON.stringify(error?.response?.data, null, 2));
    throw error; // keep axios response
  }
}

// ---------------------------------------------------------------------------
// UNVERIFIED - layout / display-group / display-health functions below.
//
// Everything above this line has been exercised against a real Xibo CMS.
// Everything below is written from Xibo v4 REST API documentation only - it
// has NOT been run against a real Xibo instance yet (that requires the Week 1
// spike, still blocked on real staging credentials in .env). Endpoint paths,
// field names, and request shapes are exactly the kind of thing this
// codebase's own defensive multi-shape parsing (see extractMediaId-style
// helpers) proves can't be trusted from docs alone.
//
// Do not wire these into a user-facing flow as if proven. src/lib/xiboPublish.ts
// deliberately still throws for DISPLAY_GROUP/LAYOUT_REGION_PLAYLIST targets
// until each function below has been run once against staging and adjusted
// to match what actually comes back.
// ---------------------------------------------------------------------------

export async function listResolutions() {
  const token = await getAccessToken();
  const res = await axios.get(`${XIBO_BASE_URL}/api/resolution`, {
    headers: { Authorization: `Bearer ${token}` },
    httpsAgent,
  });
  return res.data;
}

export async function createLayout(params: {
  name: string;
  resolutionId?: number | string;
  description?: string;
}) {
  const token = await getAccessToken();
  const body = new URLSearchParams();
  body.append("name", params.name);
  if (params.description) body.append("description", params.description);
  if (params.resolutionId) body.append("resolutionId", String(params.resolutionId));

  const res = await axios.post(`${XIBO_BASE_URL}/api/layout`, body, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    httpsAgent,
  });
  return res.data;
}

export async function addRegion(
  layoutId: number | string,
  region: { width: number; height: number; top: number; left: number },
) {
  const token = await getAccessToken();
  const body = new URLSearchParams();
  body.append("width", String(region.width));
  body.append("height", String(region.height));
  body.append("top", String(region.top));
  body.append("left", String(region.left));

  const res = await axios.post(`${XIBO_BASE_URL}/api/region/${layoutId}`, body, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    httpsAgent,
  });
  return res.data;
}

/** embed example: "regions,playlists,widgets" */
export async function getLayout(layoutId: number | string, embed?: string) {
  const token = await getAccessToken();
  const res = await axios.get(`${XIBO_BASE_URL}/api/layout`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { layoutId, ...(embed ? { embed } : {}) },
    httpsAgent,
  });
  return res.data;
}

export async function publishLayout(layoutId: number | string) {
  const token = await getAccessToken();
  const res = await axios.put(
    `${XIBO_BASE_URL}/api/layout/publish/${layoutId}`,
    new URLSearchParams({ publishNow: "1" }),
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      httpsAgent,
    },
  );
  return res.data;
}

export async function listDisplayGroups() {
  const token = await getAccessToken();
  const res = await axios.get(`${XIBO_BASE_URL}/api/displaygroup`, {
    headers: { Authorization: `Bearer ${token}` },
    httpsAgent,
  });
  return res.data;
}

/**
 * Xibo v4 typically pushes a layout to a display group via scheduling, not a
 * direct "assign" call. fromDt/toDt default to "starting now, for 24h" if not
 * given - unverified whether that's the right default for an "always on"
 * placement versus a real recurring schedule.
 */
export async function scheduleLayoutForDisplayGroup(
  displayGroupId: number | string,
  layoutId: number | string,
  window?: { fromDt?: Date; toDt?: Date },
) {
  const token = await getAccessToken();
  const fromDt = window?.fromDt ?? new Date();
  const toDt = window?.toDt ?? new Date(fromDt.getTime() + 24 * 60 * 60 * 1000);

  const body = new URLSearchParams();
  body.append("displayGroupIds[]", String(displayGroupId));
  body.append("layoutId", String(layoutId));
  body.append("fromDt", fromDt.toISOString());
  body.append("toDt", toDt.toISOString());

  const res = await axios.post(`${XIBO_BASE_URL}/api/schedule`, body, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    httpsAgent,
  });
  return res.data;
}

export type NormalizedDisplayStatus = {
  displayId: string;
  displayName?: string;
  online: boolean;
  lastAccessed?: string;
  raw: any;
};

/** Field names (loggedIn, lastAccessed, etc.) are the Xibo v4-documented ones - unverified against a real instance. */
export async function listDisplays(filter?: {
  displayId?: number | string;
}): Promise<NormalizedDisplayStatus[]> {
  const token = await getAccessToken();
  const res = await axios.get(`${XIBO_BASE_URL}/api/display`, {
    headers: { Authorization: `Bearer ${token}` },
    params: filter,
    httpsAgent,
  });

  const items = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
  return items.map((d: any) => ({
    displayId: String(d.displayId ?? d.id),
    displayName: d.display ?? d.name,
    online: d.loggedIn === 1 || d.loggedIn === true,
    lastAccessed: d.lastAccessed,
    raw: d,
  }));
}

export async function getDisplayStatus(
  displayId: number | string,
): Promise<NormalizedDisplayStatus | null> {
  const results = await listDisplays({ displayId });
  return results[0] ?? null;
}
