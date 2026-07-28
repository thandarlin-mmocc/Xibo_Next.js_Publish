const { app, BrowserWindow } = require("electron");

const API_BASE_URL = process.env.PLAYER_API_BASE_URL || "http://localhost:3000";

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    fullscreen: process.env.PLAYER_KIOSK === "1",
    autoHideMenuBar: true,
  });

  mainWindow.loadURL(`${API_BASE_URL}/player`);
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
