# Issue #1: chore(core): LeetLogger Project Kickoff and Architecture Inception

- **State**: `CLOSED`
- **Labels**: `type: chore`, `area: core`
- **URL**: `https://github.com/Inkesk-Dozing/LeetLogger/issues/1`

---

LeetLogger is a dedicated, high-performance Chrome Extension and framework engineered to **automatically record, format, and backfill LeetCode submissions directly to GitHub**.

Unlike generic sync tools, LeetLogger preserves authentic LeetCode solve dates by aligning commit timestamps directly with LeetCode's submission history via GitHub's low-level Git Data API.

---

## 🎯 Architecture Scope (LeetCode Exclusive)

- **Real-Time LeetCode Submission Interceptor**
  - Monitors LeetCode DOM and GraphQL network responses (`submit` and `checkResponse`).
  - Automatically extracts accepted solution code, runtime/memory percentiles, tags, and problem statement.
  - Commits solutions to GitHub under organized directories (`leetcode/<0000-id>-<titleSlug>/`).

- **Historical Catch-Up Engine**
  - Queries LeetCode's GraphQL API for all historical accepted submissions across user history.
  - Computes missing solutions against target GitHub repository.
  - Generates backdated commits with authentic past solve timestamps (`author.date`).
  - Generates root repository `README.md` indexing table of all solved LeetCode problems.

- **React 18 User Interface**
  - Glassmorphic popup window for connection status, recent submissions, and sync status.
  - Onboarding and settings dashboard for GitHub OAuth and PAT management.

---

## ✅ Core Deliverables
- [x] Extension scaffolding and Manifest V3 configuration.
- [x] GitHub Git Data API client for atomic commits and custom timestamps.
- [x] LeetCode GraphQL and DOM submission parser.
- [x] Background service worker hub and local storage retry queue.
- [x] React 18 popup and options dashboards.

