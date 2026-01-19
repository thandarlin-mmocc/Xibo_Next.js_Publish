import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import https from "https";

const httpsAgent = new https.Agent({ rejectUnauthorized: false }); // DEV/LAN only

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
      { headers: formData.getHeaders(), httpsAgent }
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
    : res.data?.data ?? res.data?.items ?? [];
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
  // IMPORTANT: use deterministic name so we can find existing media
  form.append("name", mediaName);
  form.append("files[]", fs.createReadStream(filePath));

  const res = await axios.post(`${XIBO_BASE_URL}/api/library`, form, {
    headers: {
      Authorization: `Bearer ${token}`,
      ...form.getHeaders(),
    },
    httpsAgent,
    maxBodyLength: Infinity,
  });

  return res.data;
}

export async function assignToPlaylist(
  playlistId: number | string,
  mediaId: number | string,
  duration = 10
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
      }
    );
    return res.data;
  } catch (error: any) {
    console.error("Xibo Playlist Assign Failed");
    console.error("Status:", error?.response?.status);
    console.error("Body:", JSON.stringify(error?.response?.data, null, 2));
    throw error; // keep axios response
  }
}
