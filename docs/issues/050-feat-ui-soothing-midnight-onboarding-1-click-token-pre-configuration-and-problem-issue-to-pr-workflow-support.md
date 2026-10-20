# Issue #50: feat(ui): Soothing Midnight Onboarding, 1-Click Token Pre-Configuration, and Problem Issue-to-PR Workflow Support

- **State**: `OPEN`
- **Labels**: `type: feature`, `area: ui`, `area: git-client`, `area: sync-engine`
- **Milestone**: `v1.0.0 - Production Readiness & Release Distribution`
- **URL**: `https://github.com/Inkesk-Dozing/LeetLogger/issues/50`

---

### Problem Statement

The initial onboarding and welcome UI presented usability and visual friction:
1. **Harsh Visual Contrast & Eye Strain**: The pure pitch-black (`#000000`) background paired with piercing neon orange elements and high-contrast borders caused severe visual fatigue during extended coding sessions.
2. **Confusing Token Generation Workflow**: Users were required to manually navigate GitHub's complex permission settings to configure least-privilege personal access tokens, creating friction and leading to permission errors.
3. **Automated Issue-to-PR Workflow Requirements**: The git synchronization lifecycle requires opening a GitHub Issue for each solved question, creating an associated topic branch, committing the solution, and raising a Pull Request against `main`. Without pre-configuring `issues:write` and `pull_requests:write` alongside `contents:write`, fine-grained tokens fail with `403 Resource not accessible by personal access token`.
4. **Persistent Error Banners**: Transient OAuth errors were cached in extension local storage without automatic cleanup, lingering across sessions on the welcome interface.

---

### Proposed Architecture & Solution

1. **Soothing Midnight Slate Design System**:
   - Palette migration from `#000000` to deep calming slate/navy (`#0b0f19` to `#0f172a`) with subtle ambient radial illumination (`rgba(56, 189, 248, 0.05)`).
   - Glassmorphism containers (`.welcome-card`) featuring `backdrop-filter: blur(20px)`, subtle borders (`1px solid rgba(255, 255, 255, 0.08)`), and soft drop shadows.
   - Harmonious typography, soothing copper amber accents (`#f59e0b` / `#ea580c`), and refined difficulty badges (Emerald for Easy, Amber for Medium, Rose for Hard).

2. **1-Click Pre-Configured Token Generator**:
   - Implemented a 1-click token pre-configuration URL:
     `https://github.com/settings/personal-access-tokens/new?name=LeetLogger%20Sync&description=Automated%20sync%20of%20LeetCode%20solutions%20to%20GitHub&contents=write&pull_requests=write&issues=write`
   - Automatically pre-selects the exact required scopes on GitHub (`Contents: Read & write`, `Pull requests: Read & write`, `Issues: Read & write`), enabling users to generate their token in a single click with zero manual checkbox configuration.
   - Secondary link provided for classic PAT users with `repo` scope.

3. **Interactive Step-by-Step Tutorial Modal**:
   - Built a 3-step visual tutorial modal (`.modal-backdrop` and `.modal-card`) accessible right next to the token input.
   - Explains the generation step, repository scoping, token copying, and local zero-leakage privacy guarantee.

4. **GitHub Client Issue Creation Engine**:
   - Implemented `createIssue` in `GitHubClient` (`POST /repos/{owner}/{repo}/issues`) supporting title, body, and tags (`leetcode`, `solution`).
   - Supports automated issue opening upon submission.

5. **Automated Issue → Branch → Commit → Pull Request Mode**:
   - Implemented `syncWorkflow: 'direct' | 'pr_issue'` in `IGitHubConfig`.
   - In `pr_issue` mode, background sync opens an Issue with problem details and tags, creates a dedicated topic branch (`solve/issue-X-title-slug`), commits the solution files, and raises a PR against `main` referencing `Closes #X`.
   - Added interactive workflow selector in onboarding and settings dashboards.

6. **Live Username Auto-Resolution & Storage Hygiene**:
   - Added debounced live query to `GET /user` when a token is pasted to verify credentials and auto-fill the GitHub username.
   - Automatic cleanup of stale `oauth_error` from `chrome.storage.local` upon view initialization.

---

### Acceptance Criteria

- [x] Background updated to eye-comfort midnight slate palette with frosted glass cards.
- [x] 1-Click Fine-Grained Token generation pre-selects `contents`, `pull_requests`, and `issues` permissions.
- [x] Step-by-Step Token Tutorial modal integrated and accessible from the token action bar.
- [x] `createIssue` method added to `GitHubClient` for issue generation.
- [x] Automated Issue → Branch → Commit → Pull Request workflow supported in background sync engine.
- [x] Sync Automation Mode toggle integrated into onboarding and repository settings.
- [x] Automatic GitHub username resolution upon pasting valid token.
- [x] Stale OAuth errors cleaned up from local storage on load.
- [x] All 19 unit tests passing (`npm test`).
- [x] Production build and release package generated cleanly (`npm run package`).
