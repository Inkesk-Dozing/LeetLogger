import { ISubmissionPayload, Difficulty } from '../../core/types';

export interface LeetCodeSubmissionDetails {
  url?: string;
  problemId?: string;
  title?: string;
  difficulty?: Difficulty;
  topics?: string[];
  runtime?: string;
  runtimePercentile?: number;
  memory?: string;
  memoryPercentile?: number;
  questionContent?: string;
  timestamp?: number;
}

export class LeetCodeParser {
  /**
   * Extracts current problem title slug from URL string or window location.
   */
  public static getTitleSlug(url?: string): string {
    const targetUrl = url || (typeof window !== 'undefined' ? window.location.pathname : '');
    const match = targetUrl.match(/\/problems\/([^/]+)/);
    return match ? match[1] : '';
  }

  /**
   * Parses live submission result element and details in LeetCode DOM.
   */
  public static parseLiveSubmission(
    verdictText: string,
    code: string,
    lang: string,
    details: LeetCodeSubmissionDetails = {}
  ): ISubmissionPayload | null {
    // Check if verdict is Accepted
    if (!verdictText || !verdictText.toLowerCase().includes('accepted')) {
      return null;
    }

    const slug = this.getTitleSlug(details.url);
    if (!slug) return null;

    const titleClean = details.title ||
      slug
        .split('-')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

    return {
      id: `lc_${details.timestamp || Date.now()}`,
      platform: 'leetcode',
      problemId: details.problemId || '',
      title: titleClean,
      titleSlug: slug,
      difficulty: details.difficulty || 'Medium',
      topics: details.topics || [],
      code: code || '// Solution',
      language: lang,
      extension: this.getLangExtension(lang),
      runtime: details.runtime,
      runtimePercentile: details.runtimePercentile,
      memory: details.memory,
      memoryPercentile: details.memoryPercentile,
      questionContent: details.questionContent,
      timestamp: details.timestamp || Date.now(),
    };
  }

  /**
   * Parses raw GraphQL submission object into standard ISubmissionPayload structure.
   */
  public static parseRawGraphQLSubmission(
    raw: any,
    code: string,
    lang: string
  ): ISubmissionPayload | null {
    if (!raw) return null;

    const question = raw.question || raw;
    const slug = question.titleSlug || question.slug || this.getTitleSlug();
    if (!slug) return null;

    const rawDiff = question.difficulty || 'Medium';
    const difficulty: Difficulty =
      rawDiff === 'Easy' || rawDiff === 'Medium' || rawDiff === 'Hard' ? rawDiff : 'Medium';

    const topics: string[] = Array.isArray(question.topicTags)
      ? question.topicTags.map((tag: any) => (typeof tag === 'string' ? tag : tag.name)).filter(Boolean)
      : [];

    const titleClean = question.title ||
      slug
        .split('-')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

    const timestamp = raw.timestamp
      ? (typeof raw.timestamp === 'string' ? parseInt(raw.timestamp, 10) * 1000 : raw.timestamp * 1000)
      : Date.now();

    return {
      id: `lc_${raw.id || timestamp}`,
      platform: 'leetcode',
      problemId: question.questionId || question.questionFrontendId || '',
      title: titleClean,
      titleSlug: slug,
      difficulty,
      topics,
      code: code || raw.code || '// Solution',
      language: lang || raw.lang || raw.language || 'cpp',
      extension: this.getLangExtension(lang || raw.lang || raw.language || 'cpp'),
      runtime: raw.runtime || (raw.statusRuntime ? `${raw.statusRuntime}` : undefined),
      runtimePercentile: raw.runtimePercentile,
      memory: raw.memory || (raw.statusMemory ? `${raw.statusMemory}` : undefined),
      memoryPercentile: raw.memoryPercentile,
      questionContent: question.content || question.questionContent,
      timestamp,
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
    if (l.includes('python')) return '.py';
    if (l.includes('go') || l.includes('golang')) return '.go';
    if (l.includes('rust')) return '.rs';
    if (l.includes('kotlin')) return '.kt';
    if (l.includes('swift')) return '.swift';
    if (l.includes('ruby')) return '.rb';
    if (l.includes('php')) return '.php';
    if (l.includes('scala')) return '.scala';
    if (l.includes('sql')) return '.sql';
    if (l.includes('bash') || l.includes('shell')) return '.sh';
    return '.cpp';
  }
}
