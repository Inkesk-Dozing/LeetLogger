console.log('[LeetLogger] GitHub OAuth Content Script active on:', window.location.href);

// Note: Client secrets must never be embedded in client-side bundles (CWE-312).
// LeetLogger operates on a 100% zero-cost architecture using direct GitHub Personal Access Tokens (PAT).

async function handleOAuthCode(code: string) {
  console.log('[LeetLogger Content] GitHub authorization code received:', code ? 'present' : 'none');
  console.info('[LeetLogger Content] To prevent client secret leakage (CWE-312), LeetLogger enforces direct PAT authentication.');
  
  chrome.runtime.sendMessage({
    type: 'OAUTH_FAILURE',
    error: 'Direct client-side OAuth secret exchange is disabled to prevent credential leakage (CWE-312). Please connect securely using a GitHub Personal Access Token (PAT) in settings.',
  });
}

const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');

if (code && window.location.host === 'github.com') {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get('leetlogger_pipe', (data) => {
      if (data && data.leetlogger_pipe) {
        chrome.storage.local.remove('leetlogger_pipe');
        handleOAuthCode(code);
      }
    });
  }
}
