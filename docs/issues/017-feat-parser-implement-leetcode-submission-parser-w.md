# Issue #17: feat(parser): Implement LeetCode Submission Parser with Payload Validation

- **State**: `CLOSED`
- **Labels**: `type: feature`, `area: platform`
- **URL**: `https://github.com/Inkesk-Dozing/LeetLogger/issues/17`

---

Build the dedicated LeetCode submission parser and implement comprehensive runtime payload validation.

## Objectives
- Implement `LeetCodeParser` to extract problem statements, accepted code, runtime, and memory stats (`src/platform/leetcode/parser.ts`).
- Intercept LeetCode GraphQL responses for `submit` and `checkResponse` queries.
- Fallback DOM extraction for modern dynamic LeetCode problem layouts (`https://leetcode.com/problems/*`).
- Implement runtime schema validation to ensure submission payload integrity (`src/core/validation/submissionValidator.ts`).
- Add unit tests for LeetCode parser and validator (`src/__tests__/leetcodeParser.test.ts`, `src/__tests__/submissionValidator.test.ts`).

## Verification
- 100% test pass rate across parser and validation test suites.

