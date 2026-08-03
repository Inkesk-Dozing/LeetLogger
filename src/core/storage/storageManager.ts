import { IExtensionStorage, IGitHubConfig, IExtensionStats, ISolvedProblemMetadata } from '../types';

const DEFAULT_STORAGE: IExtensionStorage = {
  stats: {
    totalSynced: 0,
    leetcodeCount: 0,
    gfgCount: 0,
  },
  queue: [],
  syncedSlugs: {},
  solvedProblems: {},
  autoSyncEnabled: true,
};

export class StorageManager {
  /**
   * Retrieves full extension storage state.
   */
  public static async getStorage(): Promise<IExtensionStorage> {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        // Passing null fetches the entire storage contents cleanly
        chrome.storage.local.get(null, (result) => {
          resolve({
            ...DEFAULT_STORAGE,
            ...result,
          } as IExtensionStorage);
        });
      } else {
        // Fallback for non-extension node/browser environments
        const local = localStorage.getItem('leetlogger_storage');
        resolve(local ? JSON.parse(local) : DEFAULT_STORAGE);
      }
    });
  }

  /**
   * Updates partial storage state.
   */
  public static async setStorage(data: Partial<IExtensionStorage>): Promise<void> {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set(data, () => resolve());
      } else {
        const current = localStorage.getItem('leetlogger_storage');
        const updated = { ...(current ? JSON.parse(current) : DEFAULT_STORAGE), ...data };
        localStorage.setItem('leetlogger_storage', JSON.stringify(updated));
        resolve();
      }
    });
  }

  /**
   * Saves GitHub Configuration.
   */
  public static async setGitConfig(config: IGitHubConfig): Promise<void> {
    await this.setStorage({ gitConfig: config });
  }

  /**
   * Retrieves GitHub Configuration.
   */
  public static async getGitConfig(): Promise<IGitHubConfig | undefined> {
    const storage = await this.getStorage();
    return storage.gitConfig;
  }

  /**
   * Increments synced statistics and records solved problem metadata.
   */
  public static async recordSyncSuccess(
    platform: string,
    titleSlug: string,
    commitSha: string,
    metadata?: { id: string; title: string; difficulty: string; topics: string[] }
  ): Promise<void> {
    const storage = await this.getStorage();
    
    // Only increment count if the slug is not already synced to prevent double increments on edit/re-sync
    const alreadySynced = !!storage.syncedSlugs[titleSlug];

    const leetcodeIncrement = (platform === 'leetcode' && !alreadySynced) ? 1 : 0;
    const gfgIncrement = (platform === 'gfg' && !alreadySynced) ? 1 : 0;
    const totalIncrement = !alreadySynced ? 1 : 0;

    const stats: IExtensionStats = {
      ...storage.stats,
      totalSynced: storage.stats.totalSynced + totalIncrement,
      leetcodeCount: storage.stats.leetcodeCount + leetcodeIncrement,
      gfgCount: storage.stats.gfgCount + gfgIncrement,
      lastSyncedTimestamp: Date.now(),
      lastSyncedProblem: titleSlug,
    };
    const syncedSlugs = { ...storage.syncedSlugs, [titleSlug]: commitSha };

    const solvedProblems = { ...(storage.solvedProblems || {}) };
    if (metadata) {
      solvedProblems[titleSlug] = {
        id: metadata.id,
        title: metadata.title,
        titleSlug,
        difficulty: metadata.difficulty,
        topics: metadata.topics,
        platform,
        timestamp: Date.now(),
      };
    }

    await this.setStorage({ stats, syncedSlugs, solvedProblems });
  }
}
