import React, { useState, useEffect } from 'react';
import { StorageManager } from '../../core/storage/storageManager';
import { GitHubClient } from '../../core/git/githubClient';
import { IGitHubConfig, IExtensionStats, IHistoricalSyncProgress } from '../../core/types';

declare const __CLIENT_ID__: string;

// User's correct OAuth App Client ID
const DEFAULT_OAUTH_CLIENT_ID = typeof __CLIENT_ID__ !== 'undefined' && __CLIENT_ID__ ? __CLIENT_ID__ : 'Ov23libeIlT8ePmShcl3';

export const WelcomeApp: React.FC = () => {
  const [gitConfig, setGitConfig] = useState<IGitHubConfig | undefined>();
  const [stats, setStats] = useState<IExtensionStats>({ totalSynced: 0, leetcodeCount: 0, gfgCount: 0 });
  const [solvedStats, setSolvedStats] = useState({ easy: 0, medium: 0, hard: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [authTab, setAuthTab] = useState<'oauth' | 'pat'>('oauth');
  const [repoMode, setRepoMode] = useState<'create' | 'link'>('create');

  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [repository, setRepository] = useState('LeetCode-Track');
  const [branch, setBranch] = useState('main');

  const [saving, setSaving] = useState(false);
  const [syncingReadme, setSyncingReadme] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [syncProgress, setSyncProgress] = useState<IHistoricalSyncProgress>({
    status: 'idle',
    totalFound: 0,
    totalMissing: 0,
    processedCount: 0,
  });

  const loadConfig = () => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(null, (allData) => {
        console.log('[LeetLogger Diagnostics] Full Storage State:', allData);
      });
    }

    StorageManager.getStorage().then((storage) => {
      setStats(storage.stats);
      
      // Calculate dynamic stats from solved problems
      const solvedProblems = storage.solvedProblems || {};
      let easy = 0, medium = 0, hard = 0;
      Object.values(solvedProblems).forEach((p) => {
        const diff = p.difficulty.toLowerCase();
        if (diff === 'easy' || diff === 'basic' || diff === 'school') easy++;
        else if (diff === 'medium') medium++;
        else if (diff === 'hard') hard++;
      });
      setSolvedStats({ easy, medium, hard });

      if (storage.gitConfig && storage.gitConfig.accessToken) {
        setGitConfig(storage.gitConfig);
        setToken(storage.gitConfig.accessToken);
        setUsername(storage.gitConfig.username);
        if (storage.gitConfig.repository) {
          setRepository(storage.gitConfig.repository);
        }
        setBranch(storage.gitConfig.branch || 'main');
      } else {
        setGitConfig(undefined);
      }
    });

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get('oauth_error', (res) => {
        if (res && res.oauth_error) {
          setStatusMsg({ type: 'error', text: `OAuth Error: ${res.oauth_error}` });
        }
      });
    }
  };

  useEffect(() => {
    loadConfig();

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(loadConfig);
    }
  }, []);

  const handleOAuthLogin = () => {
    const activeClientId = DEFAULT_OAUTH_CLIENT_ID;
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      setStatusMsg(null);
      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.remove('oauth_error');
      }
      chrome.storage.local.set({ leetlogger_pipe: true }, () => {
        const authUrl = `https://github.com/login/oauth/authorize?client_id={activeClientId}&scope=repo`.replace('{activeClientId}', activeClientId);
        chrome.tabs.create({ url: authUrl, active: true });
      });
    } else {
      alert('1-Click OAuth authentication requires Chrome extension environment.');
    }
  };

  const handleRepoSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);

    const activeToken = token || gitConfig?.accessToken;
    const activeUsername = username || gitConfig?.username || 'user';

    if (!activeToken) {
      setSaving(false);
      setStatusMsg({ type: 'error', text: 'GitHub access token is missing. Please authenticate again.' });
      return;
    }

    if (!repository.trim()) {
      setSaving(false);
      setStatusMsg({ type: 'error', text: 'Repository name cannot be empty.' });
      return;
    }

    if (repoMode === 'create') {
      const createRes = await GitHubClient.createRepository(activeToken, repository);
      if (!createRes.success && !createRes.error?.includes('already exists')) {
        setSaving(false);
        setStatusMsg({ type: 'error', text: createRes.error || 'Failed to create repository.' });
        return;
      }
    }

    const config: IGitHubConfig = {
      accessToken: activeToken,
      username: activeUsername,
      repository: repository.trim(),
      branch: branch || 'main',
    };

    const github = new GitHubClient(config);
    const verify = await github.verifyRepo();
    setSaving(false);

    if (verify.success) {
      await StorageManager.setGitConfig(config);
      setGitConfig(config);
      setIsEditing(false);
      setStatusMsg({ type: 'success', text: `Successfully linked ${config.username}/${repository} to LeetLogger!` });
    } else {
      setStatusMsg({ type: 'error', text: verify.error || 'Could not verify repository. Make sure the name is correct and public/private permissions are authorized.' });
    }
  };

  const handlePatSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);

    const activeToken = token;
    if (!activeToken) {
      setSaving(false);
      setStatusMsg({ type: 'error', text: 'Please paste your GitHub Personal Access Token (PAT).' });
      return;
    }

    if (repoMode === 'create') {
      const createRes = await GitHubClient.createRepository(activeToken, repository);
      if (!createRes.success && !createRes.error?.includes('already exists')) {
        setSaving(false);
        setStatusMsg({ type: 'error', text: createRes.error || 'Failed to create repository.' });
        return;
      }
    }

    const config: IGitHubConfig = {
      accessToken: activeToken,
      username: username || 'user',
      repository: repository.trim(),
      branch: branch || 'main',
    };

    const github = new GitHubClient(config);
    const verify = await github.verifyRepo();
    setSaving(false);

    if (verify.success) {
      await StorageManager.setGitConfig(config);
      setGitConfig(config);
      setIsEditing(false);
      setStatusMsg({ type: 'success', text: `Successfully linked ${config.username}/${repository} to LeetLogger!` });
    } else {
      setStatusMsg({ type: 'error', text: verify.error || 'Could not verify repository.' });
    }
  };

  const handleUnlink = async () => {
    await StorageManager.setStorage({ gitConfig: undefined });
    setGitConfig(undefined);
    setIsEditing(false);
    setStatusMsg(null);
  };

  const startHistoricalSync = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      setSyncProgress({ status: 'scanning_repo', totalFound: 0, totalMissing: 0, processedCount: 0 });
      chrome.runtime.sendMessage({ type: 'START_HISTORICAL_SYNC' }, (res) => {
        if (res && res.progress) {
          setSyncProgress(res.progress);
        }
      });
    } else {
      alert('Historical catch-up requires extension runtime context.');
    }
  };

  const handleReadmeSync = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      setSyncingReadme(true);
      setStatusMsg(null);
      chrome.runtime.sendMessage({ type: 'SYNC_ROOT_README' }, (res) => {
        setSyncingReadme(false);
        if (res && res.success) {
          setStatusMsg({ type: 'success', text: 'Root README.md successfully rebuilt and committed to GitHub!' });
        } else {
          setStatusMsg({ type: 'error', text: res?.error || 'Failed to sync Root README.md.' });
        }
      });
    }
  };

  // Determine view states
  const isAuthenticated = !!(gitConfig?.accessToken);
  const isRepoLinked = !!(gitConfig?.repository);

  return (
    <div style={{ width: '100%', maxWidth: 760, padding: '40px 24px', position: 'relative' }}>
      {/* Brand Header */}
      <div className="brand-header">
        <div className="brand-title">
          <img
            src="assets/logo.svg"
            alt="LeetLogger"
            width="48"
            height="48"
            style={{ borderRadius: 10, verticalAlign: 'middle', objectFit: 'contain' }}
          />
          <span>Leet<span className="brand-title-accent">Logger</span></span>
        </div>
        <div className="brand-subtitle">
          Automatically sync your code from LeetCode to GitHub
        </div>
      </div>

      {/* Primary Configuration & Linking Container */}
      <div className="status-banner">
        {isAuthenticated && isRepoLinked && !isEditing ? (
          // Active Commit State Dashboard
          <div>
            <div className="status-linked-text">
              Successfully linked <strong style={{ color: '#ffffff' }}>{gitConfig.username}/{gitConfig.repository}</strong> to LeetLogger. Start LeetCoding now!
            </div>
            <div className="status-link-action" onClick={handleUnlink}>
              Linked the wrong repo? Unlink / Log Out
            </div>
          </div>
        ) : isAuthenticated && (!isRepoLinked || isEditing) ? (
          // Repository Hook Selection Screen (Transitions to after OAuth authentication success)
          <div style={{ maxWidth: 520, margin: '0 auto', textAlign: 'left' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc', marginBottom: 12, textAlign: 'center' }}>
              Set Up Your Repository
            </h3>
            <p style={{ fontSize: 13, color: '#a1a1aa', marginBottom: 20, textAlign: 'center', lineHeight: 1.5 }}>
              Hello, <strong>{gitConfig?.username}</strong>! Select how you want to store your synced solutions.
            </p>

            <form onSubmit={handleRepoSetup} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 13, color: '#e4e4e7', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="radio"
                    name="repoMode"
                    value="create"
                    checked={repoMode === 'create'}
                    onChange={() => setRepoMode('create')}
                  />
                  Create a new Private Repo
                </label>
                <label style={{ fontSize: 13, color: '#e4e4e7', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="radio"
                    name="repoMode"
                    value="link"
                    checked={repoMode === 'link'}
                    onChange={() => setRepoMode('link')}
                  />
                  Link an Existing Repo
                </label>
              </div>

              <div>
                <label style={{ fontSize: 12, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>Repository Name</label>
                <input
                  type="text"
                  className="input-field"
                  value={repository}
                  onChange={(e) => setRepository(e.target.value)}
                  placeholder="e.g. LeetCode-Track"
                  required
                />
              </div>

              <button type="submit" className="btn-accent" disabled={saving} style={{ marginTop: 8, padding: '14px', fontSize: 15 }}>
                {saving ? 'Linking Repository...' : repoMode === 'create' ? 'Create & Link Repository 🚀' : 'Link Repository 🔗'}
              </button>
            </form>

            <div
              style={{ fontSize: 12, color: '#71717a', cursor: 'pointer', textDecoration: 'underline', marginTop: 14, textAlign: 'center' }}
              onClick={handleUnlink}
            >
              ← Back to Sign In
            </div>
          </div>
        ) : (
          // Initial Unlinked Sign In Options Screen
          <div style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
            {authTab === 'oauth' ? (
              <div>
                <div
                  style={{
                    background: 'rgba(249, 115, 22, 0.08)',
                    border: '1px solid rgba(249, 115, 22, 0.25)',
                    borderRadius: 14,
                    padding: 24,
                    marginBottom: 20,
                  }}
                >
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc', marginBottom: 8 }}>
                    1-Click GitHub Authentication
                  </h3>
                  <p style={{ fontSize: 13, color: '#a1a1aa', marginBottom: 20, lineHeight: 1.5 }}>
                    Connect LeetLogger directly via official GitHub OAuth. We will automatically authenticate your GitHub account so you can configure your repository.
                  </p>
                  <button
                    type="button"
                    className="btn-accent"
                    onClick={handleOAuthLogin}
                    style={{ width: '100%', padding: '16px', fontSize: 16, fontWeight: 700 }}
                  >
                    Authenticate with GitHub 🚀
                  </button>
                </div>

                <div
                  style={{ fontSize: 12, color: '#71717a', cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => setAuthTab('pat')}
                >
                  Or enter Personal Access Token (PAT) manually
                </div>
              </div>
            ) : (
              <div>
                <form onSubmit={handlePatSetup} style={{ display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'left' }}>
                  <div>
                    <label style={{ fontSize: 12, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>
                      Paste Your Personal Access Token (PAT)
                    </label>
                    <input
                      type="password"
                      className="input-field"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 16, marginTop: 4, justifyContent: 'center' }}>
                    <label style={{ fontSize: 13, color: '#a1a1aa', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="radio"
                        name="repoMode"
                        value="create"
                        checked={repoMode === 'create'}
                        onChange={() => setRepoMode('create')}
                      />
                      Create new Private Repository
                    </label>
                    <label style={{ fontSize: 13, color: '#a1a1aa', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="radio"
                        name="repoMode"
                        value="link"
                        checked={repoMode === 'link'}
                        onChange={() => setRepoMode('link')}
                      />
                      Link existing Repository
                    </label>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>Your GitHub Username</label>
                      <input
                        type="text"
                        className="input-field"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Inkesk-Dozing"
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>Repository Name</label>
                      <input
                        type="text"
                        className="input-field"
                        value={repository}
                        onChange={(e) => setRepository(e.target.value)}
                        placeholder="LeetCode-Track"
                        required
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn-accent" disabled={saving} style={{ marginTop: 8, padding: '14px', fontSize: 15 }}>
                    {saving ? 'Linking Repository...' : repoMode === 'create' ? 'Create & Link Repository 🚀' : 'Link Repository 🔗'}
                  </button>
                </form>

                <div
                  style={{ fontSize: 12, color: '#71717a', cursor: 'pointer', textDecoration: 'underline', marginTop: 14, textAlign: 'center' }}
                  onClick={() => setAuthTab('oauth')}
                >
                  ← Back to 1-Click GitHub OAuth
                </div>
              </div>
            )}
          </div>
        )}

        {statusMsg && (
          <div
            style={{
              marginTop: 16,
              fontSize: 14,
              color: statusMsg.type === 'success' ? '#22c55e' : '#ef4444',
              lineHeight: 1.4,
              wordBreak: 'break-word',
              textAlign: 'center',
            }}
          >
            {statusMsg.text}
          </div>
        )}
      </div>

      {/* Bottom Stats & Historical Feature Section */}
      <div className="stats-grid">
        {/* Left: Problems Solved */}
        <div>
          <div className="stats-section-title">
            Problems Solved: {stats.totalSynced}
          </div>
          <div className="difficulty-row">
            <span className="diff-easy">Easy: {solvedStats.easy}</span>
            <span className="diff-medium">Medium: {solvedStats.medium}</span>
            <span className="diff-hard">Hard: {solvedStats.hard}</span>
          </div>
        </div>

        {/* Right: Historical Sync Feature */}
        <div style={{ textAlign: 'right' }}>
          <div className="feature-request-title">
            Repository Actions
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', marginTop: 4 }}>
            <span className="link-cyan" onClick={startHistoricalSync} style={{ cursor: 'pointer' }}>
              {syncProgress.status === 'scanning_repo'
                ? 'Scanning repository...'
                : syncProgress.status === 'fetching_leetcode'
                ? 'Fetching accepted solutions...'
                : syncProgress.status === 'committing'
                ? `Syncing (${syncProgress.processedCount}/${syncProgress.totalMissing})...`
                : syncProgress.status === 'updating_readme'
                ? 'Generating Root README...'
                : 'Back-fill past solutions!'}
            </span>
            {isAuthenticated && isRepoLinked && (
              <span className="link-cyan" onClick={handleReadmeSync} style={{ cursor: 'pointer', fontSize: 13, opacity: syncingReadme ? 0.6 : 1 }}>
                {syncingReadme ? 'Syncing Root README...' : 'Rebuild Root README 🔄'}
              </span>
            )}
          </div>
          {syncProgress.status === 'completed' && (
            <div style={{ fontSize: 12, color: '#22c55e', marginTop: 4 }}>
              Historical sync completed cleanly!
            </div>
          )}
        </div>
      </div>

      {/* Footer Link */}
      <a
        href="https://github.com/Inkesk-Dozing/LeetLogger"
        target="_blank"
        rel="noreferrer"
        className="footer-star"
      >
        Star <strong>LeetLogger</strong> on GitHub
      </a>
    </div>
  );
};
