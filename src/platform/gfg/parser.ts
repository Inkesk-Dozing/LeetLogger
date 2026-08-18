import { ISubmissionPayload, Difficulty } from '../../core/types';

export interface GFGSubmissionDetails {
  url?: string;
  problemId?: string;
  title?: string;
  difficulty?: Difficulty;
  topics?: string[];
  runtime?: string;
  memory?: string;
  questionContent?: string;
  timestamp?: number;
}

export class GFGParser {
  /**
   * Extracts current problem title slug from URL string or window location.
   */
  public static getTitleSlug(url?: string): string {
    const targetUrl = url || (typeof window !== 'undefined' ? window.location.pathname : '');
    const match = targetUrl.match(/\/problems\/([^/]+)/);
    return match ? match[1] : 'gfg-problem';
  }

  /**
   * Parses GeeksforGeeks raw submission input into standard ISubmissionPayload structure.
   */
  public static parseGFGSubmission(
    code: string,
    language: string,
    details: GFGSubmissionDetails = {}
  ): ISubmissionPayload | null {
    const slug = this.getTitleSlug(details.url);

    const titleClean = details.title ||
      slug
        .split('-')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

    const rawDiff = details.difficulty || 'Medium';
    const validDifficulties: Difficulty[] = ['School', 'Basic', 'Easy', 'Medium', 'Hard'];
    const difficulty: Difficulty = validDifficulties.includes(rawDiff) ? rawDiff : 'Medium';

    const lang = language || 'cpp';

    return {
      id: `gfg_${details.timestamp || Date.now()}`,
      platform: 'gfg',
      problemId: details.problemId || '',
      title: titleClean,
      titleSlug: slug,
      difficulty,
      topics: details.topics || [],
      code: code || '// Solution',
      language: lang,
      extension: this.getLangExtension(lang),
      runtime: details.runtime,
      memory: details.memory,
      questionContent: details.questionContent,
      timestamp: details.timestamp || Date.now(),
    };
  }

  /**
   * Maps competitive programming language string to file extension.
   */
  public static getLangExtension(lang: string): string {
    if (!lang) return '.cpp';
    const l = lang.toLowerCase();
    if (l.includes('javascript') || l === 'js') return '.js';
    if (l.includes('typescript') || l === 'ts') return '.ts';
    if (l.includes('c++') || l === 'cpp') return '.cpp';
    if (l === 'c') return '.c';
    if (l.includes('csharp') || l.includes('c#')) return '.cs';
    if (l.includes('java')) return '.java';
    if (l.includes('python') || l.includes('py')) return '.py';
    return '.cpp';
  }
}
