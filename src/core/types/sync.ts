import { ISubmissionPayload, Difficulty } from './submission';

export interface IHistoricalSyncProgress {
  status: 'idle' | 'scanning_repo' | 'fetching_leetcode' | 'committing' | 'updating_readme' | 'completed' | 'error';
  totalFound: number;
  totalMissing: number;
  processedCount: number;
  currentProblem?: string;
  error?: string;
}

export interface IStagedProblemItem {
  id: string;
  problemId: string;
  title: string;
  titleSlug: string;
  difficulty: Difficulty;
  topics: string[];
  language: string;
  timestamp: number;
  isAlreadySynced: boolean;
  submission: ISubmissionPayload;
}

export interface ISelectiveSyncOptions {
  targetBranch: string;
  createPullRequest: boolean;
  pullRequestTitle?: string;
  pullRequestBody?: string;
  baseBranch?: string;
}

export interface ISelectiveSyncResult {
  success: boolean;
  committedCount: number;
  totalRequested: number;
  branch: string;
  pullRequestUrl?: string;
  error?: string;
}
