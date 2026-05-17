import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { AzureDevOpsAdapter } from './src/shell/adapters/azure-devops/AzureDevOpsAdapter';
import { GoogleAIAdapter } from './src/shell/adapters/google-ai/GoogleAIAdapter';
import { ReviewOrchestrator } from './src/core/use-cases/ReviewOrchestrator';
import { ApplyFixUseCase } from './src/core/use-cases/ApplyFixUseCase';
import { ApplyFixBatchUseCase } from './src/core/use-cases/ApplyFixBatchUseCase';
import { FixPatcher } from './src/core/services/FixPatcher';
import { CompletePullRequestUseCase } from './src/core/use-cases/CompletePullRequestUseCase';
import { FileDiff } from './src/core/domain/types';
import * as dotenv from 'dotenv';


dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'), // Assuming esbuild compiles preload.ts/js to cjs if needed, or we just write preload.cjs
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  
  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, 'dist/index.html'));
  }
}

app.whenReady().then(() => {
  const orgUrl = process.env.AZURE_DEVOPS_ORG_URL || "";
  const project = process.env.AZURE_DEVOPS_PROJECT || "";
  const pat = process.env.AZURE_DEVOPS_PAT || "";
  const apiKey = process.env.GEMINI_API_KEY || "";
  const azureDevOpsAdapter = new AzureDevOpsAdapter(orgUrl, project, pat);
  const aiAdapter = new GoogleAIAdapter(apiKey);
  const reviewOrchestrator = new ReviewOrchestrator(azureDevOpsAdapter, aiAdapter);

  ipcMain.handle('get-pull-requests', async () => {
    return azureDevOpsAdapter.getActivePullRequests();
  });

  ipcMain.handle('get-diffs', async (event, repoId: string, prId: number) => {
    return azureDevOpsAdapter.getPullRequestDiffs(repoId, prId);
  });

  ipcMain.handle('generate-ai-review', async (event, repoId: string, branchName: string, diffs: FileDiff[]) => {
    return reviewOrchestrator.orchestrateReview(repoId, branchName, diffs);
  });

  // Inside app.whenReady...
  const applyFixUseCase = new ApplyFixUseCase(azureDevOpsAdapter);
  const applyFixBatchUseCase = new ApplyFixBatchUseCase(azureDevOpsAdapter);
  const completePRUseCase = new CompletePullRequestUseCase(azureDevOpsAdapter);
  const fixPatcher = new FixPatcher();

  ipcMain.handle('apply-fix', async (event, repoId: string, sourceBranch: string, filePath: string, searchBlock: string, replaceBlock: string, commitMessage: string) => {
     return applyFixUseCase.execute(repoId, sourceBranch, { filePath, searchBlock, replaceBlock, commitMessage });
  });

  ipcMain.handle('apply-fix-batch', async (event, repoId: string, sourceBranch: string, fixes: any[]) => {
     return applyFixBatchUseCase.execute(repoId, sourceBranch, fixes);
  });

  ipcMain.handle('dry-run-fix', async (event, repoId: string, sourceBranch: string, filePath: string, searchBlock: string, replaceBlock: string) => {
     try {
         const { content } = await azureDevOpsAdapter.getFileContent(repoId, filePath, sourceBranch);
         const fix = { filePath, searchBlock, replaceBlock, commitMessage: '' };
         return fixPatcher.dryRun(fix, content);
     } catch (e) {
         console.error('Dry run failed', e);
         return { tier: 'T3_Reject', reason: 'Failed to fetch file context' };
     }
  });

  ipcMain.handle('get-pr-policies', async (event, repoId: string, prId: number) => {
     return azureDevOpsAdapter.getPullRequestPolicyStatus(repoId, prId);
  });

  ipcMain.handle('vote-pr', async (event, repoId: string, prId: number, vote: number) => {
     return azureDevOpsAdapter.setReviewerVote(repoId, prId, vote);
  });

  ipcMain.handle('complete-pr', async (event, repoId: string, prId: number, confirmation: { engineerDisplayName: string, timestampUtc: string }) => {
     return completePRUseCase.execute(repoId, prId, confirmation);
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
