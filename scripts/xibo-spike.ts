/**
 * Week 1 Phase 10 - Xibo API spike.
 *
 * Throwaway script to verify what Xibo's REST API actually returns before
 * Week 2 writes production code against assumed shapes. Run each step in
 * order - later steps depend on ids discovered by earlier ones.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/xibo-spike.ts
 *
 * Requires XIBO_BASE_URL / XIBO_CLIENT_ID / XIBO_CLIENT_SECRET /
 * XIBO_PLAYLIST_ID to be set to REAL staging values in .env first.
 *
 * This creates real (small, clearly-named) test objects in your Xibo
 * library - a test.png upload, a "Week1 Spike Layout" layout - safe to
 * delete afterward.
 */
import axios from "axios";
import FormData from "form-data";
import https from "https";

const BASE_URL = process.env.XIBO_BASE_URL || "";
const CLIENT_ID = process.env.XIBO_CLIENT_ID || "";
const CLIENT_SECRET = process.env.XIBO_CLIENT_SECRET || "";
const PLAYLIST_ID = process.env.XIBO_PLAYLIST_ID || "";
const ALLOW_INSECURE_TLS = process.env.XIBO_ALLOW_INSECURE_TLS === "true";
const httpsAgent = ALLOW_INSECURE_TLS
  ? new https.Agent({ rejectUnauthorized: false })
  : undefined;

function section(n: number, title: string) {
  console.log(`\n=== Step ${n}: ${title} ===`);
}

function dump(label: string, value: unknown) {
  console.log(`[${label}]`, JSON.stringify(value, null, 2));
}

async function getToken(): Promise<string> {
  const form = new FormData();
  form.append("grant_type", "client_credentials");
  form.append("client_id", CLIENT_ID);
  form.append("client_secret", CLIENT_SECRET);

  const res = await axios.post(`${BASE_URL}/api/authorize/access_token`, form, {
    headers: form.getHeaders(),
    httpsAgent,
  });
  return res.data.access_token;
}

