"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useWallet } from "@/context/WalletContext";
import { Wallet } from "lucide-react";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { address } = useWallet();
  const isPublicAuth =
    pathname === "/login" || pathname === "/admin" || pathname === "/";

  useEffect(() => {
    if (loading || isPublicAuth || isAuthenticated) return;

    const next = `${pathname}${window.location.search}`;
    router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [loading, isPublicAuth, isAuthenticated, pathname, router]);

  if (isPublicAuth) return <>{children}</>;

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-transparent text-[10px] uppercase tracking-widest text-zinc-500">
        Authenticating…
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-transparent text-[10px] uppercase tracking-widest text-zinc-500">
        Redirecting to login…
      </div>
    );
  }

  if (!address) {
    return (
      <div className="h-full w-full flex flex-col gap-4 items-center justify-center bg-transparent text-zinc-500">
        <Wallet className="w-12 h-12 text-crucible-gold opacity-50 mb-2" />
        <div className="text-[10px] uppercase tracking-widest font-bold">
          Wallet Connection Required
        </div>
        <div className="text-sm max-w-sm text-center text-zinc-400">
          Please connect your Stellar wallet using the button in the top right corner to access this application.
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
