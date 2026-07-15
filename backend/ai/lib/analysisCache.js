import { createHash } from "crypto";
import { cacheGet, cacheSet } from "../../src/services/cache.js";

const DEFAULT_TTL = 30 * 60 * 1000;

function hashKey(prefix, payload) {
  const h = createHash("sha256")
    .update(typeof payload === "string" ? payload : JSON.stringify(payload))
    .digest("hex")
    .slice(0, 24);
  return `ai:${prefix}:${h}`;
}

/**
 * Analysis cache for expensive summaries / full reports.
 * Keys by evidence fingerprint so unchanged repos skip repeat LLM cost.
 */
export const analysisCache = {
  get(prefix, payload) {
    return cacheGet(hashKey(prefix, payload));
  },
  set(prefix, payload, value, ttlMs = DEFAULT_TTL) {
    return cacheSet(hashKey(prefix, payload), value, ttlMs);
  },
  wrap(prefix, payload, ttlMs, fn) {
    const hit = analysisCache.get(prefix, payload);
    if (hit != null) return Promise.resolve({ cached: true, value: hit });
    return Promise.resolve(fn()).then((value) => {
      analysisCache.set(prefix, payload, value, ttlMs);
      return { cached: false, value };
    });
  },
};
