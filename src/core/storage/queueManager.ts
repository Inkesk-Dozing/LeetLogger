import { StorageManager } from './storageManager';
import { IQueuedItem, ISubmissionPayload } from '../types';

export class QueueManager {
  /**
   * Enqueues a failed submission for retry.
   */
  public static async enqueue(payload: ISubmissionPayload, errorMsg?: string): Promise<void> {
    const storage = await StorageManager.getStorage();
    const queue = storage.queue || [];

    // Avoid duplicate queue entries for same submission ID
    const existingIndex = queue.findIndex((item) => item.payload.id === payload.id);
    if (existingIndex >= 0) {
      queue[existingIndex].retryCount += 1;
      queue[existingIndex].lastError = errorMsg;
    } else {
      const newItem: IQueuedItem = {
        id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        payload,
        addedAt: Date.now(),
        retryCount: 0,
        lastError: errorMsg,
      };
      queue.push(newItem);
    }

    await StorageManager.setStorage({ queue });
  }

  /**
   * Dequeues an item by ID after successful sync.
   */
  public static async dequeue(queueItemId: string): Promise<void> {
    const storage = await StorageManager.getStorage();
    const queue = (storage.queue || []).filter((item) => item.id !== queueItemId);
    await StorageManager.setStorage({ queue });
  }

  /**
   * Gets all pending queued items.
   */
  public static async getQueue(): Promise<IQueuedItem[]> {
    const storage = await StorageManager.getStorage();
    return storage.queue || [];
  }
}
