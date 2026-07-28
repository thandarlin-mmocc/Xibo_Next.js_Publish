const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("player", {
  getState: () => ipcRenderer.invoke("device:getState"),
  onUpdate: (callback) => {
    ipcRenderer.on("device:update", (_event, state) => callback(state));
  },
});
