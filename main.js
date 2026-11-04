const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
const { execFile } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const hasSingleInstance = app.requestSingleInstanceLock();
if (!hasSingleInstance) app.quit();

let mainWindow;
let alwaysOnTop = true;
let skyrimWatcher = null;
let skyrimWasRunning = false;
const startedAsSkyrimWatcher = process.argv.includes("--watch-skyrim");

function isSkyrimRunning() {
  return new Promise((resolve) => {
    if (process.platform !== "win32") return resolve(false);
    execFile("tasklist", ["/FO", "CSV", "/NH"], { windowsHide: true }, (error, stdout) => {
      if (error) return resolve(false);
      resolve(/"SkyrimSE(?:Launcher)?\.exe"/i.test(stdout));
    });
  });
}

function showWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

async function pollForSkyrim() {
  const running = await isSkyrimRunning();
  if (running && !skyrimWasRunning) showWindow();
  skyrimWasRunning = running;
}

function startSkyrimWatcher() {
  if (skyrimWatcher || process.platform !== "win32") return;
  pollForSkyrim();
  skyrimWatcher = setInterval(pollForSkyrim, 3000);
}

function stopSkyrimWatcher() {
  if (!skyrimWatcher) return;
  clearInterval(skyrimWatcher);
  skyrimWatcher = null;
  skyrimWasRunning = false;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 440,
    height: 900,
    minWidth: 380,
    minHeight: 620,
    show: !startedAsSkyrimWatcher,
    frame: true,
    resizable: true,
    backgroundColor: "#11100f",
    title: "Merchant's Assistant",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js")
    }
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));
  mainWindow.setAlwaysOnTop(alwaysOnTop, "floating");
  if (!startedAsSkyrimWatcher) mainWindow.focus();
  mainWindow.on("closed", () => { mainWindow = null; });
}

if (hasSingleInstance) app.whenReady().then(() => {
  ipcMain.handle("window:minimize", () => mainWindow?.minimize());
  ipcMain.handle("window:toggle-always-on-top", () => {
    alwaysOnTop = !alwaysOnTop;
    mainWindow?.setAlwaysOnTop(alwaysOnTop, "floating");
    return alwaysOnTop;
  });
  ipcMain.handle("window:open-readme", () => {
    const readmePath = app.isPackaged
      ? path.join(process.resourcesPath, "app.asar.unpacked", "README.md")
      : path.join(__dirname, "README.md");
    return shell.openPath(readmePath);
  });
  ipcMain.handle("settings:set-skyrim-autostart", (_event, enabled) => {
    const active = enabled === true;
    if (process.platform === "win32") {
      app.setLoginItemSettings({ openAtLogin: active, openAsHidden: true, args: ["--watch-skyrim"] });
    }
    if (active) startSkyrimWatcher(); else stopSkyrimWatcher();
    return active;
  });
  ipcMain.handle("backup:open-spreadsheet", async (_event, csv) => {
    const result = await dialog.showSaveDialog(mainWindow, { title: "Save Merchant's Assistant spreadsheet", defaultPath: "Merchants-Assistant-pricing.csv", filters: [{ name: "Excel-compatible CSV", extensions: ["csv"] }] });
    if (result.canceled || !result.filePath) return false;
    fs.writeFileSync(result.filePath, `\ufeff${String(csv || "")}`, "utf8");
    await shell.openPath(result.filePath);
    return true;
  });
  createWindow();
  if (startedAsSkyrimWatcher) startSkyrimWatcher();

  app.on("second-instance", () => showWindow());

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
