"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LoginPanel from "@/components/LoginPanel";
import { useAuth } from "@/context/AuthContext";

function safeNext(raw: string | null): string {
  if (
    !raw ||
    !raw.startsWith("/") ||
    raw.startsWith("//") ||
    raw.startsWith("/login") ||
    raw.startsWith("/admin")
  ) {
    return "/dashboard";
  }
  return raw;
}

export default function LoginClient() {
  const { login, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNext(searchParams.get("next"));

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace(nextPath);
    }
  }, [loading, isAuthenticated, router, nextPath]);

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
      footerHint="Demo · demo / demo · Keycloak realm equidox"
      onSubmit={async (username, password) => {
        await login(username, password);
        router.replace(nextPath);
      }}
    />
  );
}
