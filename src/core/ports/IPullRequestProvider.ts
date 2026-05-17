import { PullRequest, FileDiff } from '../domain/types';

export interface FileCommitDetails {
    filePath: string;
    newContent: string;
    changeType: 'edit' | 'add' | 'delete';
}

export interface PolicyStatus {
    isPassing: boolean;
    policies: string[];
}

export interface IPullRequestProvider {
    getActivePullRequests(): Promise<PullRequest[]>;
    getPullRequestDiffs(repoId: string, prId: number): Promise<FileDiff[]>;
    getFileContent(repoId: string, filePath: string, branchOrCommit: string): Promise<{ content: string; objectId: string; branchSha: string }>;
    commitChanges(repoId: string, sourceBranch: string, expectedOldObjectId: string, changes: FileCommitDetails[], commitMessage: string): Promise<boolean>;
    setReviewerVote(repoId: string, prId: number, vote: number): Promise<boolean>;
    completePullRequest(repoId: string, prId: number): Promise<boolean>;
    getPullRequestPolicyStatus(repoId: string, prId: number): Promise<PolicyStatus>;
}
