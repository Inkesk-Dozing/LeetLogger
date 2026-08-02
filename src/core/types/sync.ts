export interface IHistoricalSyncProgress {
  status: 'idle' | 'scanning_repo' | 'fetching_leetcode' | 'committing' | 'updating_readme' | 'completed' | 'error';
  totalFound: number;
  totalMissing: number;
  processedCount: number;
  currentProblem?: string;
  error?: string;
}
