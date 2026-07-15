"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Wallet,
  LogOut,
  Droplets,
  Bell,
  ChevronDown,
  Activity,
  ExternalLink,
  CheckCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useWallet } from "@/context/WalletContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { api, type ChainEvent } from "@/lib/api";
import { shortAddress, explorerTxUrl } from "@/lib/config";

const SEEN_KEY = "equidox.notifications.seenAt";

const EVENT_COPY: Record<
  string,
  { title: string; tone: "gold" | "cyan" | "zinc" }
> = {
  GrantCreated: { title: "Grant created", tone: "gold" },
  FundsDeposited: { title: "Escrow funded", tone: "cyan" },
  MilestoneAdded: { title: "Milestone added", tone: "gold" },
  MilestoneSubmitted: { title: "Evidence submitted", tone: "cyan" },
  AiVerificationAdded: { title: "AI verification anchored", tone: "cyan" },
  MilestoneApproved: { title: "Milestone approved", tone: "gold" },
  PaymentReleased: { title: "Funds released", tone: "gold" },
  PassportUpdated: { title: "Passport updated", tone: "cyan" },
  MilestoneRejected: { title: "Milestone rejected", tone: "zinc" },
};

function eventHref(ev: ChainEvent, isAdmin: boolean): string | null {
  const payload =
    ev.payload && typeof ev.payload === "object"
      ? (ev.payload as Record<string, unknown>)
      : {};
  const grantId = payload.grant_id ?? payload.grantId;
  if (
    grantId != null &&
    ["MilestoneSubmitted", "AiVerificationAdded", "MilestoneApproved", "MilestoneRejected", "PaymentReleased", "MilestoneAdded"].includes(
      ev.event_name
    )
  ) {
    // Prefer DB verification routes via grants list when possible — chain id alone is OK for grants page
    return isAdmin ? "/review" : "/submit";
  }
  if (ev.event_name === "PassportUpdated" && typeof payload.builder === "string") {
    return `/builder/${payload.builder}`;
  }
  if (["GrantCreated", "FundsDeposited"].includes(ev.event_name)) {
    return "/grants";
  }
  return "/dashboard";
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleString();
}

function asPlainId(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    if (o.id != null) return asPlainId(o.id);
    if (o.value != null) return asPlainId(o.value);
  }
  return null;
}

