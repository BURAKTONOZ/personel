const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getData: () => ipcRenderer.invoke('get-data'),
  savePersonnel: (data) => ipcRenderer.invoke('save-personnel', data),
  saveSettings: (data) => ipcRenderer.invoke('save-settings', data),
  
  checkDatabase: () => ipcRenderer.invoke('check-db-connection'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  setCustomDbPath: (path) => ipcRenderer.invoke('set-custom-db-path', path),
  getDbStatus: () => ipcRenderer.invoke('get-db-status'),
  backupDatabase: () => ipcRenderer.invoke('backup-database'),
  silentBackup: (backupPath) => ipcRenderer.invoke('silent-backup', backupPath),
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximizeToggle: () => ipcRenderer.send('window-maximize-toggle'),
  windowClose: () => ipcRenderer.send('window-close'),
  maximizeWindow: () => ipcRenderer.send('maximize-window')
});
