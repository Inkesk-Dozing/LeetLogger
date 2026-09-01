import React, { useEffect, useState } from 'react';
import { StorageManager } from '../../core/storage/storageManager';
import { IExtensionStats, IGitHubConfig } from '../../core/types';

export const PopupApp: React.FC = () => {
  const [gitConfig, setGitConfig] = useState<IGitHubConfig | undefined>();
  const [stats, setStats] = useState<IExtensionStats>({ totalSynced: 0, leetcodeCount: 0, gfgCount: 0 });
  const [solvedStats, setSolvedStats] = useState({ easy: 0, medium: 0, hard: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    StorageManager.getStorage().then((storage) => {
      setGitConfig(storage.gitConfig);
      setStats(storage.stats);

      const solvedProblems = storage.solvedProblems || {};
      let easy = 0, medium = 0, hard = 0;
      Object.values(solvedProblems).forEach((p) => {
        const diff = p.difficulty.toLowerCase();
        if (diff === 'easy' || diff === 'basic' || diff === 'school') easy++;
        else if (diff === 'medium') medium++;
        else if (diff === 'hard') hard++;
      });
      setSolvedStats({ easy, medium, hard });
      setLoading(false);
    });
  }, []);

  const openSettings = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open('welcome.html');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#a1a1aa' }}>
        Loading LeetLogger...
      </div>
    );
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="assets/logo.svg" alt="LeetLogger" width="32" height="32" style={{ borderRadius: 8, objectFit: 'contain' }} />
          <h2 style={{ fontSize: 20, margin: 0, fontWeight: 800, fontFamily: 'Outfit, sans-serif' }}>
            Leet<span style={{ color: '#f97316' }}>Logger</span>
          </h2>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: '3px 8px',
            borderRadius: 12,
            background: gitConfig ? 'rgba(34, 197, 94, 0.15)' : 'rgba(249, 115, 22, 0.15)',
            color: gitConfig ? '#22c55e' : '#f97316',
            border: `1px solid ${gitConfig ? 'rgba(34, 197, 94, 0.3)' : 'rgba(249, 115, 22, 0.3)'}`,
          }}
        >
          {gitConfig ? 'Linked' : 'Not Linked'}
        </span>
      </div>

      {/* Target Repo Info */}
      <div
        style={{
          background: 'rgba(24, 24, 27, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 12,
          padding: 16,
        }}
      >
        {gitConfig ? (
          <div>
            <div style={{ fontSize: 11, color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Target Repository
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#ffffff', marginTop: 4 }}>
              {gitConfig.username} / {gitConfig.repository}
            </div>
            <div style={{ fontSize: 12, color: '#a1a1aa', marginTop: 2 }}>
              Branch: {gitConfig.branch || 'main'}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '6px 0' }}>
            <p style={{ fontSize: 13, color: '#a1a1aa', marginBottom: 10 }}>
              Link your GitHub repo to sync solutions automatically.
            </p>
            <button className="btn-accent" onClick={openSettings} style={{ width: '100%' }}>
              Configure Repository
            </button>
          </div>
        )}
      </div>

      {/* Stats Counter */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div
          style={{
            background: 'rgba(24, 24, 27, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 12,
            padding: 14,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div style={{ fontSize: 32, fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>{stats.totalSynced}</div>
          <div style={{ fontSize: 11, color: '#a1a1aa', marginTop: 6 }}>Problems Solved</div>
        </div>
        <div
          style={{
            background: 'rgba(24, 24, 27, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 12,
            padding: '10px 14px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: '#10b981', display: 'flex', justifyContent: 'space-between' }}>
            <span>Easy:</span> <span>{solvedStats.easy}</span>
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#f97316', display: 'flex', justifyContent: 'space-between' }}>
            <span>Medium:</span> <span>{solvedStats.medium}</span>
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#ef4444', display: 'flex', justifyContent: 'space-between' }}>
            <span>Hard:</span> <span>{solvedStats.hard}</span>
          </div>
        </div>
      </div>

      {/* Primary Action Button */}
      <div style={{ marginTop: 'auto' }}>
        <button
          className="btn-accent"
          onClick={openSettings}
          style={{ width: '100%', padding: '12px 16px' }}
        >
          Open Dashboard 🚀
        </button>
      </div>
    </div>
  );
};
