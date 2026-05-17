import * as azdev from "azure-devops-node-api";
import * as GitApi from "azure-devops-node-api/GitApi";
import { GitPullRequestSearchCriteria, PullRequestStatus } from "azure-devops-node-api/interfaces/GitInterfaces";
import { IPullRequestProvider } from "../../../core/ports/IPullRequestProvider";
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
