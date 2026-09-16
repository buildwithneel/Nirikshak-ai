/**
 * NIRIKSHAK AI — Field Resilience & Offline Synchronization Service
 * Manages queued offline actions, auto-sync upon reconnection,
 * and resilient network status awareness for field officers.
 */

export interface SyncQueueItem {
  id: string;
  type: 'OBSERVATION' | 'VERIFICATION_DRAFT' | 'COMPLAINT_DRAFT';
  entityId: string;
  payload: any;
  timestamp: string;
  retryCount: number;
}

export type SyncListener = (status: {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncTime: string | null;
}) => void;

class SyncService {
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isSyncing: boolean = false;
  private lastSyncTime: string | null = null;
  private listeners: Set<SyncListener> = new Set();
  private storageKey: string = 'nirikshak_offline_sync_queue';

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.notifyListeners();
        this.triggerSync();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.notifyListeners();
      });
    }
  }

  public getStatus() {
    return {
      isOnline: this.isOnline,
      pendingCount: this.getQueue().length,
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
    };
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    const status = this.getStatus();
    this.listeners.forEach(fn => {
      try {
        fn(status);
      } catch (e) {
        console.error('Error in sync listener:', e);
      }
    });
  }

  public getQueue(): SyncQueueItem[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveQueue(queue: SyncQueueItem[]) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(queue));
      this.notifyListeners();
    } catch (e) {
      console.error('Failed to persist sync queue:', e);
    }
  }

  public enqueueAction(type: SyncQueueItem['type'], entityId: string, payload: any): string {
    const queue = this.getQueue();
    const id = `sync-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const item: SyncQueueItem = {
      id,
      type,
      entityId,
      payload,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };
    queue.push(item);
    this.saveQueue(queue);

    // If online, immediately try to flush
    if (this.isOnline) {
      this.triggerSync();
    }
    return id;
  }

  public async triggerSync(): Promise<void> {
    if (!this.isOnline || this.isSyncing) return;

    const queue = this.getQueue();
    if (queue.length === 0) return;

    this.isSyncing = true;
    this.notifyListeners();

    const remainingItems: SyncQueueItem[] = [];

    for (const item of queue) {
      try {
        const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        let url = '';
        let method = 'POST';

        if (item.type === 'OBSERVATION') {
          url = `/api/inspections/${item.entityId}/observations`;
        } else if (item.type === 'VERIFICATION_DRAFT') {
          url = `/api/inspections/${item.entityId}/verify`;
        } else if (item.type === 'COMPLAINT_DRAFT') {
          url = '/api/complaints';
        }

        if (url) {
          const res = await fetch(url, {
            method,
            headers,
            body: JSON.stringify(item.payload),
          });
          if (!res.ok && res.status >= 500) {
            // Server error: retry later
            item.retryCount += 1;
            remainingItems.push(item);
          }
        }
      } catch {
        // Network failure during request
        item.retryCount += 1;
        remainingItems.push(item);
      }
    }

    this.saveQueue(remainingItems);
    this.isSyncing = false;
    this.lastSyncTime = new Date().toLocaleTimeString();
    this.notifyListeners();
  }
}

export const syncService = new SyncService();
