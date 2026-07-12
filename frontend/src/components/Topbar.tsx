"use client";

import { useEffect, useState } from "react";
import { User, Settings, Wallet, LogOut, Droplets } from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { api } from "@/lib/api";
import { shortAddress } from "@/lib/config";

export default function Topbar() {
  const { address, connecting, connect, disconnect, freighterAvailable, error } =
    useWallet();
  const { user, logout, isAdmin } = useAuth();
  const toast = useToast();
  const [funded, setFunded] = useState<boolean | null>(null);
  const [funding, setFunding] = useState(false);

  const displayName =
    user?.preferred_username || user?.email || user?.name || "User";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!address) {
        setFunded(null);
        return;
      }
      try {
        const res = await api.checkAccount(address);
        if (!cancelled) setFunded(res.exists);
      } catch {
        if (!cancelled) setFunded(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address]);

  async function fundWallet() {
    if (!address) return;
    setFunding(true);
    try {
      await api.fundFriendbot(address);
      setFunded(true);
      toast.success("Testnet wallet funded", "Account is ready for Soroban txs");
    } catch (err) {
      toast.error(
        "Friendbot failed",
        err instanceof Error ? err.message : "Could not fund account"
      );
    } finally {
      setFunding(false);
    }
  }

  async function signOut() {
    try {
      disconnect();
    } catch {
      // wallet may already be disconnected
    }
    await logout();
    toast.success("Signed out");
  }

  return (
    <div className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-crucible-border bg-crucible-bg/80 backdrop-blur-md z-10 shrink-0 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 border border-white/5">
          <div className="w-1.5 h-1.5 rounded-full bg-crucible-cyan"></div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            Stellar Testnet
          </span>
        </div>
        {!freighterAvailable && (
          <span className="text-[10px] text-crucible-gold uppercase tracking-widest hidden md:inline">
            Freighter not detected
          </span>
        )}
        {address && funded === false && (
          <button
            type="button"
            onClick={fundWallet}
            disabled={funding}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 border border-crucible-gold/50 text-crucible-gold text-[10px] font-bold uppercase tracking-widest hover:bg-crucible-gold/10 disabled:opacity-60"
          >
            <Droplets className="w-3 h-3" />
            {funding ? "Funding..." : "Fund Testnet Wallet"}
          </button>
        )}
        {error && (
          <span className="text-[10px] text-crucible-red uppercase tracking-widest hidden lg:inline max-w-xs truncate">
            {error}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        <div
          className="hidden sm:flex items-center gap-2 h-10 px-3 rounded-md border border-crucible-border bg-black/40 text-zinc-300 text-xs uppercase tracking-wide"
          title={displayName}
        >
          <User className="w-3.5 h-3.5 text-crucible-gold" />
          <span className="max-w-[120px] truncate">{displayName}</span>
          <span
            className={`text-[9px] font-bold tracking-widest ${
              isAdmin ? "text-crucible-gold" : "text-crucible-cyan"
            }`}
          >
            {isAdmin ? "ADMIN" : "USER"}
          </span>
        </div>

        <button className="w-10 h-10 hidden md:flex items-center justify-center rounded-full border border-transparent hover:bg-white/5 text-zinc-400 hover:text-white transition-colors">
          <Settings className="w-4 h-4" />
        </button>

        {address ? (
          <div className="flex items-center gap-2">
            {funded === false && (
              <button
                type="button"
                onClick={fundWallet}
                disabled={funding}
                className="sm:hidden h-10 px-3 rounded-md border border-crucible-gold/50 text-crucible-gold text-[10px] font-bold uppercase"
              >
                Fund
              </button>
            )}
            <div
              className="h-10 px-3 md:px-4 rounded-md border border-crucible-border bg-black/40 text-crucible-cyan font-bold tracking-wide uppercase text-xs flex items-center gap-2"
              title={address}
            >
              <Wallet className="w-3.5 h-3.5" />
              {shortAddress(address)}
              {funded && (
                <span className="hidden md:inline text-[9px] text-crucible-cyan/70">
                  FUNDED
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={disconnect}
              className="h-10 w-10 rounded-md border border-crucible-border hover:bg-white/5 text-zinc-400 hover:text-white flex items-center justify-center"
              title="Disconnect wallet"
              aria-label="Disconnect wallet"
            >
              <Wallet className="w-4 h-4 opacity-60" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() =>
              connect()
                .then(() => toast.success("Wallet connected"))
                .catch(() => undefined)
            }
            disabled={connecting}
            className="h-10 px-4 md:px-6 rounded-md bg-crucible-gold hover:bg-yellow-400 disabled:opacity-60 text-black font-bold tracking-wide uppercase text-sm flex items-center gap-2 transition-colors shadow-[0_0_15px_rgba(255,176,0,0.3)]"
          >
            <Wallet className="w-4 h-4" />
            {connecting ? "Confirm..." : "Connect Wallet"}
          </button>
        )}

        <button
          type="button"
          onClick={() => void signOut()}
          className="h-10 w-10 rounded-md border border-crucible-border hover:bg-white/5 text-zinc-400 hover:text-white flex items-center justify-center"
          title="Sign out"
          aria-label="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
