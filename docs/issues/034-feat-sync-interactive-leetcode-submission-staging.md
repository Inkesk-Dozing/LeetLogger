# Issue #34: feat(sync): Interactive LeetCode Submission Staging & Pull Request Review Workflow

- **State**: `OPEN`
- **Labels**: `type: feature`, `area: sync-engine`, `area: ui`
- **URL**: `https://github.com/Inkesk-Dozing/LeetLogger/issues/34`

---

### Problem Statement

Currently, the historical catch-up engine attempts to commit all missing LeetCode submissions sequentially and directly to `main`. For users with hundreds of historical LeetCode solves:
1. Pushing 400+ historical commits at once saturates GitHub activity unrealistically and risks rate limiting.
2. Users have no granular control over which LeetCode problems, categories, or date ranges get synced.
3. Committing directly to `main` bypasses branch protection, code review, and prevents peer collaboration.

### Proposed Architecture (LeetCode Staging)

1. **Interactive LeetCode Submission Staging Table (React Dashboard)**:
   - Queries historical LeetCode submissions via `historicalFetcher` and renders an interactive staging table in the Options/Welcome UI.
   - Filters: By difficulty (Easy, Medium, Hard), topic tags (e.g. `Dynamic Programming`, `Graphs`, `Arrays`), programming language, and date range.
   - Selection Controls: Checkboxes per problem, "Select All Visible", "Select by Year/Month".
   - Status Indicator: Highlights problems already present in the target repository vs. missing.

2. **Selective Paced Commits**:
   - Commits only the selected subset of LeetCode problems with authentic backdated author timestamps (`author.date`).

3. **Branch-Based Pull Request Workflow**:
   - Option to commit to a dedicated branch (e.g. `sync/leetcode-batch-2024-q1`).
   - Automatically opens a formatted GitHub Pull Request against `main` with a problem summary table, enabling peer code review, CI verification, and team collaboration.

### Acceptance Criteria
- [ ] User can preview and select specific historical LeetCode submissions before committing.
- [ ] Option to create a sync branch and open a Pull Request.
- [ ] Automated PR body includes problem table with difficulty badges and LeetCode problem links.

