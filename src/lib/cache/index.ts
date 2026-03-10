const CACHE: Record<string, { data: unknown; ts: number }> = {};
const TTL = 30_000;

export const qc = {
  get<T>(key: string): T | null {
    const e = CACHE[key];
    if (!e || Date.now() - e.ts > TTL) {
      delete CACHE[key];
      return null;
    }
    return e.data as T;
  },
  set<T>(key: string, data: T): void {
    CACHE[key] = { data, ts: Date.now() };
  },
  bust(prefix: string): void {
    Object.keys(CACHE).forEach((k) => {
      if (k.startsWith(prefix)) delete CACHE[k];
    });
  },
};
