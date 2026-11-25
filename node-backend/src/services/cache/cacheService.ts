import { CacheProvider, CacheMetrics } from './cache.types';
import { NoopCacheProvider } from './providers/NoopCacheProvider';
import { MemoryCacheProvider } from './providers/MemoryCacheProvider';

/**
 * Centralized Application Cache Service.
 * Manages provider lifecycle, telemetry, in-flight stampede suppression,
 * generation-based race protection, and error-suppressed getOrLoad execution.
 */
class CacheService {
  private provider: CacheProvider;
  private inFlightLoaders = new Map<string, Promise<any>>();
  private keyGenerations = new Map<string, number>();
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    errors: 0,
    writes: 0
  };

  constructor() {
    // In test environment or when explicit memory cache is requested (and NOT in production)
    const isProduction = process.env.NODE_ENV === 'production';
    if (!isProduction && (process.env.NODE_ENV === 'test' || process.env.USE_MEMORY_CACHE === 'true')) {
      this.provider = new MemoryCacheProvider();
    } else {
      this.provider = new NoopCacheProvider();
    }
  }

  /**
   * Sanitizes a cache key for safe logging (strips personal IDs and complex hashes).
   */
  private sanitizeKey(key: string): string {
    const parts = key.split(':');
    if (parts.length <= 3) return key;
    return `${parts.slice(0, 3).join(':')}:***`;
  }

  /**
   * Allows hot-swapping provider (e.g. for testing or future Redis provider activation).
   */
  setProvider(provider: CacheProvider) {
    this.provider = provider;
  }

  getProviderName(): string {
    return this.provider.name;
  }

  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  resetMetrics() {
    this.metrics = { hits: 0, misses: 0, errors: 0, writes: 0 };
    this.inFlightLoaders.clear();
    this.keyGenerations.clear();
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const val = await this.provider.get<T>(key);
      if (val !== null && val !== undefined) {
        this.metrics.hits++;
        return val;
      }
      this.metrics.misses++;
      return null;
    } catch (err: any) {
      this.metrics.errors++;
      console.warn(`[CacheService] Provider get error for namespace "${this.sanitizeKey(key)}":`, err?.message || err);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      await this.provider.set(key, value, ttlSeconds);
      this.metrics.writes++;
    } catch (err: any) {
      this.metrics.errors++;
      console.warn(`[CacheService] Provider set error for namespace "${this.sanitizeKey(key)}":`, err?.message || err);
    }
  }

  async delete(key: string | string[]): Promise<void> {
    try {
      const keys = Array.isArray(key) ? key : [key];
      // Advance generation for invalidated keys to prevent in-flight loaders from caching stale data
      for (const k of keys) {
        this.keyGenerations.set(k, (this.keyGenerations.get(k) || 0) + 1);
      }
      await this.provider.delete(key);
    } catch (err: any) {
      this.metrics.errors++;
      console.warn(`[CacheService] Provider delete error:`, err?.message || err);
    }
  }

  async clear(): Promise<void> {
    try {
      this.keyGenerations.clear();
      await this.provider.clear();
    } catch (err: any) {
      this.metrics.errors++;
    }
  }

  /**
   * Transparent cache-aside helper with in-flight stampede and race protection:
   * 1. Attempts to fetch from cache.
   * 2. On miss, collapses concurrent identical requests onto a single in-flight loader promise.
   * 3. Records starting key generation; if key is invalidated while loader runs, drops stale write.
   */
  async getOrLoad<T>(
    key: string,
    ttlSeconds: number,
    loader: () => Promise<T>
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    // Cache stampede prevention: check if an identical loader is already running
    const existingPromise = this.inFlightLoaders.get(key);
    if (existingPromise) {
      return existingPromise as Promise<T>;
    }

    const startGen = this.keyGenerations.get(key) || 0;

    const loaderPromise = (async () => {
      try {
        const loaded = await loader();
        const currentGen = this.keyGenerations.get(key) || 0;
        // Invalidation race protection: only write back if the key was NOT invalidated while loading
        if (currentGen === startGen && loaded !== null && loaded !== undefined) {
          await this.set(key, loaded, ttlSeconds);
        }
        return loaded;
      } finally {
        this.inFlightLoaders.delete(key);
      }
    })();

    this.inFlightLoaders.set(key, loaderPromise);
    return loaderPromise;
  }
}

export const cacheService = new CacheService();
