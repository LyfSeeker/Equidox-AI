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
  Bot,
  CheckCircle2,
  RefreshCw,
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
import PageHeader from "@/components/ui/PageHeader";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonCard } from "@/components/ui/Skeleton";

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
  const paidMilestones = milestones.filter((m) => m.status === "paid").length;
  const successRate =
    milestones.length > 0
      ? Math.round((paidMilestones / milestones.length) * 100)
      : 0;
  const aiReviews = milestones.filter((m) =>
    ["under_review", "approved", "paid"].includes(m.status)
  ).length;
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
    <div className="page-shell font-mono text-zinc-400">
      <PageHeader
        eyebrow={isAdmin ? "Admin" : "Builder"}
        title={isAdmin ? "Dashboard" : "Updates"}
        description={
          isAdmin
            ? "KPIs, incoming reviews, live grants, Stellar events, and builder rankings — all in one place."
            : "Track grant progress and open a milestone when you’re ready to submit evidence."
        }
        actions={
          <button type="button" onClick={load} className="btn btn-ghost btn-sm">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        }
      />

      {error && (
        <div className="panel-static p-4 text-crucible-red text-xs break-all border-crucible-red/40">
          {error}
        </div>
      )}

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: "Active Grants", value: String(activeGrants), icon: Code, tone: "gold" },
          {
            label: "Escrow Value",
            value: `${stroopsToXlm(totalEscrow)}`,
            suffix: "XLM",
            icon: Wallet,
            tone: "cyan",
          },
          {
            label: "Builder Reputation",
            value: passportScore != null ? String(passportScore) : "—",
            icon: Shield,
            tone: "gold",
          },
          {
            label: "AI Reviews",
            value: String(aiReviews),
            icon: Bot,
            tone: "cyan",
          },
          {
            label: "Success Rate",
            value: `${successRate}%`,
            icon: CheckCircle2,
            tone: "gold",
          },
          {
            label: "Pending Reviews",
            value: String(submissions.length),
            icon: Activity,
            tone: "cyan",
          },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="panel-border card-lift p-5"
          >
            <div className="flex justify-between mb-4">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500">
                {card.label}
              </p>
              <card.icon
                className={`w-4 h-4 ${
                  card.tone === "gold" ? "text-crucible-gold" : "text-crucible-cyan"
                }`}
              />
            </div>
            <p className="text-3xl font-bold text-white tracking-tight tabular-nums">
              {loading ? "—" : card.value}
            </p>
            {card.suffix && (
              <p className="text-[10px] uppercase tracking-widest text-zinc-600 mt-1">
                {card.suffix}
              </p>
            )}
          </motion.div>
        ))}
      </div>

      {isAdmin && (
        <section className="panel-static p-5 md:p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="section-title text-crucible-cyan">
              <Activity className="w-4 h-4" /> Pending Reviews
            </h2>
            <Badge tone="cyan">{submissions.length} open</Badge>
          </div>
          {loading ? (
            <div className="grid md:grid-cols-2 gap-3">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : submissions.length === 0 ? (
            <EmptyState
              title="All clear"
              description="No documents waiting for review. New submissions will appear here."
              actionLabel="Open Review"
              actionHref="/review"
            />
          ) : (
            <div className="grid md:grid-cols-2 gap-3 max-h-72 overflow-y-auto">
              {submissions.map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Link
                    href={`/verification/${s.grant_db_id || s.grant_id}`}
                    className="block panel-border p-4"
                  >
                    <div className="flex justify-between gap-3 mb-2">
                      <span className="text-xs text-white font-bold uppercase tracking-wider">
                        {s.grant_title || `Grant #${s.grant_id}`} ·{" "}
                        {s.title || `MS #${s.id}`}
                      </span>
                      <StatusBadge status={s.status} />
                    </div>
                    <p className="text-[10px] text-zinc-500 break-all">
                      {s.evidence_json?.repoUrl || "No repo URL"}
                    </p>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <section className="panel-static p-5 md:p-6 min-h-[320px] flex flex-col">
            <div className="flex items-center justify-between mb-6 gap-3">
              <h2 className="section-title text-crucible-gold">
                <GitMerge className="w-4 h-4" /> Grant Progress
              </h2>
              <div className="flex gap-2">
                <Badge tone="cyan">Builders {topBuilders.length}</Badge>
                <Badge tone="gold">Registered {grants.length}</Badge>
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : grants.length === 0 ? (
              <EmptyState
                icon={GitMerge}
                title="No grants yet"
                description={
                  isAdmin
                    ? "Create your first grant to start escrowed milestone payouts."
                    : "Waiting for an admin to publish grants."
                }
                actionLabel={isAdmin ? "Create a Grant" : undefined}
                actionHref={isAdmin ? "/grants" : undefined}
              />
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-[420px]">
                {grants.map((grant) => {
                  const budget = Number(grant.total_budget_stroops || 0);
                  const escrow = Number(grant.escrowed_stroops || 0);
                  const pct = budget
                    ? Math.min(100, (escrow / budget) * 100)
                    : 0;
                  const canCancel =
                    isAdmin &&
                    ["active", "funded"].includes(grant.status) &&
                    grant.on_chain_grant_id != null;
                  const isProvider =
                    !!address && address === grant.provider_address;

                  return (
                    <div key={grant.id} className="panel-border p-4 space-y-3">
                      <div className="flex justify-between gap-4">
                        <Link
                          href={`/verification/${grant.id}`}
                          className="text-white font-bold uppercase tracking-wider text-sm hover:text-crucible-gold transition-colors"
                        >
                          {grant.title || `Grant #${grant.id}`}
                        </Link>
                        <StatusBadge status={grant.status} />
                      </div>
                      <p className="text-[10px] text-zinc-500">
                        Builder {shortAddress(grant.builder_address)} · Reviewer{" "}
                        {shortAddress(grant.reviewer_address)} · Budget{" "}
                        {stroopsToXlm(budget)} XLM
                      </p>
                      <div className="progress-track">
                        <motion.div
                          className="progress-fill bg-crucible-cyan"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8 }}
                        />
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-[10px] text-zinc-600">
                          Escrow {stroopsToXlm(escrow)} · Chain #
                          {grant.on_chain_grant_id ?? "—"}
                        </p>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/verification/${grant.id}`}
                            className="btn btn-ghost btn-sm"
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
                                  ? "Cancel grant and refund escrow"
                                  : "Connect provider wallet to cancel & refund"
                              }
                              className="btn btn-danger btn-sm"
                            >
                              <Trash2 className="w-3 h-3" />
                              {cancellingId === grant.id
                                ? "Cancelling…"
                                : escrow > 0
                                  ? "Refund"
                                  : "Delete"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <div className="col-span-1 flex flex-col gap-6">
          <LifecycleTimeline
            steps={timeline}
            title="Activity Timeline"
            subtitle={featured?.title || "Featured grant"}
          />
          <div className="panel-static p-5">
            <div className="flex justify-between items-start mb-4">
              <p className="section-title">Contracts</p>
              <Shield className="w-4 h-4 text-crucible-gold" />
            </div>
            <p className="text-[10px] text-zinc-500 mb-2 break-all">
              GM: {shortAddress(health?.contracts?.grantManager, 6)}
            </p>
            <p className="text-[10px] text-zinc-500 break-all">
              Passport: {shortAddress(health?.contracts?.builderPassport, 6)}
            </p>
            <p className="text-[10px] mt-3 uppercase tracking-widest">
              Backend{" "}
              <span
                className={
                  health?.status === "ok"
                    ? "text-crucible-cyan"
                    : "text-crucible-red"
                }
              >
                {health?.status === "ok" ? "Online" : loading ? "…" : "Off"}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="panel-static p-5 lg:col-span-1">
          <div className="flex justify-between items-center mb-5 border-b border-crucible-border pb-3">
            <h3 className="section-title">
              <Terminal className="w-4 h-4 text-zinc-400" /> Live Events
            </h3>
          </div>
          <div className="space-y-3 font-mono text-[10px] max-h-64 overflow-y-auto">
            {events.length === 0 ? (
              <p className="text-zinc-600">No indexed events yet.</p>
            ) : (
              events.map((ev) => (
                <div
                  key={ev.id}
                  className="flex gap-3 text-zinc-300 p-2 rounded-lg hover:bg-white/[0.03]"
                >
                  <span className="text-crucible-gold shrink-0 tabular-nums">
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
                    ) : null}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="panel-static p-5 lg:col-span-2">
          <div className="flex justify-between items-center mb-5 border-b border-crucible-border pb-3">
            <h3 className="section-title">Builder Rankings</h3>
            <Link
              href={address ? `/builder/${address}` : "/builder/me"}
              className="text-[10px] text-crucible-gold font-bold uppercase hover:underline"
            >
              Open Passport ›
            </Link>
          </div>
          <div className="space-y-2">
            {topBuilders.length === 0 ? (
              <EmptyState
                title="No builders yet"
                description="Builder activity will rank here as grants go live."
              />
            ) : (
              topBuilders.map((g, i) => (
                <Link
                  key={g.builder_address}
                  href={`/builder/${g.builder_address}`}
                  className="flex items-center gap-4 panel-border !shadow-none p-3"
                >
                  <span className="text-xs font-bold text-crucible-gold w-6">
                    #{i + 1}
                  </span>
                  <div className="w-10 h-10 rounded-lg bg-black border border-crucible-border flex items-center justify-center">
                    <Activity className="w-5 h-5 text-crucible-gold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-1 gap-2">
                      <span className="text-sm font-bold text-white truncate">
                        {shortAddress(g.builder_address)}
                      </span>
                      <StatusBadge status={g.status} />
                    </div>
                    <p className="text-[10px] text-zinc-500 truncate">
                      {g.title || `Grant #${g.id}`} ·{" "}
                      {stroopsToXlm(g.total_budget_stroops)} XLM
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
