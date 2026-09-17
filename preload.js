const { contextBridge, ipcRenderer } = require('electron');

// HTML dosyamızın içine "window.api" adında güvenli bir köprü açıyoruz
contextBridge.exposeInMainWorld('api', {
  getData: () => ipcRenderer.invoke('get-data'),
  savePersonnel: (data) => ipcRenderer.invoke('save-personnel', data),
  saveSettings: (data) => ipcRenderer.invoke('save-settings', data)
});
