# Platform Parsers Component Specification

## Purpose

The `LeetCodeParser` component is responsible for detecting accepted submissions on LeetCode web pages, extracting source code, runtime performance, memory usage, problem identifiers, category tags, and problem statement content into a normalized `ISubmissionPayload`.

---

## Dependencies

- **`IPlatformParser`**: Contract interface defining extraction and verification methods.
- **`ISubmissionPayload`**: Normalized data contract holding verified submission attributes.
- **`SubmissionValidator`**: Schema validation guard ensuring complete payload integrity.
- **LeetCode GraphQL API**: `https://leetcode.com/graphql` for metadata resolution.

---

## Big-O Complexity Analysis

| Operation | Time Complexity | Space Complexity | Description |
| :--- | :---: | :---: | :--- |
| **DOM Verification (`isSubmissionSuccess`)** | $O(1)$ | $O(1)$ | Direct element query against targeted status and verdict DOM selectors. |
| **Payload Extraction (`parseSubmission`)** | $O(N)$ | $O(N)$ | $N$ is code and problem description byte length. Reads DOM node text and parses code editor container lines. |
| **GraphQL Metadata Fetch** | $O(M)$ | $O(M)$ | $M$ is question content payload size returned by LeetCode GraphQL query. |

---

## Interface Definitions

```typescript
export interface ISubmissionPayload {
  platform: 'leetcode';
  problemId: string;
  title: string;
  titleSlug: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category?: string;
  topics: string[];
  code: string;
  language: string;
  runtime?: string;
  runtimePercentile?: number;
  memory?: string;
  memoryPercentile?: number;
  questionContent?: string;
  timestamp: number; // Unix timestamp in milliseconds
}

export interface IPlatformParser {
  platformName: string;
  isSubmissionSuccess(): boolean;
  parseSubmission(): Promise<ISubmissionPayload | null>;
}
```

---

## Parsing Mechanics

1. **Network Interception**: Intercepts LeetCode GraphQL responses for `submit` and `checkResponse` queries when available.
2. **Dynamic DOM Fallback**: Evaluates React-rendered DOM elements on `https://leetcode.com/problems/*` targeting modern Monaco/CodeMirror editor containers and submission result dialogs.
3. **GraphQL Metadata Resolution**: Resolves complete problem statement, official difficulty, and topic taxonomy tags via `questionTitle` and `questionContent` GraphQL operations.
