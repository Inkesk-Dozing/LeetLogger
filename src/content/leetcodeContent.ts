import { LeetCodeParser } from '../platform/leetcode/parser';

console.log('[LeetLogger] LeetCode Content Script loaded.');

let lastSubmissionTime = 0;

// Listen for successful submission results in the live coder
function observeLiveSubmissions() {
  const observer = new MutationObserver(() => {
    const resultElement = document.querySelector('[data-e2e-locator="submission-result"]') ||
      document.querySelector('.success__3V2m') ||
      document.querySelector('[class*="result"]');

    if (resultElement) {
      const text = resultElement.textContent || '';
      if (text.includes('Accepted') && Date.now() - lastSubmissionTime > 5000) {
        lastSubmissionTime = Date.now();
        console.log('[LeetLogger] Detected Accepted submission!');

        const codeLines = Array.from(document.querySelectorAll('.view-lines .view-line'))
          .map((line) => line.textContent || '')
          .join('\n');

        const payload = LeetCodeParser.parseLiveSubmission('Accepted', codeLines, 'cpp');
        if (payload) {
          chrome.runtime.sendMessage({ type: 'SUBMIT_SOLUTION', payload });
        }
      }
    }

    // Inject manual sync button if on a submission details page
    injectManualSyncButton();
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

// Injects the premium "Sync w/ LeetLogger" orange action button next to other buttons
function injectManualSyncButton() {
  const url = window.location.href;
  if (!url.match(/\/submissions\/\d+/)) {
    return;
  }

  const container = document.querySelector('.flex.flex-none.gap-2:not(.justify-center):not(.justify-between)');
  if (!container) {
    return;
  }

  if (document.getElementById('leetlogger-sync-btn')) {
    return;
  }

  const btn = document.createElement('button');
  btn.id = 'leetlogger-sync-btn';
  btn.innerText = 'Sync w/ LeetLogger';
  btn.setAttribute('style', `
    background-color: #ea580c;
    color: #ffffff;
    border: none;
    border-radius: 8px;
    padding: 6px 14px;
    font-size: 13px;
    font-weight: 600;
    font-family: Inter, system-ui, -apple-system, sans-serif;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    transition: all 0.2s ease-in-out;
  `);

  // Hover states
  btn.addEventListener('mouseenter', () => {
    btn.style.backgroundColor = '#d97706';
    btn.style.transform = 'scale(1.02)';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.backgroundColor = '#ea580c';
    btn.style.transform = 'scale(1)';
  });

  // Action Click Handler
  btn.addEventListener('click', () => {
    const match = window.location.href.match(/leetcode\.com\/problems\/([^/]+)\/submissions\/(\d+)/);
    if (!match) {
      alert('Could not detect submission details from the URL.');
      return;
    }

    const titleSlug = match[1];
    const submissionId = match[2];

    btn.disabled = true;
    btn.innerText = 'Syncing... ⏳';
    btn.style.backgroundColor = '#78716c';
    btn.style.cursor = 'not-allowed';

    chrome.runtime.sendMessage({
      type: 'SYNC_SUBMISSION_MANUALLY',
      submissionId,
      titleSlug,
    }, (res) => {
      if (res && res.success) {
        btn.innerText = 'Synced! ✅';
        btn.style.backgroundColor = '#16a34a';
      } else {
        btn.innerText = 'Failed! ❌';
        btn.style.backgroundColor = '#dc2626';
        console.error('[LeetLogger Manual Sync] Error:', res?.error);
        setTimeout(() => {
          btn.disabled = false;
          btn.innerText = 'Sync w/ LeetLogger';
          btn.style.backgroundColor = '#ea580c';
          btn.style.cursor = 'pointer';
        }, 3000);
      }
    });
  });

  container.appendChild(btn);
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  observeLiveSubmissions();
} else {
  window.addEventListener('DOMContentLoaded', observeLiveSubmissions);
}