export default function Topbar() {
  const router = useRouter();
  const { address, connecting, connect, disconnect, freighterAvailable, error } =
    useWallet();
  const { user, logout, isAdmin } = useAuth();
  const toast = useToast();
  const [funded, setFunded] = useState<boolean | null>(null);
  const [funding, setFunding] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [events, setEvents] = useState<ChainEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [seenAt, setSeenAt] = useState<number>(() => {
    if (typeof window === "undefined") return Date.now();
    const raw = window.localStorage.getItem(SEEN_KEY);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  });
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const displayName =
    user?.preferred_username || user?.email || user?.name || "User";

  const unreadCount = events.filter(
    (ev) => new Date(ev.indexed_at).getTime() > seenAt
  ).length;

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const list = await api.listEvents(25);
      setEvents(list);
    } catch {
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEvents();
    const t = setInterval(() => void loadEvents(), 45_000);
    return () => clearInterval(t);
  }, [loadEvents]);

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
    if (!profileOpen && !notifOpen) return;
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node;
      if (profileOpen && menuRef.current && !menuRef.current.contains(t)) {
        setProfileOpen(false);
      }
      if (notifOpen && notifRef.current && !notifRef.current.contains(t)) {
        setNotifOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setProfileOpen(false);
        setNotifOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [profileOpen, notifOpen]);

  function markAllSeen() {
    const now = Date.now();
    setSeenAt(now);
    try {
      window.localStorage.setItem(SEEN_KEY, String(now));
    } catch {
      // ignore quota
    }
  }

  function openNotifications() {
    setProfileOpen(false);
    setNotifOpen((v) => {
      const next = !v;
      if (next) {
        void loadEvents();
      }
      return next;
    });
  }

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
    <header className="relative z-50 h-16 flex items-center justify-between px-4 md:px-6 border-b border-crucible-border bg-crucible-bg/85 backdrop-blur-xl shrink-0 gap-3 isolate">
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
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            className="btn btn-ghost btn-icon relative"
            aria-label="Notifications"
            aria-expanded={notifOpen}
            title="Notifications"
            onClick={openNotifications}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[14px] h-3.5 px-1 rounded-full bg-crucible-gold text-black text-[9px] font-bold flex items-center justify-center leading-none">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-[min(100vw-2rem,22rem)] panel-static p-0 z-[100] shadow-[0_12px_40px_rgba(0,0,0,0.75)] overflow-hidden"
              >
                <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-crucible-border">
                  <div>
                    <p className="text-xs font-bold text-white uppercase tracking-widest">
                      Updates
                    </p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">
                      Live on-chain &amp; indexer activity
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={markAllSeen}
                    className="text-[10px] uppercase tracking-widest text-crucible-cyan hover:text-white inline-flex items-center gap-1"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Read
                  </button>
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {eventsLoading && events.length === 0 ? (
                    <p className="px-4 py-8 text-center text-[10px] text-zinc-600 uppercase tracking-widest">
                      Loading updates…
                    </p>
                  ) : events.length === 0 ? (
                    <div className="px-4 py-10 text-center space-y-2">
                      <Activity className="w-5 h-5 text-zinc-600 mx-auto" />
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                        No updates yet
                      </p>
                      <p className="text-[11px] text-zinc-600 font-sans">
                        Grant, milestone, and payment events will appear here.
                      </p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-crucible-border">
                      {events.map((ev) => {
                        const meta = EVENT_COPY[ev.event_name] || {
                          title: ev.event_name,
                          tone: "zinc" as const,
                        };
                        const unread =
                          new Date(ev.indexed_at).getTime() > seenAt;
                        const href = eventHref(ev, isAdmin);
                        const payload =
                          ev.payload && typeof ev.payload === "object"
                            ? (ev.payload as Record<string, unknown>)
                            : {};
                        const toneClass =
                          meta.tone === "gold"
                            ? "text-crucible-gold"
                            : meta.tone === "cyan"
                              ? "text-crucible-cyan"
                              : "text-zinc-400";

                        return (
                          <li key={ev.id}>
                            <button
                              type="button"
                              className={`w-full text-left px-4 py-3 hover:bg-white/[0.04] transition-colors ${
                                unread ? "bg-crucible-gold/[0.04]" : ""
                              }`}
                              onClick={() => {
                                markAllSeen();
                                setNotifOpen(false);
                                if (href) router.push(href);
                              }}
                            >
                              <div className="flex items-start gap-2">
                                {unread && (
                                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-crucible-gold shrink-0" />
                                )}
                                <div className={`min-w-0 flex-1 ${unread ? "" : "pl-3.5"}`}>
                                  <div className="flex items-center justify-between gap-2">
                                    <p
                                      className={`text-[11px] font-bold uppercase tracking-widest ${toneClass}`}
                                    >
                                      {meta.title}
                                    </p>
                                    <span className="text-[9px] text-zinc-600 shrink-0">
                                      {formatWhen(ev.indexed_at)}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-zinc-500 mt-1 truncate">
                                    {(() => {
                                      const grantId = asPlainId(
                                        payload.grant_id ?? payload.grantId
                                      );
                                      const milestoneId = asPlainId(
                                        payload.milestone_id ??
                                          payload.milestoneId
                                      );
                                      const builder =
                                        typeof payload.builder === "string"
                                          ? shortAddress(payload.builder)
                                          : null;
                                      const bits = [
                                        grantId ? `Grant #${grantId}` : null,
                                        milestoneId
                                          ? `Milestone #${milestoneId}`
                                          : null,
                                        !grantId && builder ? builder : null,
                                      ].filter(Boolean);
                                      return bits.length
                                        ? bits.join(" · ")
                                        : ev.event_name;
                                    })()}
                                  </p>
                                  {ev.tx_hash && explorerTxUrl(ev.tx_hash) && (
                                    <a
                                      href={explorerTxUrl(ev.tx_hash)!}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="mt-1 inline-flex items-center gap-1 text-[9px] text-crucible-cyan hover:underline"
                                    >
                                      Tx {shortAddress(ev.tx_hash, 4)}
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <div className="border-t border-crucible-border px-4 py-2.5 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => {
                      setNotifOpen(false);
                      router.push("/dashboard");
                    }}
                    className="text-[10px] uppercase tracking-widest text-zinc-500 hover:text-white"
                  >
                    Open dashboard
                  </button>
                  <button
                    type="button"
                    onClick={() => void loadEvents()}
                    className="text-[10px] uppercase tracking-widest text-crucible-gold hover:text-white"
                  >
                    Refresh
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

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
            onClick={() => {
              setNotifOpen(false);
              setProfileOpen((v) => !v);
            }}
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
                className="absolute right-0 top-full mt-2 w-56 panel-static p-2 z-[100] shadow-[0_12px_40px_rgba(0,0,0,0.75)]"
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
