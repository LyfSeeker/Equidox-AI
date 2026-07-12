import {
  KEYCLOAK_CLIENT_ID,
  KEYCLOAK_REALM,
  KEYCLOAK_URL,
} from "./config";

const ACCESS_TOKEN_KEY = "equidox_kc_access_token";
const REFRESH_TOKEN_KEY = "equidox_kc_refresh_token";
const EXPIRES_AT_KEY = "equidox_kc_expires_at";

export type KeycloakTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

export type KeycloakUser = {
  sub: string;
  preferred_username?: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  realm_access?: {
    roles?: string[];
  };
  resource_access?: Record<string, { roles?: string[] }>;
};

export function getRealmRoles(user: KeycloakUser | null | undefined): string[] {
  return user?.realm_access?.roles ?? [];
}

export function hasRealmRole(
  user: KeycloakUser | null | undefined,
  role: string
): boolean {
  return getRealmRoles(user).includes(role);
}

export function isAdminUser(user: KeycloakUser | null | undefined): boolean {
  if (hasRealmRole(user, "admin")) return true;
  // Fallback for tokens missing realm_access mapping
  return user?.preferred_username?.toLowerCase() === "admin";
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  error?: string;
  error_description?: string;
};

function tokenEndpoint() {
  return `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;
}

function logoutEndpoint() {
  return `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/logout`;
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

export function saveTokens(tokens: KeycloakTokens) {
  if (!canUseStorage()) return;
  sessionStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  sessionStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  sessionStorage.setItem(EXPIRES_AT_KEY, String(tokens.expiresAt));
}

export function clearTokens() {
  if (!canUseStorage()) return;
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(EXPIRES_AT_KEY);
}

export function loadTokens(): KeycloakTokens | null {
  if (!canUseStorage()) return null;
  const accessToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY);
  const expiresAtRaw = sessionStorage.getItem(EXPIRES_AT_KEY);
  if (!accessToken || !refreshToken || !expiresAtRaw) return null;
  return {
    accessToken,
    refreshToken,
    expiresAt: Number(expiresAtRaw),
  };
}

export function parseJwtPayload(token: string): KeycloakUser | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = atob(padded);
    return JSON.parse(json) as KeycloakUser;
  } catch {
    return null;
  }
}

async function parseTokenResponse(res: Response): Promise<KeycloakTokens> {
  const data = (await res.json()) as TokenResponse;
  if (!res.ok || data.error || !data.access_token) {
    throw new Error(
      data.error_description || data.error || "Authentication failed"
    );
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || "",
    expiresAt: Date.now() + (data.expires_in || 300) * 1000,
  };
}

export async function loginWithPassword(
  username: string,
  password: string
): Promise<KeycloakTokens> {
  const body = new URLSearchParams({
    grant_type: "password",
    client_id: KEYCLOAK_CLIENT_ID,
    username: username.trim(),
    password,
    scope: "openid profile email",
  });

  const res = await fetch(tokenEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const tokens = await parseTokenResponse(res);
  saveTokens(tokens);
  return tokens;
}

export async function refreshAccessToken(
  refreshToken?: string
): Promise<KeycloakTokens> {
  const existing = loadTokens();
  const token = refreshToken || existing?.refreshToken;
  if (!token) throw new Error("No refresh token");

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: KEYCLOAK_CLIENT_ID,
    refresh_token: token,
  });

  const res = await fetch(tokenEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const tokens = await parseTokenResponse(res);
  if (!tokens.refreshToken && existing?.refreshToken) {
    tokens.refreshToken = existing.refreshToken;
  }
  saveTokens(tokens);
  return tokens;
}

export async function logout(refreshToken?: string) {
  const existing = loadTokens();
  const token = refreshToken || existing?.refreshToken;
  clearTokens();

  if (!token) return;

  try {
    const body = new URLSearchParams({
      client_id: KEYCLOAK_CLIENT_ID,
      refresh_token: token,
    });
    await fetch(logoutEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  } catch {
    // Local session already cleared
  }
}

export function isTokenExpiringSoon(
  expiresAt: number,
  skewMs = 60_000
): boolean {
  return Date.now() >= expiresAt - skewMs;
}
