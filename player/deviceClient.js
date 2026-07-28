const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

const API_BASE_URL = process.env.PLAYER_API_BASE_URL || "http://localhost:3000";
const HEARTBEAT_INTERVAL_MS = 30 * 1000;
const POLL_INTERVAL_MS = 4 * 1000;

function statePath(userDataDir) {
  return path.join(userDataDir, "device-state.json");
}

function loadState(userDataDir) {
  try {
    return JSON.parse(fs.readFileSync(statePath(userDataDir), "utf8"));
  } catch {
    return {};
  }
}

function saveState(userDataDir, state) {
  fs.writeFileSync(statePath(userDataDir), JSON.stringify(state, null, 2));
}

async function postJson(pathname, body, accessToken) {
  const res = await fetch(`${API_BASE_URL}${pathname}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

/** 1-minute load average as a percentage of available cores - a rough proxy, not exact instantaneous CPU%. */
function cpuPct() {
  const cores = os.cpus().length || 1;
  return Math.min(100, (os.loadavg()[0] / cores) * 100);
}

function ramPct() {
  const total = os.totalmem();
  const free = os.freemem();
  return ((total - free) / total) * 100;
}

/**
 * Manages this device's lifecycle end to end: persistent identity, the
 * register -> poll -> claim handshake, and the ongoing heartbeat once
 * active. `onStatusChange(status)` is called with "pending" | "active" so
 * the caller (main.js) can push UI updates to the renderer.
 */
function createDeviceClient(userDataDir, onStatusChange) {
  let state = loadState(userDataDir);
  let pollTimer = null;
  let heartbeatTimer = null;

  if (!state.deviceUid) {
    state.deviceUid = crypto.randomUUID();
    saveState(userDataDir, state);
  }

  async function refreshTokens() {
    if (!state.refreshToken) return false;
    const { ok, data } = await postJson("/api/auth/device/refresh", { refreshToken: state.refreshToken });
    if (!ok) return false;
    state.accessToken = data.accessToken;
    state.refreshToken = data.refreshToken;
    saveState(userDataDir, state);
    return true;
  }

  async function sendHeartbeat() {
    if (!state.deviceId || !state.accessToken) return;
    let { ok, status } = await postJson(
      `/api/devices/${state.deviceId}/heartbeat`,
      { cpuPct: cpuPct(), ramPct: ramPct() },
      state.accessToken,
    );

    if (!ok && status === 401) {
      const refreshed = await refreshTokens();
      if (refreshed) {
        ({ ok, status } = await postJson(
          `/api/devices/${state.deviceId}/heartbeat`,
          { cpuPct: cpuPct(), ramPct: ramPct() },
          state.accessToken,
        ));
      }
    }

    if (!ok && status === 401) {
      // The refresh token itself is dead (revoked/expired) - these
      // credentials are unrecoverable, so drop them and register fresh.
      state.accessToken = undefined;
      state.refreshToken = undefined;
      state.deviceId = undefined;
      saveState(userDataDir, state);
      stopHeartbeat();
      onStatusChange("pending");
      startRegistrationFlow();
      return;
    }

    if (!ok && status === 409) {
      // Device exists and its credentials are still valid, it's just been
      // suspended/rejected server-side - keep the identity and keep
      // retrying, so reactivating it in the fleet UI resumes heartbeats
      // without the player needing to be re-claimed from scratch.
      onStatusChange("suspended", null, null, state.name);
      return;
    }

    if (ok) {
      onStatusChange("active", null, null, state.name);
    }
  }

  function startHeartbeat() {
    stopHeartbeat();
    sendHeartbeat();
    heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
  }

  function stopHeartbeat() {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  function stopPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
  }

  async function startRegistrationFlow() {
    stopPolling();
    const { ok, data } = await postJson("/api/devices/register", { deviceUid: state.deviceUid });
    if (!ok) {
      onStatusChange("error", data.error || "Failed to register device");
      return;
    }

    const registrationCode = data.registrationCode;
    onStatusChange("pending", null, registrationCode);

    pollTimer = setInterval(async () => {
      const { data: pollData } = await postJson("/api/devices/registration-status", { registrationCode });

      if (pollData.status === "approved") {
        stopPolling();
        state.deviceId = pollData.deviceId;
        state.name = pollData.name;
        state.accessToken = pollData.accessToken;
        state.refreshToken = pollData.refreshToken;
        saveState(userDataDir, state);
        onStatusChange("active", null, null, state.name);
        startHeartbeat();
      } else if (pollData.status === "expired" || pollData.status === "invalid" || pollData.status === "rejected") {
        stopPolling();
        // Registration window lapsed or was rejected - generate a fresh code automatically.
        startRegistrationFlow();
      }
      // "pending" / "suspended": keep waiting.
    }, POLL_INTERVAL_MS);
  }

  function start() {
    if (state.deviceId && state.accessToken) {
      onStatusChange("active", null, null, state.name);
      startHeartbeat();
    } else {
      startRegistrationFlow();
    }
  }

  function stop() {
    stopPolling();
    stopHeartbeat();
  }

  return { start, stop };
}

module.exports = { createDeviceClient };
