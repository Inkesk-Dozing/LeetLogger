import { MarkdownFormatter } from '../core/formatters/markdownFormatter';
import { ISubmissionPayload } from '../core/types';

describe('MarkdownFormatter', () => {
  const samplePayload: ISubmissionPayload = {
    id: 'lc_1001',
    platform: 'leetcode',
    problemId: '1',
    title: 'Two Sum',
    titleSlug: 'two-sum',
    difficulty: 'Easy',
    topics: ['Array', 'Hash Table'],
    code: 'class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {}\n};',
    language: 'cpp',
    extension: '.cpp',
    runtime: '45 ms',
    runtimePercentile: 88.5,
    memory: '14.2 MB',
    memoryPercentile: 72.1,
    questionContent: '<p>Given an array of integers <code>nums</code>...</p>',
    timestamp: 1684161120000,
  };

  test('should generate correct directory path with zero-padded problem ID', () => {
    const dir = MarkdownFormatter.getDirectoryPath(samplePayload);
    expect(dir).toBe('leetcode/0001-two-sum');
  });

  test('should format code filename correctly', () => {
    expect(MarkdownFormatter.getCodeFileName('.cpp')).toBe('Solution.cpp');
    expect(MarkdownFormatter.getCodeFileName('py')).toBe('Solution.py');
  });

  test('should generate structured README content containing badges and problem details', () => {
    const readme = MarkdownFormatter.formatReadme(samplePayload);
    expect(readme).toContain('# [1. Two Sum](https://leetcode.com/problems/two-sum/)');
    expect(readme).toContain('![Easy](https://img.shields.io/badge/Difficulty-Easy-brightgreen?style=flat-square)');
    expect(readme).toContain('`Array`, `Hash Table`');
    expect(readme).toContain('<p>Given an array of integers <code>nums</code>...</p>');
  });
});
