import { IGitHubConfig, ICommitFile, ICommitResult, ICommitAuthor } from '../types/git';

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
      Authorization: `token ${this.config.accessToken}`,
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
          return { success: false, error: `Repository '${this.config.repository}' not found under '${this.config.username}'. You can create it using the setup options.` };
        }
        if (res.status === 401) {
          return { success: false, error: 'Invalid GitHub Personal Access Token or OAuth credentials.' };
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
  public static async createRepository(token: string, repoName: string): Promise<{ success: boolean; repoName?: string; error?: string }> {
    try {
      const url = 'https://api.github.com/user/repos';
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: repoName,
          private: true,
          auto_init: true,
          description: 'A collection of LeetCode and competitive programming solutions - Logged using LeetLogger',
          homepage: `https://github.com/Inkesk-Dozing/LeetLogger`,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        return { success: false, error: errData.message || `Failed to create repository: ${res.statusText}` };
      }

      const data = await res.json();
      return { success: true, repoName: data.name };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error creating repository.' };
    }
  }

  /**
   * Scans existing repository tree to map all file paths.
   */
  public async getExistingRepoTree(): Promise<Set<string>> {
    const paths = new Set<string>();
    try {
      const url = `${this.baseUrl}/git/trees/${this.config.branch}?recursive=1`;
      const res = await fetch(url, { headers: this.headers });
      if (res.ok) {
        const data = await res.json();
        if (data.tree && Array.isArray(data.tree)) {
          data.tree.forEach((item: { path: string }) => paths.add(item.path));
        }
      }
    } catch (err) {
      console.warn('Failed to fetch existing repo tree:', err);
    }
    return paths;
  }

  /**
   * Fetches latest commit SHA and base tree SHA for target branch.
   * Utilizes internal cache to bypass GitHub API replication lag during sequential commits.
   */
  private async getHeadCommit(): Promise<{ commitSha: string; treeSha: string }> {
    if (this.lastCommitSha && this.lastTreeSha) {
      return { commitSha: this.lastCommitSha, treeSha: this.lastTreeSha };
    }

    const refUrl = `${this.baseUrl}/git/ref/heads/${this.config.branch}`;
    const refRes = await fetch(refUrl, { headers: this.headers });
    if (!refRes.ok) {
      throw new Error(`Failed to fetch branch ref '${this.config.branch}': ${refRes.statusText}`);
    }
    const refData = await refRes.json();
    const commitSha = refData.object.sha;

    const commitUrl = `${this.baseUrl}/git/commits/${commitSha}`;
    const commitRes = await fetch(commitUrl, { headers: this.headers });
    if (!commitRes.ok) {
      throw new Error(`Failed to fetch commit '${commitSha}': ${commitRes.statusText}`);
    }
    const commitData = await commitRes.json();

    this.lastCommitSha = commitSha;
    this.lastTreeSha = commitData.tree.sha;

    return { commitSha, treeSha: commitData.tree.sha };
  }

  /**
   * Commits files to GitHub using Git Data API with optional custom backdated timestamp.
   * Employs transient locks retries and force updates to handle race-conditions robustly.
   */
  public async commitFiles(
    files: ICommitFile[],
    commitMessage: string,
    authorTimestamp?: string
  ): Promise<ICommitResult> {
    const retries = 3;
    let delayMs = 600;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const { commitSha: baseCommitSha, treeSha: baseTreeSha } = await this.getHeadCommit();

        // 1. Create Blobs for each file
        const treeItems = await Promise.all(
          files.map(async (file) => {
            const blobRes = await fetch(`${this.baseUrl}/git/blobs`, {
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
        const treeRes = await fetch(`${this.baseUrl}/git/trees`, {
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
        const newCommitRes = await fetch(`${this.baseUrl}/git/commits`, {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify({
            message: commitMessage,
            tree: treeData.sha,
            parents: [baseCommitSha],
            ...(authorTimestamp ? {
              author: { name: this.config.username, email: `${this.config.username}@users.noreply.github.com`, date: authorTimestamp },
              committer: { name: this.config.username, email: `${this.config.username}@users.noreply.github.com`, date: authorTimestamp }
            } : {})
          }),
        });

        if (!newCommitRes.ok) throw new Error(`Failed to create commit: ${newCommitRes.statusText}`);
        const newCommitData = await newCommitRes.json();

        // 4. Update Reference with force: true to prevent locks or replication delays
        const updateRefRes = await fetch(`${this.baseUrl}/git/refs/heads/${this.config.branch}`, {
          method: 'PATCH',
          headers: this.headers,
          body: JSON.stringify({
            sha: newCommitData.sha,
            force: true,
          }),
        });
        if (!updateRefRes.ok) throw new Error(`Failed to update branch ref: ${updateRefRes.statusText}`);

        // Update internal cache to chain successive commits correctly without querying GitHub again
        this.lastCommitSha = newCommitData.sha;
        this.lastTreeSha = treeData.sha;

        return {
          success: true,
          commitSha: newCommitData.sha,
          commitUrl: `${this.baseUrl.replace('api.github.com/repos', 'github.com')}/commit/${newCommitData.sha}`,
        };
      } catch (err: any) {
        console.warn(`[LeetLogger Git] Commit attempt ${attempt} failed:`, err.message || err);
        // Invalidate cache on failure to force refetch from GitHub
        this.lastCommitSha = null;
        this.lastTreeSha = null;

        if (attempt === retries) {
          return {
            success: false,
            error: err.message || 'Commit execution failed.',
          };
        }
        // Exponential back-off delay
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs *= 1.5;
      }
    }

    return { success: false, error: 'Commit failed after maximum retries.' };
  }
}