async function main() {
  if (!BASE_URL || !CLIENT_ID || !CLIENT_SECRET) {
    console.error(
      "Missing XIBO_BASE_URL / XIBO_CLIENT_ID / XIBO_CLIENT_SECRET - fill in .env with your real staging values first.",
    );
    process.exit(1);
  }

  // --- Step 1: connectivity ---
  section(1, "Connectivity (OAuth2 token)");
  let token: string;
  try {
    token = await getToken();
    console.log("OK - token acquired, length:", token.length);
  } catch (e: any) {
    console.error("FAILED:", e?.response?.status, e?.response?.data ?? e?.message);
    console.error(
      "If this is a self-signed staging cert, set XIBO_ALLOW_INSECURE_TLS=true in .env and re-run.",
    );
    return;
  }
  const auth = { headers: { Authorization: `Bearer ${token}` }, httpsAgent };

  // --- Step 3: playlist read shape (before regression-testing assign) ---
  section(3, "Playlist read shape");
  if (PLAYLIST_ID) {
    try {
      const byPath = await axios.get(`${BASE_URL}/api/playlist/${PLAYLIST_ID}`, auth);
      dump("GET /api/playlist/:id", byPath.data);
    } catch (e: any) {
      console.log("GET /api/playlist/:id FAILED:", e?.response?.status);
    }
    try {
      const byFilter = await axios.get(`${BASE_URL}/api/playlist`, {
        ...auth,
        params: { playlistId: PLAYLIST_ID },
      });
      dump("GET /api/playlist?playlistId=", byFilter.data);
    } catch (e: any) {
      console.log("GET /api/playlist?playlistId= FAILED:", e?.response?.status);
    }
  } else {
    console.log("Skipped - set XIBO_PLAYLIST_ID to test this.");
  }

  // --- Step 4: library search filter ---
  section(4, "Library search filter (media vs name)");
  try {
    const byMedia = await axios.get(`${BASE_URL}/api/library`, {
      ...auth,
      params: { media: "spike" },
    });
    dump("GET /api/library?media=", byMedia.data);
  } catch (e: any) {
    console.log("?media= FAILED:", e?.response?.status);
  }
  try {
    const byName = await axios.get(`${BASE_URL}/api/library`, {
      ...auth,
      params: { name: "spike" },
    });
    dump("GET /api/library?name=", byName.data);
  } catch (e: any) {
    console.log("?name= FAILED:", e?.response?.status);
  }

  // --- Step 5: resolutions + layout create ---
  section(5, "Resolutions + layout create");
  let layoutId: number | string | undefined;
  try {
    const resolutions = await axios.get(`${BASE_URL}/api/resolution`, auth);
    dump("GET /api/resolution", resolutions.data);
    const items = Array.isArray(resolutions.data)
      ? resolutions.data
      : (resolutions.data?.data ?? []);
    const resolutionId = items?.[0]?.resolutionId ?? items?.[0]?.id;
    console.log("Using resolutionId:", resolutionId);

    const layoutForm = new URLSearchParams();
    layoutForm.append("name", "Week1 Spike Layout");
    layoutForm.append("description", "throwaway - safe to delete");
    if (resolutionId) layoutForm.append("resolutionId", String(resolutionId));

    const layout = await axios.post(`${BASE_URL}/api/layout`, layoutForm, {
      ...auth,
      headers: {
        ...auth.headers,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    dump("POST /api/layout", layout.data);
    layoutId = layout.data?.layoutId ?? layout.data?.id;
    console.log("Discovered layoutId:", layoutId);
  } catch (e: any) {
    console.log("FAILED:", e?.response?.status, e?.response?.data);
  }

  // --- Step 6: region + region-playlist discovery ---
  section(6, "Region + region-playlist discovery");
  let regionPlaylistId: number | string | undefined;
  if (layoutId) {
    try {
      const region = await axios.post(
        `${BASE_URL}/api/region/${layoutId}`,
        new URLSearchParams({ width: "1920", height: "1080", top: "0", left: "0" }),
        {
          ...auth,
          headers: {
            ...auth.headers,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );
      dump("POST /api/region/:layoutId", region.data);

      const full = await axios.get(`${BASE_URL}/api/layout`, {
        ...auth,
        params: { layoutId, embed: "regions,playlists" },
      });
      dump("GET /api/layout?embed=regions,playlists", full.data);
      console.log(
        "Inspect the dump above for the region's playlistId - path varies by Xibo version.",
      );
    } catch (e: any) {
      console.log("FAILED:", e?.response?.status, e?.response?.data);
    }
  } else {
    console.log("Skipped - no layoutId from step 5.");
  }

  // --- Step 7: assign to region playlist (fill in regionPlaylistId manually after inspecting step 6) ---
  section(7, "Assign media to region playlist");
  console.log(
    regionPlaylistId
      ? "Would reuse assignToPlaylist(regionPlaylistId, mediaId, duration) here."
      : "Skipped - set regionPlaylistId from step 6's dump and re-run, or test manually via curl.",
  );

  // --- Step 8: publish the layout ---
  section(8, "Publish the layout");
  if (layoutId) {
    try {
      const publish = await axios.put(
        `${BASE_URL}/api/layout/publish/${layoutId}`,
        new URLSearchParams({ publishNow: "1" }),
        {
          ...auth,
          headers: {
            ...auth.headers,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );
      dump("PUT /api/layout/publish/:id", publish.data);
    } catch (e: any) {
      console.log("FAILED:", e?.response?.status, e?.response?.data);
    }
  } else {
    console.log("Skipped - no layoutId from step 5.");
  }

  // --- Step 9: display groups + push mechanism ---
  section(9, "Display groups + schedule push");
  let displayGroupId: number | string | undefined;
  try {
    const groups = await axios.get(`${BASE_URL}/api/displaygroup`, auth);
    dump("GET /api/displaygroup", groups.data);
    const items = Array.isArray(groups.data) ? groups.data : (groups.data?.data ?? []);
    displayGroupId = items?.[0]?.displayGroupId ?? items?.[0]?.id;
    console.log("Using displayGroupId:", displayGroupId);
  } catch (e: any) {
    console.log("GET /api/displaygroup FAILED:", e?.response?.status, e?.response?.data);
  }
  if (displayGroupId && layoutId) {
    try {
      const schedule = await axios.post(
        `${BASE_URL}/api/schedule`,
        new URLSearchParams({
          "displayGroupIds[]": String(displayGroupId),
          layoutId: String(layoutId),
          fromDt: new Date().toISOString(),
          toDt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }),
        {
          ...auth,
          headers: {
            ...auth.headers,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );
      dump("POST /api/schedule", schedule.data);
    } catch (e: any) {
      console.log("POST /api/schedule FAILED:", e?.response?.status, e?.response?.data);
    }
  } else {
    console.log("Skipped schedule push - missing displayGroupId or layoutId.");
  }

  // --- Step 10: display health ---
  section(10, "Display health");
  try {
    const displays = await axios.get(`${BASE_URL}/api/display`, auth);
    dump("GET /api/display", displays.data);
    console.log(
      "Compare field names above against XiboDisplayHealth (displayId, status, lastSeenAt, lastSyncAt).",
    );
  } catch (e: any) {
    console.log("FAILED:", e?.response?.status, e?.response?.data);
  }

  console.log(
    "\nSpike complete. Review the dumps above, note anything that differs from assumptions, then update src/lib/xibo.ts + src/lib/xiboPublish.ts's gated target types accordingly.",
  );
}

main().catch((e) => {
  console.error("Spike script crashed:", e);
  process.exit(1);
});
