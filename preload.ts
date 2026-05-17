import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getPullRequests: () => ipcRenderer.invoke('get-pull-requests'),
  getDiffs: (repoId: string, prId: number) => ipcRenderer.invoke('get-diffs', repoId, prId),
  generateAIReview: (repoId: string, branchName: string, diffs: any[]) => ipcRenderer.invoke('generate-ai-review', repoId, branchName, diffs),
  applyFix: (repoId: string, sourceBranch: string, filePath: string, searchBlock: string, replaceBlock: string, commitMessage: string) => ipcRenderer.invoke('apply-fix', repoId, sourceBranch, filePath, searchBlock, replaceBlock, commitMessage)
});
