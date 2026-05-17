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
    private pat: string,
    private maxFilesPerReview?: number
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

  async getFileContent(repoId: string, filePath: string, branchOrCommit: string): Promise<{ content: string; objectId: string; branchSha: string }> {
    const gitApi = await this.getApi();

    if (!this.project) {
        throw new ConfigError("Missing AZURE_DEVOPS_PROJECT.");
    }
    
    // Convert a branch name like "feature/auth" to an ADO version descriptor
    const versionFullName = branchOrCommit.startsWith('refs/') ? branchOrCommit : `refs/heads/${branchOrCommit}`;
    const versionName = versionFullName.replace('refs/heads/', '');
    
    const versionDescriptor = {
        version: versionName,
        versionType: 0 // 0 = Branch, 1 = Tag, 2 = Commit
    };

    try {
        const branchRef = await gitApi.getRefs(repoId, this.project, versionName);
        const branchSha = branchRef && branchRef.length > 0 ? branchRef[0].objectId! : '';

        const item = await gitApi.getItem(
            repoId,
            filePath,
            this.project,
            undefined, // scopePath
            undefined, // recursionLevel
            true, // includeContentMetadata
            undefined, // latestProcessedChange
            undefined, // download
            versionDescriptor as any,
            true // includeContent
        );
        
        return {
          content: item?.content || "",
          objectId: item?.objectId || "",
          branchSha
        };
    } catch (error: any) {
        console.error(`Failed to fetch ${filePath}:`, error);
        throw new NetworkError(`Failed to fetch file content: ${error.message}`);
    }
  }

  async commitChanges(repoId: string, sourceBranch: string, expectedOldObjectId: string, changes: FileCommitDetails[], commitMessage: string): Promise<boolean> {
    const gitApi = await this.getApi();
    
    if (!this.project) {
        throw new ConfigError("Missing AZURE_DEVOPS_PROJECT.");
    }

    try {
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
                oldObjectId: expectedOldObjectId
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

      const diffsResponse = await api.getCommitDiffs(
        repositoryId,
        this.project,
        undefined, // diffCommonCommit
        100, // top
        0, // skip
        { version: targetCommit, versionType: 2 } as any, // baseVersionDescriptor
        { version: sourceCommit, versionType: 2 } as any // targetVersionDescriptor
      );
      
      const fileChanges: FileDiff[] = [];

      if (!diffsResponse || !diffsResponse.changes) {
        return [];
      }

      let changes = diffsResponse.changes.filter(c => !c.item?.isFolder);
      if (this.maxFilesPerReview !== undefined && this.maxFilesPerReview > 0) {
        changes = changes.slice(0, this.maxFilesPerReview);
      }

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

  async setReviewerVote(repoId: string, prId: number, vote: number): Promise<boolean> {
    const gitApi = await this.getApi();
    if (!this.project) {
        throw new ConfigError("Missing AZURE_DEVOPS_PROJECT.");
    }
    try {
        const authHandler = azdev.getPersonalAccessTokenHandler(this.pat);
        const connection = new azdev.WebApi(this.orgUrl, authHandler);
        const connData = await connection.connect();
        const myId = connData.authenticatedUser?.id;
        if (!myId) throw new Error("Could not determine authenticated user identity.");
        
        await gitApi.createPullRequestReviewer({ vote }, repoId, prId, myId, this.project);
        return true;
    } catch (error: any) {
        console.error("Failed to set reviewer vote:", error);
        throw new NetworkError(`Failed to set reviewer vote: ${error.message}`);
    }
  }

  async completePullRequest(repoId: string, prId: number): Promise<boolean> {
    const gitApi = await this.getApi();
    if (!this.project) {
        throw new ConfigError("Missing AZURE_DEVOPS_PROJECT.");
    }
    
    try {
        const currentPr = await gitApi.getPullRequest(repoId, prId, this.project);
        const lastMergeSourceCommit = currentPr.lastMergeSourceCommit?.commitId;
        if (!lastMergeSourceCommit) throw new Error("Could not determine lastMergeSourceCommit");

        const prToUpdate = {
            status: 3, // PullRequestStatus.Completed
            lastMergeSourceCommit: {
                commitId: lastMergeSourceCommit
            }
        };
        await gitApi.updatePullRequest(prToUpdate, repoId, prId, this.project);
        return true;
    } catch (error: any) {
        console.error("Failed to complete PR:", error);
        throw new NetworkError(`Failed to complete PR: ${error.message}`);
    }
  }

  async getPullRequestPolicyStatus(repoId: string, prId: number): Promise<{ isPassing: boolean; policies: string[]; }> {
    const gitApi = await this.getApi();
    if (!this.project) {
        throw new ConfigError("Missing AZURE_DEVOPS_PROJECT.");
    }
    
    try {
        const pr = await gitApi.getPullRequest(repoId, prId, this.project);
        const artifactId = pr.artifactId;
        if (!artifactId) throw new Error("Could not retrieve PR artifactId.");

        const authHandler = azdev.getPersonalAccessTokenHandler(this.pat);
        const connection = new azdev.WebApi(this.orgUrl, authHandler);
        const policyApi = await connection.getPolicyApi();

        const evaluations = await policyApi.getPolicyEvaluations(this.project, artifactId);

        let isPassing = true;
        const policies: string[] = [];

        for (const evalRecord of evaluations) {
             const statusValue = evalRecord.status;
             // 2 = Approved, 4 = NotApplicable
             if (evalRecord.configuration?.isBlocking) {
                 if (statusValue !== 2 && statusValue !== 4) {
                     isPassing = false;
                 }
             }
             let statusString = "Unknown";
             if (statusValue === 0) statusString = "Queued";
             if (statusValue === 1) statusString = "Running";
             if (statusValue === 2) statusString = "Approved";
             if (statusValue === 3) statusString = "Rejected";
             if (statusValue === 4) statusString = "NotApplicable";
             if (statusValue === 5) statusString = "Broken";

             policies.push(`${evalRecord.configuration?.type?.displayName || "Unknown"}: ${statusString}`);
        }

        return { isPassing, policies };
    } catch (error: any) {
        console.error("Failed to fetch policies:", error);
        throw new NetworkError(`Failed to fetch policies: ${error.message}`);
    }
  }
}
