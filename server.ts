import express from 'express';
import path from 'path';
import axios from 'axios';
import * as diff from 'diff';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Helper to validate config
  const validateConfig = () => {
    const orgUrl = process.env.AZURE_DEVOPS_ORG_URL;
    const project = process.env.AZURE_DEVOPS_PROJECT;
    const pat = process.env.AZURE_DEVOPS_PAT;
    if (!orgUrl || !project || !pat) {
      throw new Error('Missing Azure DevOps configuration. Please set AZURE_DEVOPS_ORG_URL, AZURE_DEVOPS_PROJECT, and AZURE_DEVOPS_PAT.');
    }
    return { orgUrl, project, pat };
  };

  // Helper for generic Azure DevOps API calls
  const executeAzureApi = async (url: string) => {
    const { pat } = validateConfig();
    const token = Buffer.from(`:${pat}`).toString('base64');
    
    return axios.get(url, {
      headers: {
        'Authorization': `Basic ${token}`,
        'Content-Type': 'application/json',
      }
    });
  };

  // API Routes
  
  // 1. Get List of PRs
  app.get('/api/prs', async (req, res) => {
    try {
      const { orgUrl, project } = validateConfig();
      // Fetch active pull requests
      const url = `${orgUrl}/${project}/_apis/git/pullrequests?searchCriteria.status=active&api-version=7.0`;
      
      const response = await executeAzureApi(url);
      
      const prs = response.data.value.map((pr: any) => ({
        id: pr.pullRequestId,
        title: pr.title,
        author: pr.createdBy.displayName,
        time: new Date(pr.creationDate).toLocaleString(), // Simple format
        repositoryId: pr.repository.id,
        sourceCommit: pr.lastMergeSourceCommit?.commitId,
        targetCommit: pr.lastMergeTargetCommit?.commitId,
      }));
      
      res.json({ prs });
    } catch (error: any) {
      console.error('Error fetching PRs:', error.message);
      res.status(500).json({ error: error.message || 'Failed to fetch PRs' });
    }
  });

  // 2. Get PR Diff
  app.get('/api/prs/:repoId/:prId/diff', async (req, res) => {
    try {
      const { repoId, prId } = req.params;
      const { orgUrl, project } = validateConfig();

      // Get PR details to find latest commits
      const prUrl = `${orgUrl}/${project}/_apis/git/repositories/${repoId}/pullrequests/${prId}?api-version=7.0`;
      const prResponse = await executeAzureApi(prUrl);
      const pr = prResponse.data;

      const sourceCommit = pr.lastMergeSourceCommit?.commitId;
      const targetCommit = pr.lastMergeTargetCommit?.commitId;

      if (!sourceCommit || !targetCommit) {
         return res.json({ diff: [] }); // PR not yet merged/conflicted/etc
      }

      // Fetch iterations / changes (Azure makes getting exact line diffs difficult without two calls)
      // We will try fetching the base and target file contents for changed files and generating diffs
      
      // Let's get the list of changed files between the source and target commits
      const changesUrl = `${orgUrl}/${project}/_apis/git/repositories/${repoId}/diffs/commits?baseVersion=${targetCommit}&baseVersionType=commit&targetVersion=${sourceCommit}&targetVersionType=commit&api-version=7.0`;
      const changesResponse = await executeAzureApi(changesUrl);
      
      if (!changesResponse.data || !changesResponse.data.changes) {
        return res.json({ diff: [] });
      }

      // Limit to first 3 files to avoid massive delays in prototype harness
      const fileChanges = changesResponse.data.changes.filter((c: any) => !c.item.isFolder).slice(0, 3);
      
      const diffResults = [];

      for (const change of fileChanges) {
        const filePath = change.item.path;
        let baseContent = '';
        let targetContent = '';

        try {
          if (change.changeType !== 'add') {
             const baseItemUrl = `${orgUrl}/${project}/_apis/git/repositories/${repoId}/items?path=${filePath}&versionDescriptor.version=${targetCommit}&versionDescriptor.versionType=commit&api-version=7.0`;
             const baseResponse = await executeAzureApi(baseItemUrl);
             baseContent = typeof baseResponse.data === 'object' ? JSON.stringify(baseResponse.data, null, 2) : baseResponse.data.toString();
          }
        } catch (e) { /* ignore fetching issues */ }

        try {
          if (change.changeType !== 'delete') {
             const targetItemUrl = `${orgUrl}/${project}/_apis/git/repositories/${repoId}/items?path=${filePath}&versionDescriptor.version=${sourceCommit}&versionDescriptor.versionType=commit&api-version=7.0`;
             const targetResponse = await executeAzureApi(targetItemUrl);
             targetContent = typeof targetResponse.data === 'object' ? JSON.stringify(targetResponse.data, null, 2) : targetResponse.data.toString();
          }
        } catch (e) { /* ignore fetching issues */ }

        // Compute diff
        const fileDiff = diff.structuredPatch(filePath, filePath, baseContent, targetContent, '', '');
        diffResults.push({
           filePath,
           changeType: change.changeType,
           patch: fileDiff,
        });
      }

      res.json({ diff: diffResults });

    } catch (error: any) {
      console.error('Error fetching PR Diff:', error.message);
      res.status(500).json({ error: error.message || 'Failed to fetch diff' });
    }
  });

  // Vite Integration for frontend
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
