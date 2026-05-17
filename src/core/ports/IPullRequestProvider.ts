import { PullRequest, FileDiff } from '../domain/types';

export interface IPullRequestProvider {
    getActivePullRequests(): Promise<PullRequest[]>;
    getPullRequestDiffs(repoId: string, prId: number): Promise<FileDiff[]>;
}
