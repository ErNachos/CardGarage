const { contextBridge, ipcRenderer } = require('electron');

// Espone funzioni sicure al renderer per la navigazione
contextBridge.exposeInMainWorld('electronAPI', {
  navigateToTool: (toolName) => ipcRenderer.invoke('navigate-to-tool', toolName)
});
