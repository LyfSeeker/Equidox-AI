import { cacheGet, cacheSet } from "./cache.js";

function cleanText(raw) {
  return String(raw || "")
    .replace(/\r\n/g, "\n")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&\w+;/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim()
    .slice(0, 40_000);
}

/**
 * Fetch and clean documentation from URL or inline markdown/PDF text.
 */
export async function fetchDocumentation({
  docsUrl,
  markdownText,
  pdfText,
} = {}) {
  if (markdownText || pdfText) {
    return {
      source: markdownText ? "markdown" : "pdf",
      url: docsUrl || null,
      text: cleanText(markdownText || pdfText),
      cached: false,
    };
  }

  if (!docsUrl) {
    return { source: null, url: null, text: "", cached: false };
  }

  const key = `docs:${docsUrl}`;
  const hit = cacheGet(key);
  if (hit) return { ...hit, cached: true };

  try {
    const res = await fetch(docsUrl, {
      headers: { "User-Agent": "equidox-ai-docs", Accept: "text/*,*/*" },
      redirect: "follow",
    });
    if (!res.ok) {
      const miss = {
        source: "url",
        url: docsUrl,
        text: "",
        error: `HTTP ${res.status}`,
        cached: false,
      };
      return miss;
    }
    const contentType = res.headers.get("content-type") || "";
    const body = await res.text();
    const value = {
      source: contentType.includes("html") ? "html" : "url",
      url: docsUrl,
      text: cleanText(body),
      cached: false,
    };
    cacheSet(key, value, 10 * 60 * 1000);
    return value;
  } catch (err) {
    console.error("[docs] fetch failed:", err.message);
    return {
      source: "url",
      url: docsUrl,
      text: "",
      error: err.message,
      cached: false,
    };
  }
}
