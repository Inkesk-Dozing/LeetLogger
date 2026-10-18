import { StorageManager } from '../core/storage/storageManager';
import { GitHubClient } from '../core/git/githubClient';
import { LeetCodeHistoricalFetcher } from '../platform/leetcode/historicalFetcher';
import { MarkdownFormatter } from '../core/formatters/markdownFormatter';
import {
  IHistoricalSyncProgress,
  IStagedProblemItem,
  ISelectiveSyncOptions,
  ISelectiveSyncResult,
} from '../core/types/sync';
import { ISubmissionPayload } from '../core/types/submission';
import { ICommitFile, IBatchCommitItem } from '../core/types/git';

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
   * Fetches full historical list and matches against repository files to produce staging items.
   */
  public static async fetchStagingList(): Promise<{ success: boolean; items?: IStagedProblemItem[]; error?: string }> {
    const gitConfig = await StorageManager.getGitConfig();
    if (!gitConfig) {
      return { success: false, error: 'GitHub credentials not configured.' };
    }

    const github = new GitHubClient(gitConfig);
    const verify = await github.verifyRepo();
    if (!verify.success) {
      return { success: false, error: verify.error };
    }

    const existingRepoPaths = await github.getExistingRepoTree();
    const submissions = await LeetCodeHistoricalFetcher.fetchSubmissionHistory(100);

    const items: IStagedProblemItem[] = submissions.map((sub) => {
      const dirPath = MarkdownFormatter.getDirectoryPath(sub);
      const codeFileName = MarkdownFormatter.getCodeFileName(sub.extension);
      const codePath = `${dirPath}/${codeFileName}`;
      const isAlreadySynced = existingRepoPaths.has(codePath);

      return {
        id: sub.problemId || sub.titleSlug,
        problemId: sub.problemId || '',
        title: sub.title,
        titleSlug: sub.titleSlug,
        difficulty: sub.difficulty,
        topics: sub.topics || [],
        language: sub.language,
        timestamp: sub.timestamp,
        isAlreadySynced,
        submission: sub,
      };
    });

    return { success: true, items };
  }

  /**
   * Synchronizes an arbitrary user-selected subset of submissions with optional branch & PR creation.
   */
  public static async syncSelectedSubmissions(
    submissions: ISubmissionPayload[],
    options: ISelectiveSyncOptions,
    onProgressUpdate?: (progress: IHistoricalSyncProgress) => void
  ): Promise<ISelectiveSyncResult> {
    const gitConfig = await StorageManager.getGitConfig();
    if (!gitConfig) {
      return {
        success: false,
        committedCount: 0,
        totalRequested: submissions.length,
        branch: options.targetBranch,
        error: 'GitHub credentials not configured.',
      };
    }

    const github = new GitHubClient(gitConfig);
    const targetBranch = options.targetBranch || gitConfig.branch || 'main';
    const baseBranch = options.baseBranch || gitConfig.branch || 'main';

    // 1. If PR workflow is selected, ensure target branch is created
    if (options.createPullRequest && targetBranch !== baseBranch) {
      const branchRes = await github.createBranch(targetBranch, baseBranch);
      if (!branchRes.success) {
        return {
          success: false,
          committedCount: 0,
          totalRequested: submissions.length,
          branch: targetBranch,
          error: `Failed to create sync branch '${targetBranch}': ${branchRes.error}`,
        };
      }
    }

    // 2. Fetch target branch existing paths
    const existingRepoPaths = await github.getExistingRepoTree(targetBranch);

    // 3. Format batch commit items
    const batchItems: IBatchCommitItem[] = submissions.map((sub) => {
      const dirPath = MarkdownFormatter.getDirectoryPath(sub);
      const codeFileName = MarkdownFormatter.getCodeFileName(sub.extension);
      const readmeContent = MarkdownFormatter.formatReadme(sub, github.username);
      const readmePath = `${dirPath}/README.md`;

      const files: ICommitFile[] = [{ path: `${dirPath}/${codeFileName}`, content: sub.code }];
      if (!existingRepoPaths.has(readmePath)) {
        files.push({ path: readmePath, content: readmeContent });
      }

      const isoTimestamp = new Date(sub.timestamp).toISOString();
      let commitMsg = '';
      if (sub.runtime && sub.memory) {
        const runPct = sub.runtimePercentile ? ` (${sub.runtimePercentile.toFixed(2)}%)` : '';
        const memPct = sub.memoryPercentile ? ` (${sub.memoryPercentile.toFixed(2)}%)` : '';
        commitMsg = `Time: ${sub.runtime}${runPct}, Space: ${sub.memory}${memPct} - LeetLogger`;
      } else {
        commitMsg = `LeetCode: ${sub.problemId ? `${sub.problemId} - ` : ''}${sub.title} (${sub.language}) - LeetLogger`;
      }

      return {
        files,
        message: commitMsg,
        authorTimestamp: isoTimestamp,
        metadata: {
          platform: 'leetcode',
          titleSlug: sub.titleSlug,
          problemId: sub.problemId || '',
          title: sub.title,
          difficulty: sub.difficulty,
          topics: sub.topics,
        },
      };
    });

    this.currentProgress = {
      status: 'committing',
      totalFound: submissions.length,
      totalMissing: submissions.length,
      processedCount: 0,
    };

    const batchRes = await github.commitBatchChain(
      batchItems,
      async (completed, total, lastCommitSha) => {
        this.currentProgress.processedCount = completed;
        const currentSub = submissions[completed - 1];
        if (currentSub) {
          this.currentProgress.currentProblem = `${currentSub.title} (${currentSub.language})`;
          await StorageManager.recordSyncSuccess('leetcode', currentSub.titleSlug, lastCommitSha || '', {
            id: currentSub.problemId || '',
            title: currentSub.title,
            difficulty: currentSub.difficulty,
            topics: currentSub.topics,
          });
        }
        if (onProgressUpdate) onProgressUpdate(this.currentProgress);
      },
      targetBranch
    );

    if (!batchRes.success) {
      return {
        success: false,
        committedCount: batchRes.committedCount,
        totalRequested: submissions.length,
        branch: targetBranch,
        error: batchRes.error || 'Batch commit failed.',
      };
    }

    // 4. Update Root README on target branch
    try {
      await this.syncRootReadme(github, targetBranch);
    } catch (e: any) {
      console.warn('[LeetLogger Sync] Root README update skipped or failed:', e);
    }

    // 5. If PR requested, generate structured PR body and open pull request
    let prUrl: string | undefined;
    if (options.createPullRequest && targetBranch !== baseBranch) {
      const prTitle =
        options.pullRequestTitle ||
        `sync: add ${submissions.length} LeetCode solution${submissions.length > 1 ? 's' : ''}`;

      let prBody = options.pullRequestBody || '';
      if (!prBody) {
        prBody = `## 🚀 LeetLogger Selective Submission Sync\n\n`;
        prBody += `Synchronized **${submissions.length}** historical LeetCode solution(s) to branch \`${targetBranch}\` via **[LeetLogger](https://github.com/Inkesk-Dozing/LeetLogger)**.\n\n`;
        prBody += `### 📋 Synchronized Problems\n\n`;
        prBody += `| # | Problem | Difficulty | Language | Solved Date |\n`;
        prBody += `| :-: | :--- | :-: | :---: | :---: |\n`;

        submissions.forEach((s) => {
          const dateStr = new Date(s.timestamp).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });
          const badge = MarkdownFormatter.getDifficultyBadge(s.difficulty);
          const link = `https://leetcode.com/problems/${s.titleSlug}/`;
          prBody += `| ${s.problemId || '-'} | [${s.title}](${link}) | ${badge} | \`${s.language}\` | ${dateStr} |\n`;
        });

        prBody += `\n---\n_Automated historical synchronization powered by [LeetLogger](https://github.com/Inkesk-Dozing/LeetLogger)._\n`;
      }

      const prRes = await github.createPullRequest(prTitle, targetBranch, baseBranch, prBody);
      if (prRes.success) {
        prUrl = prRes.url;
      } else {
        console.warn('[LeetLogger Sync] Pull request creation failed:', prRes.error);
      }
    }

    this.currentProgress.status = 'completed';
    if (onProgressUpdate) onProgressUpdate(this.currentProgress);

    return {
      success: true,
      committedCount: batchRes.committedCount,
      totalRequested: submissions.length,
      branch: targetBranch,
      pullRequestUrl: prUrl,
    };
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

    // 3. Fetch LeetCode historical submissions
    this.currentProgress.status = 'fetching_leetcode';
    const submissions = await LeetCodeHistoricalFetcher.fetchSubmissionHistory(100);
    this.currentProgress.totalFound = submissions.length;

    // 4. Identify missing problems
    const missingSubmissions = submissions.filter((sub) => {
      const dirPath = MarkdownFormatter.getDirectoryPath(sub);
      const codeFileName = MarkdownFormatter.getCodeFileName(sub.extension);
      const codePath = `${dirPath}/${codeFileName}`;
      return !existingRepoPaths.has(codePath);
    });

    this.currentProgress.totalMissing = missingSubmissions.length;
    this.currentProgress.status = 'committing';

    // 5. Commit missing problems via atomic chained batch commits
    const batchItems: IBatchCommitItem[] = missingSubmissions.map((sub) => {
      const dirPath = MarkdownFormatter.getDirectoryPath(sub);
      const codeFileName = MarkdownFormatter.getCodeFileName(sub.extension);
      const readmeContent = MarkdownFormatter.formatReadme(sub, github.username);
      const readmePath = `${dirPath}/README.md`;

      const files: ICommitFile[] = [{ path: `${dirPath}/${codeFileName}`, content: sub.code }];
      if (!existingRepoPaths.has(readmePath)) {
        files.push({ path: readmePath, content: readmeContent });
      }

      const isoTimestamp = new Date(sub.timestamp).toISOString();
      let commitMsg = '';
      if (sub.runtime && sub.memory) {
        const runPct = sub.runtimePercentile ? ` (${sub.runtimePercentile.toFixed(2)}%)` : '';
        const memPct = sub.memoryPercentile ? ` (${sub.memoryPercentile.toFixed(2)}%)` : '';
        commitMsg = `Time: ${sub.runtime}${runPct}, Space: ${sub.memory}${memPct} - LeetLogger`;
      } else {
        commitMsg = `LeetCode: ${sub.problemId ? `${sub.problemId} - ` : ''}${sub.title} (${sub.language}) - LeetLogger`;
      }

      return {
        files,
        message: commitMsg,
        authorTimestamp: isoTimestamp,
        metadata: {
          platform: 'leetcode',
          titleSlug: sub.titleSlug,
          problemId: sub.problemId || '',
          title: sub.title,
          difficulty: sub.difficulty,
          topics: sub.topics,
        },
      };
    });

    const batchRes = await github.commitBatchChain(
      batchItems,
      async (completed, total, lastCommitSha) => {
        this.currentProgress.processedCount = completed;
        const currentSub = missingSubmissions[completed - 1];
        if (currentSub) {
          this.currentProgress.currentProblem = `${currentSub.title} (${currentSub.language})`;
          const dirPath = MarkdownFormatter.getDirectoryPath(currentSub);
          const codeFileName = MarkdownFormatter.getCodeFileName(currentSub.extension);
          const readmePath = `${dirPath}/README.md`;
          existingRepoPaths.add(readmePath);
          existingRepoPaths.add(`${dirPath}/${codeFileName}`);

          await StorageManager.recordSyncSuccess('leetcode', currentSub.titleSlug, lastCommitSha || '', {
            id: currentSub.problemId || '',
            title: currentSub.title,
            difficulty: currentSub.difficulty,
            topics: currentSub.topics,
          });
        }
      }
    );

    if (!batchRes.success) {
      console.warn('[LeetLogger Sync] Batch commit chain encountered an issue:', batchRes.error);
    }

    // 6. Generate and commit Root README.md
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
  public static async syncRootReadme(github: GitHubClient, branchName?: string): Promise<void> {
    const storage = await StorageManager.getStorage();
    const solvedMap = storage.solvedProblems || {};
    const problems = Object.values(solvedMap);
    if (problems.length === 0) {
      console.log('[LeetLogger README Sync] No solved problems recorded to generate Root README.');
      return;
    }

    const readmeContent = MarkdownFormatter.generateRootReadme(problems, github.username);
    const files: ICommitFile[] = [{ path: 'README.md', content: readmeContent }];
    await github.commitFiles(files, 'docs: update repository Root README.md with solved problem index', undefined, branchName);
    console.log('[LeetLogger README Sync] Successfully committed updated Root README.md.');
  }
}
