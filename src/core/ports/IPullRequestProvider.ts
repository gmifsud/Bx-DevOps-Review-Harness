import { PullRequest, FileDiff } from '../domain/types';

export interface FileCommitDetails {
    filePath: string;
    newContent: string;
    changeType: 'edit' | 'add' | 'delete';
}

export interface IPullRequestProvider {
    getActivePullRequests(): Promise<PullRequest[]>;
    getPullRequestDiffs(repoId: string, prId: number): Promise<FileDiff[]>;
    getFileContent(repoId: string, filePath: string, branchOrCommit: string): Promise<string>;
    getRepositoryTree(repoId: string, branchName: string): Promise<string[]>;
    commitChanges(repoId: string, sourceBranch: string, changes: FileCommitDetails[], commitMessage: string): Promise<boolean>;
}
