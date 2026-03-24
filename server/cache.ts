interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class TtlCache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs: number): void {
    this.store.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  invalidateByPrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }
}

export const cache = new TtlCache();

export const TTL = {
  DASHBOARD: 60_000,
  WARGA_LIST: 5 * 60_000,
  KK_LIST: 5 * 60_000,
  WARGA_WITH_KK: 5 * 60_000,
  NOMOR_KOSONG: 2 * 60_000,
} as const;

export const CacheKey = {
  dashboard: (rt?: number) => `dashboard:rt=${rt ?? "all"}`,
  wargaList: () => `warga:list`,
  kkList: () => `kk:list`,
  wargaWithKk: () => `warga-with-kk:list`,
  nomorKosong: () => `nomor-kosong:list`,
};

export function invalidateWarga(): void {
  cache.delete(CacheKey.wargaList());
  cache.delete(CacheKey.wargaWithKk());
  cache.delete(CacheKey.nomorKosong());
  cache.invalidateByPrefix("dashboard:");
}

export function invalidateKk(): void {
  cache.delete(CacheKey.kkList());
  cache.delete(CacheKey.wargaWithKk());
  cache.delete(CacheKey.nomorKosong());
  cache.invalidateByPrefix("dashboard:");
}
