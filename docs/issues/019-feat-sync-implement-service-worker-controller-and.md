# Issue #19: feat(sync): Implement Service Worker Controller and Historical Catch-Up Orchestrator

- **State**: `CLOSED`
- **Labels**: `type: feature`, `area: sync-engine`
- **URL**: `https://github.com/Inkesk-Dozing/LeetLogger/issues/19`

---

Build the central Chrome Extension service worker hub and historical backfill engine.

## Objectives
- Background service worker hub handling runtime messages, badge updates, and queue flushing (`src/background/serviceWorker.ts`).
- Historical sync orchestrator querying LeetCode GraphQL API to fetch historical submissions and backfill missing problems (`src/background/historicalSyncOrchestrator.ts`).
- Historical submission fetcher extracting past problem solutions and timestamps (`src/platform/leetcode/historicalFetcher.ts`).
- Automatic root `README.md` synchronization with table indexing all logged solutions.

## Tasks
- [x] Build background service worker message router.
- [x] Implement historical sync orchestrator.
- [x] Implement LeetCode historical GraphQL fetcher.

