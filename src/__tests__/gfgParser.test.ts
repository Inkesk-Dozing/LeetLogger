import { GFGParser } from '../platform/gfg/parser';

describe('GFGParser', () => {
  test('should extract title slug from GFG URL', () => {
    const slug = GFGParser.getTitleSlug('https://www.geeksforgeeks.org/problems/must-do-coding-questions-0/1');
    expect(slug).toBe('must-do-coding-questions-0');
  });

  test('should parse GFG submission with details', () => {
    const payload = GFGParser.parseGFGSubmission(
      'class Solution {\npublic:\n    void solve() {}\n};',
      'cpp',
      {
        url: 'https://www.geeksforgeeks.org/problems/array-leader/1',
        title: 'Array Leaders',
        difficulty: 'Easy',
        topics: ['Arrays', 'Data Structures'],
        runtime: '0.12s',
        memory: '24MB',
      }
    );

    expect(payload).not.toBeNull();
    expect(payload?.platform).toBe('gfg');
    expect(payload?.title).toBe('Array Leaders');
    expect(payload?.titleSlug).toBe('array-leader');
    expect(payload?.difficulty).toBe('Easy');
    expect(payload?.extension).toBe('.cpp');
    expect(payload?.topics).toEqual(['Arrays', 'Data Structures']);
  });

  test('should handle default values when details are omitted', () => {
    const payload = GFGParser.parseGFGSubmission('print("hello")', 'python3');

    expect(payload).not.toBeNull();
    expect(payload?.platform).toBe('gfg');
    expect(payload?.titleSlug).toBe('gfg-problem');
    expect(payload?.difficulty).toBe('Medium');
    expect(payload?.extension).toBe('.py');
  });

  test('should map language extensions correctly', () => {
    expect(GFGParser.getLangExtension('cpp')).toBe('.cpp');
    expect(GFGParser.getLangExtension('java')).toBe('.java');
    expect(GFGParser.getLangExtension('python')).toBe('.py');
    expect(GFGParser.getLangExtension('javascript')).toBe('.js');
  });
});
