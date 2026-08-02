/**
 * Core submission payload structure extracted from coding platforms.
 */
export type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Basic' | 'School';

export type SupportedPlatform = 'leetcode' | 'gfg' | 'hackerrank';

export interface ISubmissionPayload {
  id: string; // Unique submission ID
  platform: SupportedPlatform;
  problemId: string; // e.g. "1" or "0001"
  title: string; // e.g. "Two Sum"
  titleSlug: string; // e.g. "two-sum"
  difficulty: Difficulty;
  category?: string;
  topics: string[];
  code: string;
  language: string; // e.g. "cpp", "python3", "java", "typescript"
  extension: string; // e.g. ".cpp", ".py", ".java", ".ts"
  runtime?: string; // e.g. "45 ms"
  runtimePercentile?: number; // e.g. 88.5
  memory?: string; // e.g. "14.2 MB"
  memoryPercentile?: number; // e.g. 72.1
  questionContent?: string; // Problem statement HTML or markdown
  timestamp: number; // Unix timestamp in milliseconds
}
