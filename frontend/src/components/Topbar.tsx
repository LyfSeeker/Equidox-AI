"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Wallet,
  LogOut,
  Droplets,
  Bell,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useWallet } from "@/context/WalletContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { api } from "@/lib/api";
import { shortAddress } from "@/lib/config";

export default function Topbar() {
  const router = useRouter();
  const { address, connecting, connect, disconnect, freighterAvailable, error } =
    useWallet();
  const { user, logout, isAdmin } = useAuth();
  const toast = useToast();
  const [funded, setFunded] = useState<boolean | null>(null);
  const [funding, setFunding] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!profileOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (!menuRef.current?.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setProfileOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [profileOpen]);

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

  function onDisconnectWallet(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      disconnect();
      setProfileOpen(false);
      toast.success("Wallet disconnected", "Connect Freighter again to continue");
    } catch (err) {
      toast.error(
        "Disconnect failed",
        err instanceof Error ? err.message : "Could not disconnect"
      );
    }
  }

  async function onSignOut(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    setProfileOpen(false);
    try {
      try {
        disconnect();
      } catch {
        // wallet may already be cleared
      }
      await logout();
      toast.success("Signed out");
      router.replace("/login");
    } catch (err) {
      toast.error(
        "Sign out failed",
        err instanceof Error ? err.message : "Could not sign out"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <header className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-crucible-border bg-crucible-bg/85 backdrop-blur-xl z-10 shrink-0 gap-3">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="badge badge-cyan shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-crucible-cyan animate-pulse" />
          Stellar Testnet
        </div>

        {!freighterAvailable && (
          <span className="text-[10px] text-crucible-gold uppercase tracking-widest hidden lg:inline">
            Freighter not detected
          </span>
        )}
        {address && funded === false && (
          <button
            type="button"
            onClick={fundWallet}
            disabled={funding}
            className="btn btn-ghost btn-sm hidden sm:inline-flex border-crucible-gold/40 text-crucible-gold"
          >
            <Droplets className="w-3 h-3" />
            {funding ? "Funding…" : "Fund Wallet"}
          </button>
        )}
        {error && (
          <span className="text-[10px] text-crucible-red uppercase tracking-widest hidden xl:inline max-w-xs truncate">
            {error}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          className="btn btn-ghost btn-icon relative"
          aria-label="Notifications"
          title="Notifications"
          onClick={() => toast.info("Notifications", "You’re caught up")}
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-crucible-gold" />
        </button>

        {address ? (
          <div
            className="h-10 px-3 rounded-lg border border-crucible-border bg-black/40 text-crucible-cyan font-bold tracking-wide uppercase text-xs flex items-center gap-2"
            title={address}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{shortAddress(address)}</span>
            {funded && <span className="badge badge-cyan !py-0.5">Funded</span>}
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
            className="btn btn-primary btn-sm"
          >
            <Wallet className="w-4 h-4" />
            {connecting ? "Confirm…" : "Connect"}
          </button>
        )}

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setProfileOpen((v) => !v)}
            className="h-10 px-3 rounded-lg border border-crucible-border bg-black/40 text-zinc-300 text-xs uppercase tracking-wide flex items-center gap-2 hover:border-crucible-gold/30 transition-colors"
            aria-expanded={profileOpen}
            aria-haspopup="menu"
          >
            <User className="w-3.5 h-3.5 text-crucible-gold" />
            <span className="hidden sm:inline max-w-[100px] truncate">
              {displayName}
            </span>
            <span
              className={`text-[9px] font-bold tracking-widest ${
                isAdmin ? "text-crucible-gold" : "text-crucible-cyan"
              }`}
            >
              {isAdmin ? "ADMIN" : "USER"}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
          </button>

          <AnimatePresence>
            {profileOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                role="menu"
                className="absolute right-0 mt-2 w-56 panel-static p-2 z-[60] shadow-[0_12px_40px_rgba(0,0,0,0.6)]"
              >
                <p className="px-3 py-2 text-[10px] text-zinc-500 uppercase tracking-widest truncate">
                  {displayName}
                </p>
                <button
                  type="button"
                  role="menuitem"
                  disabled={!address || busy}
                  onClick={onDisconnectWallet}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs text-zinc-300 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Wallet className="w-3.5 h-3.5" /> Disconnect wallet
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={busy}
                  onClick={(e) => void onSignOut(e)}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs text-crucible-red hover:bg-crucible-red/10 disabled:opacity-40"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  {busy ? "Signing out…" : "Sign out"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
