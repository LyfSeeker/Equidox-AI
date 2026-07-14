/**
 * Simple in-memory TTL cache for GitHub / docs fetches.
 */
const store = new Map();

export function cacheGet(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export function cacheSet(key, value, ttlMs = 5 * 60 * 1000) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

export async function cacheWrap(key, ttlMs, fn) {
  const hit = cacheGet(key);
  if (hit != null) return hit;
  const value = await fn();
  return cacheSet(key, value, ttlMs);
}
