const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getVersion: () => process.versions.electron,
  getPlatform: () => process.platform,
  getBackendStatus: () => ipcRenderer.invoke("backend:get-status"),
  waitForBackend: (timeoutMs = 20000) => ipcRenderer.invoke("backend:wait-for-ready", timeoutMs),
  onBackendStatus: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on("backend:status", listener);
    return () => ipcRenderer.removeListener("backend:status", listener);
  },
  removeBackendStatusListener: () => {
    ipcRenderer.removeAllListeners("backend:status");
  }
});

console.log("✅ Preload script loaded");
