console.log('[LeetLogger] GitHub OAuth Content Script active on:', window.location.href);

// Fallback to verified OAuth Client Credentials if custom env is absent
const CLIENT_ID = 'Ov23libeIlT8ePmShcl3';
const CLIENT_SECRET = '28af7ac9d44717eca8e08bce9f77b3a50f7626e7';

async function performOAuthExchange(code: string) {
  try {
    console.log('[LeetLogger Content] Exchanging code for token...');
    const formData = new FormData();
    formData.append('client_id', CLIENT_ID);
    formData.append('client_secret', CLIENT_SECRET);
    formData.append('code', code);

    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
      },
      body: formData,
    });

    if (!tokenRes.ok) {
      throw new Error(`Token exchange failed: ${tokenRes.statusText}`);
    }

    const tokenData = await tokenRes.json();
    const token = tokenData.access_token;
    if (!token) {
      throw new Error(tokenData.error_description || 'OAuth token missing in response.');
    }

    console.log('[LeetLogger Content] Token fetched. Fetching user profile...');

    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!userRes.ok) {
      const errBody = await userRes.text().catch(() => '');
      throw new Error(`Failed to fetch user profile: ${userRes.status} - ${errBody}`);
    }

    const user = await userRes.json();
    const username = user.login;

    console.log('[LeetLogger Content] Successfully authenticated:', username);

    chrome.runtime.sendMessage({
      type: 'OAUTH_SUCCESS',
      token,
      username,
    });
  } catch (err: any) {
    console.error('[LeetLogger Content] OAuth Exchange error:', err);
    chrome.runtime.sendMessage({
      type: 'OAUTH_FAILURE',
      error: err.message || String(err),
    });
  }
}

const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');

if (code && window.location.host === 'github.com') {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get('leetlogger_pipe', (data) => {
      if (data && data.leetlogger_pipe) {
        chrome.storage.local.remove('leetlogger_pipe');
        performOAuthExchange(code);
      }
    });
  }
}
