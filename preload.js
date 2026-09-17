const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getData: () => ipcRenderer.invoke('get-data'),
  savePersonnel: (data) => ipcRenderer.invoke('save-personnel', data),
  saveSettings: (data) => ipcRenderer.invoke('save-settings', data)
});
