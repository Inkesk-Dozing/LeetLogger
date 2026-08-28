import { StorageManager } from '../core/storage/storageManager';
import { GitHubClient } from '../core/git/githubClient';
import { LeetCodeHistoricalFetcher } from '../platform/leetcode/historicalFetcher';
import { MarkdownFormatter } from '../core/formatters/markdownFormatter';
import { IHistoricalSyncProgress } from '../core/types/sync';
import { ICommitFile } from '../core/types/git';

export class HistoricalSyncOrchestrator {
  private static currentProgress: IHistoricalSyncProgress = {
    status: 'idle',
    totalFound: 0,
    totalMissing: 0,
    processedCount: 0,
  };

  public static getProgress(): IHistoricalSyncProgress {
    return this.currentProgress;
  }

  /**
   * Starts historical catch-up sync between LeetCode and GitHub repository.
   */
  public static async startSync(): Promise<IHistoricalSyncProgress> {
    const gitConfig = await StorageManager.getGitConfig();
    if (!gitConfig) {
      this.currentProgress = {
        status: 'error',
        totalFound: 0,
        totalMissing: 0,
        processedCount: 0,
        error: 'GitHub credentials not configured.',
      };
      return this.currentProgress;
    }

    const github = new GitHubClient(gitConfig);

    // 1. Verify Repo
    const verify = await github.verifyRepo();
    if (!verify.success) {
      this.currentProgress = {
        status: 'error',
        totalFound: 0,
        totalMissing: 0,
        processedCount: 0,
        error: verify.error,
      };
      return this.currentProgress;
    }

    // 2. Scan existing repository files
    this.currentProgress = { status: 'scanning_repo', totalFound: 0, totalMissing: 0, processedCount: 0 };
    const existingRepoPaths = await github.getExistingRepoTree();

    // 3. Fetch LeetCode historical submissions (includes multi-language support)
    this.currentProgress.status = 'fetching_leetcode';
    const submissions = await LeetCodeHistoricalFetcher.fetchSubmissionHistory(100);
    this.currentProgress.totalFound = submissions.length;

    // 4. Identify missing problems by checking if the specific code file is absent
    const missingSubmissions = submissions.filter((sub) => {
      const dirPath = MarkdownFormatter.getDirectoryPath(sub);
      const codeFileName = MarkdownFormatter.getCodeFileName(sub.extension);
      const codePath = `${dirPath}/${codeFileName}`;
      return !existingRepoPaths.has(codePath);
    });

    this.currentProgress.totalMissing = missingSubmissions.length;
    this.currentProgress.status = 'committing';

    // 5. Commit missing problems with historical backdated timestamps
    for (let i = 0; i < missingSubmissions.length; i++) {
      const sub = missingSubmissions[i];
      this.currentProgress.currentProblem = `${sub.title} (${sub.language})`;
      this.currentProgress.processedCount = i + 1;

      const dirPath = MarkdownFormatter.getDirectoryPath(sub);
      const codeFileName = MarkdownFormatter.getCodeFileName(sub.extension);
      const readmeContent = MarkdownFormatter.formatReadme(sub, github.username);

      // If README already exists in the repo tree, omit it from the commit to avoid unnecessary writes
      const readmePath = `${dirPath}/README.md`;
      const files: ICommitFile[] = [
        { path: `${dirPath}/${codeFileName}`, content: sub.code }
      ];
      if (!existingRepoPaths.has(readmePath)) {
        files.push({ path: readmePath, content: readmeContent });
      }

      const isoTimestamp = new Date(sub.timestamp).toISOString();

      // Format commit message to include metrics: Time: X ms (Y%), Space: Z MB (W%) - LeetLogger
      let commitMsg = '';
      if (sub.runtime && sub.memory) {
        const runPct = sub.runtimePercentile ? ` (${sub.runtimePercentile.toFixed(2)}%)` : '';
        const memPct = sub.memoryPercentile ? ` (${sub.memoryPercentile.toFixed(2)}%)` : '';
        commitMsg = `Time: ${sub.runtime}${runPct}, Space: ${sub.memory}${memPct} - LeetLogger`;
      } else {
        commitMsg = `LeetCode: ${sub.problemId ? `${sub.problemId} - ` : ''}${sub.title} (${sub.language}) - LeetLogger`;
      }

      const res = await github.commitFiles(files, commitMsg, isoTimestamp);
      if (res.success) {
        // Update local repo tree state to prevent duplicate README uploads in the same session
        existingRepoPaths.add(readmePath);
        existingRepoPaths.add(`${dirPath}/${codeFileName}`);

        await StorageManager.recordSyncSuccess('leetcode', sub.titleSlug, res.commitSha || '', {
          id: sub.problemId || '',
          title: sub.title,
          difficulty: sub.difficulty,
          topics: sub.topics,
        });
      } else {
        console.warn(`Failed to commit historical problem ${sub.title} in ${sub.language}:`, res.error);
      }
    }

    // 6. Generate and commit/update Root README.md
    try {
      this.currentProgress.status = 'updating_readme';
      await this.syncRootReadme(github);
    } catch (e: any) {
      console.error('Failed to sync root README:', e);
    }

    this.currentProgress.status = 'completed';
    return this.currentProgress;
  }

  /**
   * Builds and pushes the enhanced Master Root README.md based on all logged solved problems.
   */
  public static async syncRootReadme(github: GitHubClient): Promise<void> {
    const storage = await StorageManager.getStorage();
    const solvedMap = storage.solvedProblems || {};
    const problems = Object.values(solvedMap);
    if (problems.length === 0) {
      console.log('[LeetLogger README Sync] No solved problems recorded to generate Root README.');
      return;
    }

    const readmeContent = MarkdownFormatter.generateRootReadme(problems, github.username);
    const files: ICommitFile[] = [{ path: 'README.md', content: readmeContent }];
    await github.commitFiles(files, 'docs: update repository Root README.md with solved problem index');
    console.log('[LeetLogger README Sync] Successfully committed updated Root README.md.');
  }
}
