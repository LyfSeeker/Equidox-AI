"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import LoginPanel from "@/components/LoginPanel";
import { useAuth } from "@/context/AuthContext";
import { isAdminUser, loadTokens, parseJwtPayload } from "@/lib/keycloak";
import { homePathForRole } from "@/lib/authRedirect";

export default function AdminClient() {
  const { login, logout, isAuthenticated, loading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuthenticated && isAdmin) {
      router.replace(homePathForRole(true));
    }
  }, [loading, isAuthenticated, isAdmin, router]);

  if (loading) {
    return (
      <div className="h-full w-full min-h-screen flex items-center justify-center bg-crucible-bg text-[10px] uppercase tracking-widest text-zinc-500">
        Checking session…
      </div>
    );
  }

  if (isAuthenticated && isAdmin) {
    return (
      <div className="h-full w-full min-h-screen flex items-center justify-center bg-crucible-bg text-[10px] uppercase tracking-widest text-zinc-500">
        Redirecting…
      </div>
    );
  }

  return (
    <LoginPanel
      usernamePlaceholder="admin"
      defaultUsername="admin"
      defaultPassword="admin"
      onSubmit={async (username, password) => {
        await login(username, password);
        const tokens = loadTokens();
        const payload = tokens ? parseJwtPayload(tokens.accessToken) : null;
        if (!isAdminUser(payload)) {
          await logout();
          throw new Error("This page is for Equidox admins only");
        }
        router.replace(homePathForRole(true));
      }}
    />
  );
}
