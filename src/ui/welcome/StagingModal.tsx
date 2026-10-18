import React, { useState, useEffect, useMemo } from 'react';
import { IStagedProblemItem, ISelectiveSyncOptions, ISelectiveSyncResult } from '../../core/types/sync';

interface StagingModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseBranch: string;
  onSyncComplete?: () => void;
}

export const StagingModal: React.FC<StagingModalProps> = ({ isOpen, onClose, baseBranch, onSyncComplete }) => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<IStagedProblemItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [diffFilter, setDiffFilter] = useState<'All' | 'Easy' | 'Medium' | 'Hard'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Missing' | 'Synced'>('Missing');

  // Sync Options
  const [workflowMode, setWorkflowMode] = useState<'direct' | 'pr'>('pr');
  const [targetBranch, setTargetBranch] = useState(`sync/leetcode-${new Date().toISOString().slice(0, 10)}`);
  const [prTitle, setPrTitle] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<ISelectiveSyncResult | null>(null);

  // Load staging items
  const loadStagingList = () => {
    if (typeof chrome === 'undefined' || !chrome.runtime) return;
    setLoading(true);
    setError(null);
    setSyncResult(null);

    chrome.runtime.sendMessage({ type: 'FETCH_STAGING_SUBMISSIONS' }, (res) => {
      setLoading(false);
      if (res && res.success && Array.isArray(res.items)) {
        setItems(res.items);
        // Pre-select missing submissions by default
        const missing = new Set<string>();
        res.items.forEach((item: IStagedProblemItem) => {
          if (!item.isAlreadySynced) {
            missing.add(item.id);
          }
        });
        setSelectedIds(missing);
      } else {
        setError(res?.error || 'Failed to fetch historical submissions. Make sure your repository is linked.');
      }
    });
  };

  useEffect(() => {
    if (isOpen) {
      loadStagingList();
    }
  }, [isOpen]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Search filter
      const matchesSearch =
        !search.trim() ||
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.problemId.includes(search) ||
        item.topics.some((t) => t.toLowerCase().includes(search.toLowerCase()));

      // Difficulty filter
      const matchesDiff = diffFilter === 'All' || item.difficulty.toLowerCase() === diffFilter.toLowerCase();

      // Status filter
      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Missing' && !item.isAlreadySynced) ||
        (statusFilter === 'Synced' && item.isAlreadySynced);

      return matchesSearch && matchesDiff && matchesStatus;
    });
  }, [items, search, diffFilter, statusFilter]);

  // Selection helpers
  const handleToggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredItems.forEach((item) => next.add(item.id));
      return next;
    });
  };

  const handleDeselectFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredItems.forEach((item) => next.delete(item.id));
      return next;
    });
  };

  // Execution
  const handleStartSync = () => {
    if (selectedIds.size === 0) {
      alert('Please select at least one problem to synchronize.');
      return;
    }

    const selectedSubmissions = items.filter((i) => selectedIds.has(i.id)).map((i) => i.submission);
    const options: ISelectiveSyncOptions = {
      targetBranch: workflowMode === 'pr' ? targetBranch : baseBranch,
      createPullRequest: workflowMode === 'pr',
      pullRequestTitle: prTitle || `sync: add ${selectedSubmissions.length} LeetCode solutions`,
      baseBranch,
    };

    setSyncing(true);
    setError(null);
    setSyncResult(null);

    chrome.runtime.sendMessage(
      {
        type: 'SYNC_SELECTED_SUBMISSIONS',
        submissions: selectedSubmissions,
        options,
      },
      (res: ISelectiveSyncResult) => {
        setSyncing(false);
        if (res && res.success) {
          setSyncResult(res);
          if (onSyncComplete) onSyncComplete();
        } else {
          setError(res?.error || 'Synchronization failed.');
        }
      }
    );
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          backgroundColor: '#121214',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '920px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 10 }}>
              LeetCode Staging & Pull Request Studio 🚀
            </h2>
            <p style={{ fontSize: '13px', color: '#a1a1aa', marginTop: '4px' }}>
              Selectively sync past solutions, preview solve details, and commit directly or open a GitHub Pull Request.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={syncing}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#a1a1aa',
              fontSize: '22px',
              cursor: 'pointer',
              padding: '4px 8px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Filters & Search Toolbar */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', gap: 10, flex: 1, minWidth: '260px' }}>
            <input
              type="text"
              placeholder="Search problem title, #ID, or topic tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '13px',
              }}
            />
          </div>

          {/* Difficulty Chips */}
          <div style={{ display: 'flex', gap: 6 }}>
            {(['All', 'Easy', 'Medium', 'Hard'] as const).map((diff) => (
              <button
                key={diff}
                onClick={() => setDiffFilter(diff)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: diffFilter === diff ? '1px solid #f97316' : '1px solid rgba(255, 255, 255, 0.08)',
                  backgroundColor: diffFilter === diff ? 'rgba(249, 115, 22, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  color: diffFilter === diff ? '#f97316' : '#a1a1aa',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                {diff}
              </button>
            ))}
          </div>

          {/* Status Chips */}
          <div style={{ display: 'flex', gap: 6 }}>
            {(['All', 'Missing', 'Synced'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: statusFilter === st ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.08)',
                  backgroundColor: statusFilter === st ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  color: statusFilter === st ? '#60a5fa' : '#a1a1aa',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Action Toolbar */}
        <div
          style={{
            padding: '10px 24px',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            fontSize: '12px',
          }}
        >
          <div style={{ color: '#a1a1aa', display: 'flex', gap: 14, alignItems: 'center' }}>
            <span>
              Selected <strong style={{ color: '#f97316' }}>{selectedIds.size}</strong> of {items.length} problems
            </span>
            <span>•</span>
            <span>Showing {filteredItems.length} matching filter</span>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleSelectFiltered}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '4px',
                color: '#e4e4e7',
                padding: '4px 10px',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Select All Visible
            </button>
            <button
              onClick={handleDeselectFiltered}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '4px',
                color: '#e4e4e7',
                padding: '4px 10px',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Deselect Visible
            </button>
          </div>
        </div>

        {/* Table Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
          {loading ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#a1a1aa' }}>
              <div style={{ fontSize: '15px', marginBottom: 8 }}>Fetching LeetCode historical solves & repo tree...</div>
              <div style={{ fontSize: '12px', color: '#71717a' }}>This will take just a moment.</div>
            </div>
          ) : error ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#ef4444' }}>
              <div>{error}</div>
              <button
                onClick={loadStagingList}
                style={{
                  marginTop: 14,
                  padding: '8px 16px',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid #ef4444',
                  color: '#ffffff',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                Retry Fetch 🔄
              </button>
            </div>
          ) : filteredItems.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#71717a' }}>
              No submissions found matching your filters.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#71717a' }}>
                  <th style={{ padding: '12px 16px', width: '40px' }}></th>
                  <th style={{ padding: '12px 16px' }}>Problem</th>
                  <th style={{ padding: '12px 16px', width: '100px' }}>Difficulty</th>
                  <th style={{ padding: '12px 16px', width: '90px' }}>Language</th>
                  <th style={{ padding: '12px 16px', width: '120px' }}>Solved Date</th>
                  <th style={{ padding: '12px 16px', width: '100px' }}>Repo Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const isChecked = selectedIds.has(item.id);
                  const diffColor =
                    item.difficulty.toLowerCase() === 'easy'
                      ? '#22c55e'
                      : item.difficulty.toLowerCase() === 'medium'
                      ? '#f59e0b'
                      : '#ef4444';

                  return (
                    <tr
                      key={item.id}
                      onClick={() => handleToggle(item.id)}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        backgroundColor: isChecked ? 'rgba(249, 115, 22, 0.04)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '12px 16px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggle(item.id)}
                          style={{ cursor: 'pointer', accentColor: '#f97316' }}
                        />
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#f8fafc' }}>
                          {item.problemId ? `${item.problemId}. ` : ''}
                          <a
                            href={`https://leetcode.com/problems/${item.titleSlug}/`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: '#ffffff', textDecoration: 'none' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {item.title}
                          </a>
                        </div>
                        {item.topics.length > 0 && (
                          <div style={{ fontSize: '11px', color: '#71717a', marginTop: 2 }}>
                            {item.topics.slice(0, 3).join(', ')}
                            {item.topics.length > 3 && ` +${item.topics.length - 3}`}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: diffColor,
                            backgroundColor: `${diffColor}18`,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            border: `1px solid ${diffColor}40`,
                          }}
                        >
                          {item.difficulty}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#a1a1aa' }}>
                        <code style={{ fontSize: '12px', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 4 }}>
                          {item.language}
                        </code>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#a1a1aa', fontSize: '12px' }}>
                        {new Date(item.timestamp).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {item.isAlreadySynced ? (
                          <span style={{ fontSize: '11px', color: '#22c55e', display: 'flex', alignItems: 'center', gap: 4 }}>
                            ✓ Synced
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#f97316', display: 'flex', alignItems: 'center', gap: 4 }}>
                            ● Missing
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Sync Workflow Options Footer */}
        <div
          style={{
            padding: '18px 24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {/* Workflow Mode Switch */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <label style={{ fontSize: '13px', color: '#e4e4e7', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="radio"
                name="workflowMode"
                value="pr"
                checked={workflowMode === 'pr'}
                onChange={() => setWorkflowMode('pr')}
                style={{ accentColor: '#f97316' }}
              />
              Create New Branch & Open Pull Request (Recommended)
            </label>
            <label style={{ fontSize: '13px', color: '#e4e4e7', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="radio"
                name="workflowMode"
                value="direct"
                checked={workflowMode === 'direct'}
                onChange={() => setWorkflowMode('direct')}
                style={{ accentColor: '#f97316' }}
              />
              Commit directly to {baseBranch}
            </label>
          </div>

          {workflowMode === 'pr' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: '11px', color: '#a1a1aa', display: 'block', marginBottom: 4 }}>Target Branch</label>
                <input
                  type="text"
                  value={targetBranch}
                  onChange={(e) => setTargetBranch(e.target.value)}
                  placeholder="sync/leetcode-batch"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#a1a1aa', display: 'block', marginBottom: 4 }}>Pull Request Title</label>
                <input
                  type="text"
                  value={prTitle}
                  onChange={(e) => setPrTitle(e.target.value)}
                  placeholder={`sync: add ${selectedIds.size} LeetCode solutions`}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
              </div>
            </div>
          )}

          {/* Result Alert */}
          {syncResult && (
            <div
              style={{
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '8px',
                padding: '12px 16px',
                color: '#22c55e',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>
                Successfully synchronized <strong>{syncResult.committedCount}</strong> solutions to branch <code>{syncResult.branch}</code>!
              </span>
              {syncResult.pullRequestUrl && (
                <a
                  href={syncResult.pullRequestUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: '#22c55e',
                    fontWeight: 700,
                    textDecoration: 'underline',
                    marginLeft: 12,
                  }}
                >
                  View Pull Request #{syncResult.pullRequestUrl.split('/').pop()} ↗
                </a>
              )}
            </div>
          )}

          {/* Action Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginTop: 4 }}>
            <button
              onClick={onClose}
              disabled={syncing}
              style={{
                padding: '10px 18px',
                backgroundColor: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                color: '#a1a1aa',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleStartSync}
              disabled={syncing || selectedIds.size === 0}
              style={{
                padding: '10px 24px',
                backgroundColor: '#f97316',
                border: 'none',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: syncing || selectedIds.size === 0 ? 'not-allowed' : 'pointer',
                opacity: syncing || selectedIds.size === 0 ? 0.6 : 1,
                boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)',
              }}
            >
              {syncing
                ? 'Synchronizing Batch...'
                : workflowMode === 'pr'
                ? `Commit & Open PR (${selectedIds.size}) 🚀`
                : `Commit Selected (${selectedIds.size}) 🚀`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
