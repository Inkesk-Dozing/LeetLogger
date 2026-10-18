# Issue #18: feat(content): Implement LeetCode DOM Content Scripts and OAuth Interceptors

- **State**: `CLOSED`
- **Labels**: `type: feature`, `area: platform`
- **URL**: `https://github.com/Inkesk-Dozing/LeetLogger/issues/18`

---

Implement content scripts injected into LeetCode problem pages and GitHub authorization callbacks.

## Objectives
- Injected content script for LeetCode problem and submission pages (`src/content/leetcodeContent.ts`).
- Interceptor script for capturing OAuth authentication tokens from GitHub callback pages (`src/content/githubAuthorize.ts`).
- Mutation observer and network listener detecting accepted submission dialogs and forwarding payloads to the background service worker.

## Verification
- Verified message dispatch between LeetCode content scripts and background runtime.

