import { IGitHubConfig } from './git';
import { ISubmissionPayload } from './submission';

export interface IExtensionStats {
  totalSynced: number;
  leetcodeCount: number;
  gfgCount: number;
  lastSyncedTimestamp?: number;
  lastSyncedProblem?: string;
}

export interface ISolvedProblemMetadata {
  id: string;
  title: string;
  titleSlug: string;
  difficulty: string;
  topics: string[];
  platform: string;
  timestamp: number;
}

export interface IQueuedItem {
  id: string; // Unique queue item ID
  payload: ISubmissionPayload;
  addedAt: number;
  retryCount: number;
  lastError?: string;
}

export interface IExtensionStorage {
  gitConfig?: IGitHubConfig;
  stats: IExtensionStats;
  queue: IQueuedItem[];
  syncedSlugs: Record<string, string>; // Map titleSlug -> commitSha
  solvedProblems?: Record<string, ISolvedProblemMetadata>; // Map titleSlug -> metadata
  autoSyncEnabled: boolean;
}
