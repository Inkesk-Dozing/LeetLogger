import { ISubmissionPayload } from '../../core/types';

export class GFGParser {
  public static parseGFGSubmission(code: string, language: string): ISubmissionPayload | null {
    const match = window.location.pathname.match(/\/problems\/([^/]+)/);
    const slug = match ? match[1] : 'gfg-problem';

    const titleClean = slug
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return {
      id: `gfg_${Date.now()}`,
      platform: 'gfg',
      problemId: '',
      title: titleClean,
      titleSlug: slug,
      difficulty: 'Medium',
      topics: [],
      code: code || '// Solution',
      language: language || 'cpp',
      extension: '.cpp',
      timestamp: Date.now(),
    };
  }
}
