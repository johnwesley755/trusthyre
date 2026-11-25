import { describe, it, expect, beforeEach } from 'bun:test';
import { cacheService } from '../src/services/cache/cacheService';
import { NoopCacheProvider } from '../src/services/cache/providers/NoopCacheProvider';
import { MemoryCacheProvider } from '../src/services/cache/providers/MemoryCacheProvider';
import { CacheKeys, hashFilters } from '../src/services/cache/cacheKeys';
import { CacheTTL } from '../src/services/cache/cacheTTL';

describe('Cache Abstraction Layer Tests', () => {
  beforeEach(() => {
    cacheService.resetMetrics();
  });

  it('1. NoopCacheProvider always returns null and ignores writes without throwing', async () => {
    const noop = new NoopCacheProvider();
    cacheService.setProvider(noop);

    expect(cacheService.getProviderName()).toBe('noop');

    await cacheService.set('test-key', { data: 'sample' }, 60);
    const result = await cacheService.get('test-key');
    expect(result).toBeNull();

    let dbCallCount = 0;
    const loaded = await cacheService.getOrLoad('test-key-2', 60, async () => {
      dbCallCount++;
      return { id: 123, status: 'OPEN' };
    });

    expect(loaded).toEqual({ id: 123, status: 'OPEN' });
    expect(dbCallCount).toBe(1);

    // Calling again with noop executes loader again (pure DB passthrough)
    const secondCall = await cacheService.getOrLoad('test-key-2', 60, async () => {
      dbCallCount++;
      return { id: 123, status: 'OPEN' };
    });
    expect(dbCallCount).toBe(2);
    expect(secondCall).toEqual({ id: 123, status: 'OPEN' });
  });

  it('2. MemoryCacheProvider caches items, honors TTL, and handles deletion', async () => {
    const mem = new MemoryCacheProvider();
    cacheService.setProvider(mem);

    expect(cacheService.getProviderName()).toBe('memory');

    let loaderHits = 0;
    const testLoader = async () => {
      loaderHits++;
      return { title: 'Senior Electrician', city: 'Chennai' };
    };

    // First call: cache miss, executes loader
    const res1 = await cacheService.getOrLoad('job:100', 10, testLoader);
    expect(res1).toEqual({ title: 'Senior Electrician', city: 'Chennai' });
    expect(loaderHits).toBe(1);

    // Second call: cache hit, loader NOT executed
    const res2 = await cacheService.getOrLoad('job:100', 10, testLoader);
    expect(res2).toEqual({ title: 'Senior Electrician', city: 'Chennai' });
    expect(loaderHits).toBe(1);

    // Delete key
    await cacheService.delete('job:100');
    const res3 = await cacheService.get('job:100');
    expect(res3).toBeNull();

    // After deletion, loader executes again
    await cacheService.getOrLoad('job:100', 10, testLoader);
    expect(loaderHits).toBe(2);
  });

  it('3. CacheKeys and filter hashing generate deterministic, collision-resistant keys', () => {
    const filtersA = { city: 'Chennai', trade: 'Electrician', page: '1' };
    const filtersB = { trade: 'Electrician', city: 'Chennai', page: '1' };

    const hashA = hashFilters(filtersA);
    const hashB = hashFilters(filtersB);

    // Key order should not affect the deterministic hash
    expect(hashA).toBe(hashB);
    expect(hashA.length).toBe(32); // 32-character SHA-256 digest

    const key = CacheKeys.jobSearch(hashA, 1, 15);
    expect(key).toBe(`trusthyre:v1:jobs:search:${hashA}:1:15`);
    expect(CacheTTL.jobSearch).toBe(45);
  });

  it('4. getOrLoad prevents cache stampede by collapsing concurrent identical misses into one execution', async () => {
    const mem = new MemoryCacheProvider();
    cacheService.setProvider(mem);

    let loaderExecutions = 0;
    const slowLoader = async () => {
      loaderExecutions++;
      await new Promise(resolve => setTimeout(resolve, 50));
      return { data: 'stampede-proof' };
    };

    // Fire 5 concurrent requests for the same un-cached key
    const results = await Promise.all([
      cacheService.getOrLoad('stampede-test-key', 60, slowLoader),
      cacheService.getOrLoad('stampede-test-key', 60, slowLoader),
      cacheService.getOrLoad('stampede-test-key', 60, slowLoader),
      cacheService.getOrLoad('stampede-test-key', 60, slowLoader),
      cacheService.getOrLoad('stampede-test-key', 60, slowLoader),
    ]);

    // All requests should return identical results, but the loader must execute only ONCE
    expect(loaderExecutions).toBe(1);
    results.forEach(res => {
      expect(res).toEqual({ data: 'stampede-proof' });
    });
  });

  it('5. MemoryCacheProvider enforces LRU capacity eviction and rejects negative TTL', async () => {
    const mem = new MemoryCacheProvider(2); // Capacity of 2 items
    cacheService.setProvider(mem);

    await cacheService.set('key1', 'val1', 60);
    await cacheService.set('key2', 'val2', 60);

    // Access key1 so key2 becomes the least recently used
    await cacheService.get('key1');

    // Add key3 -> should evict key2, keeping key1 and key3
    await cacheService.set('key3', 'val3', 60);

    expect(await cacheService.get('key1')).toBe('val1');
    expect(await cacheService.get('key2')).toBeNull(); // Evicted by LRU
    expect(await cacheService.get('key3')).toBe('val3');

    // Reject <= 0 TTL without crashing
    await cacheService.set('negative-ttl', 'bad', -5);
    expect(await cacheService.get('negative-ttl')).toBeNull();
  });
});
