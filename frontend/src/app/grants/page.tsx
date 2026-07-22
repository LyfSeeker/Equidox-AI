"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  Filter,
  Sparkles,
  ArrowRight,
  Zap,
  Target,
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
  STELLAR_NETWORK,
} from "@/lib/config";
import BrandIcon from "@/components/BrandIcon";

function isStellarAddress(value: string) {
  return /^G[A-Z0-9]{55}$/.test(value.trim());
}

function parseReturnU64(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string" && value !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    for (const key of ["u64", "u32", "i128", "value", "id", "_value"]) {
      if (key in o) {
        const nested = parseReturnU64(o[key]);
        if (nested != null) return nested;
      }
    }
  }
  return null;
}

function parseReturnU32(value: unknown): number | null {
  return parseReturnU64(value);
}

function assertTxSuccess(submitted: {
  hash?: string;
  status?: string;
  returnValue?: unknown;
}) {
  if (submitted?.status && submitted.status !== "SUCCESS") {
    throw new Error(
      `On-chain submit did not succeed (${submitted.status}). Hash: ${submitted.hash || "—"}. Nothing was saved — fix Freighter/network and retry.`
    );
  }
}

type DraftMilestone = {
  key: string;
  title: string;
  description: string;
  amountXlm: string;
  deadline: string;
};

