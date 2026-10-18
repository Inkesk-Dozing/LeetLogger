# Issue #29: fix(perf): Resolve LeetCode GraphQL Batch Throttling and Sequential Git Latency

- **State**: `OPEN`
- **Labels**: `type: bug`, `type: perf`, `area: platform`, `area: sync-engine`
- **URL**: `https://github.com/Inkesk-Dozing/LeetLogger/issues/29`

---

The **Historical Catch-Up Engine** in `LeetLogger` experiences execution lag, network throttling, and worker timeouts when syncing large LeetCode submission histories (100+ problems).

### 🔍 Technical Root Causes (LeetCode Pipeline)

1. **Unthrottled LeetCode GraphQL Batching**:
   - Location: `src/platform/leetcode/historicalFetcher.ts`
   - Firing 20 concurrent GraphQL queries in parallel via `Promise.all()` triggers LeetCode HTTP 429 (Too Many Requests) rate limits and Cloudflare WAF challenges.

2. **Sequential Single-File Git Commits**:
   - Location: `src/background/historicalSyncOrchestrator.ts`
   - Committing each missing problem in a separate HTTP POST request inside a synchronous loop exhausts GitHub secondary rate limits.

---

### 🛠️ Proposed Solution

- **Rate Limiter & Jitter**: Implement token-bucket limiter (concurrency: 3-5) with randomized delay (150ms-350ms) between LeetCode GraphQL queries.
- **Atomic Batch Commits**: Group historical submissions into atomic composite Git tree commits, reducing API calls by ~85%.
- **Service Worker Heartbeat**: Maintain alive ping to prevent Chrome MV3 service worker timeout.

---

### ✅ Acceptance Criteria
- [ ] LeetCode historical fetcher runs with controlled concurrency without HTTP 429 errors.
- [ ] Atomic batch tree commits preserve authentic LeetCode solve dates.
- [ ] Clean completion of 200+ problem historical syncs without worker termination.

