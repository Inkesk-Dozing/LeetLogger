# Issue #48: feat(auth): support GitHub Fine-Grained Personal Access Tokens with least-privilege scoping and release packaging

- **Issue URL**: [GitHub Issue #48](https://github.com/Inkesk-Dozing/LeetLogger/issues/48)
- **Status**: Open
- **Milestone**: `v1.0.0 - Production Readiness & Release Distribution`
- **Labels**: `type: feature`, `area: core`, `area: ui`, `type: security`

---

## Executive Summary

To adhere to the principle of least privilege and modern GitHub security best practices, LeetLogger is upgrading its authentication pipeline and onboarding experience to natively support, recommend, and prioritize **GitHub Fine-Grained Personal Access Tokens** (`github_pat_...`) alongside classic tokens (`ghp_...`).

Additionally, this issue introduces automatic GitHub username resolution from the token, modern `Bearer` authorization headers, and a dedicated release packaging pipeline (`npm run package`) for production distribution.

---

## Motivation & Problem Statement

1. **Expansive Blast Radius of Classic PATs**: Classic tokens (`ghp_...`) with the `repo` scope grant blanket read/write access to **all repositories** in a user's GitHub account (including sensitive work or private personal projects). Fine-Grained PATs restrict access exclusively to a single repository (e.g. `LeetCode-Track`).
2. **Friction in Onboarding**: Requiring manual username entry frequently causes authentication failures due to user typos or copy-pasted trailing whitespace.
3. **API Modernization**: GitHub REST API v3 standardizes on `Authorization: Bearer <token>` for fine-grained tokens and GitHub Apps.
4. **Distribution Packaging**: The repository lacks an automated script to package production bundles into compliant Chrome Web Store `.zip` archives.

---

## Technical Specification & Proposed Changes

### 1. Core Git Client Modernization (`src/core/git/githubClient.ts`)
- Standardize all GitHub API requests on `Authorization: Bearer ${this.config.accessToken}`.
- Enhance error handling in `verifyRepo()` and `createRepository()`:
  - If a 404/403 occurs with a Fine-Grained token scoped to "Only select repositories", provide actionable guidance explaining that the repository must be selected under token settings or pre-created on GitHub.
  - Clarify 401 errors for expired tokens.

### 2. Welcome & Options UI Enhancements (`src/ui/welcome/App.tsx`)
- Display an informative security notice highlighting **Least-Privilege Security**:
  - Direct 1-click link to [Generate Fine-Grained PAT ↗](https://github.com/settings/personal-access-tokens/new).
  - Fallback link for [Classic PAT ↗](https://github.com/settings/tokens/new?scopes=repo&description=LeetLogger).
  - Explicit list of minimal required permissions: `Repository permissions → Contents: Read and write` (and `Metadata: Read-only`).
- Auto-detect username: If the user pastes their token and leaves the username blank, automatically query `GET https://api.github.com/user` to resolve their GitHub login.
- Strip trailing/leading whitespace from token and repository inputs (`.trim()`).

### 3. Production Release Packaging Pipeline (`scripts/package.js` & `package.json`)
- Add script `scripts/package.js` to bundle `dist/` into `release/leetlogger-v1.0.0.zip`.
- Add npm script: `"package": "npm run build && node scripts/package.js"`.
- Ensure `release/` and `*.zip` are properly ignored in `.gitignore`.

### 4. Documentation Architecture (`README.md`)
- Update `README.md` with explicit instructions on how to generate and configure Fine-Grained Tokens.

---

## Acceptance Criteria

- [ ] `GitHubClient` issues all requests using `Bearer` token authorization.
- [ ] Both `github_pat_...` and `ghp_...` authenticate and sync solutions cleanly.
- [ ] Missing username is automatically resolved from token via GitHub API.
- [ ] Onboarding UI guides users directly to fine-grained token creation with exact permissions noted.
- [ ] `npm run package` builds and generates a clean `.zip` archive in `release/`.
- [ ] All 19 unit tests pass (`npm test`).
- [ ] Production build succeeds with 0 warnings or errors (`npm run build`).
