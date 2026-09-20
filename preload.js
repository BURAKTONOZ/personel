const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    checkDatabase: () => ipcRenderer.invoke('check-db-connection'),
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    setCustomDbPath: (path) => ipcRenderer.invoke('set-custom-db-path', path),
    getDbStatus: () => ipcRenderer.invoke('get-db-status'),
    getData: () => ipcRenderer.invoke('get-data'),
    savePersonnel: (data) => ipcRenderer.invoke('save-personnel', data),
    saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
    backupDatabase: () => ipcRenderer.invoke('backup-database'),
    windowMinimize: () => ipcRenderer.send('window-minimize'),
    windowMaximizeToggle: () => ipcRenderer.send('window-maximize-toggle'),
    windowClose: () => ipcRenderer.send('window-close'),
    maximizeWindow: () => ipcRenderer.send('maximize-window')
});
