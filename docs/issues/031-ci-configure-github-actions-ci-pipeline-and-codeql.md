# Issue #31: ci: Configure GitHub Actions CI Pipeline and CodeQL Security Scanning

- **State**: `OPEN`
- **Labels**: `type: ci`, `type: security`
- **URL**: `https://github.com/Inkesk-Dozing/LeetLogger/issues/31`

---

### Problem Statement

The repository currently lacks automated CI/CD checks to validate linting, automated testing, and Webpack builds on pull requests or commits to primary branches. In addition, automated security analysis and SAST scanning are missing.

### Proposed Solution

Implement standard GitHub Actions workflows:

1. **Continuous Integration (`.github/workflows/ci.yml`)**:
   - Triggers on `push` and `pull_request` targeting `main`, `master`, and `dev`.
   - Provisions Node.js 20 environment with npm caching.
   - Executes ESLint (`npm run lint`), Jest test suite (`npm test`), and production Webpack build (`npm run build`).

2. **Security & Vulnerability Analysis (`.github/workflows/codeql.yml`)**:
   - Automated CodeQL static analysis for `javascript-typescript`.
   - Triggers on push, PR, and weekly scheduled cron (`0 12 * * 1`).
   - Publishes security findings to GitHub Security tab.

### Files Involved
- `.github/workflows/ci.yml`
- `.github/workflows/codeql.yml`

### Acceptance Criteria
- [x] Workflows pass YAML validation.
- [x] Matrix targets Node 20 and Ubuntu runner.
- [x] Permissions restricted strictly to minimum requirements (`actions: read`, `contents: read`, `security-events: write`).

