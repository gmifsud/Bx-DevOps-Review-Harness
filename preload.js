const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getPullRequests: () => ipcRenderer.invoke('get-pull-requests'),
  getDiffs: (repoId, prId) => ipcRenderer.invoke('get-diffs', repoId, prId)
});
