const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("merchantWindow", {
  minimize: () => ipcRenderer.invoke("window:minimize"),
  close: () => ipcRenderer.invoke("window:close"),
  toggleAlwaysOnTop: () => ipcRenderer.invoke("window:toggle-always-on-top"),
  openReadme: () => ipcRenderer.invoke("window:open-readme"),
  setSkyrimAutostart: (enabled) => ipcRenderer.invoke("settings:set-skyrim-autostart", enabled),
  openSpreadsheet: (csv) => ipcRenderer.invoke("backup:open-spreadsheet", csv)
});
