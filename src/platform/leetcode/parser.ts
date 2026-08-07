import { ISubmissionPayload, Difficulty } from '../../core/types';

export class LeetCodeParser {
  /**
   * Extracts current problem title slug from window location URL.
   */
  public static getTitleSlug(): string {
    const match = window.location.pathname.match(/\/problems\/([^/]+)/);
    return match ? match[1] : '';
  }

  /**
   * Parses live submission result element in LeetCode DOM.
   */
  public static parseLiveSubmission(verdictText: string, code: string, lang: string): ISubmissionPayload | null {
    const slug = this.getTitleSlug();
    if (!slug) return null;

    // Check if verdict is Accepted
    if (!verdictText.toLowerCase().includes('accepted')) {
      return null;
    }

    const titleClean = slug
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return {
      id: `lc_${Date.now()}`,
      platform: 'leetcode',
      problemId: '',
      title: titleClean,
      titleSlug: slug,
      difficulty: 'Medium',
      topics: [],
      code: code || '// Solution',
      language: lang,
      extension: this.getLangExtension(lang),
      timestamp: Date.now(),
    };
  }

  private static getLangExtension(lang: string): string {
    const l = lang.toLowerCase();
    if (l.includes('cpp') || l.includes('c++')) return '.cpp';
    if (l.includes('java')) return '.java';
    if (l.includes('python')) return '.py';
    if (l.includes('javascript') || l.includes('js')) return '.js';
    if (l.includes('typescript') || l.includes('ts')) return '.ts';
    if (l.includes('go')) return '.go';
    if (l.includes('rust')) return '.rs';
    return '.cpp';
  }
}
