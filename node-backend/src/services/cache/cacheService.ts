import { CacheProvider, CacheMetrics } from './cache.types';
import { NoopCacheProvider } from './providers/NoopCacheProvider';
import { MemoryCacheProvider } from './providers/MemoryCacheProvider';

/**
 * Centralized Application Cache Service.
 * Manages provider lifecycle, telemetry, and error-suppressed getOrLoad execution.
 */
class CacheService {
  private provider: CacheProvider;
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    errors: 0,
    writes: 0
  };

  constructor() {
    // In test environment or when explicit memory cache is requested, use MemoryCacheProvider
    if (process.env.NODE_ENV === 'test' || process.env.USE_MEMORY_CACHE === 'true') {
      this.provider = new MemoryCacheProvider();
    } else {
      this.provider = new NoopCacheProvider();
    }
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
    } catch (err) {
      this.metrics.errors++;
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      await this.provider.set(key, value, ttlSeconds);
      this.metrics.writes++;
    } catch (err) {
      this.metrics.errors++;
    }
  }

  async delete(key: string | string[]): Promise<void> {
    try {
      await this.provider.delete(key);
    } catch (err) {
      this.metrics.errors++;
    }
  }

  async clear(): Promise<void> {
    try {
      await this.provider.clear();
    } catch (err) {
      this.metrics.errors++;
    }
  }

  /**
   * Transparent cache-aside helper:
   * 1. Attempts to fetch from cache.
   * 2. On miss or provider error, executes loader().
   * 3. Stores loaded result asynchronously and returns.
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

    const loaded = await loader();
    if (loaded !== null && loaded !== undefined) {
      await this.set(key, loaded, ttlSeconds);
    }
    return loaded;
  }
}

export const cacheService = new CacheService();
