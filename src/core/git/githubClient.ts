import {
  IGitHubConfig,
  ICommitFile,
  ICommitResult,
  IBatchCommitItem,
  IBatchCommitResult,
} from '../types/git';

export class GitHubClient {
  private config: IGitHubConfig;
  private lastCommitSha: string | null = null;
  private lastTreeSha: string | null = null;

  constructor(config: IGitHubConfig) {
    this.config = config;
  }

  public get username(): string {
    return this.config.username;
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.accessToken}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };
  }

  private get baseUrl(): string {
    return `https://api.github.com/repos/${this.config.username}/${this.config.repository}`;
  }

  /**
   * Verifies credentials and repository existence.
   */
  public async verifyRepo(): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(this.baseUrl, { headers: this.headers });
      if (!res.ok) {
        if (res.status === 404) {
          return {
            success: false,
            error: `Repository '${this.config.repository}' not found under '${this.config.username}'. If using a Fine-Grained Token, ensure this repository is explicitly granted under 'Selected repositories'.`,
          };
        }
        if (res.status === 401) {
          return { success: false, error: 'Invalid or expired GitHub Personal Access Token. Please verify or refresh your token.' };
        }
        return { success: false, error: `GitHub API error: ${res.statusText}` };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to connect to GitHub.' };
    }
  }

  /**
   * Creates a new GitHub repository for the authenticated user.
   */
  public static async createRepository(
    token: string,
    repoName: string
  ): Promise<{ success: boolean; repoName?: string; error?: string }> {
    try {
      const res = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: repoName,
          private: true,
          auto_init: true,
          description: 'A collection of LeetCode solutions - Logged using LeetLogger',
          homepage: `https://github.com/Inkesk-Dozing/LeetLogger`,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 422 && data.errors?.[0]?.message?.includes('already exists')) {
          return { success: true, repoName };
        }
        if (res.status === 403 || res.status === 404) {
          return {
            success: false,
            error: `Cannot create repository via API (${data.message || res.statusText}). If using a Fine-Grained PAT scoped to 'Selected repositories', please create '${repoName}' on GitHub first and choose 'Link an Existing Repo'.`,
          };
        }
        return { success: false, error: data.message || `Failed to create repository: ${res.statusText}` };
      }

      const repo = await res.json();
      return { success: true, repoName: repo.name };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to create repository.' };
    }
  }

  /**
   * Recursively fetches all tree file paths currently committed to target branch.
   */
  public async getExistingRepoTree(branchName?: string): Promise<Set<string>> {
    const targetBranch = branchName || this.config.branch || 'main';
    const paths = new Set<string>();
    try {
      const treeUrl = `${this.baseUrl}/git/trees/${targetBranch}?recursive=1`;
      const res = await this.fetchWithRetry(treeUrl, { headers: this.headers });
      if (!res.ok) {
        console.warn(`[LeetLogger Git] Tree fetch returned HTTP ${res.status} for branch '${targetBranch}'.`);
        return paths;
      }
      const data = await res.json();
      if (data && Array.isArray(data.tree)) {
        for (const item of data.tree) {
          if (item.path) {
            paths.add(item.path);
          }
        }
      }
    } catch (err) {
      console.warn('[LeetLogger Git] Error fetching existing repository tree:', err);
    }
    return paths;
  }

  /**
   * Fetches latest commit SHA and base tree SHA of target branch.
   */
  public async getHeadCommit(branchName?: string): Promise<{ commitSha: string; treeSha: string }> {
    const target = branchName || this.config.branch || 'main';
    if (!branchName && this.lastCommitSha && this.lastTreeSha) {
      return { commitSha: this.lastCommitSha, treeSha: this.lastTreeSha };
    }

    const refUrl = `${this.baseUrl}/git/refs/heads/${target}`;
    const refRes = await this.fetchWithRetry(refUrl, { headers: this.headers });
    if (!refRes.ok) {
      throw new Error(`Failed to fetch branch ref '${target}': ${refRes.statusText}`);
    }
    const refData = await refRes.json();
    const commitSha = refData.object.sha;

    const commitUrl = `${this.baseUrl}/git/commits/${commitSha}`;
    const commitRes = await this.fetchWithRetry(commitUrl, { headers: this.headers });
    if (!commitRes.ok) {
      throw new Error(`Failed to fetch commit '${commitSha}': ${commitRes.statusText}`);
    }
    const commitData = await commitRes.json();

    if (!branchName || branchName === this.config.branch) {
      this.lastCommitSha = commitSha;
      this.lastTreeSha = commitData.tree.sha;
    }

    return { commitSha, treeSha: commitData.tree.sha };
  }

  /**
   * Creates a new branch pointing to fromBranch HEAD if it doesn't already exist.
   */
  public async createBranch(newBranch: string, fromBranch?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const checkRes = await this.fetchWithRetry(`${this.baseUrl}/git/refs/heads/${newBranch}`, {
        headers: this.headers,
      });
      if (checkRes.ok) {
        return { success: true };
      }

      const { commitSha } = await this.getHeadCommit(fromBranch || this.config.branch || 'main');
      const createRes = await this.fetchWithRetry(`${this.baseUrl}/git/refs`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          ref: `refs/heads/${newBranch}`,
          sha: commitSha,
        }),
      });

      if (!createRes.ok) {
        const data = await createRes.json().catch(() => ({}));
        return { success: false, error: data.message || `Failed to create branch '${newBranch}': ${createRes.statusText}` };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Branch creation failed.' };
    }
  }

  /**
   * Opens a GitHub Pull Request between headBranch and baseBranch.
   */
  public async createPullRequest(
    title: string,
    headBranch: string,
    baseBranch: string,
    body: string
  ): Promise<{ success: boolean; url?: string; number?: number; error?: string }> {
    try {
      const res = await this.fetchWithRetry(`${this.baseUrl}/pulls`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          title,
          head: headBranch,
          base: baseBranch || this.config.branch || 'main',
          body,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: data.message || `Failed to create PR: ${res.statusText}` };
      }
      return {
        success: true,
        url: data.html_url,
        number: data.number,
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Pull request creation failed.' };
    }
  }

  /**
   * Creates a GitHub Issue in the repository.
   */
  public async createIssue(
    title: string,
    body: string,
    labels?: string[]
  ): Promise<{ success: boolean; url?: string; number?: number; error?: string }> {
    try {
      const res = await this.fetchWithRetry(`${this.baseUrl}/issues`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          title,
          body,
          labels: labels && labels.length > 0 ? labels : ['leetcode', 'solution'],
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: data.message || `Failed to create Issue: ${res.statusText}` };
      }
      return {
        success: true,
        url: data.html_url,
        number: data.number,
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Issue creation failed.' };
    }
  }

  /**
   * Commits files to GitHub using Git Data API with optional custom backdated timestamp.
   */
  public async commitFiles(
    files: ICommitFile[],
    commitMessage: string,
    authorTimestamp?: string,
    targetBranch?: string
  ): Promise<ICommitResult> {
    const branch = targetBranch || this.config.branch || 'main';
    const retries = 3;
    let delayMs = 600;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const { commitSha: baseCommitSha, treeSha: baseTreeSha } = await this.getHeadCommit(branch);

        // 1. Create Blobs for each file
        const treeItems = await Promise.all(
          files.map(async (file) => {
            const blobRes = await this.fetchWithRetry(`${this.baseUrl}/git/blobs`, {
              method: 'POST',
              headers: this.headers,
              body: JSON.stringify({
                content: btoa(unescape(encodeURIComponent(file.content))),
                encoding: 'base64',
              }),
            });
            if (!blobRes.ok) throw new Error(`Failed blob creation for ${file.path}`);
            const blobData = await blobRes.json();

            return {
              path: file.path,
              mode: '100644',
              type: 'blob',
              sha: blobData.sha,
            };
          })
        );

        // 2. Create Tree
        const treeRes = await this.fetchWithRetry(`${this.baseUrl}/git/trees`, {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify({
            base_tree: baseTreeSha,
            tree: treeItems,
          }),
        });
        if (!treeRes.ok) throw new Error(`Failed to create git tree: ${treeRes.statusText}`);
        const treeData = await treeRes.json();

        // 3. Create Commit
        const newCommitRes = await this.fetchWithRetry(`${this.baseUrl}/git/commits`, {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify({
            message: commitMessage,
            tree: treeData.sha,
            parents: [baseCommitSha],
            ...(authorTimestamp
              ? {
                  author: {
                    name: this.config.username,
                    email: `${this.config.username}@users.noreply.github.com`,
                    date: authorTimestamp,
                  },
                  committer: {
                    name: this.config.username,
                    email: `${this.config.username}@users.noreply.github.com`,
                    date: authorTimestamp,
                  },
                }
              : {}),
          }),
        });

        if (!newCommitRes.ok) throw new Error(`Failed to create commit: ${newCommitRes.statusText}`);
        const newCommitData = await newCommitRes.json();

        // 4. Update Reference
        await this.updateBranchRef(newCommitData.sha, branch);

        return {
          success: true,
          commitSha: newCommitData.sha,
          commitUrl: `${this.baseUrl.replace('api.github.com/repos', 'github.com')}/commit/${newCommitData.sha}`,
        };
      } catch (err: any) {
        console.warn(`[LeetLogger Git] Commit attempt ${attempt} failed:`, err.message || err);
        this.lastCommitSha = null;
        this.lastTreeSha = null;

        if (attempt === retries) {
          return {
            success: false,
            error: err.message || 'Commit execution failed.',
          };
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs *= 1.5;
      }
    }

    return { success: false, error: 'Commit failed after maximum retries.' };
  }

  /**
   * Updates target branch reference to point directly to a commit SHA.
   */
  public async updateBranchRef(commitSha: string, branchName?: string): Promise<boolean> {
    const target = branchName || this.config.branch || 'main';
    const updateRefRes = await this.fetchWithRetry(`${this.baseUrl}/git/refs/heads/${target}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify({
        sha: commitSha,
        force: true,
      }),
    });
    if (!updateRefRes.ok) {
      throw new Error(`Failed to update branch ref '${target}' to ${commitSha}: ${updateRefRes.statusText}`);
    }
    if (!branchName || branchName === this.config.branch) {
      this.lastCommitSha = commitSha;
    }
    return true;
  }

  /**
   * Resilient HTTP fetcher with rate limit sensing and exponential backoff retry.
   */
  private async fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
    let delay = 1000;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await fetch(url, options);
        if (res.status === 403 || res.status === 429) {
          const retryAfter = res.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : delay;
          console.warn(`[LeetLogger Git] Rate limit hit (${res.status}). Waiting ${waitTime}ms before retry...`);
          await new Promise((r) => setTimeout(r, waitTime));
          delay *= 2;
          continue;
        }
        return res;
      } catch (err) {
        if (attempt === retries) throw err;
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
      }
    }
    return fetch(url, options);
  }

  /**
   * Commits an array of items in an efficient Git commit chain.
   * Reuses base tree and parent commit references, deferring branch ref updates
   * until the end of the batch (or periodically) to bypass GitHub secondary rate limits.
   */
  public async commitBatchChain(
    items: IBatchCommitItem[],
    onProgress?: (completed: number, total: number, lastCommitSha?: string) => Promise<void> | void,
    targetBranch?: string
  ): Promise<IBatchCommitResult> {
    if (!items || items.length === 0) {
      return { success: true, totalItems: 0, committedCount: 0 };
    }

    const branch = targetBranch || this.config.branch || 'main';
    let { commitSha: currentCommitSha, treeSha: currentTreeSha } = await this.getHeadCommit(branch);
    let committedCount = 0;
    const REF_SYNC_INTERVAL = 10;

    try {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // 1. Create Blobs for the item's files
        const treeItems = await Promise.all(
          item.files.map(async (file) => {
            const blobRes = await this.fetchWithRetry(`${this.baseUrl}/git/blobs`, {
              method: 'POST',
              headers: this.headers,
              body: JSON.stringify({
                content: btoa(unescape(encodeURIComponent(file.content))),
                encoding: 'base64',
              }),
            });
            if (!blobRes.ok) throw new Error(`Failed blob creation for ${file.path}`);
            const blobData = await blobRes.json();
            return {
              path: file.path,
              mode: '100644',
              type: 'blob',
              sha: blobData.sha,
            };
          })
        );

        await new Promise((r) => setTimeout(r, 80));

        // 2. Create Tree layered on top of current tree
        const treeRes = await this.fetchWithRetry(`${this.baseUrl}/git/trees`, {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify({
            base_tree: currentTreeSha,
            tree: treeItems,
          }),
        });
        if (!treeRes.ok) throw new Error(`Failed to create git tree: ${treeRes.statusText}`);
        const treeData = await treeRes.json();

        // 3. Create Commit parented to current commit
        const newCommitRes = await this.fetchWithRetry(`${this.baseUrl}/git/commits`, {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify({
            message: item.message,
            tree: treeData.sha,
            parents: [currentCommitSha],
            ...(item.authorTimestamp
              ? {
                  author: {
                    name: this.config.username,
                    email: `${this.config.username}@users.noreply.github.com`,
                    date: item.authorTimestamp,
                  },
                  committer: {
                    name: this.config.username,
                    email: `${this.config.username}@users.noreply.github.com`,
                    date: item.authorTimestamp,
                  },
                }
              : {}),
          }),
        });
        if (!newCommitRes.ok) throw new Error(`Failed to create commit: ${newCommitRes.statusText}`);
        const newCommitData = await newCommitRes.json();

        currentCommitSha = newCommitData.sha;
        currentTreeSha = treeData.sha;
        committedCount++;

        // Periodic ref checkpoint update
        if (committedCount % REF_SYNC_INTERVAL === 0) {
          await this.updateBranchRef(currentCommitSha, branch);
        }

        if (onProgress) {
          await onProgress(committedCount, items.length, currentCommitSha);
        }

        await new Promise((r) => setTimeout(r, 120));
      }

      // Final ref update
      await this.updateBranchRef(currentCommitSha, branch);
      if (!targetBranch || targetBranch === this.config.branch) {
        this.lastCommitSha = currentCommitSha;
        this.lastTreeSha = currentTreeSha;
      }

      return {
        success: true,
        totalItems: items.length,
        committedCount,
        finalCommitSha: currentCommitSha,
      };
    } catch (err: any) {
      console.error('[LeetLogger Git] Error during commitBatchChain:', err);
      if (committedCount > 0 && currentCommitSha) {
        try {
          await this.updateBranchRef(currentCommitSha, branch);
        } catch (syncErr) {
          console.error('[LeetLogger Git] Failed to sync ref after partial batch:', syncErr);
        }
      }
      return {
        success: false,
        totalItems: items.length,
        committedCount,
        finalCommitSha: currentCommitSha,
        error: err.message || 'Batch commit chain failed.',
      };
    }
  }
}
