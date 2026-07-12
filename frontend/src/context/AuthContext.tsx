"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  clearTokens,
  isAdminUser,
  isTokenExpiringSoon,
  loadTokens,
  loginWithPassword,
  logout as keycloakLogout,
  parseJwtPayload,
  refreshAccessToken,
  getRealmRoles,
  type KeycloakUser,
} from "@/lib/keycloak";

type AuthContextValue = {
  user: KeycloakUser | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  roles: string[];
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<KeycloakUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyTokens = useCallback((accessToken: string, expiresAt: number) => {
    const payload = parseJwtPayload(accessToken);
    setToken(accessToken);
    setUser(payload);
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    const delay = Math.max(5_000, expiresAt - Date.now() - 60_000);
    refreshTimer.current = setTimeout(() => {
      void (async () => {
        try {
          const tokens = await refreshAccessToken();
          applyTokens(tokens.accessToken, tokens.expiresAt);
        } catch {
          clearTokens();
          setToken(null);
          setUser(null);
        }
      })();
    }, delay);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = loadTokens();
        if (!stored) return;
        if (isTokenExpiringSoon(stored.expiresAt)) {
          const refreshed = await refreshAccessToken(stored.refreshToken);
          if (!cancelled) applyTokens(refreshed.accessToken, refreshed.expiresAt);
        } else if (!cancelled) {
          applyTokens(stored.accessToken, stored.expiresAt);
        }
      } catch {
        clearTokens();
        if (!cancelled) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [applyTokens]);

  const login = useCallback(
    async (username: string, password: string) => {
      const tokens = await loginWithPassword(username, password);
      applyTokens(tokens.accessToken, tokens.expiresAt);
    },
    [applyTokens]
  );

  const logout = useCallback(async () => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    await keycloakLogout();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(token && user),
      roles: getRealmRoles(user),
      isAdmin: isAdminUser(user),
      login,
      logout,
    }),
    [user, token, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
