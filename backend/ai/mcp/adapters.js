/**
 * MCP preparation layer.
 *
 * Design: each adapter exposes the same async interface.
 * Prefer MCP when a client is injected; otherwise fall back to REST/local.
 *
 * Future wiring:
 *   registerMcpClient('github', mcpGithubClient)
 *   adapters.github.getRepo(...) uses MCP if present
 */

const mcpClients = new Map();

export function registerMcpClient(name, client) {
  mcpClients.set(name, client);
}

export function getMcpClient(name) {
  return mcpClients.get(name) || null;
}

export function listMcpClients() {
  return [...mcpClients.keys()];
}

async function withFallback(name, mcpMethod, restFn) {
  const client = getMcpClient(name);
  if (client && typeof client[mcpMethod] === "function") {
    return client[mcpMethod]();
  }
  return restFn();
}

export const mcpAdapters = {
  github: {
    async getRepoEvidence(fetcher) {
      return withFallback("github", "getRepoEvidence", fetcher);
    },
  },
  filesystem: {
    async readTree(fetcher) {
      return withFallback("filesystem", "readTree", fetcher);
    },
  },
  postgres: {
    async query(fetcher) {
      return withFallback("postgres", "query", fetcher);
    },
  },
  browser: {
    async fetchPage(fetcher) {
      return withFallback("browser", "fetchPage", fetcher);
    },
  },
  git: {
    async log(fetcher) {
      return withFallback("git", "log", fetcher);
    },
  },
};

export default mcpAdapters;
