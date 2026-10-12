/**
 * preload.js
 * جسر آمن بين عملية Electron الرئيسية والواجهة (Renderer).
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getPrices: () => ipcRenderer.invoke('prices:get'),
  refreshPrices: () => ipcRenderer.invoke('prices:refresh'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (partial) => ipcRenderer.invoke('settings:set', partial),

  onPricesUpdate: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('prices:update', listener);
    return () => ipcRenderer.removeListener('prices:update', listener);
  },

  onPricesError: (callback) => {
    const listener = (_event, message) => callback(message);
    ipcRenderer.on('prices:error', listener);
    return () => ipcRenderer.removeListener('prices:error', listener);
  }
});
