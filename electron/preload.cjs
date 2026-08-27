const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAuth', {
  signInWithGoogle: () => ipcRenderer.invoke('electron-google-auth'),
});
