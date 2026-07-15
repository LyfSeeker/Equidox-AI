"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { homePathForRole } from "@/lib/authRedirect";

/**
 * Root entry: unauthenticated users go to sign-in;
 * signed-in users go to their role home (admin → dashboard, user → submit).
 */
export default function RootEntry() {
  const { isAuthenticated, loading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    router.replace(homePathForRole(isAdmin));
  }, [loading, isAuthenticated, isAdmin, router]);

  return (
    <div className="h-full w-full min-h-screen flex items-center justify-center bg-crucible-bg text-[10px] uppercase tracking-widest text-zinc-500">
      {loading ? "Checking session…" : "Redirecting…"}
    </div>
  );
}
