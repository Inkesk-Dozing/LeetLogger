# LeetLogger Security Threat Model & Mitigation Strategy

This document details the threat landscape, trust boundaries, asset classification, and defense-in-depth mitigations for the LeetLogger Chrome Manifest V3 extension.

---

## 🛡️ Asset Classification & Threat Matrix

| Asset | Sensitivity | Threat Vector | Impact | Mitigation Strategy |
| :--- | :---: | :--- | :--- | :--- |
| **GitHub Access Tokens (PAT / OAuth)** | **Critical** | Malicious content scripts, cross-extension leaks, XSS | Unauthorized access to user GitHub repositories | Tokens are strictly scoped and held in isolated `chrome.storage.local`. Content scripts never have direct access to storage credentials; background service worker brokers all GitHub API calls. |
| **Submission Payloads & Code** | **Medium** | Man-in-the-Middle (MitM) eavesdropping | Leakage of private problem solutions | All network communication is enforced strictly over TLS 1.3 / HTTPS. Zero third-party telemetry, proxy servers, or external brokers exist in the pipeline. |
| **Extension Execution Context** | **High** | Script injection, unauthorized eval, prototype pollution | Arbitrary code execution in browser extension context | Strict Content Security Policy (CSP) compliant with Chrome Manifest V3: `script-src 'self'; object-src 'self'`. Evaluated strings (`eval`), `Function()` constructors, and inline scripts are forbidden. |
| **Network Host Permissions** | **High** | Excessive wildcard matching (`<all_urls>`) | Exposure to untrusted third-party websites | Host permissions in `manifest.json` are strictly pinned to minimal required origins: `https://leetcode.com/*`, `https://api.github.com/*`, and `https://github.com/*`. |

---

## 🔒 Security Architecture Guiding Principles

### 1. Principle of Least Privilege
- Chrome extension permissions are limited strictly to `storage`, `unlimitedStorage`, `webNavigation`, `tabs`, and `cookies`.
- GitHub OAuth token requests specify only minimal necessary repository management scopes (`repo` or `public_repo`).

### 2. Isolated World Security Barrier
- Content scripts operate within Chrome's isolated worlds. LeetCode web page scripts cannot inspect, intercept, or tamper with the extension's execution memory or variables.
- Messages passed from content scripts to the service worker undergo strict schema validation via `SubmissionValidator` before any processing occurs.

### 3. Rate-Limit Hardening & Denial-of-Service Defense
- Internal exponential backoff and randomized jitter prevent the client from becoming an accidental DoS source against LeetCode's GraphQL endpoint or GitHub's REST API.
- Secondary rate-limit sensing intercepts HTTP 429 and 403 responses and halts further request bursts until `Retry-After` windows expire.
