const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  runCode: (code) => ipcRenderer.invoke('run-code', code),
  loadTabs: () => ipcRenderer.invoke('load-tabs'),
  saveTabs: (data) => ipcRenderer.invoke('save-tabs', data),
  exportTab: (payload) => ipcRenderer.invoke('export-tab', payload),
});
