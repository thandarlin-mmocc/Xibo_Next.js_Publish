const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const QRCode = require("qrcode");
const { createDeviceClient } = require("./deviceClient");

let mainWindow;
let deviceClient;
let latestState = { status: "pending", error: null, registrationCode: null, qrDataUrl: null, deviceName: null };

function pushState(update) {
  latestState = { ...latestState, ...update };
  if (mainWindow) mainWindow.webContents.send("device:update", latestState);
}

async function onStatusChange(status, error, registrationCode, deviceName) {
  let qrDataUrl = null;
  if (registrationCode) {
    qrDataUrl = await QRCode.toDataURL(registrationCode, { margin: 1, width: 320 });
  }
  pushState({
    status,
    error: error ?? null,
    registrationCode: registrationCode ?? (status === "pending" ? latestState.registrationCode : null),
    qrDataUrl: qrDataUrl ?? (status === "pending" ? latestState.qrDataUrl : null),
    deviceName: deviceName ?? latestState.deviceName,
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    fullscreen: process.env.PLAYER_KIOSK === "1",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
}

ipcMain.handle("device:getState", () => latestState);

app.whenReady().then(() => {
  createWindow();
  deviceClient = createDeviceClient(app.getPath("userData"), onStatusChange);
  deviceClient.start();
});

app.on("window-all-closed", () => {
  if (deviceClient) deviceClient.stop();
  if (process.platform !== "darwin") app.quit();
});
