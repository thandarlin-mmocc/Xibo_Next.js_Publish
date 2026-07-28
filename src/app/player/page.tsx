"use client";

import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "xibo_player_state_v1";
const POLL_INTERVAL_MS = 4000;
const HEARTBEAT_INTERVAL_MS = 30000;

type PlayerState = {
  deviceUid: string;
  deviceId?: string;
  name?: string;
  accessToken?: string;
  refreshToken?: string;
};

type Status = "starting" | "pending" | "active" | "suspended" | "error";

function loadState(): PlayerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // corrupt localStorage - fall through and mint a fresh identity
  }
  const fresh: PlayerState = { deviceUid: crypto.randomUUID() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  return fresh;
}

function saveState(state: PlayerState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

async function postJson(path: string, body: unknown, accessToken?: string) {
  const res = await fetch(path, {
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

/**
 * The one player UI, shared by every shell that hosts it - the Electron
 * kiosk window on Windows mini PCs and the WebView wrapper on Android TV
 * both just point at this URL in fullscreen. Identity and tokens persist in
 * localStorage since there's no Node/native storage available here (unlike
 * the old Electron-only implementation this replaces).
 *
 * No CPU/RAM/disk in the heartbeat - those came from Node's `os` module,
 * which doesn't exist in a browser/WebView context. The API already treats
 * them as optional.
 */
export default function PlayerPage() {
  const [status, setStatus] = useState<Status>("starting");
  const [registrationCode, setRegistrationCode] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const stateRef = useRef<PlayerState | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    stateRef.current = loadState();

    if (stateRef.current.deviceId && stateRef.current.accessToken) {
      setDeviceName(stateRef.current.name ?? null);
      setStatus("active");
      startHeartbeat();
    } else {
      startRegistration();
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startRegistration() {
    if (pollRef.current) clearInterval(pollRef.current);
    const state = stateRef.current!;

    const { ok, data } = await postJson("/api/devices/register", { deviceUid: state.deviceUid });
    if (!ok) {
      setStatus("error");
      setErrorMessage(data.error || "Failed to register device");
      return;
    }

    const code = data.registrationCode as string;
    setRegistrationCode(code);
    setQrDataUrl(await QRCode.toDataURL(code, { margin: 1, width: 320 }));
    setStatus("pending");

    pollRef.current = setInterval(async () => {
      const { data: pollData } = await postJson("/api/devices/registration-status", {
        registrationCode: code,
      });

      if (pollData.status === "approved") {
        if (pollRef.current) clearInterval(pollRef.current);
        const next: PlayerState = {
          deviceUid: state.deviceUid,
          deviceId: pollData.deviceId,
          name: pollData.name,
          accessToken: pollData.accessToken,
          refreshToken: pollData.refreshToken,
        };
        stateRef.current = next;
        saveState(next);
        setDeviceName(next.name ?? null);
        setStatus("active");
        startHeartbeat();
      } else if (["expired", "invalid", "rejected"].includes(pollData.status)) {
        if (pollRef.current) clearInterval(pollRef.current);
        startRegistration();
      }
      // "pending" / "suspended": keep waiting.
    }, POLL_INTERVAL_MS);
  }

  function startHeartbeat() {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    sendHeartbeat();
    heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
  }

  async function sendHeartbeat() {
    const state = stateRef.current;
    if (!state?.deviceId || !state.accessToken) return;

    let { ok, status: httpStatus } = await postJson(
      `/api/devices/${state.deviceId}/heartbeat`,
      {},
      state.accessToken,
    );

    if (!ok && httpStatus === 401 && state.refreshToken) {
      const refreshed = await postJson("/api/auth/device/refresh", { refreshToken: state.refreshToken });
      if (refreshed.ok) {
        state.accessToken = refreshed.data.accessToken;
        state.refreshToken = refreshed.data.refreshToken;
        saveState(state);
        ({ ok, status: httpStatus } = await postJson(
          `/api/devices/${state.deviceId}/heartbeat`,
          {},
          state.accessToken,
        ));
      }
    }

    if (!ok && httpStatus === 401) {
      // The refresh token itself is dead - unrecoverable, start over.
      const deviceUid = state.deviceUid;
      stateRef.current = { deviceUid };
      saveState(stateRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      setDeviceName(null);
      setStatus("pending");
      startRegistration();
      return;
    }

    if (!ok && httpStatus === 409) {
      // Credentials still valid, just suspended server-side - keep retrying,
      // don't wipe the identity.
      setStatus("suspended");
      return;
    }

    if (ok) setStatus("active");
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-950 text-gray-100">
      <div className="max-w-lg px-12 text-center">
        {status === "error" && (
          <>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-red-400">Error</p>
            <p className="text-red-400">{errorMessage ?? "Something went wrong"}</p>
          </>
        )}

        {status === "active" && (
          <>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-emerald-400">Registered</p>
            <p className="text-3xl font-bold">{deviceName ?? "This device"}</p>
            <p className="mt-4 text-gray-400">Connected. Waiting for content to be scheduled.</p>
          </>
        )}

        {status === "suspended" && (
          <>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-amber-400">Suspended</p>
            <p className="text-3xl font-bold">{deviceName ?? "This device"}</p>
            <p className="mt-4 text-gray-400">This screen has been suspended by an administrator.</p>
          </>
        )}

        {(status === "pending" || status === "starting") && (
          <>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400">
              Enter this code to add this screen
            </p>
            {qrDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="Registration QR code" className="mx-auto mb-6 rounded-xl" width={240} height={240} />
            )}
            <p className="text-6xl font-bold tracking-[0.15em]">{registrationCode ?? "------"}</p>
            <p className="mt-6 text-gray-400">
              Open the Devices page and enter this code to claim this screen.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
