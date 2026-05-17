import * as azdev from "azure-devops-node-api";
import * as GitApi from "azure-devops-node-api/GitApi";
import { GitPullRequestSearchCriteria, PullRequestStatus, GitPush, ItemContentType, VersionControlChangeType } from "azure-devops-node-api/interfaces/GitInterfaces";
import { IPullRequestProvider, FileCommitDetails } from "../../../core/ports/IPullRequestProvider";
import { PullRequest, FileDiff } from "../../../core/domain/types";
import { ConfigError, NetworkError } from "../../../core/domain/errors";
import * as diff from "diff";

export class AzureDevOpsAdapter implements IPullRequestProvider {
  private gitApi: GitApi.IGitApi | null = null;

  constructor(
    private orgUrl: string,
    private project: string,
    private pat: string
  ) {}

  private async getApi(): Promise<GitApi.IGitApi> {
    if (this.gitApi) return this.gitApi;

    if (!this.orgUrl || !this.pat) {
      throw new ConfigError("Missing AZURE_DEVOPS_ORG_URL or AZURE_DEVOPS_PAT.");
    }

    try {
      const authHandler = azdev.getPersonalAccessTokenHandler(this.pat);
      const connection = new azdev.WebApi(this.orgUrl, authHandler);
      this.gitApi = await connection.getGitApi();
      return this.gitApi;
    } catch (e: any) {
      throw new NetworkError(`Failed to connect to Azure DevOps: ${e.message}`);
    }
  }

  async getFileContent(repoId: string, filePath: string, branchOrCommit: string): Promise<string> {
    const gitApi = await this.getApi();

    if (!this.project) {
        throw new ConfigError("Missing AZURE_DEVOPS_PROJECT.");
    }
    
    // Convert a branch name like "feature/auth" to an ADO version descriptor
    const versionDescriptor = {
        version: branchOrCommit.replace('refs/heads/', ''),
        versionType: 0 // 0 = Branch, 1 = Tag, 2 = Commit
    };

    try {
        const stream = await gitApi.getItemText(
            repoId,
            filePath,
            this.project,
            undefined, // includeContentMetadata
            undefined, // resolveLfs
            versionDescriptor
        );
        
        if (typeof stream === 'string') {
          return stream;
        } else if (stream && (stream as any).read) {
          // Read the stream into a string
          return await new Promise<string>((resolve, reject) => {
              let content = '';
              (stream as any).on('data', (chunk: any) => content += chunk);
              (stream as any).on('end', () => resolve(content));
              (stream as any).on('error', reject);
          });
        }
        return "";
    } catch (error: any) {
        console.error(`Failed to fetch ${filePath}:`, error);
        throw new NetworkError(`Failed to fetch file content: ${error.message}`);
    }
  }

  async getRepositoryTree(repoId: string, branchName: string): Promise<string[]> {
      const gitApi = await this.getApi();
      if (!this.project) {
        throw new ConfigError("Missing AZURE_DEVOPS_PROJECT.");
      }
      try {
        const items = await gitApi.getItems(repoId, this.project, undefined, undefined, undefined, true, undefined, undefined, { version: branchName.replace('refs/heads/', ''), versionType: 0 });
        return items.filter(item => !item.isFolder && item.path).map(item => item.path!);
      } catch (e: any) {
         console.error("Failed to fetch repository tree:", e);
         throw new NetworkError(`Failed to fetch tree: ${e.message}`);
      }
  }

