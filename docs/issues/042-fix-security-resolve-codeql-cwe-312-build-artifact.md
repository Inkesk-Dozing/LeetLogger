# Issue #42: fix(security): resolve CodeQL CWE-312 build artifact leak in webpack configuration and OAuth script

- **Status**: OPEN
- **Labels**: `type: security`, `type: bug`, `area: core`
- **Milestone**: `v1.0.0 - Production Readiness & Release Distribution`
- **GitHub URL**: https://github.com/Inkesk-Dozing/LeetLogger/issues/42
- **Alert Reference**: https://github.com/Inkesk-Dozing/LeetLogger/security/code-scanning/1

---

### Problem Description

CodeQL static analysis detected that `webpack.config.js` injects sensitive environment variables (`process.env.LEETLOGGER_CLIENT_SECRET`, `process.env.GITHUB_CLIENT_SECRET`, and `__CLIENT_SECRET__`) into client bundles via `webpack.DefinePlugin`. Additionally, `src/content/githubAuthorize.ts` contains a hardcoded fallback client secret.

In Chrome Extension Manifest V3 architectures, client bundles are delivered directly to user machines as unpacked or zipped JavaScript. Baking a client secret into the frontend artifact allows any user or inspector to extract the secret, violating security principles (CWE-312 / CWE-315 / CWE-359).

---

### Proposed Solution (100% Free Lifetime Zero-Cost Architecture)

1. **Remove Client Secret Injection from Webpack**:
   - Strip all `*_CLIENT_SECRET` definitions from `webpack.DefinePlugin` in `webpack.config.js`.
2. **Remove Hardcoded Secret in Content Script**:
   - Clean `src/content/githubAuthorize.ts` to reject embedding client secrets in client content scripts.
3. **Enforce Direct Token Security (PAT & Public App Flow)**:
   - Promote GitHub Personal Access Token (PAT) authentication as the primary, direct, zero-cost method (0 servers, 0 proxies, 0 paid APIs, 100% free forever).
   - Ensure OAuth client interactions operate without client-side secrets.

---

### Acceptance Criteria
- [ ] No client secrets or private tokens exist in compiled bundles in `dist/`.
- [ ] `webpack.config.js` no longer injects secret environment variables into `DefinePlugin`.
- [ ] CodeQL alert #1 resolves cleanly on GitHub Security.
- [ ] All unit tests pass and Webpack builds cleanly.
