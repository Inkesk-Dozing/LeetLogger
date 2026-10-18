# Issue #9: feat(core): Define Core Subsystem Type Contracts and Platform Interfaces

- **State**: `CLOSED`
- **Labels**: `type: feature`, `area: core`
- **URL**: `https://github.com/Inkesk-Dozing/LeetLogger/issues/9`

---

Define comprehensive TypeScript type contracts for submissions, sync records, storage queues, and GitHub integration.

## Objectives
- Define `ISubmissionPayload` for capturing platform metadata, solutions, and benchmarks (`src/core/types/submission.ts`).
- Define storage and queue data contracts (`src/core/types/storage.ts`).
- Define Git Data API schemas for blobs, trees, and commit references (`src/core/types/git.ts`).
- Define synchronization state interfaces and progress models (`src/core/types/sync.ts`).
- Re-export unified types via root index (`src/core/types/index.ts`).

## Tasks
- [x] Create submission types and difficulty enums.
- [x] Define sync record structures and queue payload models.
- [x] Add GitHub API client interfaces.

