export interface CacheProvider {
  readonly name: string;
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  delete(key: string | string[]): Promise<void>;
  clear(): Promise<void>;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  errors: number;
  writes: number;
}
