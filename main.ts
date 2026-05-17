import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { AzureDevOpsAdapter } from './src/shell/adapters/azure-devops/AzureDevOpsAdapter';
import { GoogleAIAdapter } from './src/shell/adapters/google-ai/GoogleAIAdapter';
import { prepareDiffForAI } from './src/core/use-cases/PrepareReviewContext';
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

  ipcMain.handle('get-pull-requests', async () => {
    return azureDevOpsAdapter.getActivePullRequests();
  });

  ipcMain.handle('get-diffs', async (event, repoId: string, prId: number) => {
    return azureDevOpsAdapter.getPullRequestDiffs(repoId, prId);
  });

  ipcMain.handle('generate-ai-review', async (event, diffs: FileDiff[]) => {
    const diffText = prepareDiffForAI(diffs);
    return aiAdapter.reviewCodeDiff(diffText);
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
