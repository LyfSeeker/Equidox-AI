"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LoginPanel from "@/components/LoginPanel";
import { useAuth } from "@/context/AuthContext";
import { isAdminUser, loadTokens, parseJwtPayload } from "@/lib/keycloak";
import { resolvePostLoginPath } from "@/lib/authRedirect";

export default function LoginClient() {
  const { login, isAuthenticated, loading, isAdmin } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace(resolvePostLoginPath(nextParam, isAdmin));
    }
  }, [loading, isAuthenticated, isAdmin, router, nextParam]);

  if (loading || isAuthenticated) {
    return (
      <div className="h-full w-full min-h-screen flex items-center justify-center bg-crucible-bg text-[10px] uppercase tracking-widest text-zinc-500">
        Checking session…
      </div>
    );
  }

  return (
    <LoginPanel
      usernamePlaceholder="demo"
      onSubmit={async (username, password) => {
        await login(username, password);
        const tokens = loadTokens();
        const payload = tokens ? parseJwtPayload(tokens.accessToken) : null;
        router.replace(resolvePostLoginPath(nextParam, isAdminUser(payload)));
      }}
    />
  );
}
