import { LeetCodeParser } from '../platform/leetcode/parser';

describe('LeetCodeParser', () => {
  test('should extract title slug from URL', () => {
    const slug = LeetCodeParser.getTitleSlug('https://leetcode.com/problems/two-sum/submissions/');
    expect(slug).toBe('two-sum');
  });

  test('should return empty slug for non-matching URL', () => {
    expect(LeetCodeParser.getTitleSlug('https://leetcode.com/explore/')).toBe('');
  });

  test('should parse live submission when verdict is Accepted', () => {
    const payload = LeetCodeParser.parseLiveSubmission(
      'Accepted',
      'int main() { return 0; }',
      'cpp',
      {
        url: 'https://leetcode.com/problems/3sum/',
        problemId: '15',
        difficulty: 'Medium',
        topics: ['Array', 'Two Pointers'],
        runtime: '45 ms',
        memory: '14.2 MB',
      }
    );

    expect(payload).not.toBeNull();
    expect(payload?.platform).toBe('leetcode');
    expect(payload?.titleSlug).toBe('3sum');
    expect(payload?.problemId).toBe('15');
    expect(payload?.difficulty).toBe('Medium');
    expect(payload?.extension).toBe('.cpp');
    expect(payload?.topics).toEqual(['Array', 'Two Pointers']);
  });

  test('should return null for non-accepted live submission', () => {
    const payload = LeetCodeParser.parseLiveSubmission(
      'Wrong Answer',
      'int main() {}',
      'cpp',
      { url: 'https://leetcode.com/problems/two-sum/' }
    );
    expect(payload).toBeNull();
  });

  test('should parse raw GraphQL submission payload', () => {
    const rawGraphQL = {
      id: 987654,
      question: {
        questionId: '1',
        title: 'Two Sum',
        titleSlug: 'two-sum',
        difficulty: 'Easy',
        topicTags: [{ name: 'Array' }, { name: 'Hash Table' }],
        content: '<p>Two Sum question content</p>',
      },
      timestamp: 1684161120,
      runtime: '50 ms',
      memory: '10.5 MB',
    };

    const payload = LeetCodeParser.parseRawGraphQLSubmission(
      rawGraphQL,
      'class Solution {};',
      'python3'
    );

    expect(payload).not.toBeNull();
    expect(payload?.problemId).toBe('1');
    expect(payload?.title).toBe('Two Sum');
    expect(payload?.difficulty).toBe('Easy');
    expect(payload?.topics).toEqual(['Array', 'Hash Table']);
    expect(payload?.extension).toBe('.py');
    expect(payload?.questionContent).toBe('<p>Two Sum question content</p>');
  });

  test('should map language extensions accurately', () => {
    expect(LeetCodeParser.getLangExtension('cpp')).toBe('.cpp');
    expect(LeetCodeParser.getLangExtension('python3')).toBe('.py');
    expect(LeetCodeParser.getLangExtension('java')).toBe('.java');
    expect(LeetCodeParser.getLangExtension('typescript')).toBe('.ts');
    expect(LeetCodeParser.getLangExtension('golang')).toBe('.go');
    expect(LeetCodeParser.getLangExtension('rust')).toBe('.rs');
  });
});
