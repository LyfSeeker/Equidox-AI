"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Bot,
  Globe,
  FileText,
  Code2,
  DollarSign,
  ExternalLink,
} from "lucide-react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, analysisFromMilestoneReport, type Analysis, type Grant, type Milestone } from "@/lib/api";
import { useWallet } from "@/context/WalletContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  shortAddress,
  stroopsToXlm,
  explorerTxUrl,
  explorerAccountUrl,
} from "@/lib/config";
import LifecycleTimeline, {
  buildMilestoneTimeline,
} from "@/components/LifecycleTimeline";

export default function VerificationView() {
  const params = useParams();
  const grantId = String(params.id);
  const { address, connect, signAndSubmit } = useWallet();
  const { isAdmin } = useAuth();
  const toast = useToast();

  const [grant, setGrant] = useState<Grant | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [repoUrl, setRepoUrl] = useState(
    "https://github.com/stellar/soroban-examples"
  );
  const [demoUrl, setDemoUrl] = useState("");
  const [docsUrl, setDocsUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [commitSha, setCommitSha] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [verificationHash, setVerificationHash] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [txStep, setTxStep] = useState<string | null>(null);
  const [premiumType, setPremiumType] = useState("Deep Code Review");
  const [loading, setLoading] = useState(true);

  // Inline milestone creation details
  const [msTitle, setMsTitle] = useState("Core deliverable");
  const [msDescription, setMsDescription] = useState(
    "Describe what must be completed for this milestone payout."
  );
  const [msAmount, setMsAmount] = useState("2.5");
  const [msDeadline, setMsDeadline] = useState("");
  const [creatingMs, setCreatingMs] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const selected = milestones.find((m) => m.id === selectedId) || milestones[0];

  function hydrateFromMilestone(m: Milestone | undefined | null) {
    if (!m) {
      setAnalysis(null);
      setVerificationHash(null);
      setRepoUrl("https://github.com/stellar/soroban-examples");
      setDemoUrl("");
      setDocsUrl("");
      setNotes("");
      setCommitSha("");
      return;
    }
    const ev = m.evidence_json;
    setRepoUrl(ev?.repoUrl || "https://github.com/stellar/soroban-examples");
    setDemoUrl(ev?.demoUrl || "");
    setDocsUrl(ev?.docsUrl || "");
    setNotes(ev?.notes || "");
    setCommitSha(ev?.commitSha || "");
    setVerificationHash(m.verification_hash || null);
    setAnalysis(analysisFromMilestoneReport(m.latest_report));
  }

  function selectMilestone(id: number) {
    const m = milestones.find((row) => row.id === id);
    setSelectedId(id);
    setError(null);
    setStatus(null);
    hydrateFromMilestone(m);
  }

  useEffect(() => {
    hydrateFromMilestone(selected);
    // Only when the selected milestone identity changes — load() refreshes
    // the same id via setMilestones + explicit hydrate below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  function parseReturnId(value: unknown): number | null {
    if (value == null) return null;
    if (typeof value === "number") return value;
    if (typeof value === "bigint") return Number(value);
    if (typeof value === "string" && value !== "") return Number(value);
    return null;
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const g = await api.getGrant(grantId);
      setGrant(g);
      const ms = await api.listMilestones(grantId).catch(() => []);
      // Heal status from chain for each milestone (best-effort), keep AI reports
      const healed = await Promise.all(
        ms.map(async (row) => {
          if (
            row.on_chain_milestone_id == null ||
            g.on_chain_grant_id == null
          ) {
            return row;
          }
          try {
            const s = await api.syncMilestone({
              milestoneId: row.id,
              onChainGrantId: g.on_chain_grant_id,
              onChainMilestoneId: row.on_chain_milestone_id,
            });
            return {
              ...row,
              ...(s.milestone || {}),
              latest_report: row.latest_report,
            };
          } catch {
            return row;
          }
        })
      );
      setMilestones(healed);
      let nextId: number | null = null;
      setSelectedId((prev) => {
        nextId =
          prev && healed.some((m) => m.id === prev)
            ? prev
            : (healed[0]?.id ?? null);
        return nextId;
      });
      hydrateFromMilestone(
        healed.find((m) => m.id === nextId) || healed[0] || null
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load grant");
    } finally {
      setLoading(false);
    }
  }, [grantId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grantId]);

  async function ensureWallet() {
    if (!address) return connect();
    return address;
  }

  async function ensureFunded(addr: string) {
    const check = await api.checkAccount(addr);
    if (!check.exists) {
      toast.info("Funding Testnet wallet...");
      await api.fundFriendbot(addr);
    }
  }

  const onChainGrantId = grant?.on_chain_grant_id ?? 0;
  const onChainMilestoneId = selected?.on_chain_milestone_id ?? 0;

  async function createMilestoneWithDetails(e: FormEvent) {
    e.preventDefault();
    if (!isAdmin) {
      setError("Only admins can set milestones.");
      return;
    }
    setCreatingMs(true);
    setError(null);
    setTxStep("Creating on-chain milestone...");
    try {
      const provider = await ensureWallet();
      await ensureFunded(provider);
      if (grant?.on_chain_grant_id == null) {
        throw new Error("Grant has no on-chain ID — create/sync grant first");
      }
      if (grant.provider_address && provider !== grant.provider_address) {
        throw new Error("Connect the grant provider wallet to add milestones");
      }

      const amountStroops = Math.round(Number(msAmount) * 10_000_000);
      if (!Number.isFinite(amountStroops) || amountStroops <= 0) {
        throw new Error("Enter a valid milestone payout amount");
      }

      const unsigned = await api.buildAddMilestone({
        sourcePublicKey: provider,
        providerAddress: provider,
        onChainGrantId: grant.on_chain_grant_id,
        amountStroops,
      });
      toast.info("Confirm add_milestone in Freighter");
      const submitted = await signAndSubmit(unsigned);
      const chainMid = parseReturnId(submitted.returnValue) ?? 0;

      const m = await api.createMilestone({
        grantId: Number(grantId),
        title: msTitle,
        description: msDescription,
        amountStroops,
        onChainMilestoneId: chainMid,
        deadline: msDeadline || null,
        txHash: submitted.hash,
        status: "pending",
      });

      await api.indexEvent({
        eventName: "MilestoneAdded",
        payload: {
          grant_id: grant.on_chain_grant_id,
          milestone_id: chainMid,
          amount: amountStroops,
          title: msTitle,
          description: msDescription,
        },
        txHash: submitted.hash,
      });

      setSelectedId(m.id);
      hydrateFromMilestone(m);
      setShowCreateForm(false);
      setStatus(`Milestone created: ${msTitle} (chain #${chainMid})`);
      toast.success("Milestone ready", "You can submit evidence details now");
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Create milestone failed";
      setError(msg);
      toast.error("Create milestone failed", msg);
    } finally {
      setCreatingMs(false);
      setTxStep(null);
    }
  }

  async function submitEvidence(e: FormEvent) {
    e.preventDefault();
    if (isAdmin) {
      setError("Admins review submissions. Sign in as a user to submit documents.");
      return;
    }
    setBusy(true);
    setError(null);
    setTxStep("Building submit_milestone...");
    try {
      const builder = await ensureWallet();
      await ensureFunded(builder);
      if (!selected) throw new Error("Create a milestone with details first");
      if (selected.on_chain_milestone_id == null) {
        throw new Error("Milestone missing on-chain ID");
      }
      if (!repoUrl.trim()) throw new Error("GitHub repo URL is required");

      const built = await api.submitMilestone({
        milestoneId: selected.id,
        repoUrl,
        demoUrl,
        docsUrl,
        notes,
        commitSha,
        builderAddress: builder,
        onChainGrantId,
        onChainMilestoneId: selected.on_chain_milestone_id,
      });

      setTxStep("Confirm submit in Freighter...");
      const submitted = await signAndSubmit(built.unsignedTransaction);
      await api.updateMilestone(selected.id, {
        status: "submitted",
        evidenceHash: built.evidenceHash,
        submitTxHash: submitted.hash,
        evidenceJson: {
          repoUrl,
          demoUrl,
          docsUrl,
          notes: notes || null,
          commitSha: commitSha || null,
          milestoneTitle: selected.title,
          submittedAt: new Date().toISOString(),
        },
        evidenceIpfsCid: built.ipfsCid || null,
      });
      await api.indexEvent({
        eventName: "MilestoneSubmitted",
        payload: {
          grant_id: onChainGrantId,
          milestone_id: selected.on_chain_milestone_id,
          builder,
          evidence_hash: built.evidenceHash,
          notes: notes || null,
        },
        txHash: submitted.hash,
      });
      setStatus(`Evidence submitted. Tx: ${submitted.hash}`);
      toast.success("Evidence details anchored on-chain");
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Submit failed";
      setError(msg);
      toast.error("Submit failed", msg);
    } finally {
      setBusy(false);
      setTxStep(null);
    }
  }

  async function runVerification(e: FormEvent) {
    e.preventDefault();
    if (!isAdmin) {
      setError("Only admins can review submitted documents.");
      return;
    }
    setBusy(true);
    setError(null);
    setTxStep("Running AI analysis...");
    try {
      await anchorVerificationAnalysis();
    } catch (err) {
      let msg = err instanceof Error ? err.message : "Verification failed";
      if (/Error\(Contract,\s*#3\)/i.test(msg) || /Contract,\s*#3/.test(msg)) {
        msg =
          "Unauthorized (#3): this Freighter wallet is not allowed to store verification on-chain. Use the grant provider/reviewer wallet, or ask the contract admin to set you as Verification Operator.";
      } else if (/Error\(Contract,\s*#6\)/i.test(msg)) {
        msg =
          "Invalid status (#6): this milestone was already analyzed on-chain. Refresh and use Approve & Release, or re-run Analyze to refresh the AI report only.";
      }
      setError(msg);
      toast.error("Verification failed", msg);
    } finally {
      setBusy(false);
      setTxStep(null);
    }
  }

  /** Runs AI analysis and anchors on-chain when needed. Returns after under_review. */
  async function anchorVerificationAnalysis() {
    const operator = await ensureWallet();
    await ensureFunded(operator);
    if (!selected) throw new Error("Select a milestone first");

    setTxStep("Syncing on-chain milestone status...");
    let synced = await api.syncMilestone({
      milestoneId: selected.id,
      onChainGrantId,
      onChainMilestoneId: selected.on_chain_milestone_id ?? 0,
    });
    let liveStatus = synced.chain?.status || synced.milestone.status;

    // Evidence exists in DB but never made it on-chain → submit first.
    if (
      (liveStatus === "pending" || liveStatus === "rejected") &&
      (selected.evidence_hash || synced.milestone.evidence_hash)
    ) {
      setTxStep("Confirm submit_milestone in Freighter (heal pending)...");
      toast.info(
        "Evidence not on-chain yet",
        "Confirm submit_milestone in Freighter"
      );
      const rebuilt = await api.buildResubmitEvidence({
        milestoneId: selected.id,
        builderAddress: operator,
        onChainGrantId,
        onChainMilestoneId: selected.on_chain_milestone_id ?? 0,
      });
      try {
        const submitted = await signAndSubmit(rebuilt.unsignedTransaction);
        await api.updateMilestone(selected.id, {
          status: "submitted",
          evidenceHash: rebuilt.evidenceHash,
          submitTxHash: submitted.hash,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // Already submitted on-chain
        if (!/Error\(Contract,\s*#6\)/i.test(msg)) throw err;
      }
      synced = await api.syncMilestone({
        milestoneId: selected.id,
        onChainGrantId,
        onChainMilestoneId: selected.on_chain_milestone_id ?? 0,
      });
      liveStatus = synced.chain?.status || "submitted";
    }

    setTxStep("Running AI analysis...");
    const result = await api.verifyMilestone({
      milestoneId: selected.id,
      repoUrl,
      demoUrl,
      docsUrl,
      operatorAddress: operator,
      onChainGrantId,
      onChainMilestoneId: selected.on_chain_milestone_id ?? 0,
    });

    if (
      result.alreadyAnchored ||
      !result.unsignedTransaction ||
      ["under_review", "approved", "paid"].includes(liveStatus)
    ) {
      setAnalysis(result.analysis);
      setVerificationHash(
        result.verificationHash || synced.milestone.verification_hash || null
      );
      toast.success(
        "AI report ready",
        result.analysis?.recommended_action
          ? `Recommendation: ${result.analysis.recommended_action}`
          : "Already verified on-chain"
      );
      setStatus(
        "AI report ready. Verification already on-chain — you can Approve & Release."
      );
      await load();
      return { ...result, alreadyAnchored: true };
    }

    setTxStep("Confirm store_verification_hash in Freighter...");
    try {
      const submitted = await signAndSubmit(result.unsignedTransaction);
      await api.updateMilestone(selected.id, {
        status: "under_review",
        verificationHash: result.verificationHash,
        verifyTxHash: submitted.hash,
      });
      await api.indexEvent({
        eventName: "AiVerificationAdded",
        payload: {
          grant_id: onChainGrantId,
          milestone_id: selected.on_chain_milestone_id,
          verification_hash: result.verificationHash,
          operator,
        },
        txHash: submitted.hash,
      });
      setAnalysis(result.analysis);
      setVerificationHash(result.verificationHash);
      setStatus(`AI hash anchored. Tx: ${submitted.hash}`);
      toast.success(
        "AI report ready",
        result.analysis?.recommended_action
          ? `Recommendation: ${result.analysis.recommended_action}`
          : "Verification hash stored on Stellar"
      );
      await load();
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/Error\(Contract,\s*#6\)/i.test(msg) || /Contract,\s*#6/.test(msg)) {
        await api.syncMilestone({
          milestoneId: selected.id,
          onChainGrantId,
          onChainMilestoneId: selected.on_chain_milestone_id ?? 0,
        });
        setAnalysis(result.analysis);
        setVerificationHash(result.verificationHash);
        toast.success(
          "Already verified on-chain",
          "Synced status — you can Approve & Release"
        );
        setStatus("On-chain status was already under_review. Synced.");
        await load();
        return { ...result, alreadyAnchored: true };
      }
      throw err;
    }
  }

  async function approveAndRelease() {
    if (!isAdmin) {
      setError("Only admins can approve and release funds.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const reviewer = await ensureWallet();
      await ensureFunded(reviewer);
      if (!selected) throw new Error("Select a milestone");

      const escrow = Number(
        grant?.live_escrow_stroops ?? grant?.escrowed_stroops ?? 0
      );
      const payout = Number(selected.amount_stroops || 0);
      if (escrow < payout) {
        throw new Error(
          `Insufficient escrow: need ${stroopsToXlm(payout)} XLM locked, but escrow is ${stroopsToXlm(escrow)} XLM. Open Grants → Manage Escrow and deposit funds before approving.`
        );
      }

      setTxStep("Syncing on-chain status...");
      const synced = await api.syncMilestone({
        milestoneId: selected.id,
        onChainGrantId,
        onChainMilestoneId: selected.on_chain_milestone_id ?? 0,
      });
      let milestoneStatus =
        synced.chain?.status || synced.milestone.status || selected.status;

      if (
        milestoneStatus === "submitted" ||
        milestoneStatus === "pending" ||
        milestoneStatus === "rejected"
      ) {
        toast.info(
          "Finishing on-chain steps first",
          "Confirm Freighter prompts (submit → analyze) if shown"
        );
        await anchorVerificationAnalysis();
        const again = await api.syncMilestone({
          milestoneId: selected.id,
          onChainGrantId,
          onChainMilestoneId: selected.on_chain_milestone_id ?? 0,
        });
        milestoneStatus =
          again.chain?.status || again.milestone.status || "under_review";
      }

      if (
        milestoneStatus !== "under_review" &&
        milestoneStatus !== "approved"
      ) {
        if (milestoneStatus === "paid") {
          throw new Error("This milestone is already paid. Refresh the page.");
        }
        throw new Error(
          `Milestone must be under_review or approved before release. Current on-chain status: ${milestoneStatus}`
        );
      }

      let approveHash: string | null =
        synced.milestone.approve_tx_hash || selected.approve_tx_hash || null;

      // Build approve and release separately. Simulating release_funds while the
      // milestone is still UnderReview fails with Contract #6 (InvalidStatus).
      if (milestoneStatus !== "approved") {
        setTxStep("Building approve_milestone...");
        const approveBuilt = await api.buildApproveRelease({
          reviewerAddress: reviewer,
          onChainGrantId,
          onChainMilestoneId: selected.on_chain_milestone_id ?? 0,
          step: "approve",
        });
        setTxStep("Confirm approve_milestone in Freighter...");
        try {
          const approveResult = await signAndSubmit(approveBuilt.transaction);
          approveHash = approveResult.hash;
          await api.updateMilestone(selected.id, {
            status: "approved",
            approveTxHash: approveResult.hash,
          });
          await api.indexEvent({
            eventName: "MilestoneApproved",
            payload: {
              grant_id: onChainGrantId,
              milestone_id: selected.on_chain_milestone_id,
              reviewer,
            },
            txHash: approveResult.hash,
          });
          milestoneStatus = "approved";
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (/Error\(Contract,\s*#6\)/i.test(msg)) {
            const s = await api.syncMilestone({
              milestoneId: selected.id,
              onChainGrantId,
              onChainMilestoneId: selected.on_chain_milestone_id ?? 0,
            });
            milestoneStatus =
              s.chain?.status || s.milestone.status || milestoneStatus;
            if (milestoneStatus !== "approved" && milestoneStatus !== "paid") {
              throw err;
            }
            toast.info("Already approved on-chain", "Continuing to release…");
          } else {
            throw err;
          }
        }
      }

      if (milestoneStatus === "paid") {
        toast.success("Already paid", "This milestone was already released");
        await load();
        return;
      }

      const liveGrant = await api.getGrant(grantId).catch(() => grant);
      const liveEscrow = Number(
        liveGrant?.live_escrow_stroops ??
          liveGrant?.escrowed_stroops ??
          escrow
      );
      if (liveEscrow < payout) {
        throw new Error(
          `Insufficient escrow after approve: need ${stroopsToXlm(payout)} XLM, have ${stroopsToXlm(liveEscrow)} XLM. Deposit more via Grants → Manage Escrow, then click Approve & Release again to finish payout.`
        );
      }

      setTxStep("Building release_funds...");
      const releaseBuilt = await api.buildApproveRelease({
        reviewerAddress: reviewer,
        onChainGrantId,
        onChainMilestoneId: selected.on_chain_milestone_id ?? 0,
        step: "release",
      });
      setTxStep("Confirm release_funds in Freighter...");
      const releaseResult = await signAndSubmit(releaseBuilt.transaction);
      await api.updateMilestone(selected.id, {
        status: "paid",
        releaseTxHash: releaseResult.hash,
      });
      await api.indexEvent({
        eventName: "PaymentReleased",
        payload: {
          grant_id: onChainGrantId,
          milestone_id: selected.on_chain_milestone_id,
          builder: grant?.builder_address,
          amount: selected.amount_stroops,
        },
        txHash: releaseResult.hash,
      });
      await api.indexEvent({
        eventName: "PassportUpdated",
        payload: { builder: grant?.builder_address },
        txHash: releaseResult.hash,
      });

      setStatus(
        `Approved & released. Approve: ${approveHash || "—"} · Release: ${releaseResult.hash}`
      );
      toast.success("Funds released · Passport updated");
      await load();
    } catch (err) {
      let msg = err instanceof Error ? err.message : "Approve/release failed";
      if (/Error\(Contract,\s*#7\)/i.test(msg) || /Insufficient escrow/i.test(msg)) {
        msg = msg.includes("Insufficient escrow")
          ? msg
          : "Insufficient escrow (#7): deposit XLM into the grant escrow (Grants → Manage Escrow) before releasing funds.";
      } else if (/Error\(Contract,\s*#6\)/i.test(msg)) {
        msg =
          "Invalid status (#6): refresh the page. If still stuck, run Refresh AI Report once, then Approve again.";
      } else if (/Error\(Contract,\s*#8\)/i.test(msg)) {
        msg =
          "Already paid (#8): this milestone was already released. Refresh the page.";
      } else if (/Error\(Contract,\s*#17\)/i.test(msg)) {
        msg =
          "Reviewer mismatch (#17): connect the Freighter wallet set as this grant's reviewer.";
      }
      setError(msg);
      toast.error("Approve/release failed", msg);
    } finally {
      setBusy(false);
      setTxStep(null);
    }
  }

  async function unlockPremium() {
    setBusy(true);
    setError(null);
    try {
      try {
        const result = await api.premiumReport({
          repoUrl,
          reportType: premiumType,
          demoUrl,
          docsUrl,
        });
        setStatus(`Premium report ready. Hash: ${result.ipfsHash?.slice(0, 16)}...`);
        if (result.analysis && typeof result.analysis === "object") {
          setAnalysis((prev) => ({
            ...(prev || ({} as Analysis)),
            ...(result.analysis as Analysis),
          }));
        }
        toast.success("Premium analysis ready");
      } catch (err) {
        const e = err as Error & { status?: number; x402?: { price?: string } };
        if (e.status === 402) {
          const payer = await ensureWallet();
          const fakeReceipt = `demo-x402-${Date.now()}`;
          await api.recordX402Payment({
            txHash: fakeReceipt,
            amount: e.x402?.price || 1000000,
            payerAddress: payer,
            reportType: premiumType,
          });
          const result = await api.premiumReport({
            repoUrl,
            reportType: premiumType,
            demoUrl,
            docsUrl,
            paymentReceipt: fakeReceipt,
          });
          setStatus(`Premium unlocked via x402 receipt ${fakeReceipt}`);
          if (result.analysis) {
            setAnalysis((prev) => ({
              ...(prev || ({} as Analysis)),
              ...(result.analysis as Analysis),
            }));
          }
          toast.success("x402 payment recorded · premium unlocked");
        } else {
          throw err;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Premium unlock failed";
      // Graceful fallback: run free-tier analysis style premium without paywall
      try {
        const result = await api.premiumReport({
          repoUrl,
          reportType: premiumType,
          demoUrl,
          docsUrl,
        });
        if (result.analysis) {
          setAnalysis((prev) => ({
            ...(prev || ({} as Analysis)),
            ...(result.analysis as Analysis),
          }));
        }
        toast.info("Premium fallback (x402 unavailable)", msg);
      } catch {
        setError(msg);
        toast.error("Premium failed", msg);
      }
    } finally {
      setBusy(false);
    }
  }

  const timeline = useMemo(
    () =>
      buildMilestoneTimeline({
        hasGrant: Boolean(grant),
        escrowed: Number(
          grant?.live_escrow_stroops ?? grant?.escrowed_stroops ?? 0
        ),
        grantStatus: grant?.status,
        milestone: selected
          ? { status: selected.status, title: selected.title }
          : null,
      }),
    [grant, selected]
  );

  const completion = analysis?.completion_score ?? 0;
  const confidence = analysis?.confidence_score ?? 0;
  const risk = analysis?.risk_score ?? 0;

  if (loading && !grant) {
    return (
      <div className="max-w-6xl mx-auto py-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="panel-border h-32 animate-pulse bg-white/5" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 font-mono text-zinc-400">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <Link
            href="/dashboard"
            className="text-zinc-500 hover:text-white transition-colors uppercase text-[10px] tracking-widest font-bold"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-white uppercase tracking-widest flex items-center gap-3 mt-2 flex-wrap">
            Milestone Review
            <span className="px-2 py-1 rounded bg-black border border-crucible-border text-zinc-500 text-xs font-bold tracking-widest">
              GRANT: {grantId}
            </span>
          </h1>
          <p className="text-sm mt-2">
            {grant?.title || "Grant"} · Builder{" "}
            {grant?.builder_address ? (
              <a
                className="text-crucible-cyan hover:underline"
                href={explorerAccountUrl(grant.builder_address) || "#"}
                target="_blank"
                rel="noreferrer"
              >
                {shortAddress(grant.builder_address)}
              </a>
            ) : (
              "—"
            )}
          </p>
        </div>
        {txStep && (
          <div className="panel-border px-4 py-2 text-[10px] text-crucible-gold uppercase tracking-widest animate-pulse">
            {txStep}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Budget",
            value: `${stroopsToXlm(grant?.total_budget_stroops)} XLM`,
          },
          {
            label: "Escrow",
            value: `${stroopsToXlm(grant?.live_escrow_stroops ?? grant?.escrowed_stroops)} XLM`,
          },
          {
            label: "Remaining",
            value: `${stroopsToXlm(
              Number(grant?.total_budget_stroops || 0) -
                Number(grant?.escrowed_stroops || 0)
            )} XLM`,
          },
          {
            label: "On-chain ID",
            value: String(grant?.on_chain_grant_id ?? "—"),
          },
        ].map((c) => (
          <div key={c.label} className="panel-border p-4">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
              {c.label}
            </p>
            <p className="text-sm font-bold text-white">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="panel-border p-5 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-2">
              Milestones
            </h3>
            {isAdmin && (milestones.length === 0 || showCreateForm) ? (
              <form onSubmit={createMilestoneWithDetails} className="space-y-3">
                {milestones.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="text-[10px] text-zinc-500 uppercase tracking-widest"
                  >
                    ← Back to list
                  </button>
                )}
                <p className="text-[10px] text-zinc-500">
                  Add milestone details here (provider wallet). Title & description
                  are stored off-chain; payout amount goes on-chain.
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
                  Description / acceptance criteria
                  <textarea
                    value={msDescription}
                    onChange={(e) => setMsDescription(e.target.value)}
                    className="mt-2 w-full bg-black border border-crucible-border px-3 py-2 text-xs text-white min-h-20"
                    required
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-[10px] font-bold tracking-widest uppercase">
                    Payout (XLM)
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
                </div>
                <button
                  type="submit"
                  disabled={creatingMs || busy}
                  className="w-full py-3 bg-crucible-gold text-black text-xs font-bold uppercase tracking-widest disabled:opacity-60"
                >
                  {creatingMs
                    ? "Confirm in Freighter..."
                    : "Create Milestone On-Chain"}
                </button>
              </form>
            ) : milestones.length === 0 ? (
              <p className="text-[10px] text-zinc-500">
                No milestones yet. Waiting for admin to set them.
              </p>
            ) : (
              <div className="space-y-2">
                {milestones.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => selectMilestone(m.id)}
                    className={`w-full text-left p-3 border ${
                      selected?.id === m.id
                        ? "border-crucible-gold bg-crucible-gold/5"
                        : "border-crucible-border hover:bg-white/5"
                    }`}
                  >
                    <div className="flex justify-between gap-2">
                      <span className="text-xs text-white font-bold uppercase">
                        {m.title || `Milestone #${m.id}`}
                      </span>
                      <span className="text-[10px] text-crucible-cyan uppercase">
                        {m.status}
                        {m.evidence_json ? " · DOCS IN" : ""}
                      </span>
                    </div>
                    {m.description && (
                      <p className="text-[10px] text-zinc-500 mt-1 line-clamp-2">
                        {m.description}
                      </p>
                    )}
                    <p className="text-[10px] text-zinc-600 mt-1">
                      Chain #{m.on_chain_milestone_id ?? "—"} ·{" "}
                      {stroopsToXlm(m.amount_stroops)} XLM
                      {m.deadline
                        ? ` · due ${new Date(m.deadline).toLocaleDateString()}`
                        : ""}
                    </p>
                  </button>
                ))}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(true)}
                    className="text-[10px] text-crucible-gold uppercase tracking-widest"
                  >
                    + Add another milestone
                  </button>
                )}
              </div>
            )}
          </div>

          {!isAdmin && (
          <form onSubmit={submitEvidence} className="panel-border p-5 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
              <Code2 className="w-4 h-4 text-crucible-gold" /> Submit Evidence
            </h3>
            <p className="text-[10px] text-zinc-500">
              Fill in delivery details for{" "}
              <span className="text-white">
                {selected?.title || "the selected milestone"}
              </span>
              . These are hashed and submitted on-chain.
            </p>
            <label className="block text-[10px] font-bold tracking-widest uppercase">
              GitHub Repo *
              <input
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/org/repo"
                className="mt-2 w-full bg-black border border-crucible-border px-3 py-2 text-xs text-white"
                required
              />
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block text-[10px] font-bold tracking-widest uppercase">
                Demo / Deployment URL
                <input
                  value={demoUrl}
                  onChange={(e) => setDemoUrl(e.target.value)}
                  placeholder="https://..."
                  className="mt-2 w-full bg-black border border-crucible-border px-3 py-2 text-xs text-white"
                />
              </label>
              <label className="block text-[10px] font-bold tracking-widest uppercase">
                Docs URL
                <input
                  value={docsUrl}
                  onChange={(e) => setDocsUrl(e.target.value)}
                  placeholder="https://..."
                  className="mt-2 w-full bg-black border border-crucible-border px-3 py-2 text-xs text-white"
                />
              </label>
            </div>
            <label className="block text-[10px] font-bold tracking-widest uppercase">
              Commit / PR SHA
              <input
                value={commitSha}
                onChange={(e) => setCommitSha(e.target.value)}
                placeholder="abc123… or PR link"
                className="mt-2 w-full bg-black border border-crucible-border px-3 py-2 text-xs text-white"
              />
            </label>
            <label className="block text-[10px] font-bold tracking-widest uppercase">
              Builder notes / details
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What was delivered, how to test, known limitations…"
                className="mt-2 w-full bg-black border border-crucible-border px-3 py-2 text-xs text-white min-h-24"
              />
            </label>
            <button
              type="submit"
              disabled={busy || !selected}
              className="w-full py-3 border border-crucible-border text-xs font-bold uppercase tracking-widest hover:bg-white/5 disabled:opacity-60"
            >
              {!selected
                ? "Waiting for admin milestones"
                : busy
                  ? "Submitting..."
                  : "Submit Evidence On-Chain"}
            </button>
          </form>
          )}

          {isAdmin && (
          <form onSubmit={runVerification} className="panel-border p-5 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
              <Bot className="w-4 h-4 text-crucible-cyan" /> Review Documents
            </h3>
            <p className="text-[10px] text-zinc-500">
              User submissions appear here. Review the details, run AI analysis,
              then approve and release funds.
            </p>
            {selected?.evidence_json ? (
              <div className="text-[10px] text-zinc-300 space-y-2 border border-crucible-cyan/40 p-4 bg-crucible-cyan/5">
                <p className="text-crucible-cyan font-bold uppercase tracking-widest">
                  Received from user
                  {selected.evidence_json.submittedAt
                    ? ` · ${new Date(selected.evidence_json.submittedAt).toLocaleString()}`
                    : ""}
                </p>
                <p>
                  <span className="text-zinc-500 uppercase tracking-widest">Repo · </span>
                  {selected.evidence_json.repoUrl ? (
                    <a
                      href={selected.evidence_json.repoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-white hover:text-crucible-gold break-all"
                    >
                      {selected.evidence_json.repoUrl}
                    </a>
                  ) : (
                    "—"
                  )}
                </p>
                <p>
                  <span className="text-zinc-500 uppercase tracking-widest">Demo · </span>
                  {selected.evidence_json.demoUrl ? (
                    <a
                      href={selected.evidence_json.demoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-white hover:text-crucible-gold break-all"
                    >
                      {selected.evidence_json.demoUrl}
                    </a>
                  ) : (
                    "—"
                  )}
                </p>
                <p>
                  <span className="text-zinc-500 uppercase tracking-widest">Docs · </span>
                  {selected.evidence_json.docsUrl ? (
                    <a
                      href={selected.evidence_json.docsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-white hover:text-crucible-gold break-all"
                    >
                      {selected.evidence_json.docsUrl}
                    </a>
                  ) : (
                    "—"
                  )}
                </p>
                <p>
                  <span className="text-zinc-500 uppercase tracking-widest">Commit · </span>
                  <span className="text-white break-all">
                    {selected.evidence_json.commitSha || "—"}
                  </span>
                </p>
                <p>
                  <span className="text-zinc-500 uppercase tracking-widest">Notes · </span>
                  <span className="text-white whitespace-pre-wrap">
                    {selected.evidence_json.notes || "—"}
                  </span>
                </p>
                <p className="break-all text-zinc-500">
                  Hash: {selected.evidence_hash || "—"}
                  {selected.evidence_ipfs_cid
                    ? ` · IPFS ${selected.evidence_ipfs_cid}`
                    : ""}
                </p>
              </div>
            ) : (
              <div className="text-[10px] text-zinc-500 border border-crucible-border p-3">
                No user submission yet for this milestone. Status:{" "}
                <span className="text-white uppercase">{selected?.status || "—"}</span>
              </div>
            )}
            <label className="block text-[10px] font-bold tracking-widest uppercase">
              Repo to review
              <input
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="mt-2 w-full bg-black border border-crucible-border px-3 py-2 text-xs text-white"
                readOnly={Boolean(selected?.evidence_json?.repoUrl)}
              />
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="block text-[10px] font-bold tracking-widest uppercase">
                Demo URL
                <input
                  value={demoUrl}
                  onChange={(e) => setDemoUrl(e.target.value)}
                  className="mt-2 w-full bg-black border border-crucible-border px-3 py-2 text-xs text-white"
                  readOnly={Boolean(selected?.evidence_json)}
                />
              </label>
              <label className="block text-[10px] font-bold tracking-widest uppercase">
                Docs URL
                <input
                  value={docsUrl}
                  onChange={(e) => setDocsUrl(e.target.value)}
                  className="mt-2 w-full bg-black border border-crucible-border px-3 py-2 text-xs text-white"
                  readOnly={Boolean(selected?.evidence_json)}
                />
              </label>
            </div>
            {selected?.evidence_json?.notes && (
              <div className="text-[10px]">
                <p className="font-bold tracking-widest uppercase text-zinc-500 mb-1">
                  Builder notes
                </p>
                <p className="text-zinc-300 whitespace-pre-wrap border border-crucible-border p-3 bg-black/30">
                  {selected.evidence_json.notes}
                </p>
              </div>
            )}
            <button
              type="submit"
              disabled={busy || !selected || !selected.evidence_json}
              className="w-full py-3 bg-crucible-gold text-black text-xs font-bold uppercase tracking-widest disabled:opacity-60"
            >
              {!selected?.evidence_json
                ? "Waiting for user submission"
                : selected.status === "submitted"
                  ? "Analyze & Anchor Hash"
                  : "Refresh AI Report"}
            </button>
            {isAdmin &&
              selected &&
              Number(grant?.live_escrow_stroops ?? grant?.escrowed_stroops ?? 0) <
                Number(selected.amount_stroops || 0) && (
                <p className="text-[10px] text-crucible-gold">
                  Escrow is too low to release this milestone (
                  {stroopsToXlm(
                    grant?.live_escrow_stroops ?? grant?.escrowed_stroops
                  )}{" "}
                  XLM locked, need {stroopsToXlm(selected.amount_stroops)} XLM).{" "}
                  <Link href="/grants" className="underline hover:text-white">
                    Deposit via Manage Escrow
                  </Link>{" "}
                  first.
                </p>
              )}
            <button
              type="button"
              disabled={
                busy ||
                !selected ||
                !selected.evidence_json ||
                Number(
                  grant?.live_escrow_stroops ?? grant?.escrowed_stroops ?? 0
                ) < Number(selected.amount_stroops || 0)
              }
              onClick={approveAndRelease}
              className="w-full py-3 border border-crucible-cyan text-crucible-cyan text-xs font-bold uppercase tracking-widest hover:bg-crucible-cyan/10 disabled:opacity-60"
            >
              Approve & Release Funds
            </button>
          </form>
          )}

          {analysis ? (
            <div className="panel-border p-5 space-y-4 border-crucible-cyan/40">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <FileText className="w-4 h-4 text-crucible-cyan" /> AI Verification
                Report
              </h3>
              <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-widest">
                <span className="px-2 py-1 border border-crucible-border text-zinc-400">
                  {selected?.title || "Milestone"}
                </span>
                <span className="px-2 py-1 border border-crucible-border text-zinc-400">
                  Status · {selected?.status || "—"}
                </span>
                <span className="px-2 py-1 border border-crucible-border text-zinc-400">
                  Source · {analysis.source || "ai"}
                </span>
                {analysis.generated_at && (
                  <span className="px-2 py-1 border border-crucible-border text-zinc-400">
                    {new Date(analysis.generated_at).toLocaleString()}
                  </span>
                )}
                <span className="px-2 py-1 border border-crucible-gold/50 text-crucible-gold">
                  {analysis.recommended_action}
                </span>
              </div>
              <p className="text-sm text-zinc-300 font-sans leading-relaxed">
                {analysis.summary}
              </p>
              {analysis.findings && analysis.findings.length > 0 && (
                <ul className="space-y-2 text-[11px] text-zinc-400 list-disc pl-4">
                  {analysis.findings.map((f, i) => (
                    <li key={`${i}-${f.slice(0, 24)}`}>{f}</li>
                  ))}
                </ul>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
                {[
                  ["Completion", analysis.completion_score],
                  ["Confidence", analysis.confidence_score],
                  ["Risk", analysis.risk_score],
                  ["Quality", analysis.code_quality_score ?? 0],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    className="bg-black/40 border border-crucible-border p-2"
                  >
                    <p className="text-[9px] uppercase text-zinc-500">{label}</p>
                    <p className="text-sm font-bold text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="panel-border p-5 space-y-2 border-dashed border-crucible-border">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <FileText className="w-4 h-4 text-zinc-500" /> AI Verification
                Report
              </h3>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500">
                {selected?.title || "Selected milestone"} ·{" "}
                {selected?.status || "—"}
              </p>
              <p className="text-sm text-zinc-500 font-sans">
                No AI report for this milestone yet.
                {selected?.status === "paid" || selected?.status === "approved"
                  ? " Status is already past verification."
                  : selected?.evidence_json
                    ? " Run Refresh AI Report to analyze this submission."
                    : " Submit evidence first, then run AI analysis."}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <LifecycleTimeline
            steps={timeline}
            title="Milestone Lifecycle"
            subtitle={
              selected
                ? `${selected.title || "Milestone"} · ${selected.status}`
                : "Select a milestone"
            }
          />
          <div className="panel-border p-5 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest">
              AI Scores
            </h3>
            {[
              { label: "Completion", value: completion, color: "bg-crucible-cyan" },
              { label: "Confidence", value: confidence, color: "bg-crucible-gold" },
              { label: "Risk", value: risk, color: "bg-crucible-red" },
              {
                label: "Code Quality",
                value: analysis?.code_quality_score ?? 0,
                color: "bg-white/40",
              },
              {
                label: "Security",
                value: analysis?.security_score ?? 0,
                color: "bg-crucible-cyan/70",
              },
              {
                label: "Docs",
                value: analysis?.documentation_score ?? 0,
                color: "bg-crucible-gold/70",
              },
              {
                label: "Deploy",
                value: analysis?.deployment_score ?? 0,
                color: "bg-white/30",
              },
            ].map((s) => (
              <div key={s.label}>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="uppercase tracking-widest">{s.label}</span>
                  <span className="text-white font-bold">{s.value}</span>
                </div>
                <div className="h-1.5 bg-black border border-crucible-border overflow-hidden">
                  <div
                    className={`h-full ${s.color}`}
                    style={{ width: `${Math.min(100, Number(s.value))}%` }}
                  />
                </div>
              </div>
            ))}
            {analysis?.summary && (
              <p className="text-[10px] text-zinc-400 border-t border-crucible-border pt-3">
                {analysis.summary}
              </p>
            )}
            {analysis?.recommended_action && (
              <p className="text-[10px] text-crucible-gold uppercase tracking-widest flex items-center gap-2">
                {analysis.recommended_action === "approve" ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5" />
                )}
                Recommend: {analysis.recommended_action}
              </p>
            )}
            {verificationHash && (
              <p className="text-[10px] text-zinc-500 break-all">
                Hash: {verificationHash}
              </p>
            )}
          </div>

          <div className="panel-border p-5 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Premium AI (x402)
            </h3>
            <select
              value={premiumType}
              onChange={(e) => setPremiumType(e.target.value)}
              className="w-full bg-black border border-crucible-border px-3 py-2 text-xs text-white"
            >
              {[
                "Deep Code Review",
                "Smart Contract Audit",
                "Security Scan",
                "Business Analysis",
                "Architecture Review",
                "Repository Health",
                "Technical Due Diligence",
              ].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={busy}
              onClick={unlockPremium}
              className="w-full py-2 border border-crucible-gold text-crucible-gold text-[10px] font-bold uppercase tracking-widest hover:bg-crucible-gold/10"
            >
              Unlock Premium Report
            </button>
          </div>

          <div className="panel-border p-5 space-y-2 text-[10px]">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-2">
              Parties
            </h3>
            <p>
              Provider:{" "}
              <span className="text-white">
                {shortAddress(grant?.provider_address)}
              </span>
            </p>
            <p>
              Builder:{" "}
              <Link
                href={`/builder/${grant?.builder_address || "me"}`}
                className="text-crucible-cyan hover:underline"
              >
                {shortAddress(grant?.builder_address)}
              </Link>
            </p>
            <p>
              Reviewer:{" "}
              <span className="text-white">
                {shortAddress(grant?.reviewer_address)}
              </span>
            </p>
            {selected?.release_tx_hash && explorerTxUrl(selected.release_tx_hash) && (
              <a
                href={explorerTxUrl(selected.release_tx_hash)!}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-crucible-gold mt-2"
              >
                Release tx <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      </div>

      {status && (
        <div className="panel-border p-4 text-[10px] text-crucible-cyan break-all mb-4 flex items-start gap-2">
          <Globe className="w-4 h-4 shrink-0" /> {status}
        </div>
      )}
      {error && (
        <div className="panel-border p-4 text-[10px] text-crucible-red break-all flex items-start gap-2">
          <FileText className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
    </div>
  );
}
