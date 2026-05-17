import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getPullRequests: () => ipcRenderer.invoke('get-pull-requests'),
  getDiffs: (repoId: string, prId: number) => ipcRenderer.invoke('get-diffs', repoId, prId),
  generateAIReview: (repoId: string, branchName: string, diffs: any[]) => ipcRenderer.invoke('generate-ai-review', repoId, branchName, diffs),
  applyFix: (repoId: string, sourceBranch: string, filePath: string, searchBlock: string, replaceBlock: string, commitMessage: string) => ipcRenderer.invoke('apply-fix', repoId, sourceBranch, filePath, searchBlock, replaceBlock, commitMessage),
  applyFixBatch: (repoId: string, sourceBranch: string, fixes: any[]) => ipcRenderer.invoke('apply-fix-batch', repoId, sourceBranch, fixes),
  dryRunFix: (repoId: string, sourceBranch: string, filePath: string, searchBlock: string, replaceBlock: string) => ipcRenderer.invoke('dry-run-fix', repoId, sourceBranch, filePath, searchBlock, replaceBlock),
  getPrPolicies: (repoId: string, prId: number) => ipcRenderer.invoke('get-pr-policies', repoId, prId),
  votePr: (repoId: string, prId: number, vote: number) => ipcRenderer.invoke('vote-pr', repoId, prId, vote),
  completePr: (repoId: string, prId: number, confirmation: { engineerDisplayName: string, timestampUtc: string }) => ipcRenderer.invoke('complete-pr', repoId, prId, confirmation)
});