  async commitChanges(repoId: string, sourceBranch: string, changes: FileCommitDetails[], commitMessage: string): Promise<boolean> {
    const gitApi = await this.getApi();
    
    if (!this.project) {
        throw new ConfigError("Missing AZURE_DEVOPS_PROJECT.");
    }

    try {
        // 1. We need the current objectId of the branch we are pushing to
        const branchRef = await gitApi.getRefs(repoId, this.project, sourceBranch.replace('refs/', ''));
        if (!branchRef || branchRef.length === 0) throw new Error("Branch not found");
        const oldObjectId = branchRef[0].objectId;

        // 2. Map our Domain changes to ADO's GitChange interface
        const adoChanges = changes.map(c => ({
            changeType: c.changeType === 'edit' ? 2 : c.changeType === 'add' ? 1 : 16, // 1: Add, 2: Edit, 16: Delete
            item: { path: c.filePath },
            newContent: c.changeType !== 'delete' ? { content: c.newContent, contentType: 0 } : undefined // 0 = RawText
        }));

        // 3. Construct the Push payload
        const push: GitPush = {
            refUpdates: [{
                name: sourceBranch.startsWith('refs/') ? sourceBranch : `refs/heads/${sourceBranch}`,
                oldObjectId: oldObjectId
            }],
            commits: [{
                comment: commitMessage,
                changes: adoChanges
            }]
        };

        // 4. Execute the push
        await gitApi.createPush(push, repoId, this.project);
        return true;
    } catch (error: any) {
        console.error("Failed to commit changes:", error);
        throw new NetworkError(`Failed to commit changes: ${error.message}`);
    }
  }

  async getActivePullRequests(): Promise<PullRequest[]> {
    const api = await this.getApi();

    if (!this.project) {
      throw new ConfigError("Missing AZURE_DEVOPS_PROJECT.");
    }

    const searchCriteria: GitPullRequestSearchCriteria = {
      status: PullRequestStatus.Active,
    };

    try {
      const pullRequests = await api.getPullRequestsByProject(this.project, searchCriteria);

      return pullRequests.map(pr => ({
        id: pr.pullRequestId!,
        title: pr.title || "Untitled",
        author: pr.createdBy?.displayName || "Unknown",
        time: pr.creationDate ? new Date(pr.creationDate).toLocaleString() : "Unknown",
        repositoryId: pr.repository?.id || "Unknown",
        sourceBranch: pr.sourceRefName || "Unknown",
      }));
    } catch (e: any) {
      throw new NetworkError(`Failed to fetch pull requests: ${e.message}`);
    }
  }

  async getPullRequestDiffs(repositoryId: string, pullRequestId: number): Promise<FileDiff[]> {
    const api = await this.getApi();

    if (!this.project) {
      throw new ConfigError("Missing AZURE_DEVOPS_PROJECT.");
    }

    try {
      const pr = await api.getPullRequest(repositoryId, pullRequestId, this.project);

      const sourceCommit = pr.lastMergeSourceCommit?.commitId;
      const targetCommit = pr.lastMergeTargetCommit?.commitId;

      if (!sourceCommit || !targetCommit) {
        return [];
      }

      const diffsResponse = await api.getCommitDiffs(repositoryId, this.project, undefined, 0, 100, undefined, undefined, targetCommit, sourceCommit);
      
      const fileChanges: FileDiff[] = [];

      if (!diffsResponse || !diffsResponse.changes) {
        return [];
      }

      // Limit to first 3 files to avoid massive delays in prototype harness
      const changes = diffsResponse.changes.filter(c => !c.item?.isFolder).slice(0, 3);

      for (const change of changes) {
        const filePath = change.item?.path;
        if (!filePath) continue;

        let baseContent = '';
        let targetContent = '';

        if (change.changeType !== 1) { // 1 is Add
           try {
             // simplified fetching
             const baseItem = await api.getItem(repositoryId, filePath, this.project, undefined, undefined, true, undefined, undefined, { versionType: 0, version: targetCommit });
             if (baseItem && baseItem.content) {
               baseContent = baseItem.content;
             }
           } catch (e) { /* ignore fetching issues */ }
        }

        if (change.changeType !== 2) { // 2 is Delete
           try {
             const targetItem = await api.getItem(repositoryId, filePath, this.project, undefined, undefined, true, undefined, undefined, { versionType: 0, version: sourceCommit });
             if (targetItem && targetItem.content) {
               targetContent = targetItem.content;
             }
           } catch (e) { /* ignore fetching issues */ }
        }

        let changeTypeString = 'edit';
        if (change.changeType === 1) changeTypeString = 'add';
        if (change.changeType === 2) changeTypeString = 'delete';

        const fileDiff = diff.structuredPatch(filePath, filePath, baseContent, targetContent, '', '');
        fileChanges.push({
           filePath,
           changeType: changeTypeString,
           patch: fileDiff,
        });
      }

      return fileChanges;
    } catch (e: any) {
      throw new NetworkError(`Failed to fetch pull request diffs: ${e.message}`);
    }
  }
}
