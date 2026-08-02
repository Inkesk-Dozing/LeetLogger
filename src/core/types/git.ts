/**
 * GitHub API and Git Commit types.
 */
export interface IGitHubConfig {
  accessToken: string;
  username: string;
  repository: string; // e.g. "LeetCode-Solutions"
  branch: string; // default "main"
}

export interface ICommitAuthor {
  name: string;
  email: string;
  date: string; // ISO 8601 string, e.g. "2023-05-15T14:32:00Z"
}

export interface ICommitFile {
  path: string; // Relative file path in repository (e.g. "leetcode/0001-two-sum/README.md")
  content: string; // File content
}

export interface ICommitResult {
  success: boolean;
  commitSha?: string;
  commitUrl?: string;
  error?: string;
}
