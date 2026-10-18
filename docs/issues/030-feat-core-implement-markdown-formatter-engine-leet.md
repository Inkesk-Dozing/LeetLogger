# Issue #30: feat(core): Implement Markdown Formatter Engine & LeetCode Problem Documentation Generator

- **State**: `OPEN`
- **Labels**: `type: feature`, `area: core`, `area: formatter`
- **URL**: `https://github.com/Inkesk-Dozing/LeetLogger/issues/30`

---

### Problem Statement

Currently, unit tests for markdown formatting (`src/__tests__/markdownFormatter.test.ts`) exist in the repository, but the core implementation `src/core/formatters/markdownFormatter.ts` remains uncommitted.

### Proposed Solution

Commit and integrate `src/core/formatters/markdownFormatter.ts` configured strictly for LeetCode problem standards:
- **HTML to Markdown Converter**: Cleans raw LeetCode HTML question descriptions into clean Markdown for problem READMEs.
- **Difficulty Badges**: Generates Shields.io style badges for LeetCode difficulty tiers (`Easy`, `Medium`, `Hard`).
- **Directory Path Standardizer**: Normalizes problem folder paths to `leetcode/<0000-id>-<titleSlug>/` (e.g. `leetcode/0001-two-sum/`).
- **Solution File Resolver**: Resolves language extensions to standard solution files (`Solution.cpp`, `Solution.py`, `Solution.java`, `Solution.ts`, etc.).
- **Problem README Generator**: Formats comprehensive READMEs with LeetCode URLs, complexity metrics, runtime percentiles, and topic tags.
- **Root README Generator**: Compiles master repository `README.md` indexing table of all solved LeetCode problems.

### Files Involved
- `src/core/formatters/markdownFormatter.ts`

### Acceptance Criteria
- [x] `MarkdownFormatter` standardizes `leetcode/` directory structures and badges.
- [x] All 19 Jest unit tests pass (`src/__tests__/markdownFormatter.test.ts`).
- [x] TypeScript builds cleanly.

