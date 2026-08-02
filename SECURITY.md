# Security Policy

## Supported Versions

The following versions of LeetLogger are currently supported with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability within LeetLogger, please follow these guidelines:

1. **Do Not Publicly Disclose**: Please do not open public GitHub issues for security vulnerabilities.
2. **Contact Protocol**: Report any vulnerabilities directly via email to security@inkesk.org or submit a private security advisory on GitHub.
3. **Response SLA**: We will acknowledge receipt of your report within 48 hours and provide an estimated timeline for remediation.
4. **Token Storage**: LeetLogger stores your GitHub Personal Access Tokens and OAuth credentials locally in your browser's extension storage (via `chrome.storage.local`). The browser engine saves these credentials locally on disk; they are never transmitted to third-party tracking services, external databases, or logging endpoints.
