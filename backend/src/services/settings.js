/**
 * AI provider config — env only (no runtime UI).
 *
 * Set in backend/.env:
 *   AI_API_KEY=...              (Kimi / Moonshot or other OpenAI-compatible)
 *   AI_BASE_URL=https://api.moonshot.ai/v1
 *   AI_MODEL=kimi-k2.6
 *   AI_PROVIDER_ID=kimi
 *   AI_PROVIDER_NAME=Kimi
 *   AI_PRIMARY_PROVIDER=kimi|gemini|deepseek|openai
 *   GEMINI_API_KEY=...          (optional fallback)
 *   DEEPSEEK_API_KEY=...
 *   OPENAI_API_KEY=...
 *   GITHUB_TOKEN=...            (optional, raises GitHub rate limits)
 */

const BUILTIN = {
  gemini: {
    id: "gemini",
    name: "Gemini",
    type: "openai-compatible",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-2.5-flash",
  },
  deepseek: {
    id: "deepseek",
    name: "DeepSeek",
    type: "openai-compatible",
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-chat",
  },
  openai: {
    id: "openai",
    name: "OpenAI",
    type: "openai-compatible",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
  },
};

let cache = null;
let cacheAt = 0;
const CACHE_TTL_MS = 5_000;

function normalizeProvider(raw = {}) {
  return {
    id: String(raw.id || "").trim(),
    name: String(raw.name || "API").trim() || "API",
    type: "openai-compatible",
    baseUrl: String(raw.baseUrl || "")
      .trim()
      .replace(/\/$/, ""),
    model: String(raw.model || "").trim(),
    apiKey: String(raw.apiKey || "").trim(),
  };
}

function buildFromEnv() {
  const providers = [];

  if (process.env.GEMINI_API_KEY) {
    providers.push(
      normalizeProvider({
        ...BUILTIN.gemini,
        baseUrl: process.env.GEMINI_BASE_URL || BUILTIN.gemini.baseUrl,
        model: process.env.GEMINI_MODEL || BUILTIN.gemini.model,
        apiKey: process.env.GEMINI_API_KEY,
      })
    );
  }

  if (process.env.DEEPSEEK_API_KEY) {
    providers.push(
      normalizeProvider({
        ...BUILTIN.deepseek,
        baseUrl: process.env.DEEPSEEK_BASE_URL || BUILTIN.deepseek.baseUrl,
        model: process.env.DEEPSEEK_MODEL || BUILTIN.deepseek.model,
        apiKey: process.env.DEEPSEEK_API_KEY,
      })
    );
  }

  if (process.env.OPENAI_API_KEY) {
    providers.push(
      normalizeProvider({
        ...BUILTIN.openai,
        baseUrl: process.env.OPENAI_BASE_URL || BUILTIN.openai.baseUrl,
        model: process.env.OPENAI_MODEL || BUILTIN.openai.model,
        apiKey: process.env.OPENAI_API_KEY,
      })
    );
  }

  // Optional custom OpenAI-compatible gateway
  if (process.env.AI_API_KEY && process.env.AI_BASE_URL && process.env.AI_MODEL) {
    providers.push(
      normalizeProvider({
        id: process.env.AI_PROVIDER_ID || "custom",
        name: process.env.AI_PROVIDER_NAME || "Custom API",
        baseUrl: process.env.AI_BASE_URL,
        model: process.env.AI_MODEL,
        apiKey: process.env.AI_API_KEY,
      })
    );
  }

  const preferred = String(
    process.env.AI_PRIMARY_PROVIDER || "kimi"
  ).toLowerCase();
  let primaryProviderId =
    providers.find((p) => p.id === preferred)?.id ||
    providers.find((p) => p.apiKey)?.id ||
    providers[0]?.id ||
    "kimi";

  return {
    primaryProviderId,
    providers,
    githubToken: process.env.GITHUB_TOKEN || "",
  };
}

export async function getAiConfig({ bypassCache = false } = {}) {
  if (!bypassCache && cache && Date.now() - cacheAt < CACHE_TTL_MS) {
    return cache;
  }
  cache = buildFromEnv();
  cacheAt = Date.now();
  return cache;
}

export async function getPrimaryProvider() {
  const cfg = await getAiConfig();
  return (
    cfg.providers.find((p) => p.id === cfg.primaryProviderId) ||
    cfg.providers.find((p) => p.apiKey) ||
    null
  );
}

export async function getFallbackProviders() {
  const cfg = await getAiConfig();
  return cfg.providers.filter(
    (p) => p.id !== cfg.primaryProviderId && p.apiKey && p.baseUrl && p.model
  );
}

export async function getProviderById(id) {
  const cfg = await getAiConfig();
  return cfg.providers.find((p) => p.id === id) || null;
}

export function invalidateSettingsCache() {
  cache = null;
  cacheAt = 0;
}
