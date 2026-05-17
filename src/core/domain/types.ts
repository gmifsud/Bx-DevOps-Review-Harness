export interface PullRequest {
  id: number;
  title: string;
  author: string;
  time: string;
  repositoryId: string;
}

export interface FileDiff {
  filePath: string;
  changeType: string;
  patch: any;
}

export interface AIReview {
  id: string;
  status: "approved" | "rejected";
  comments?: string;
}
