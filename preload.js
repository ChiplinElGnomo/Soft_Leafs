const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  cerrarApp: () => ipcRenderer.send('cerrar-app')
});