function newDraftMilestone(partial?: Partial<DraftMilestone>): DraftMilestone {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: partial?.title || "Core deliverable",
    description:
      partial?.description ||
      "Acceptance criteria: what must be delivered and how it will be verified.",
    amountXlm: partial?.amountXlm || "2.5",
    deadline: partial?.deadline || "",
  };
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
  const [firstMilestone, setFirstMilestone] = useState<DraftMilestone>(
    newDraftMilestone({
      title: "Core Smart Contracts",
      description:
        "Ship and document Soroban grant manager + passport. Acceptance: contracts deployable on Mainnet, README with build steps, and at least one verified invoke.",
      amountXlm: "5",
    })
  );
  const [budgetXlm, setBudgetXlm] = useState("5");

  const [activeGrant, setActiveGrant] = useState<Grant | null>(null);
  const [escrowOpen, setEscrowOpen] = useState(false);
  const [depositXlm, setDepositXlm] = useState("");
  const [depositBusy, setDepositBusy] = useState(false);
  const [escrowError, setEscrowError] = useState<string | null>(null);
  /** Guided step after create / add-milestone: deposit this milestone's payout */
  const [depositStepLabel, setDepositStepLabel] = useState<string | null>(null);

  const [milestoneOpen, setMilestoneOpen] = useState(false);
  const [msTitle, setMsTitle] = useState("AI Verification Flow");
  const [msDescription, setMsDescription] = useState(
    "Working submit → AI analyze → approve/release path. Acceptance: builder can submit evidence; admin can refresh AI report against this criterion."
  );
  const [msAmount, setMsAmount] = useState("5");
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

  async function ensureWallet() {
    if (address) return address;
    return connect();
  }

  async function ensureFunded(addr: string) {
    const check = await api.checkAccount(addr);
    if (check.exists) return;

    if (STELLAR_NETWORK === "mainnet") {
      throw new Error(
        `Wallet ${shortAddress(addr)} is not funded on Mainnet. Send real XLM to it, then try again.`
      );
    }

    toast.info("Funding Testnet wallet via Friendbot...");
    await api.fundFriendbot(addr);
    toast.success("Wallet funded");
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
      // Any Freighter wallet the admin connects becomes the grant provider.
      const providerAddress = await ensureWallet();
      if (!isStellarAddress(providerAddress)) {
        throw new Error("Connect a valid Freighter wallet to create the grant.");
      }
      if (!isStellarAddress(builderAddress)) {
        throw new Error("Enter a valid builder wallet address (G…).");
      }
      if (!isStellarAddress(reviewerAddress)) {
        throw new Error("Enter a valid reviewer wallet address (G…).");
      }

      const amountStroops = Math.round(
        Number(firstMilestone.amountXlm) * 10_000_000
      );
      const totalBudgetStroops = Math.round(Number(budgetXlm) * 10_000_000);
      if (!firstMilestone.title.trim()) {
        throw new Error("First milestone: title is required");
      }
      if (!firstMilestone.description.trim()) {
        throw new Error(
          "First milestone: acceptance criteria (description) is required"
        );
      }
      if (!Number.isFinite(amountStroops) || amountStroops <= 0) {
        throw new Error("First milestone: enter a valid payout in XLM");
      }
      if (!Number.isFinite(totalBudgetStroops) || totalBudgetStroops <= 0) {
        throw new Error("Enter a valid grant budget in XLM");
      }
      if (totalBudgetStroops < amountStroops) {
        throw new Error(
          "Grant budget must be at least the first milestone payout"
        );
      }

      const milestone = {
        title: firstMilestone.title.trim(),
        description: firstMilestone.description.trim(),
        amountStroops,
        amountXlm: Number(firstMilestone.amountXlm),
        deadline: firstMilestone.deadline || null,
      };

      setSubmitting(true);
      await ensureFunded(providerAddress);

      const meta = await api.uploadMetadata({
        title,
        description,
        milestones: [
          {
            title: milestone.title,
            description: milestone.description,
            amountXlm: milestone.amountXlm,
            deadline: milestone.deadline,
          },
        ],
      });
      const unsigned = await api.buildCreateGrant({
        sourcePublicKey: providerAddress,
        providerAddress,
        builderAddress: builderAddress.trim(),
        reviewerAddress: reviewerAddress.trim(),
        totalBudgetStroops,
        metadataHash: meta.metadataHash,
      });

      toast.info(
        "Confirm create_grant in Freighter",
        `Mainnet · ${shortAddress(providerAddress)} — approve and wait for confirmation`
      );
      const submitted = await signAndSubmit(unsigned);
      assertTxSuccess(submitted);
      const onChainGrantId = parseReturnU64(submitted.returnValue);

      if (onChainGrantId == null) {
        throw new Error(
          `create_grant confirmed (${submitted.hash?.slice(0, 10)}…) but no grant id was returned. Check Freighter is on Mainnet and retry — nothing was saved to the database.`
        );
      }

      const record = await api.createGrantRecord({
        providerAddress,
        builderAddress: builderAddress.trim(),
        reviewerAddress: reviewerAddress.trim(),
        title,
        description,
        totalBudgetStroops,
        metadataHash: meta.metadataHash,
        onChainGrantId,
        txHash: submitted.hash,
        status: "active",
      });

      await api.indexEvent({
        eventName: "GrantCreated",
        payload: {
          grant_id: onChainGrantId,
          provider: providerAddress,
          builder: builderAddress.trim(),
          reviewer: reviewerAddress.trim(),
          total_budget: totalBudgetStroops,
          milestone_count: 1,
        },
        txHash: submitted.hash,
      });
      toast.success("Grant created on Mainnet", `On-chain #${onChainGrantId}`);

      toast.info("Confirm add_milestone in Freighter", milestone.title);
      const msUnsigned = await api.buildAddMilestone({
        sourcePublicKey: providerAddress,
        providerAddress,
        onChainGrantId,
        amountStroops: milestone.amountStroops,
      });
      const msSubmitted = await signAndSubmit(msUnsigned);
      assertTxSuccess(msSubmitted);
      const onChainMilestoneId =
        parseReturnU32(msSubmitted.returnValue) ?? 0;

      await api.createMilestone({
        grantId: record.id,
        title: milestone.title,
        description: milestone.description,
        amountStroops: milestone.amountStroops,
        onChainMilestoneId,
        deadline: milestone.deadline,
        txHash: msSubmitted.hash,
        status: "pending",
      });

      await api.indexEvent({
        eventName: "MilestoneAdded",
        payload: {
          grant_id: onChainGrantId,
          milestone_id: onChainMilestoneId,
          amount: milestone.amountStroops,
          title: milestone.title,
          description: milestone.description,
        },
        txHash: msSubmitted.hash,
      });

      setMessage(
        `Grant #${record.id} + milestone #${onChainMilestoneId} created with provider ${shortAddress(providerAddress)}. Deposit escrow next.`
      );
      toast.success(
        "Grant + first milestone on-chain",
        "Next: deposit funds for this milestone"
      );
      await load();
      await openEscrowManager(record, {
        depositXlm: String(milestone.amountXlm),
        stepLabel: `Deposit ${milestone.amountXlm} XLM for “${milestone.title}”, then add more milestones if needed.`,
      });
    } catch (err) {
      const e = err as Error & { hint?: string };
      const msg = e instanceof Error ? e.message : "Grant creation failed";
      const display = e?.hint ? `${msg}\n\n${e.hint}` : msg;
      setError(display);
      toast.error("Create grant failed", e?.hint || msg);
      if (
        STELLAR_NETWORK !== "mainnet" &&
        /Account not found/i.test(msg) &&
        address
      ) {
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

  async function openEscrowManager(
    grant: Grant,
    opts?: { depositXlm?: string; stepLabel?: string | null }
  ) {
    setEscrowError(null);
    setError(null);
    setDepositStepLabel(opts?.stepLabel ?? null);

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
      if (opts?.depositXlm != null) {
        setDepositXlm(opts.depositXlm);
      } else {
        const budget = Number(fresh.total_budget_stroops || 0);
        const escrowed = Number(
          fresh.live_escrow_stroops ?? fresh.escrowed_stroops ?? 0
        );
        const remaining = Math.max(budget - escrowed, 0);
        const defaultDeposit =
          remaining > 0 ? remaining / 10_000_000 : Number(budgetXlm) || 1;
        setDepositXlm(String(defaultDeposit));
      }
      setEscrowOpen(true);
      toast.info(
        opts?.stepLabel ? "Deposit funds" : "Escrow manager opened",
        `Chain grant #${fresh.on_chain_grant_id}`
      );
    } catch (err) {
      setActiveGrant(grant);
      if (opts?.depositXlm != null) {
        setDepositXlm(opts.depositXlm);
      } else {
        const budget = Number(grant.total_budget_stroops || 0);
        const escrowed = Number(grant.escrowed_stroops || 0);
        const remaining = Math.max(budget - escrowed, 0);
        setDepositXlm(
          String(remaining > 0 ? remaining / 10_000_000 : Number(budgetXlm) || 1)
        );
      }
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
          `Switch Freighter to the grant provider wallet (${shortAddress(grant.provider_address)}) to deposit escrow. Any funded wallet can be provider when creating a new grant.`
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
      assertTxSuccess(submitted);

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
      setDepositStepLabel(
        "Escrow funded. Add another milestone when ready, then deposit its payout."
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
      assertTxSuccess(submitted);
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

      const newBudget =
        Number(activeGrant.total_budget_stroops || 0) + amountStroops;
      const patched = await api.updateGrant(activeGrant.id, {
        totalBudgetStroops: newBudget,
      });

      toast.success(
        "Milestone created on-chain",
        `ID ${onChainMilestoneId} · DB #${m.id}`
      );
      setMilestoneOpen(false);
      await load();
      await openEscrowManager(patched, {
        depositXlm: String(Number(msAmount)),
        stepLabel: `Deposit ${msAmount} XLM for “${msTitle}” (or skip if already covered by escrow).`,
      });
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
      <div className="panel-static p-8 mb-10 relative overflow-hidden">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-crucible-gold/20 border border-crucible-gold flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-crucible-gold" />
          </div>
          <h1 className="page-title !text-2xl">Grants</h1>
        </div>
        <p className="page-desc !mt-1">
          {isAdmin
            ? "Connect any Freighter wallet as grant provider, enter any builder/reviewer wallets, create the first milestone, then deposit escrow."
            : "Browse grants and open one to submit your delivery documents for review."}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {isAdmin && (
        <div className="lg:col-span-1 space-y-6">
          <form onSubmit={onCreateGrant} className="panel-border p-5 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest border-b border-crucible-border pb-2 flex items-center gap-2">
              <Filter className="w-4 h-4 text-crucible-gold" /> Create Grant
            </h3>

            <div className="border border-crucible-gold/30 bg-crucible-gold/5 px-3 py-2 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-crucible-gold">
                Provider wallet (from Freighter)
              </p>
              <p className="text-xs text-white break-all font-mono">
                {address ? address : "Connect any Freighter wallet to continue"}
              </p>
              <p className="text-[9px] text-zinc-500 font-sans normal-case tracking-normal">
                Any funded Mainnet wallet you connect can create a grant. Switch
                Freighter accounts anytime — the connected wallet becomes the
                provider and signs create/deposit.
              </p>
              {!address && (
                <button
                  type="button"
                  onClick={() => void connect()}
                  className="mt-1 text-[10px] font-bold uppercase tracking-widest text-crucible-cyan hover:underline"
                >
                  Connect Freighter
                </button>
              )}
            </div>

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
              Builder Address (any G… wallet)
              <input
                value={builderAddress}
                onChange={(e) => setBuilderAddress(e.target.value.trim())}
                placeholder="G..."
                className="mt-2 w-full bg-black border border-crucible-border px-3 py-2 text-xs text-white"
                required
              />
            </label>

            <label className="block text-[10px] font-bold tracking-widest uppercase">
              Reviewer Address (any G… wallet)
              <input
                value={reviewerAddress}
                onChange={(e) => setReviewerAddress(e.target.value.trim())}
                placeholder="G..."
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
                className="mt-2 w-full bg-black border border-crucible-border px-3 py-2 text-xs text-crucible-gold tabular-nums"
                required
              />
              <span className="mt-1 block text-[9px] text-zinc-600 normal-case tracking-normal font-sans">
                Total grant budget. Must be at least the first milestone payout.
              </span>
            </label>

            <div className="space-y-3 border border-crucible-border bg-black/30 p-3">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-white">
                First milestone / AI criteria
              </h4>
              <p className="text-[9px] text-zinc-500 font-sans normal-case tracking-normal">
                After create you will be asked to deposit this payout. Add more
                milestones from Manage Escrow next.
              </p>
              <div className="border border-crucible-border bg-crucible-bg p-3 space-y-2">
                <input
                  value={firstMilestone.title}
                  onChange={(e) =>
                    setFirstMilestone((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  placeholder="Title"
                  className="w-full bg-black border border-crucible-border px-2 py-1.5 text-xs text-white"
                  required
                />
                <textarea
                  value={firstMilestone.description}
                  onChange={(e) =>
                    setFirstMilestone((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Acceptance criteria for AI + reviewer…"
                  className="w-full bg-black border border-crucible-border px-2 py-1.5 text-xs text-white min-h-16"
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                    Payout XLM
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={firstMilestone.amountXlm}
                      onChange={(e) => {
                        const next = e.target.value;
                        setFirstMilestone((prev) => ({
                          ...prev,
                          amountXlm: next,
                        }));
                        const payout = Number(next);
                        const budget = Number(budgetXlm);
                        if (
                          Number.isFinite(payout) &&
                          payout > 0 &&
                          (!Number.isFinite(budget) || budget < payout)
                        ) {
                          setBudgetXlm(next);
                        }
                      }}
                      className="mt-1 w-full bg-black border border-crucible-border px-2 py-1.5 text-xs text-white"
                      required
                    />
                  </label>
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                    Deadline
                    <input
                      type="date"
                      value={firstMilestone.deadline}
                      onChange={(e) =>
                        setFirstMilestone((prev) => ({
                          ...prev,
                          deadline: e.target.value,
                        }))
                      }
                      className="mt-1 w-full bg-black border border-crucible-border px-2 py-1.5 text-xs text-white"
                    />
                  </label>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-crucible-gold text-black text-xs font-bold uppercase tracking-widest disabled:opacity-60"
            >
              {submitting
                ? "Confirm Freighter prompts…"
                : address
                  ? `Create with ${shortAddress(address)}`
                  : "Connect wallet & create grant"}
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
                      <BrandIcon name="escrow" className="w-3.5 h-3.5" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
          <div className="panel-static bg-crucible-surface w-full max-w-lg my-auto p-6 md:p-8 space-y-4 relative max-h-[min(90vh,720px)] overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                setEscrowOpen(false);
                setEscrowError(null);
                setDepositStepLabel(null);
              }}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white z-10"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2 pr-8">
              <BrandIcon name="escrow" className="w-4 h-4 text-crucible-cyan" /> Manage Escrow
            </h3>
            <p className="text-[10px] text-zinc-500">
              Grant #{activeGrant.id} · On-chain #
              {activeGrant.on_chain_grant_id ?? "—"} · Provider{" "}
              {shortAddress(activeGrant.provider_address)}
            </p>
            {depositStepLabel && (
              <div className="border border-crucible-gold/40 bg-crucible-gold/10 px-3 py-2 text-[10px] text-crucible-gold leading-relaxed">
                {depositStepLabel}
              </div>
            )}
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
              the Grant Manager escrow on Mainnet.
            </p>
            <button
              type="button"
              disabled={depositBusy}
              onClick={() => onDeposit(activeGrant)}
              className="w-full py-3 bg-crucible-cyan text-black text-xs font-bold uppercase tracking-widest hover:bg-crucible-cyan/90 disabled:opacity-60"
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
              <BrandIcon name="milestone" className="w-3.5 h-3.5" /> Add Another Milestone
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
          <form
            onSubmit={onAddMilestone}
            className="panel-static bg-crucible-surface w-full max-w-xl my-auto p-6 md:p-8 space-y-4 relative max-h-[min(90vh,760px)] overflow-y-auto"
          >
            <button
              type="button"
              onClick={() => setMilestoneOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white z-10"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-sm md:text-base font-bold text-white uppercase tracking-widest flex items-center gap-2 pr-8">
              <BrandIcon name="milestone" className="w-4 h-4 text-crucible-gold shrink-0" />
              Create Milestone
            </h3>
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              After this milestone is on-chain you will be asked to deposit its
              payout into escrow. Acceptance criteria are stored for AI review.
            </p>
            <label className="block text-[10px] font-bold tracking-widest uppercase">
              Title
              <input
                value={msTitle}
                onChange={(e) => setMsTitle(e.target.value)}
                className="mt-2 w-full bg-black border border-crucible-border px-3 py-2.5 text-xs text-white"
                required
              />
            </label>
            <label className="block text-[10px] font-bold tracking-widest uppercase">
              Acceptance criteria (AI)
              <textarea
                value={msDescription}
                onChange={(e) => setMsDescription(e.target.value)}
                className="mt-2 w-full bg-black border border-crucible-border px-3 py-2.5 text-xs text-white min-h-28 resize-y"
                required
              />
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block text-[10px] font-bold tracking-widest uppercase">
                Payout Amount (XLM)
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={msAmount}
                  onChange={(e) => setMsAmount(e.target.value)}
                  className="mt-2 w-full bg-black border border-crucible-border px-3 py-2.5 text-xs text-white"
                  required
                />
              </label>
              <label className="block text-[10px] font-bold tracking-widest uppercase">
                Deadline
                <input
                  type="date"
                  value={msDeadline}
                  onChange={(e) => setMsDeadline(e.target.value)}
                  className="mt-2 w-full bg-black border border-crucible-border px-3 py-2.5 text-xs text-white"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={msBusy}
              className="w-full py-3.5 bg-crucible-gold text-black text-xs font-bold uppercase tracking-widest disabled:opacity-60"
            >
              {msBusy ? "Confirm in Freighter..." : "Add On-Chain Milestone"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
