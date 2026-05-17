export interface PullRequest {
  id: number;
  title: string;
  author: string;
  time: string;
  repositoryId: string;
  sourceBranch: string;
}

export interface FileDiff {
  filePath: string;
  changeType: string;
  patch: any;
  isDisregarded?: boolean;
}

export interface AIReview {
  id: string;
  status: "approved" | "rejected";
  comments?: string;
  suggestedFixes?: SuggestedFix[];
}

export interface SuggestedFix {
  filePath: string;
  searchBlock: string;
  replaceBlock: string;
  commitMessage: string;
}
