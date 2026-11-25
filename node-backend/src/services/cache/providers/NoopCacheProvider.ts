import { CacheProvider } from '../cache.types';

/**
 * No-op cache provider for zero-overhead, pure PostgreSQL passthrough.
 * Used as the default provider prior to distributed Redis activation.
 */
export class NoopCacheProvider implements CacheProvider {
  readonly name = 'noop';

  async get<T>(_key: string): Promise<T | null> {
    return null;
  }

  async set<T>(_key: string, _value: T, _ttlSeconds: number): Promise<void> {
    // No-op
  }

  async delete(_key: string | string[]): Promise<void> {
    // No-op
  }

  async clear(): Promise<void> {
    // No-op
  }
}
