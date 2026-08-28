import { StorageManager } from '../core/storage/storageManager';
import { QueueManager } from '../core/storage/queueManager';
import { GitHubClient } from '../core/git/githubClient';
import { MarkdownFormatter } from '../core/formatters/markdownFormatter';
import { HistoricalSyncOrchestrator } from './historicalSyncOrchestrator';
import { LeetCodeHistoricalFetcher } from '../platform/leetcode/historicalFetcher';
import { ISubmissionPayload, ICommitFile } from '../core/types';

console.log('[LeetLogger] Background Service Worker initialized.');

if (typeof chrome !== 'undefined' && chrome.action) {
  chrome.action.setBadgeBackgroundColor({ color: '#3b82f6' });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { type, payload } = message;

  if (type === 'OAUTH_SUCCESS') {
    const { token, username } = message;
    handleOAuthSuccess(token, username, sender.tab?.id)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (type === 'OAUTH_FAILURE') {
    const { error } = message;
    handleOAuthFailure(error, sender.tab?.id)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (type === 'SUBMIT_SOLUTION') {
    handleSubmission(payload)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (type === 'SYNC_SUBMISSION_MANUALLY') {
    const { submissionId, titleSlug } = message;
    handleManualSubmissionSync(submissionId, titleSlug)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (type === 'START_HISTORICAL_SYNC') {
    HistoricalSyncOrchestrator.startSync()
      .then((progress) => sendResponse({ success: true, progress }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (type === 'GET_HISTORICAL_SYNC_STATUS') {
    sendResponse({ progress: HistoricalSyncOrchestrator.getProgress() });
    return false;
  }

  if (type === 'SYNC_ROOT_README') {
    handleManualReadmeSync()
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (type === 'VERIFY_GITHUB_CONFIG') {
    const github = new GitHubClient(payload);
    github.verifyRepo().then((res) => sendResponse(res));
    return true;
  }
});

async function handleOAuthSuccess(token: string, username: string, tabId?: number) {
  try {
    const gitConfig = {
      accessToken: token,
      username,
      repository: '',
      branch: 'main',
    };

    await StorageManager.setGitConfig(gitConfig);
    console.log(`[LeetLogger Background] OAuth Success: Linked credentials for ${username}`);
    updateBadge('OK');

    if (tabId && typeof chrome !== 'undefined' && chrome.tabs) {
      try {
        chrome.tabs.remove(tabId);
      } catch (e) {
        console.warn('Could not close OAuth tab:', e);
      }
    }

    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    }

    return { success: true };
  } catch (err: any) {
    console.error('[LeetLogger Background] Failed to save config on success:', err);
    return { success: false, error: err.message };
  }
}

async function handleOAuthFailure(error: string, tabId?: number) {
  try {
    console.error('[LeetLogger Background] OAuth Failure intercepted:', error);
    updateBadge('ERR');
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ oauth_error: error });
    }

    if (tabId && typeof chrome !== 'undefined' && chrome.tabs) {
      try {
        chrome.tabs.remove(tabId);
      } catch (e) {
        console.warn('Could not close OAuth tab:', e);
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function handleSubmission(payload: ISubmissionPayload) {
  const gitConfig = await StorageManager.getGitConfig();
  if (!gitConfig) {
    await QueueManager.enqueue(payload, 'GitHub credentials not configured.');
    updateBadge('ERR');
    return { success: false, error: 'GitHub credentials not configured.' };
  }

  const dirPath = MarkdownFormatter.getDirectoryPath(payload);
  const codeFileName = MarkdownFormatter.getCodeFileName(payload.extension);
  const readmeContent = MarkdownFormatter.formatReadme(payload, gitConfig.username);

  const files: ICommitFile[] = [
    { path: `${dirPath}/README.md`, content: readmeContent },
    { path: `${dirPath}/${codeFileName}`, content: payload.code },
  ];

  const github = new GitHubClient(gitConfig);

  // Match LeetHub's detailed performance format in commit message: Time: X ms (Y%), Space: Z MB (W%) - LeetLogger
  let commitMsg = '';
  if (payload.runtime && payload.memory) {
    const runPct = payload.runtimePercentile ? ` (${payload.runtimePercentile.toFixed(2)}%)` : '';
    const memPct = payload.memoryPercentile ? ` (${payload.memoryPercentile.toFixed(2)}%)` : '';
    commitMsg = `Time: ${payload.runtime}${runPct}, Space: ${payload.memory}${memPct} - LeetLogger`;
  } else {
    commitMsg = `${payload.platform.toUpperCase()}: ${payload.problemId ? `${payload.problemId} - ` : ''}${payload.title} - LeetLogger`;
  }

  const res = await github.commitFiles(files, commitMsg);
  if (res.success) {
    await StorageManager.recordSyncSuccess(payload.platform, payload.titleSlug, res.commitSha || '', {
      id: payload.problemId || '',
      title: payload.title,
      difficulty: payload.difficulty,
      topics: payload.topics,
    });
    updateBadge('OK');

    // Automatically update root README.md index
    try {
      await HistoricalSyncOrchestrator.syncRootReadme(github);
    } catch (e) {
      console.error('Failed to sync root README on submission:', e);
    }

    return { success: true, commitUrl: res.commitUrl };
  } else {
    await QueueManager.enqueue(payload, res.error);
    updateBadge('ERR');
    return { success: false, error: res.error };
  }
}

async function handleManualSubmissionSync(submissionId: string, titleSlug: string) {
  const gitConfig = await StorageManager.getGitConfig();
  if (!gitConfig) {
    return { success: false, error: 'GitHub credentials not configured.' };
  }

  const detail = await LeetCodeHistoricalFetcher.fetchSubmissionDetails(submissionId, titleSlug);
  if (!detail) {
    return { success: false, error: 'Could not fetch submission details from LeetCode.' };
  }

  const extension = LeetCodeHistoricalFetcher.getLanguageExtension(detail.lang || 'cpp');

  const payload: ISubmissionPayload = {
    id: submissionId,
    platform: 'leetcode',
    problemId: detail.questionId || '',
    title: detail.title || titleSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    titleSlug,
    difficulty: detail.difficulty || 'Medium',
    topics: detail.topics || [],
    code: detail.code || '',
    language: detail.lang || 'cpp',
    extension,
    questionContent: detail.content || '',
    timestamp: Date.now(),
  };

  return handleSubmission(payload);
}

async function handleManualReadmeSync() {
  const gitConfig = await StorageManager.getGitConfig();
  if (!gitConfig) {
    return { success: false, error: 'GitHub credentials not configured.' };
  }
  const github = new GitHubClient(gitConfig);
  await HistoricalSyncOrchestrator.syncRootReadme(github);
  return { success: true };
}

function updateBadge(text: string) {
  if (typeof chrome !== 'undefined' && chrome.action) {
    chrome.action.setBadgeText({ text });
    if (text === 'OK') {
      chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
    } else if (text === 'ERR') {
      chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
    }
  }
}
