import { GFGParser } from '../platform/gfg/parser';

console.log('[LeetLogger] GeeksforGeeks Content Script loaded.');

function observeGFGSubmissions() {
  const observer = new MutationObserver(() => {
    const successResult = document.querySelector('.problems_header_content__2k3_k') ||
      document.querySelector('[class*="accepted"]');

    if (successResult && successResult.textContent?.includes('Problem Solved Successfully')) {
      console.log('[LeetLogger] GFG Problem Solved Successfully detected!');
      const payload = GFGParser.parseGFGSubmission('// GFG Solution Code', 'cpp');
      if (payload) {
        chrome.runtime.sendMessage({ type: 'SUBMIT_SOLUTION', payload });
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  observeGFGSubmissions();
} else {
  window.addEventListener('DOMContentLoaded', observeGFGSubmissions);
}
