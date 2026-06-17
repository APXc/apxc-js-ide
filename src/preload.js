const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  runCode: (code) => ipcRenderer.invoke('run-code', code),
  loadTabs: () => ipcRenderer.invoke('load-tabs'),
  saveTabs: (data) => ipcRenderer.invoke('save-tabs', data),
  exportTab: (payload) => ipcRenderer.invoke('export-tab', payload),
  installPackage: (name) => ipcRenderer.invoke('install-package', name),
  listPackages: () => ipcRenderer.invoke('list-packages'),
  uninstallPackage: (name) => ipcRenderer.invoke('uninstall-package', name),
});
