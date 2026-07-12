"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Shield,
  Code,
  GitMerge,
  Terminal,
  Wallet,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  api,
  type ChainEvent,
  type Grant,
  type Health,
  type Milestone,
} from "@/lib/api";
import { useWallet } from "@/context/WalletContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { shortAddress, stroopsToXlm, explorerTxUrl } from "@/lib/config";
import LifecycleTimeline, {
  buildGrantTimeline,
} from "@/components/LifecycleTimeline";

export default function Dashboard() {
  const { address, connect, signAndSubmit } = useWallet();
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [grants, setGrants] = useState<Grant[]>([]);
  const [events, setEvents] = useState<ChainEvent[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [submissions, setSubmissions] = useState<
    (Milestone & {
      grant_title?: string | null;
      builder_address?: string;
      grant_db_id?: number;
    })[]
  >([]);
  const [passportScore, setPassportScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [g, e, h] = await Promise.all([
        api.listGrants().catch(() => [] as Grant[]),
        api.listEvents(20).catch(() => [] as ChainEvent[]),
        api.health().catch(() => null),
      ]);
      setGrants(g);
      setEvents(e);
      setHealth(h);

      if (g[0]) {
        const ms = await api.listMilestones(g[0].id).catch(() => []);
        setMilestones(ms);
      } else {
        setMilestones([]);
      }

      if (isAdmin) {
        const pending = await api.listSubmittedMilestones().catch(() => []);
        setSubmissions(pending);
      } else {
        setSubmissions([]);
      }

      if (address) {
        const p = await api.getPassport(address).catch(() => null);
        setPassportScore(p?.reputation_score ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [address, isAdmin]);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const activeGrants = grants.filter((g) =>
    ["active", "funded"].includes(g.status)
  ).length;
  const totalEscrow = grants.reduce(
    (sum, g) => sum + Number(g.escrowed_stroops || 0),
    0
  );
  const topBuilders = Array.from(
    new Map(grants.map((g) => [g.builder_address, g])).values()
  ).slice(0, 5);

  const featured =
    grants.find((g) => ["active", "funded"].includes(g.status)) || grants[0];
  const timeline = useMemo(
    () =>
      buildGrantTimeline({
        hasGrant: Boolean(featured),
        escrowed: Number(featured?.escrowed_stroops || 0),
        milestoneCount: milestones.length,
        statuses: [featured?.status || "", ...milestones.map((m) => m.status)],
      }),
    [featured, milestones]
  );

  async function cancelGrant(grant: Grant) {
    if (!isAdmin) {
      toast.error("Admin only", "Only admins can cancel grants");
      return;
    }
    if (grant.on_chain_grant_id == null) {
      toast.error("Cannot cancel", "Grant has no on-chain ID yet");
      return;
    }
    if (!["active", "funded"].includes(grant.status)) {
      toast.error("Cannot cancel", `Grant is already ${grant.status}`);
      return;
    }

    const escrowXlm = stroopsToXlm(grant.escrowed_stroops);
    const ok = window.confirm(
      `Cancel grant #${grant.id} (chain #${grant.on_chain_grant_id})?\n\n` +
        `Escrowed ${escrowXlm} XLM will be refunded to the provider on-chain.\n` +
        `This fails if any milestone is already approved or paid.`
    );
    if (!ok) return;

    setCancellingId(grant.id);
    setError(null);
    try {
      let provider = address;
      if (!provider) provider = await connect();
      if (provider !== grant.provider_address) {
        throw new Error(
          "Connect the grant provider wallet to cancel and receive the refund"
        );
      }

      const check = await api.checkAccount(provider);
      if (!check.exists) {
        toast.info("Funding Testnet wallet...");
        await api.fundFriendbot(provider);
      }

      toast.info(
        "Confirm cancel_grant in Freighter",
        "Escrow refunds to provider"
      );
      const unsigned = await api.buildCancelGrant({
        sourcePublicKey: provider,
        providerAddress: provider,
        grantId: grant.on_chain_grant_id,
      });
      const submitted = await signAndSubmit(unsigned);

      await api.updateGrant(grant.id, {
        status: "cancelled",
        escrowedStroops: 0,
        txHash: submitted.hash,
      });

      await api.indexEvent({
        eventName: "GrantCancelled",
        payload: {
          grant_id: grant.on_chain_grant_id,
          provider,
          refund_amount: Number(grant.escrowed_stroops || 0),
        },
        txHash: submitted.hash,
      });

      toast.success(
        "Grant cancelled",
        Number(grant.escrowed_stroops || 0) > 0
          ? `Refunded ${escrowXlm} XLM to provider · ${submitted.hash.slice(0, 12)}…`
          : `No escrow to refund · ${submitted.hash.slice(0, 12)}…`
      );
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Cancel failed";
      setError(msg);
      toast.error("Cancel / refund failed", msg);
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col gap-6 font-mono text-zinc-400">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white uppercase tracking-wider mb-2">
            {isAdmin ? "Admin Dashboard" : "Updates Dashboard"}
          </h1>
          <p className="text-sm">
            {isAdmin
              ? "Manage grants, milestones, reviews, and Soroban payouts."
              : "See grant updates and open a milestone to submit your documents."}
          </p>
        </div>
        <button
          onClick={load}
          className="px-4 py-2 border border-crucible-border hover:bg-white/5 text-[10px] font-bold uppercase tracking-widest"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="panel-border p-4 text-crucible-red text-xs break-all">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Active Grants", value: String(activeGrants), icon: Code },
          {
            label: "Total Escrow",
            value: `${stroopsToXlm(totalEscrow)} XLM`,
            icon: Wallet,
          },
          {
            label: "Backend",
            value: health?.status === "ok" ? "ONLINE" : loading ? "…" : "OFF",
            icon: Activity,
          },
          {
            label: "Passport",
            value: passportScore != null ? String(passportScore) : "—",
            icon: Shield,
          },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="panel-border p-4"
          >
            <div className="flex justify-between mb-3">
              <p className="text-[10px] uppercase tracking-widest">{card.label}</p>
              <card.icon className="w-4 h-4 text-zinc-600" />
            </div>
            <p className="text-2xl font-bold text-white tracking-tight">
              {loading && card.label !== "Backend" ? "…" : card.value}
            </p>
          </motion.div>
        ))}
      </div>

      {isAdmin && (
        <div className="panel-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-crucible-cyan font-bold tracking-widest text-sm uppercase">
              Incoming Submissions ({submissions.length})
            </h2>
          </div>
          {submissions.length === 0 ? (
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
              No user documents waiting for review
            </p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {submissions.map((s) => (
                <Link
                  key={s.id}
                  href={`/verification/${s.grant_db_id || s.grant_id}`}
                  className="block panel-border p-3 hover:border-crucible-gold/50"
                >
                  <div className="flex justify-between gap-3 mb-1">
                    <span className="text-xs text-white font-bold uppercase">
                      {s.grant_title || `Grant #${s.grant_id}`} ·{" "}
                      {s.title || `Milestone #${s.id}`}
                    </span>
                    <span className="text-[10px] text-crucible-cyan uppercase">
                      {s.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 break-all">
                    {s.evidence_json?.repoUrl || "No repo URL"}
                  </p>
                  {s.evidence_json?.notes && (
                    <p className="text-[10px] text-zinc-400 mt-1 line-clamp-2">
                      {s.evidence_json.notes}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="panel-border p-5 min-h-[320px] flex flex-col relative overflow-hidden">
            <div className="flex items-center justify-between mb-6 z-10">
              <h2 className="text-crucible-gold font-bold flex items-center gap-2 tracking-widest text-sm">
                <GitMerge className="w-4 h-4" /> LIVE GRANTS
              </h2>
              <div className="flex gap-3 text-[10px] font-bold">
                <span className="px-3 py-1 rounded-full border border-crucible-cyan text-crucible-cyan bg-crucible-cyan/10">
                  BUILDERS: {topBuilders.length}
                </span>
                <span className="px-3 py-1 rounded-full border border-crucible-gold text-crucible-gold bg-crucible-gold/10">
                  REGISTERED: {grants.length}
                </span>
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : grants.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
                <p className="text-sm text-zinc-500">No grants yet.</p>
                {isAdmin ? (
                  <Link
                    href="/grants"
                    className="px-4 py-2 bg-crucible-gold text-black text-xs font-bold uppercase tracking-widest"
                  >
                    Create a Grant
                  </Link>
                ) : (
                  <p className="text-[10px] uppercase tracking-widest text-zinc-600">
                    Waiting for admin to publish grants
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-[420px]">
                {grants.map((grant) => {
                  const budget = Number(grant.total_budget_stroops || 0);
                  const escrow = Number(grant.escrowed_stroops || 0);
                  const pct = budget ? Math.min(100, (escrow / budget) * 100) : 0;
                  const canCancel =
                    isAdmin &&
                    ["active", "funded"].includes(grant.status) &&
                    grant.on_chain_grant_id != null;
                  const isProvider =
                    !!address && address === grant.provider_address;

                  return (
                    <div
                      key={grant.id}
                      className="panel-border p-4 hover:border-crucible-gold/50 transition-colors"
                    >
                      <div className="flex justify-between gap-4 mb-2">
                        <Link
                          href={`/verification/${grant.id}`}
                          className="text-white font-bold uppercase tracking-wider text-sm hover:text-crucible-gold"
                        >
                          {grant.title || `Grant #${grant.id}`}
                        </Link>
                        <span
                          className={`text-[10px] font-bold uppercase ${
                            grant.status === "cancelled"
                              ? "text-crucible-red"
                              : "text-crucible-cyan"
                          }`}
                        >
                          {grant.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 mb-2">
                        Builder {shortAddress(grant.builder_address)} · Reviewer{" "}
                        {shortAddress(grant.reviewer_address)} · Budget{" "}
                        {stroopsToXlm(budget)} XLM
                      </p>
                      <div className="h-1.5 bg-black border border-crucible-border overflow-hidden mb-2">
                        <div
                          className="h-full bg-crucible-cyan"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-[10px] text-zinc-600">
                          Escrow {stroopsToXlm(escrow)} · Chain #
                          {grant.on_chain_grant_id ?? "—"} · Provider{" "}
                          {shortAddress(grant.provider_address)}
                        </p>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/verification/${grant.id}`}
                            className="px-3 py-1.5 border border-crucible-border text-[10px] font-bold uppercase tracking-widest hover:bg-white/5"
                          >
                            {isAdmin ? "Review" : "Submit Docs"}
                          </Link>
                          {canCancel && (
                            <button
                              type="button"
                              disabled={cancellingId === grant.id}
                              onClick={() => cancelGrant(grant)}
                              title={
                                isProvider
                                  ? "Cancel grant and refund escrow to provider"
                                  : "Connect provider wallet to cancel & refund"
                              }
                              className="px-3 py-1.5 border border-crucible-red/50 text-crucible-red text-[10px] font-bold uppercase tracking-widest hover:bg-crucible-red/10 disabled:opacity-50 flex items-center gap-1.5"
                            >
                              <Trash2 className="w-3 h-3" />
                              {cancellingId === grant.id
                                ? "Cancelling..."
                                : escrow > 0
                                  ? "Delete & Refund"
                                  : "Delete Grant"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="col-span-1 flex flex-col gap-6">
          <LifecycleTimeline steps={timeline} />
          <div className="panel-border p-5">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-bold tracking-widest uppercase">
                Contracts
              </p>
              <Shield className="w-4 h-4 text-crucible-gold" />
            </div>
            <p className="text-[10px] text-zinc-500 mb-2 break-all">
              GM: {shortAddress(health?.contracts?.grantManager, 6)}
            </p>
            <p className="text-[10px] text-zinc-500 break-all">
              Passport: {shortAddress(health?.contracts?.builderPassport, 6)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="panel-border p-5 lg:col-span-1">
          <div className="flex justify-between items-center mb-6 border-b border-crucible-border pb-3">
            <h3 className="text-xs font-bold flex items-center gap-2 tracking-widest text-white">
              <Terminal className="w-4 h-4 text-zinc-400" /> EVENT LOG
            </h3>
          </div>
          <div className="space-y-4 font-mono text-[10px] max-h-64 overflow-y-auto">
            {events.length === 0 ? (
              <p className="text-zinc-600">No indexed events yet.</p>
            ) : (
              events.map((ev) => (
                <div key={ev.id} className="flex gap-3 text-zinc-300">
                  <span className="text-crucible-gold shrink-0">
                    {new Date(ev.indexed_at).toLocaleTimeString()}
                  </span>
                  <span className="min-w-0">
                    [{ev.event_name}]{" "}
                    {ev.tx_hash && explorerTxUrl(ev.tx_hash) ? (
                      <a
                        href={explorerTxUrl(ev.tx_hash)!}
                        target="_blank"
                        rel="noreferrer"
                        className="text-crucible-cyan hover:underline"
                      >
                        {shortAddress(ev.tx_hash, 6)}
                      </a>
                    ) : (
                      ""
                    )}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="panel-border p-5 lg:col-span-2">
          <div className="flex justify-between items-center mb-6 border-b border-crucible-border pb-3">
            <h3 className="text-xs font-bold tracking-widest text-white uppercase">
              Top Builders
            </h3>
            <Link
              href={address ? `/builder/${address}` : "/builder/me"}
              className="text-[10px] text-crucible-gold font-bold uppercase hover:text-yellow-400"
            >
              Open Passport ›
            </Link>
          </div>
          <div className="space-y-4">
            {topBuilders.length === 0 ? (
              <p className="text-xs text-zinc-600">
                Connect activity will appear here.
              </p>
            ) : (
              topBuilders.map((g) => (
                <Link
                  key={g.builder_address}
                  href={`/builder/${g.builder_address}`}
                  className="flex items-center gap-4 hover:bg-white/5 p-2 -mx-2 rounded"
                >
                  <div className="w-10 h-10 rounded bg-black border border-crucible-border flex items-center justify-center">
                    <Activity className="w-5 h-5 text-crucible-gold" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-bold text-white">
                        {shortAddress(g.builder_address)}
                      </span>
                      <span className="text-[10px] text-zinc-400 uppercase">
                        {g.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500">
                      {g.title || `Grant #${g.id}`} ·{" "}
                      {stroopsToXlm(g.total_budget_stroops)} XLM
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
