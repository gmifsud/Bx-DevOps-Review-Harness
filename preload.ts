import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getPullRequests: () => ipcRenderer.invoke('get-pull-requests'),
  getDiffs: (repoId: string, prId: number) => ipcRenderer.invoke('get-diffs', repoId, prId),
  generateAIReview: (diffs: any[]) => ipcRenderer.invoke('generate-ai-review', diffs)
});
