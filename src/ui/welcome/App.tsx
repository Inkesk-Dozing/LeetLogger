import React, { useState, useEffect } from 'react';
import { StorageManager } from '../../core/storage/storageManager';
import { GitHubClient } from '../../core/git/githubClient';
import { IGitHubConfig, IExtensionStats, IHistoricalSyncProgress } from '../../core/types';
import { StagingModal } from './StagingModal';

declare const __CLIENT_ID__: string;

// User's correct OAuth App Client ID
const DEFAULT_OAUTH_CLIENT_ID = typeof __CLIENT_ID__ !== 'undefined' && __CLIENT_ID__ ? __CLIENT_ID__ : 'Ov23libeIlT8ePmShcl3';

// 1-Click Preconfigured Token URLs (prefills Name, Description, and Scopes automatically like gitbadgecheck)
const PRECONFIGURED_FINE_GRAINED_PAT_URL = 'https://github.com/settings/personal-access-tokens/new?name=LeetLogger%20Sync&description=Automated%20sync%20of%20LeetCode%20solutions%20to%20GitHub&contents=write&pull_requests=write&issues=write';
const CLASSIC_PAT_URL = 'https://github.com/settings/tokens/new?scopes=repo&description=LeetLogger%20Sync';

export const WelcomeApp: React.FC = () => {
  const [gitConfig, setGitConfig] = useState<IGitHubConfig | undefined>();
  const [stats, setStats] = useState<IExtensionStats>({ totalSynced: 0, leetcodeCount: 0, gfgCount: 0 });
  const [solvedStats, setSolvedStats] = useState({ easy: 0, medium: 0, hard: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [authTab, setAuthTab] = useState<'oauth' | 'pat'>('pat');
  const [repoMode, setRepoMode] = useState<'create' | 'link'>('create');
  const [syncWorkflow, setSyncWorkflow] = useState<'direct' | 'pr_issue'>('direct');
  const [isStagingOpen, setIsStagingOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [repository, setRepository] = useState('LeetCode-Track');
  const [branch, setBranch] = useState('main');

  const [saving, setSaving] = useState(false);
  const [syncingReadme, setSyncingReadme] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [detectedUser, setDetectedUser] = useState<string | null>(null);

  const [syncProgress, setSyncProgress] = useState<IHistoricalSyncProgress>({
    status: 'idle',
    totalFound: 0,
    totalMissing: 0,
    processedCount: 0,
  });

  const loadConfig = () => {
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
        if (storage.gitConfig.syncWorkflow) {
          setSyncWorkflow(storage.gitConfig.syncWorkflow);
        }
      } else {
        setGitConfig(undefined);
      }
    });

    // Check for transient oauth_error once and remove it from storage so it does not persist permanently
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get('oauth_error', (res) => {
        if (res && res.oauth_error) {
          chrome.storage.local.remove('oauth_error');
          // Only show if user is currently looking at OAuth tab
          if (authTab === 'oauth') {
            setStatusMsg({ type: 'error', text: `OAuth Error: ${res.oauth_error}` });
          }
        }
      });
    }
  };

  useEffect(() => {
    loadConfig();

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(loadConfig);
    }
  }, [authTab]);

  // Debounced auto-resolution of username when user inputs a token
  useEffect(() => {
    const cleanToken = token.trim();
    if (cleanToken.length >= 20 && !gitConfig?.accessToken) {
      const timer = setTimeout(async () => {
        try {
          const res = await fetch('https://api.github.com/user', {
            headers: {
              Authorization: `Bearer ${cleanToken}`,
              Accept: 'application/vnd.github.v3+json',
            },
          });
          if (res.ok) {
            const data = await res.json();
            if (data.login) {
              setDetectedUser(data.login);
              if (!username) {
                setUsername(data.login);
              }
            }
          } else {
            setDetectedUser(null);
          }
        } catch {
          setDetectedUser(null);
        }
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setDetectedUser(null);
    }
  }, [token, username, gitConfig]);

  const handleOAuthLogin = () => {
    const activeClientId = DEFAULT_OAUTH_CLIENT_ID;
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      setStatusMsg(null);
      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.remove('oauth_error');
      }
      chrome.storage.local.set({ leetlogger_pipe: true }, () => {
        const authUrl = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(activeClientId)}&scope=repo`;
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
    const activeUsername = username || gitConfig?.username || detectedUser || 'user';

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
      syncWorkflow,
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
      setStatusMsg({ type: 'error', text: verify.error || 'Could not verify repository. Make sure the name is correct and permissions are authorized.' });
    }
  };

  const handlePatSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);

    const activeToken = token.trim();
    if (!activeToken) {
      setSaving(false);
      setStatusMsg({ type: 'error', text: 'Please paste your GitHub Personal Access Token (PAT).' });
      return;
    }

    let activeUsername = username.trim() || detectedUser || '';
    if (!activeUsername) {
      try {
        const userRes = await fetch('https://api.github.com/user', {
          headers: {
            Authorization: `Bearer ${activeToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        });
        if (userRes.ok) {
          const userData = await userRes.json();
          if (userData.login) {
            activeUsername = userData.login;
            setUsername(activeUsername);
          }
        }
      } catch (e) {
        // Fallback to default
      }
    }

    if (!activeUsername) {
      activeUsername = 'user';
    }

    if (repoMode === 'create') {
      const createRes = await GitHubClient.createRepository(activeToken, repository.trim());
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
      syncWorkflow,
    };

    const github = new GitHubClient(config);
    const verify = await github.verifyRepo();
    setSaving(false);

    if (verify.success) {
      await StorageManager.setGitConfig(config);
      setGitConfig(config);
      setIsEditing(false);
      setStatusMsg({ type: 'success', text: `Successfully linked ${config.username}/${repository.trim()} to LeetLogger!` });
    } else {
      setStatusMsg({ type: 'error', text: verify.error || 'Could not verify repository. Ensure your token has write access to contents.' });
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
    <div style={{ width: '100%', maxWidth: 740, padding: '40px 24px', position: 'relative' }}>
      {/* Brand Header */}
      <div className="brand-header">
        <div className="brand-title">
          <img
            src="assets/logo.svg"
            alt="LeetLogger"
            width="46"
            height="46"
            style={{ borderRadius: 12, verticalAlign: 'middle', objectFit: 'contain' }}
          />
          <span>Leet<span className="brand-title-accent">Logger</span></span>
        </div>
        <div className="brand-subtitle">
          Automatically sync your code from LeetCode to GitHub
        </div>
      </div>

      {/* Main Glassmorphic Welcome Card */}
      <div className="welcome-card">
        {isAuthenticated && isRepoLinked && !isEditing ? (
          // Active Linked Dashboard State
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 14, background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)', color: '#34d399', fontSize: 24, marginBottom: 14 }}>
              ✓
            </div>
            <div className="status-linked-text">
              Connected to <strong style={{ color: '#ffffff' }}>{gitConfig.username}/{gitConfig.repository}</strong>
            </div>
            <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 14 }}>
              Your LeetCode and GeeksforGeeks submissions will sync automatically upon passing testcases.
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 9, background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-subtle)', fontSize: 12.5, color: '#94a3b8', marginBottom: 18 }}>
              <span>Sync Mode:</span>
              <strong style={{ color: gitConfig.syncWorkflow === 'pr_issue' ? '#fbbf24' : '#34d399' }}>
                {gitConfig.syncWorkflow === 'pr_issue' ? '🔀 Issue → Branch → PR' : '⚡ Direct Commits (main)'}
              </strong>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-accent"
                onClick={() => setIsStagingOpen(true)}
                style={{ padding: '10px 20px', fontSize: 13.5 }}
              >
                Interactive Staging & PR Studio 🚀
              </button>
              <button
                type="button"
                onClick={handleUnlink}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 11,
                  padding: '10px 18px',
                  color: '#94a3b8',
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                Unlink / Switch Repository
              </button>
            </div>
          </div>
        ) : isAuthenticated && (!isRepoLinked || isEditing) ? (
          // Repository Configuration Screen (Post-Auth)
          <div style={{ maxWidth: 520, margin: '0 auto', textAlign: 'left' }}>
            <h3 style={{ fontSize: 19, fontWeight: 700, color: '#f8fafc', marginBottom: 6, textAlign: 'center', fontFamily: 'var(--font-heading)' }}>
              Set Up Your Destination Repository
            </h3>
            <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20, textAlign: 'center', lineHeight: 1.5 }}>
              Authenticated as <strong style={{ color: '#f8fafc' }}>{gitConfig?.username}</strong>. Choose where to record your solutions.
            </p>

            <form onSubmit={handleRepoSetup} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Segmented Mode Selector */}
              <div className="segmented-control">
                <div
                  className={`segmented-option ${repoMode === 'create' ? 'active' : ''}`}
                  onClick={() => setRepoMode('create')}
                >
                  <span>✦ Create new Private Repo</span>
                </div>
                <div
                  className={`segmented-option ${repoMode === 'link' ? 'active' : ''}`}
                  onClick={() => setRepoMode('link')}
                >
                  <span>🔗 Link existing Repo</span>
                </div>
              </div>

              <div>
                <label className="input-label">Repository Name</label>
                <input
                  type="text"
                  className="input-field"
                  value={repository}
                  onChange={(e) => setRepository(e.target.value)}
                  placeholder="e.g. LeetCode-Track"
                  required
                />
              </div>

              <div>
                <label className="input-label">Sync Automation Mode</label>
                <div className="segmented-control" style={{ marginBottom: 4 }}>
                  <div
                    className={`segmented-option ${syncWorkflow === 'direct' ? 'active' : ''}`}
                    onClick={() => setSyncWorkflow('direct')}
                    title="Commits solutions directly to main branch"
                  >
                    <span>⚡ Direct Commits (main)</span>
                  </div>
                  <div
                    className={`segmented-option ${syncWorkflow === 'pr_issue' ? 'active' : ''}`}
                    onClick={() => setSyncWorkflow('pr_issue')}
                    title="Creates an Issue, commits to a topic branch, and raises a PR"
                  >
                    <span>🔀 Issue → Branch → PR</span>
                  </div>
                </div>
                <div style={{ fontSize: 11.5, color: '#64748b', lineHeight: 1.4, padding: '0 2px' }}>
                  {syncWorkflow === 'pr_issue'
                    ? 'Automates the full GitHub lifecycle: opens an Issue per solve, commits to a dedicated branch, and raises a PR to main.'
                    : 'Pushes accepted solutions directly to your main branch for immediate history tracking.'}
                </div>
              </div>

              <button type="submit" className="btn-accent" disabled={saving} style={{ marginTop: 8 }}>
                {saving ? 'Linking Repository...' : repoMode === 'create' ? 'Create & Link Repository 🚀' : 'Link Repository 🔗'}
              </button>
            </form>

            <div
              style={{ fontSize: 12, color: '#64748b', cursor: 'pointer', textDecoration: 'underline', marginTop: 14, textAlign: 'center' }}
              onClick={handleUnlink}
            >
              ← Back to Sign In
            </div>
          </div>
        ) : (
          // Initial Connection Setup (Clean, Calming PAT & OAuth Options)
          <div style={{ maxWidth: 540, margin: '0 auto' }}>
            {authTab === 'oauth' ? (
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 16,
                    padding: 24,
                    marginBottom: 18,
                  }}
                >
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc', marginBottom: 8, fontFamily: 'var(--font-heading)' }}>
                    1-Click GitHub Authentication
                  </h3>
                  <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20, lineHeight: 1.5 }}>
                    Connect LeetLogger directly via official GitHub OAuth to authorize repository access.
                  </p>
                  <button
                    type="button"
                    className="btn-accent"
                    onClick={handleOAuthLogin}
                    style={{ width: '100%', padding: '14px', fontSize: 15 }}
                  >
                    Authenticate with GitHub 🚀
                  </button>
                </div>

                <div
                  style={{ fontSize: 12.5, color: '#64748b', cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => { setAuthTab('pat'); setStatusMsg(null); }}
                >
                  Or connect with Personal Access Token (PAT)
                </div>
              </div>
            ) : (
              <div>
                {/* Header */}
                <div style={{ marginBottom: 18, textAlign: 'center' }}>
                  <h3 style={{ fontSize: 19, fontWeight: 700, color: '#f8fafc', marginBottom: 6, fontFamily: 'var(--font-heading)' }}>
                    Connect with GitHub Token
                  </h3>
                  <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>
                    Direct browser-to-GitHub synchronization. 100% free lifetime operation with zero middleman servers.
                  </p>
                </div>

                {/* 1-Click Pre-configured Token Generation & Tutorial Bar */}
                <div className="token-action-bar">
                  <div className="token-action-info">
                    <span className="token-action-title">
                      <span>⚡</span> 1-Click Token Pre-Configuration
                    </span>
                    <span className="token-action-desc">
                      Pre-fills Token Name and exact required scopes on GitHub.
                    </span>
                  </div>

                  <div className="token-action-buttons">
                    <a
                      href={PRECONFIGURED_FINE_GRAINED_PAT_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-generate-token"
                      title="Open GitHub with all scopes already selected"
                    >
                      <span>⚡ Generate Token ↗</span>
                    </a>
                    <button
                      type="button"
                      className="btn-tutorial-trigger"
                      onClick={() => setIsTutorialOpen(true)}
                      title="View step-by-step visual tutorial"
                    >
                      <span>📖 Tutorial</span>
                    </button>
                  </div>
                </div>

                {/* Form Setup */}
                <form onSubmit={handlePatSetup} style={{ display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'left' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <label className="input-label" style={{ margin: 0 }}>
                        Paste Your Personal Access Token (PAT)
                      </label>
                      {detectedUser && (
                        <span style={{ fontSize: 12, color: '#34d399', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                          ✓ Verified: @{detectedUser}
                        </span>
                      )}
                    </div>
                    <input
                      type="password"
                      className="input-field"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="github_pat_xxxxxxxxxxxxxxxxxxxx (Recommended) or ghp_xxxx"
                      required
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, fontSize: 11.5, color: '#64748b' }}>
                      <span>Permissions pre-configured: <strong>Contents, Pull Requests & Issues (Write)</strong></span>
                      <a
                        href={CLASSIC_PAT_URL}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#7dd3fc', textDecoration: 'none' }}
                      >
                        Prefer Classic Token? ↗
                      </a>
                    </div>
                  </div>

                  {/* Segmented Mode Selector */}
                  <div style={{ marginTop: 4 }}>
                    <label className="input-label">Repository Destination</label>
                    <div className="segmented-control" style={{ marginBottom: 0 }}>
                      <div
                        className={`segmented-option ${repoMode === 'create' ? 'active' : ''}`}
                        onClick={() => setRepoMode('create')}
                      >
                        <span>✦ Create new Private Repo</span>
                      </div>
                      <div
                        className={`segmented-option ${repoMode === 'link' ? 'active' : ''}`}
                        onClick={() => setRepoMode('link')}
                      >
                        <span>🔗 Link existing Repo</span>
                      </div>
                    </div>
                  </div>

                  {/* Input Grid for Repo & Username */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label className="input-label">
                        GitHub Username <span style={{ color: '#64748b', fontWeight: 400 }}>(auto-detected)</span>
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder={detectedUser ? detectedUser : 'e.g. your-github-user'}
                      />
                    </div>
                    <div>
                      <label className="input-label">Repository Name</label>
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

                  <div>
                    <label className="input-label">Sync Automation Mode</label>
                    <div className="segmented-control" style={{ marginBottom: 4 }}>
                      <div
                        className={`segmented-option ${syncWorkflow === 'direct' ? 'active' : ''}`}
                        onClick={() => setSyncWorkflow('direct')}
                        title="Commits solutions directly to main branch"
                      >
                        <span>⚡ Direct Commits (main)</span>
                      </div>
                      <div
                        className={`segmented-option ${syncWorkflow === 'pr_issue' ? 'active' : ''}`}
                        onClick={() => setSyncWorkflow('pr_issue')}
                        title="Creates an Issue, commits to a topic branch, and raises a PR"
                      >
                        <span>🔀 Issue → Branch → PR</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 11.5, color: '#64748b', lineHeight: 1.4, padding: '0 2px' }}>
                      {syncWorkflow === 'pr_issue'
                        ? 'Automates the full GitHub lifecycle: opens an Issue per solve, commits to a dedicated branch, and raises a PR to main.'
                        : 'Pushes accepted solutions directly to your main branch for immediate history tracking.'}
                    </div>
                  </div>

                  <button type="submit" className="btn-accent" disabled={saving} style={{ marginTop: 6 }}>
                    {saving ? 'Linking Repository...' : repoMode === 'create' ? 'Create & Link Repository 🚀' : 'Link Repository 🔗'}
                  </button>
                </form>

                <div
                  style={{ fontSize: 12, color: '#64748b', cursor: 'pointer', textDecoration: 'underline', marginTop: 14, textAlign: 'center' }}
                  onClick={() => { setAuthTab('oauth'); setStatusMsg(null); }}
                >
                  ← Switch to 1-Click GitHub OAuth
                </div>
              </div>
            )}
          </div>
        )}

        {/* Soft Inline Status & Notification Alert */}
        {statusMsg && (
          <div className={`alert-card ${statusMsg.type}`}>
            <div>{statusMsg.text}</div>
            <button
              type="button"
              className="alert-close"
              onClick={() => setStatusMsg(null)}
              title="Dismiss"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* Bottom Stats & Quick Actions */}
      <div className="stats-grid">
        {/* Left: Problems Solved */}
        <div>
          <div className="stats-section-title">
            Problems Solved: {stats.totalSynced}
          </div>
          <div className="difficulty-row">
            <span className="diff-badge easy">Easy: {solvedStats.easy}</span>
            <span className="diff-badge medium">Medium: {solvedStats.medium}</span>
            <span className="diff-badge hard">Hard: {solvedStats.hard}</span>
          </div>
        </div>

        {/* Right: Repository Actions */}
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
              <>
                <span
                  className="link-cyan"
                  onClick={() => setIsStagingOpen(true)}
                  style={{
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#fbbf24',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  Interactive Staging & PR Studio 🚀
                </span>
                <span className="link-cyan" onClick={handleReadmeSync} style={{ cursor: 'pointer', fontSize: 13, opacity: syncingReadme ? 0.6 : 1 }}>
                  {syncingReadme ? 'Syncing Root README...' : 'Rebuild Root README 🔄'}
                </span>
              </>
            )}
          </div>
          {syncProgress.status === 'completed' && (
            <div style={{ fontSize: 12, color: '#34d399', marginTop: 4 }}>
              Historical sync completed cleanly!
            </div>
          )}
        </div>
      </div>

      {/* Interactive Token Tutorial Modal */}
      {isTutorialOpen && (
        <div className="modal-backdrop" onClick={() => setIsTutorialOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <span>📖</span> Step-by-Step Token Tutorial
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsTutorialOpen(false)}
                title="Close tutorial"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {/* Step 1 */}
              <div className="tutorial-step-card">
                <div className="tutorial-step-num">1</div>
                <div className="tutorial-step-content">
                  <div className="tutorial-step-heading">Click &quot;1-Click Generate Token&quot;</div>
                  <div className="tutorial-step-detail">
                    Our pre-configured link automatically sets the token name to <strong>LeetLogger Sync</strong> and pre-selects the required permissions: <strong>Contents (Read & write)</strong>, <strong>Pull requests (Read & write)</strong>, and <strong>Issues (Read & write)</strong> for direct commits, issue tracking, and the PR Studio.
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="tutorial-step-card">
                <div className="tutorial-step-num">2</div>
                <div className="tutorial-step-content">
                  <div className="tutorial-step-heading">Generate on GitHub</div>
                  <div className="tutorial-step-detail">
                    On GitHub&apos;s token creation page, select which repositories LeetLogger can access (or &quot;All repositories&quot;), scroll to the bottom, and click the green <strong>&quot;Generate token&quot;</strong> button.
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="tutorial-step-card">
                <div className="tutorial-step-num">3</div>
                <div className="tutorial-step-content">
                  <div className="tutorial-step-heading">Copy and Paste Token</div>
                  <div className="tutorial-step-detail">
                    Copy the new token (starts with <code>github_pat_</code>) and paste it into the LeetLogger input field. LeetLogger will auto-detect your GitHub account.
                  </div>
                </div>
              </div>

              {/* Privacy Notice */}
              <div className="tutorial-privacy-box">
                <div style={{ fontSize: 18 }}>🛡️</div>
                <div>
                  <strong>Zero-Data-Leakage Guarantee:</strong> LeetLogger operates 100% client-side with zero backend servers or proxies. Your token remains encrypted in your local browser storage and only communicates directly with GitHub&apos;s REST API.
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
                <a
                  href={PRECONFIGURED_FINE_GRAINED_PAT_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-accent"
                  style={{ padding: '10px 18px', fontSize: 13 }}
                  onClick={() => setIsTutorialOpen(false)}
                >
                  ⚡ Open GitHub Generator ↗
                </a>
                <button
                  type="button"
                  onClick={() => setIsTutorialOpen(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 11,
                    padding: '10px 16px',
                    color: '#cbd5e1',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Got It
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Staging & PR Review Studio Modal */}
      <StagingModal
        isOpen={isStagingOpen}
        onClose={() => setIsStagingOpen(false)}
        baseBranch={branch || 'main'}
        onSyncComplete={loadConfig}
      />

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
