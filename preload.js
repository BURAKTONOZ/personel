const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getData: () => ipcRenderer.invoke('get-data'),
  savePersonnel: (data) => ipcRenderer.invoke('save-personnel', data),
  saveSettings: (data) => ipcRenderer.invoke('save-settings', data), // Varsa
  
  // Yeni eklenenler
  checkDatabase: () => ipcRenderer.invoke('check-db-connection'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  setCustomDbPath: (path) => ipcRenderer.invoke('set-custom-db-path', path),
  getDbStatus: () => ipcRenderer.invoke('get-db-status'),
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowClose: () => ipcRenderer.send('window-close')
});
