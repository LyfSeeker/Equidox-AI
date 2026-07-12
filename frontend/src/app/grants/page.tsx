"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  Filter,
  Sparkles,
  ArrowRight,
  Zap,
  Target,
  Plus,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { api, type Grant } from "@/lib/api";
import { useWallet } from "@/context/WalletContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  shortAddress,
  stroopsToXlm,
  explorerTxUrl,
} from "@/lib/config";

function parseReturnU64(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string" && value !== "") return Number(value);
  return null;
}

function parseReturnU32(value: unknown): number | null {
  return parseReturnU64(value);
}

export default function GrantMatching() {
  const { address, connect, signAndSubmit } = useWallet();
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("Equidox Demo Grant");
  const [description, setDescription] = useState(
    "Milestone-based escrow grant for Stellar Build Station demo."
  );
  const [builderAddress, setBuilderAddress] = useState("");
  const [reviewerAddress, setReviewerAddress] = useState("");
  const [budgetXlm, setBudgetXlm] = useState("10");

  const [activeGrant, setActiveGrant] = useState<Grant | null>(null);
  const [escrowOpen, setEscrowOpen] = useState(false);
  const [depositXlm, setDepositXlm] = useState("");
  const [depositBusy, setDepositBusy] = useState(false);
  const [escrowError, setEscrowError] = useState<string | null>(null);

  const [milestoneOpen, setMilestoneOpen] = useState(false);
  const [msTitle, setMsTitle] = useState("Core Smart Contracts");
  const [msDescription, setMsDescription] = useState(
    "Ship and document Soroban grant manager + passport."
  );
  const [msAmount, setMsAmount] = useState("2.5");
  const [msDeadline, setMsDeadline] = useState("");
  const [msBusy, setMsBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setGrants(await api.listGrants());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load grants");
      setGrants([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (address) {
      setBuilderAddress((prev) => prev || address);
      setReviewerAddress((prev) => prev || address);
    }
  }, [address]);

  async function ensureWallet() {
    if (address) return address;
    return connect();
  }

  async function ensureFunded(addr: string) {
    const check = await api.checkAccount(addr);
    if (!check.exists) {
      toast.info("Funding Testnet wallet via Friendbot...");
      await api.fundFriendbot(addr);
      toast.success("Wallet funded");
    }
  }

  async function onCreateGrant(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!isAdmin) {
      setError("Only admins can create grants.");
      return;
    }

    try {
      const providerAddress = await ensureWallet();
      if (!builderAddress || !reviewerAddress) {
        setError("Builder and reviewer addresses are required.");
        return;
      }

      const totalBudgetStroops = Math.round(Number(budgetXlm) * 10_000_000);
      if (!Number.isFinite(totalBudgetStroops) || totalBudgetStroops <= 0) {
        setError("Enter a valid XLM budget.");
        return;
      }

      setSubmitting(true);
      await ensureFunded(providerAddress);

      const meta = await api.uploadMetadata({ title, description });
      const unsigned = await api.buildCreateGrant({
        sourcePublicKey: providerAddress,
        providerAddress,
        builderAddress,
        reviewerAddress,
        totalBudgetStroops,
        metadataHash: meta.metadataHash,
      });

      toast.info("Confirm create_grant in Freighter");
      const submitted = await signAndSubmit(unsigned);
      const onChainGrantId = parseReturnU64(submitted.returnValue);

      const record = await api.createGrantRecord({
        providerAddress,
        builderAddress,
        reviewerAddress,
        title,
        description,
        totalBudgetStroops,
        metadataHash: meta.metadataHash,
        onChainGrantId,
        txHash: submitted.hash,
        status: "active",
      });

      if (onChainGrantId == null) {
        // Fallback: leave null but store tx; indexer / manual patch may fill
        toast.info(
          "Grant created",
          "On-chain ID pending from return value — check grant detail after refresh"
        );
      } else {
        await api.indexEvent({
          eventName: "GrantCreated",
          payload: {
            grant_id: onChainGrantId,
            provider: providerAddress,
            builder: builderAddress,
            reviewer: reviewerAddress,
            total_budget: totalBudgetStroops,
          },
          txHash: submitted.hash,
        });
      }

      setMessage(`Grant #${record.id} created. Tx: ${submitted.hash}`);
      toast.success("Grant created on-chain", `DB #${record.id}`);
      await load();
      // Open escrow manager so deposit is the next obvious step
      await openEscrowManager(record);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Grant creation failed";
      setError(msg);
      toast.error("Create grant failed", msg);
      if (/Account not found/i.test(msg) && address) {
        try {
          await api.fundFriendbot(address);
          toast.success("Funded via Friendbot — try again");
        } catch {
          /* ignore */
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function openEscrowManager(grant: Grant) {
    setEscrowError(null);
    setError(null);

    if (!isAdmin) {
      toast.error("Admin only", "Only admins can manage escrow and milestones");
      return;
    }

    if (grant.status === "cancelled") {
      toast.error("Grant cancelled", "Escrow can no longer be managed");
      return;
    }
    if (grant.on_chain_grant_id == null) {
      toast.error("Missing on-chain ID", "Create/sync the grant on-chain first");
      return;
    }

    try {
      const fresh = await api.getGrant(grant.id);
      setActiveGrant(fresh);
      const budget = Number(fresh.total_budget_stroops || 0);
      const escrowed = Number(
        fresh.live_escrow_stroops ?? fresh.escrowed_stroops ?? 0
      );
      const remaining = Math.max(budget - escrowed, 0);
      const defaultDeposit =
        remaining > 0 ? remaining / 10_000_000 : Number(budgetXlm) || 1;
      setDepositXlm(String(defaultDeposit));
      setEscrowOpen(true);
      toast.info("Escrow manager opened", `Chain grant #${fresh.on_chain_grant_id}`);
    } catch (err) {
      // Fall back to list row if detail fetch fails
      setActiveGrant(grant);
      const budget = Number(grant.total_budget_stroops || 0);
      const escrowed = Number(grant.escrowed_stroops || 0);
      const remaining = Math.max(budget - escrowed, 0);
      setDepositXlm(
        String(remaining > 0 ? remaining / 10_000_000 : Number(budgetXlm) || 1)
      );
      setEscrowOpen(true);
      if (err instanceof Error) setEscrowError(err.message);
    }
  }

  async function onDeposit(grant: Grant) {
    setDepositBusy(true);
    setEscrowError(null);
    setError(null);
    try {
      const providerAddress = await ensureWallet();
      if (providerAddress !== grant.provider_address) {
        throw new Error(
          "Connect the grant provider wallet to deposit escrow"
        );
      }
      await ensureFunded(providerAddress);
      if (grant.on_chain_grant_id == null) {
        throw new Error("Grant has no on-chain ID yet. Re-create or sync first.");
      }
      if (grant.status === "cancelled") {
        throw new Error("Cancelled grants cannot receive deposits");
      }

      const amountStroops = Math.round(Number(depositXlm) * 10_000_000);
      if (!Number.isFinite(amountStroops) || amountStroops <= 0) {
        throw new Error("Enter a valid deposit amount in XLM");
      }

      const unsigned = await api.buildDeposit({
        sourcePublicKey: providerAddress,
        providerAddress,
        grantId: grant.on_chain_grant_id,
        amountStroops,
      });
      toast.info("Confirm deposit_funds in Freighter");
      const submitted = await signAndSubmit(unsigned);

      const newEscrow = Number(grant.escrowed_stroops || 0) + amountStroops;
      const updated = await api.updateGrant(grant.id, {
        txHash: submitted.hash,
        status: "funded",
        escrowedStroops: newEscrow,
      });

      await api.indexEvent({
        eventName: "FundsDeposited",
        payload: {
          grant_id: grant.on_chain_grant_id,
          provider: providerAddress,
          amount: amountStroops,
          new_escrow_balance: newEscrow,
        },
        txHash: submitted.hash,
      });

      // Refresh live escrow from API/chain when possible
      let nextGrant = updated;
      try {
        nextGrant = await api.getGrant(grant.id);
      } catch {
        /* keep patched row */
      }

      setActiveGrant(nextGrant);
      const budget = Number(nextGrant.total_budget_stroops || 0);
      const escrowed = Number(
        nextGrant.live_escrow_stroops ?? nextGrant.escrowed_stroops ?? newEscrow
      );
      const remaining = Math.max(budget - escrowed, 0);
      setDepositXlm(
        remaining > 0 ? String(remaining / 10_000_000) : "0"
      );

      toast.success(
        "Funds deposited to escrow",
        `${stroopsToXlm(amountStroops)} XLM · ${submitted.hash.slice(0, 12)}…`
      );
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Deposit failed";
      setEscrowError(msg);
      setError(msg);
      toast.error("Deposit failed", msg);
    } finally {
      setDepositBusy(false);
    }
  }

  async function onAddMilestone(e: FormEvent) {
    e.preventDefault();
    if (!activeGrant) return;
    if (!isAdmin) {
      setError("Only admins can set milestones.");
      return;
    }
    setMsBusy(true);
    setError(null);
    try {
      const providerAddress = await ensureWallet();
      await ensureFunded(providerAddress);
      if (activeGrant.on_chain_grant_id == null) {
        throw new Error("Missing on-chain grant ID");
      }
      const amountStroops = Math.round(Number(msAmount) * 10_000_000);
      if (!amountStroops) throw new Error("Enter milestone payout amount");

      const unsigned = await api.buildAddMilestone({
        sourcePublicKey: providerAddress,
        providerAddress,
        onChainGrantId: activeGrant.on_chain_grant_id,
        amountStroops,
      });
      toast.info("Confirm add_milestone in Freighter");
      const submitted = await signAndSubmit(unsigned);
      const onChainMilestoneId = parseReturnU32(submitted.returnValue) ?? 0;

      const m = await api.createMilestone({
        grantId: activeGrant.id,
        title: msTitle,
        description: msDescription,
        amountStroops,
        onChainMilestoneId,
        deadline: msDeadline || null,
        txHash: submitted.hash,
        status: "pending",
      });

      await api.indexEvent({
        eventName: "MilestoneAdded",
        payload: {
          grant_id: activeGrant.on_chain_grant_id,
          milestone_id: onChainMilestoneId,
          amount: amountStroops,
          title: msTitle,
        },
        txHash: submitted.hash,
      });

      toast.success(
        "Milestone created on-chain",
        `ID ${onChainMilestoneId} · DB #${m.id}`
      );
      setMilestoneOpen(false);
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Add milestone failed";
      setError(msg);
      toast.error("Add milestone failed", msg);
    } finally {
      setMsBusy(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto py-8 font-mono text-zinc-400">
      <div className="panel-border p-8 mb-10 relative overflow-hidden">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-sm bg-crucible-gold/20 border border-crucible-gold flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-crucible-gold" />
          </div>
          <h1 className="text-2xl font-bold text-white uppercase tracking-widest">
            Grants
          </h1>
        </div>
        <p className="text-zinc-500 font-sans max-w-3xl">
          {isAdmin
            ? "Admin: create grants, deposit escrow, set milestones, then review submissions and release payouts."
            : "User: browse grant updates and open a grant to submit your delivery documents for review."}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {isAdmin && (
        <div className="lg:col-span-1 space-y-6">
          <form onSubmit={onCreateGrant} className="panel-border p-5 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest border-b border-crucible-border pb-2 flex items-center gap-2">
              <Filter className="w-4 h-4 text-crucible-gold" /> Create Grant
            </h3>

            <label className="block text-[10px] font-bold tracking-widest uppercase">
              Title
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-2 w-full bg-black border border-crucible-border px-3 py-2 text-xs text-white"
                required
              />
            </label>

            <label className="block text-[10px] font-bold tracking-widest uppercase">
              Description
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-2 w-full bg-black border border-crucible-border px-3 py-2 text-xs text-white min-h-20"
                required
              />
            </label>

            <label className="block text-[10px] font-bold tracking-widest uppercase">
              Builder Address
              <input
                value={builderAddress}
                onChange={(e) => setBuilderAddress(e.target.value)}
                className="mt-2 w-full bg-black border border-crucible-border px-3 py-2 text-xs text-white"
                required
              />
            </label>

            <label className="block text-[10px] font-bold tracking-widest uppercase">
              Reviewer Address
              <input
                value={reviewerAddress}
                onChange={(e) => setReviewerAddress(e.target.value)}
                className="mt-2 w-full bg-black border border-crucible-border px-3 py-2 text-xs text-white"
                required
              />
            </label>

            <label className="block text-[10px] font-bold tracking-widest uppercase">
              Budget (XLM)
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={budgetXlm}
                onChange={(e) => setBudgetXlm(e.target.value)}
                className="mt-2 w-full bg-black border border-crucible-border px-3 py-2 text-xs text-white"
                required
              />
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-crucible-gold text-black text-xs font-bold uppercase tracking-widest disabled:opacity-60"
            >
              {submitting ? "Signing with Freighter..." : "Create On-Chain Grant"}
            </button>

            {message && (
              <p className="text-[10px] text-crucible-cyan break-all">{message}</p>
            )}
            {error && (
              <p className="text-[10px] text-crucible-red break-all">{error}</p>
            )}
          </form>
        </div>
        )}

        <div className={isAdmin ? "lg:col-span-2 space-y-4" : "lg:col-span-3 space-y-4"}>
          <div className="flex justify-between items-center px-2">
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
              {isAdmin ? "Registered Grants" : "Grant Updates"} ({grants.length})
            </h2>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="panel-border h-28 animate-pulse bg-white/5"
                />
              ))}
            </div>
          ) : grants.length === 0 ? (
            <div className="panel-border p-8 text-sm text-zinc-500">
              {isAdmin
                ? "No grants yet. Create one with Freighter to get started."
                : "No grants published yet. Check back for updates from your admin."}
            </div>
          ) : (
            grants.map((grant) => {
              const canManage =
                isAdmin &&
                grant.on_chain_grant_id != null &&
                grant.status !== "cancelled";
              return (
              <div
                key={grant.id}
                className="panel-border p-6 group hover:border-crucible-gold/50 transition-all relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 h-1 bg-crucible-gold w-2/3" />
                <div className="flex flex-col md:flex-row justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                        {grant.title || `Grant #${grant.id}`}
                      </h3>
                      <span className="px-2 py-0.5 rounded-sm bg-crucible-gold/10 border border-crucible-gold text-[10px] font-bold text-crucible-gold tracking-widest flex items-center gap-1">
                        <Target className="w-3 h-3" /> {grant.status}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-500 mb-4">
                      {grant.description || "No description"}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 mb-2">
                      <div className="flex items-center gap-2 text-crucible-cyan text-sm font-bold">
                        <Zap className="w-4 h-4" />
                        {stroopsToXlm(grant.total_budget_stroops)} XLM
                      </div>
                      <div className="text-xs text-zinc-500 font-bold uppercase tracking-widest">
                        Escrow {stroopsToXlm(grant.escrowed_stroops)} · Chain #
                        {grant.on_chain_grant_id ?? "—"}
                      </div>
                      <div className="text-xs text-zinc-500 font-bold uppercase tracking-widest">
                        Builder {shortAddress(grant.builder_address)}
                      </div>
                    </div>
                    {grant.tx_hash && explorerTxUrl(grant.tx_hash) && (
                      <a
                        href={explorerTxUrl(grant.tx_hash)!}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-crucible-gold hover:underline"
                      >
                        View create tx →
                      </a>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 justify-center">
                    {isAdmin && (
                    <button
                      type="button"
                      disabled={!canManage}
                      onClick={() => openEscrowManager(grant)}
                      className="px-4 py-2 border border-crucible-cyan/60 text-crucible-cyan text-[10px] font-bold uppercase tracking-widest hover:bg-crucible-cyan/10 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      title={
                        canManage
                          ? "Deposit XLM into on-chain escrow"
                          : "Cancelled or missing on-chain grant ID"
                      }
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      Manage Escrow
                    </button>
                    )}
                    <Link
                      href={`/verification/${grant.id}`}
                      className="px-6 py-3 bg-white/5 hover:bg-crucible-gold hover:text-black border border-crucible-border hover:border-crucible-gold rounded-sm text-xs font-bold text-white uppercase tracking-widest transition-all flex items-center gap-2 justify-center"
                    >
                      {isAdmin ? "Open Review" : "View & Submit"}{" "}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            );
            })
          )}
        </div>
      </div>

      {isAdmin && escrowOpen && activeGrant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="panel-border bg-crucible-surface w-full max-w-md p-6 space-y-4 relative">
            <button
              type="button"
              onClick={() => {
                setEscrowOpen(false);
                setEscrowError(null);
              }}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
              <Wallet className="w-4 h-4 text-crucible-cyan" /> Manage Escrow
            </h3>
            <p className="text-[10px] text-zinc-500">
              Grant #{activeGrant.id} · On-chain #
              {activeGrant.on_chain_grant_id ?? "—"} · Provider{" "}
              {shortAddress(activeGrant.provider_address)}
            </p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-black/40 border border-crucible-border p-2">
                <p className="text-[9px] uppercase text-zinc-500">Budget</p>
                <p className="text-xs text-white font-bold">
                  {stroopsToXlm(activeGrant.total_budget_stroops)}
                </p>
              </div>
              <div className="bg-black/40 border border-crucible-border p-2">
                <p className="text-[9px] uppercase text-zinc-500">Escrow</p>
                <p className="text-xs text-crucible-cyan font-bold">
                  {stroopsToXlm(
                    activeGrant.live_escrow_stroops ??
                      activeGrant.escrowed_stroops
                  )}
                </p>
              </div>
              <div className="bg-black/40 border border-crucible-border p-2">
                <p className="text-[9px] uppercase text-zinc-500">Remaining</p>
                <p className="text-xs text-crucible-gold font-bold">
                  {stroopsToXlm(
                    Number(activeGrant.total_budget_stroops || 0) -
                      Number(
                        activeGrant.live_escrow_stroops ??
                          activeGrant.escrowed_stroops ??
                          0
                      )
                  )}
                </p>
              </div>
            </div>
            <label className="block text-[10px] font-bold tracking-widest uppercase">
              Deposit Amount (XLM)
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={depositXlm}
                onChange={(e) => setDepositXlm(e.target.value)}
                className="mt-2 w-full bg-black border border-crucible-border px-3 py-2 text-xs text-white"
              />
            </label>
            <p className="text-[10px] text-zinc-500">
              Signs <code>deposit_funds</code> with Freighter. XLM moves into
              the Grant Manager escrow on Testnet.
            </p>
            <button
              type="button"
              disabled={depositBusy}
              onClick={() => onDeposit(activeGrant)}
              className="w-full py-3 border border-crucible-cyan text-crucible-cyan text-xs font-bold uppercase tracking-widest hover:bg-crucible-cyan/10 disabled:opacity-60"
            >
              {depositBusy ? "Confirm in Freighter..." : "Deposit Funds"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEscrowOpen(false);
                setMilestoneOpen(true);
              }}
              className="w-full py-3 bg-white/5 border border-crucible-border text-white text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" /> Create Milestone
            </button>
            <Link
              href={`/verification/${activeGrant.id}`}
              className="block text-center text-[10px] text-crucible-gold uppercase tracking-widest"
            >
              Open verification →
            </Link>
            {escrowError && (
              <p className="text-[10px] text-crucible-red break-all">
                {escrowError}
              </p>
            )}
          </div>
        </div>
      )}

      {isAdmin && milestoneOpen && activeGrant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form
            onSubmit={onAddMilestone}
            className="panel-border bg-crucible-surface w-full max-w-md p-6 space-y-4 relative"
          >
            <button
              type="button"
              onClick={() => setMilestoneOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">
              Create Milestone
            </h3>
            <p className="text-[10px] text-zinc-500">
              Title/description stored in Postgres. Amount goes on-chain via{" "}
              <code>add_milestone</code>.
            </p>
            <label className="block text-[10px] font-bold tracking-widest uppercase">
              Title
              <input
                value={msTitle}
                onChange={(e) => setMsTitle(e.target.value)}
                className="mt-2 w-full bg-black border border-crucible-border px-3 py-2 text-xs text-white"
                required
              />
            </label>
            <label className="block text-[10px] font-bold tracking-widest uppercase">
              Description
              <textarea
                value={msDescription}
                onChange={(e) => setMsDescription(e.target.value)}
                className="mt-2 w-full bg-black border border-crucible-border px-3 py-2 text-xs text-white min-h-16"
              />
            </label>
            <label className="block text-[10px] font-bold tracking-widest uppercase">
              Payout Amount (XLM)
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={msAmount}
                onChange={(e) => setMsAmount(e.target.value)}
                className="mt-2 w-full bg-black border border-crucible-border px-3 py-2 text-xs text-white"
                required
              />
            </label>
            <label className="block text-[10px] font-bold tracking-widest uppercase">
              Deadline
              <input
                type="date"
                value={msDeadline}
                onChange={(e) => setMsDeadline(e.target.value)}
                className="mt-2 w-full bg-black border border-crucible-border px-3 py-2 text-xs text-white"
              />
            </label>
            <button
              type="submit"
              disabled={msBusy}
              className="w-full py-3 bg-crucible-gold text-black text-xs font-bold uppercase tracking-widest disabled:opacity-60"
            >
              {msBusy ? "Confirm in Freighter..." : "Add On-Chain Milestone"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
