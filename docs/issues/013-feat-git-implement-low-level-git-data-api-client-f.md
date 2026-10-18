# Issue #13: feat(git): Implement Low-Level Git Data API Client for Atomic Multi-File Commits

- **State**: `CLOSED`
- **Labels**: `type: feature`, `area: git-client`
- **URL**: `https://github.com/Inkesk-Dozing/LeetLogger/issues/13`

---

Develop an asynchronous GitHub client wrapping GitHub REST and Git Data APIs.

## Objectives
- Wrap Git Data API primitives: Blobs, Trees, Commits, and References (`src/core/git/githubClient.ts`).
- Support custom author timestamps (`author.date` / `committer.date`) for authentic backdated historical problem sync.
- Provide branch discovery, default branch resolution, and target repository verification.
- Implement automatic tree creation supporting atomic multi-file updates (code + README) in a single commit.

## Tasks
- [x] Implement GitHub Git Data API wrapper.
- [x] Support atomic multi-file tree construction.
- [x] Support custom author and committer timestamps for historical parity.

