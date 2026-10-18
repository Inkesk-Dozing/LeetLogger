import { ISubmissionPayload, Difficulty } from '../../core/types';

export class LeetCodeHistoricalFetcher {
  private static LEETCODE_GRAPHQL_ENDPOINT = 'https://leetcode.com/graphql';

  private static async getCsrfToken(): Promise<string> {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.cookies) {
        chrome.cookies.get({ url: 'https://leetcode.com', name: 'csrftoken' }, (cookie) => {
          resolve(cookie ? cookie.value : '');
        });
      } else {
        resolve('');
      }
    });
  }

  private static async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Dispatches LeetCode GraphQL queries with automatic exponential backoff for HTTP 429 rate limits.
   */
  private static async postGraphQLWithRetry(query: string, variables: any, retries = 3): Promise<any> {
    const csrfToken = await this.getCsrfToken();
    let delay = 1200;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res: Response = await fetch(this.LEETCODE_GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrftoken': csrfToken,
            'Referer': 'https://leetcode.com',
          },
          body: JSON.stringify({ query, variables }),
        });

        if (res.status === 429) {
          const jitter = Math.floor(Math.random() * 500);
          console.warn(`[LeetCode Historical] Rate limit (429) encountered. Backing off ${delay + jitter}ms (attempt ${attempt}/${retries})...`);
          await this.sleep(delay + jitter);
          delay *= 2;
          continue;
        }

        if (res.ok) {
          return await res.json();
        }

        console.warn(`[LeetCode Historical] GraphQL request returned HTTP ${res.status}: ${res.statusText}`);
      } catch (err) {
        if (attempt === retries) throw err;
        await this.sleep(delay);
        delay *= 1.5;
      }
    }
    return null;
  }

  /**
   * Fetches user's past accepted LeetCode submissions using LeetCode GraphQL API.
   * Leverages problemsetQuestionList filtered by status='AC' to find ALL solved problems,
   * then fetches the latest accepted submission details for each unique language the problem was solved in.
   */
  public static async fetchSubmissionHistory(limit = 100): Promise<ISubmissionPayload[]> {
    try {
      let skip = 0;
      let hasMore = true;
      const solvedQuestions: any[] = [];

      console.log('[LeetCode Historical] Querying user profile solved questions index...');

      // 1. Fetch all solved questions metadata
      while (hasMore) {
        const query = `
          query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
            problemsetQuestionList: questionList(
              categorySlug: $categorySlug
              limit: $limit
              skip: $skip
              filters: $filters
            ) {
              total: totalNum
              questions: data {
                questionId
                title
                titleSlug
                difficulty
                topicTags {
                  name
                }
              }
            }
          }
        `;
        const variables = {
          categorySlug: '',
          limit: 100,
          skip,
          filters: { status: 'AC' },
        };

        const data = await this.postGraphQLWithRetry(query, variables);
        if (!data) break;

        const listData = data.data?.problemsetQuestionList;
        if (!listData || !listData.questions) {
          break;
        }

        solvedQuestions.push(...listData.questions);
        hasMore = solvedQuestions.length < listData.total && listData.questions.length > 0;
        skip += 100;

        // Pacing delay between pagination pages
        await this.sleep(150);
      }

      console.log(`[LeetCode Historical] Found ${solvedQuestions.length} solved problems in profile stats. Fetching submission details with controlled concurrency...`);

      // 2. Fetch submissions details in controlled batches of 4 with randomized jitter to prevent rate limits
      const BATCH_SIZE = 4;
      const payloads: ISubmissionPayload[] = [];

      for (let i = 0; i < solvedQuestions.length; i += BATCH_SIZE) {
        const batch = solvedQuestions.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async (q) => {
            try {
              // Get latest accepted submissions for each unique language solved for this question
              const acSubmissions = await this.fetchLatestAcceptedSubmissions(q.titleSlug);
              if (!acSubmissions || acSubmissions.length === 0) {
                console.warn(`[LeetCode Historical] No accepted submission found in recent logs for ${q.titleSlug}`);
                return [];
              }

              const detailedPayloads: ISubmissionPayload[] = [];
              for (const ac of acSubmissions) {
                const detail = await this.fetchSubmissionDetails(ac.id, q.titleSlug);
                if (detail) {
                  detailedPayloads.push({
                    id: ac.id,
                    platform: 'leetcode',
                    problemId: q.questionId || detail.questionId || '',
                    title: q.title,
                    titleSlug: q.titleSlug,
                    difficulty: q.difficulty as Difficulty || 'Medium',
                    topics: q.topicTags?.map((t: any) => t.name) || detail.topics || [],
                    code: detail.code || '// Solution code',
                    language: ac.lang,
                    extension: this.getLanguageExtension(ac.lang),
                    questionContent: detail.content || '',
                    runtime: detail.runtime || '',
                    runtimePercentile: detail.runtimePercentile || 0,
                    memory: detail.memory || '',
                    memoryPercentile: detail.memoryPercentile || 0,
                    timestamp: ac.timestamp * 1000,
                  });
                }
                // Micro-jitter between detailed payload lookups
                await this.sleep(60);
              }
              return detailedPayloads;
            } catch (e) {
              console.warn(`Failed to process solved problem details for ${q.titleSlug}:`, e);
            }
            return [];
          })
        );

        for (const list of batchResults) {
          if (list && list.length > 0) {
            payloads.push(...list);
          }
        }

        // Randomized pacing delay between question batches
        await this.sleep(180 + Math.floor(Math.random() * 120));
      }

      console.log(`[LeetCode Historical] Successfully processed details for ${payloads.length} total language solutions.`);
      return payloads;
    } catch (err) {
      console.error('Failed to fetch historical LeetCode submissions:', err);
      return [];
    }
  }

  /**
   * Finds the latest accepted submission ID and language mapping for each unique language solved for a question.
   */
  private static async fetchLatestAcceptedSubmissions(titleSlug: string): Promise<Array<{ id: string; lang: string; timestamp: number }>> {
    const query = `
      query submissionList($offset: Int!, $limit: Int!, $lastKey: String, $questionSlug: String!) {
        submissionList(offset: $offset, limit: $limit, lastKey: $lastKey, questionSlug: $questionSlug) {
          lastKey
          hasNext
          submissions {
            id
            statusDisplay
            lang
            timestamp
          }
        }
      }
    `;

    try {
      const data = await this.postGraphQLWithRetry(query, { offset: 0, limit: 100, questionSlug: titleSlug });
      if (data) {
        const list = data.data?.submissionList?.submissions || [];
        
        const uniqueLangACs: Record<string, any> = {};
        for (const s of list) {
          if (s.statusDisplay === 'Accepted') {
            const langNorm = s.lang.toLowerCase();
            // Since submissions are sorted descending, the first accepted one seen is the latest for that language
            if (!uniqueLangACs[langNorm]) {
              uniqueLangACs[langNorm] = s;
            }
          }
        }
        
        return Object.values(uniqueLangACs).map((accepted: any) => ({
          id: String(accepted.id),
          lang: accepted.lang,
          timestamp: Number(accepted.timestamp),
        }));
      }
    } catch (err) {
      console.warn(`Could not fetch accepted submissions for ${titleSlug}:`, err);
    }
    return [];
  }

  /**
   * Fetches submission code and problem metadata via submission details query.
   */
  public static async fetchSubmissionDetails(submissionId: string, titleSlug: string): Promise<any> {
    const query = `
      query submissionDetails($submissionId: Int!) {
        submissionDetails(submissionId: $submissionId) {
          code
          timestamp
          runtimeDisplay
          runtimePercentile
          memoryDisplay
          memoryPercentile
          question {
            questionId
            title
            titleSlug
            difficulty
            content
            topicTags {
              name
            }
          }
        }
      }
    `;

    try {
      const data = await this.postGraphQLWithRetry(query, { submissionId: parseInt(submissionId, 10) });
      if (data) {
        const details = data.data?.submissionDetails;
        if (details) {
          return {
            code: details.code,
            runtime: details.runtimeDisplay,
            runtimePercentile: details.runtimePercentile,
            memory: details.memoryDisplay,
            memoryPercentile: details.memoryPercentile,
            questionId: details.question?.questionId,
            difficulty: details.question?.difficulty,
            content: details.question?.content,
            title: details.question?.title,
            topics: details.question?.topicTags?.map((t: any) => t.name) || [],
          };
        }
      }
    } catch (err) {
      console.warn(`Could not fetch details for submission ${submissionId}:`, err);
    }
    return null;
  }

  public static getLanguageExtension(lang: string): string {
    const l = lang.toLowerCase();
    if (l.includes('cpp') || l.includes('c++')) return '.cpp';
    if (l.includes('java')) return '.java';
    if (l.includes('python')) return '.py';
    if (l.includes('javascript') || l.includes('js')) return '.js';
    if (l.includes('typescript') || l.includes('ts')) return '.ts';
    if (l.includes('golang') || l.includes('go')) return '.go';
    if (l.includes('rust')) return '.rs';
    if (l.includes('csharp') || l.includes('c#')) return '.cs';
    return '.cpp';
  }
}
