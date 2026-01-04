declare global {
  interface Env {
    ASSETS: Fetcher;
    DB: D1Database;
    STORAGE: R2Bucket;
    KV_CACHE: KVNamespace;
    KV_SESSIONS: KVNamespace;
  }
}

export {};
