import { CacheProvider } from '../cache.types';

interface MemoryCacheEntry {
  value: any;
  expiresAt: number;
}

/**
 * In-memory cache provider for local unit testing and development.
 * Automatically enforces TTL expiration and item capacity.
 */
export class MemoryCacheProvider implements CacheProvider {
  readonly name = 'memory';
  private store = new Map<string, MemoryCacheEntry>();
  private readonly maxItems: number;

  constructor(maxItems = 1000) {
    this.maxItems = maxItems;
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (this.store.size >= this.maxItems) {
      // Evict oldest inserted entry
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) this.store.delete(oldestKey);
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000
    });
  }

  async delete(key: string | string[]): Promise<void> {
    if (Array.isArray(key)) {
      key.forEach(k => this.store.delete(k));
    } else {
      this.store.delete(key);
    }
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}
