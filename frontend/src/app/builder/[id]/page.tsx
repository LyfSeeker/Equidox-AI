"use client";

import { useEffect, useState, type ComponentType, type SVGProps } from "react";
import {
  Package,
  Globe,
  Shield,
  Calendar,
  Activity,
  CheckCircle,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useWallet } from "@/context/WalletContext";
import { api } from "@/lib/api";
import { shortAddress, stroopsToXlm } from "@/lib/config";
import { SorobanMark, VerifiedMark } from "@/components/PassportMarks";
import BrandIcon from "@/components/BrandIcon";

type PassportView = {
  builder: string;
  reputation_score: number;
  completed_milestones: number;
  completed_grants: number;
  total_funds_received: string | number;
  badges: number;
  verification_count: number;
  source: string;
  recent_payments?: {
    id: number;
    event_name: string;
    tx_hash: string | null;
    indexed_at: string;
  }[];
  verification_history?: {
    id: number;
    event_name: string;
    indexed_at: string;
  }[];
};

type Mark = ComponentType<SVGProps<SVGSVGElement>>;

const ON_CHAIN_BADGES: {
  label: string;
  detail: string;
  tone: "gold" | "cyan";
  Mark?: Mark;
  brand?: "passport" | "escrow" | "milestone" | "builder";
}[] = [
  { label: "SOROBAN", detail: "Builder", Mark: SorobanMark, tone: "cyan" },
  { label: "SHIPPER", detail: "Milestones", brand: "milestone", tone: "gold" },
  { label: "FUNDED", detail: "Escrow", brand: "escrow", tone: "cyan" },
  { label: "VERIFIED", detail: "AI Hash", Mark: VerifiedMark, tone: "cyan" },
];

export default function BuilderPassport() {
  const params = useParams();
  const { address, connect } = useWallet();
  const [passport, setPassport] = useState<PassportView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const routeId = String(params.id || "me");
  const targetAddress =
    routeId === "me" ? address : routeId.startsWith("G") ? routeId : address;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!targetAddress) {
        setPassport(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await api.getPassport(targetAddress);
        if (!cancelled) setPassport(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load passport"
          );
          setPassport({
            builder: targetAddress,
            reputation_score: 0,
            completed_milestones: 0,
            completed_grants: 0,
            total_funds_received: 0,
            badges: 0,
            verification_count: 0,
            source: "fallback",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [targetAddress]);

  const score = passport?.reputation_score ?? 0;
  const displayScore = Math.min(1000, Number(score));

  return (
    <div className="max-w-5xl mx-auto py-8 font-mono text-zinc-400">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-6">
          <div
            className="relative w-20 h-20 md:w-24 md:h-24 bg-crucible-bg border border-crucible-border flex items-center justify-center"
            aria-hidden
          >
            <span className="pointer-events-none absolute left-0 top-0 h-2.5 w-2.5 border-l border-t border-crucible-gold/70" />
            <span className="pointer-events-none absolute right-0 top-0 h-2.5 w-2.5 border-r border-t border-crucible-gold/70" />
            <span className="pointer-events-none absolute bottom-0 left-0 h-2.5 w-2.5 border-b border-l border-crucible-gold/70" />
            <span className="pointer-events-none absolute bottom-0 right-0 h-2.5 w-2.5 border-b border-r border-crucible-gold/70" />
            <BrandIcon
              name="passport"
              title="Builder passport"
              className="w-12 h-12 md:w-14 md:h-14 text-crucible-gold"
            />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-3xl font-bold text-white uppercase tracking-widest">
                Builder Passport
              </h1>
              <span className="badge badge-cyan">
                {passport?.source === "on-chain" ? "ON-CHAIN" : "SYNCED"}
              </span>
            </div>
            <p className="text-zinc-500 font-bold tracking-widest">
              {targetAddress
                ? shortAddress(targetAddress, 6)
                : "Connect wallet to load"}
            </p>
          </div>
        </div>

        <div className="panel-static px-6 py-4 flex items-center gap-6">
          <div className="text-right">
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">
              Reputation Score
            </p>
            <p className="text-3xl font-bold text-crucible-gold tabular-nums">
              {loading ? "…" : displayScore}
              <span className="text-sm text-zinc-600">/1000</span>
            </p>
          </div>
          <div className="h-12 w-px bg-crucible-border" />
          <Activity className="w-8 h-8 text-crucible-gold opacity-50" />
        </div>
      </div>

      {!address && routeId === "me" && (
        <div className="panel-static p-6 mb-8 flex items-center justify-between gap-4">
          <p className="text-sm text-zinc-500 font-sans">
            Connect Freighter to load your on-chain Builder Passport.
          </p>
          <button
            type="button"
            onClick={() => connect().catch(() => undefined)}
            className="btn btn-primary btn-sm"
          >
            Connect Wallet
          </button>
        </div>
      )}

      {error && (
        <div className="panel-static p-4 mb-6 text-[10px] text-crucible-gold">
          {error} — showing available passport data.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="panel-static p-6 col-span-1 md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="flex flex-col">
            <BrandIcon
              name="milestone"
              className="w-5 h-5 text-crucible-gold mb-3"
              title="Milestones"
            />
            <p className="text-2xl font-bold text-white mb-1 tabular-nums">
              {passport?.completed_milestones ?? 0}
            </p>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Milestones
            </p>
          </div>
          <div className="flex flex-col">
            <BrandIcon
              name="escrow"
              className="w-5 h-5 text-crucible-cyan mb-3"
              title="Escrow funded"
            />
            <p className="text-2xl font-bold text-white mb-1 tabular-nums">
              {stroopsToXlm(passport?.total_funds_received)} XLM
            </p>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Funding
            </p>
          </div>
          <div className="flex flex-col">
            <BrandIcon
              name="builder"
              className="w-5 h-5 text-crucible-gold mb-3"
              title="Grants"
            />
            <p className="text-2xl font-bold text-white mb-1 tabular-nums">
              {passport?.completed_grants ?? 0}
            </p>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Grants
            </p>
          </div>
          <div className="flex flex-col">
            <Package
              className="w-5 h-5 text-crucible-cyan mb-3"
              strokeWidth={1.75}
            />
            <p className="text-2xl font-bold text-white mb-1 tabular-nums">
              {passport?.verification_count ?? 0}
            </p>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Verifications
            </p>
          </div>
        </div>

        <div className="panel-static p-6 col-span-1">
          <h3 className="text-xs font-bold mb-6 flex items-center gap-2 text-white tracking-widest uppercase">
            <Activity className="w-4 h-4 text-crucible-cyan" />
            AI Health Profile
          </h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-zinc-500" />
                  <span className="text-[10px] font-bold tracking-widest text-zinc-400">
                    BADGES BITFIELD
                  </span>
                </div>
                <span className="text-crucible-cyan font-bold text-xs tabular-nums">
                  {passport?.badges ?? 0}
                </span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill bg-crucible-cyan"
                  style={{
                    width: `${Math.min(100, (passport?.badges || 0) * 10 + 20)}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-zinc-500" />
                  <span className="text-[10px] font-bold tracking-widest text-zinc-400">
                    REPUTATION
                  </span>
                </div>
                <span className="text-crucible-gold font-bold text-xs tabular-nums">
                  {displayScore}/1000
                </span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill bg-crucible-gold"
                  style={{ width: `${Math.min(100, displayScore / 10)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className="text-xs font-bold mb-6 text-white uppercase tracking-widest border-b border-crucible-border pb-2">
            Passport Source
          </h2>
          <div className="panel-static p-5 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm text-white mb-1 uppercase tracking-wider">
                Builder Passport Contract
              </h4>
              <p className="text-xs text-zinc-500 font-sans">
                Data loaded via Equidox API from Soroban / local fallback.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2 text-crucible-cyan text-[10px] font-bold">
                <CheckCircle className="w-3 h-3" />
                {(passport?.source || "api").toUpperCase()}
              </div>
              <div className="flex items-center gap-1 text-zinc-600 text-[10px] font-bold">
                <Calendar className="w-3 h-3" />
                Live
              </div>
            </div>
          </div>

          {(passport?.recent_payments?.length || 0) > 0 && (
            <div className="mt-4 panel-static p-4 space-y-2">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-white">
                Recent Payments
              </h4>
              {passport!.recent_payments!.slice(0, 5).map((ev) => (
                <p key={ev.id} className="text-[10px] text-zinc-500">
                  [{ev.event_name}] {ev.tx_hash?.slice(0, 12)}…
                </p>
              ))}
            </div>
          )}

          {(passport?.verification_history?.length || 0) > 0 && (
            <div className="mt-4 panel-static p-4 space-y-2">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-white">
                Verification History
              </h4>
              {passport!.verification_history!.slice(0, 5).map((ev) => (
                <p key={ev.id} className="text-[10px] text-zinc-500">
                  [{ev.event_name}] {new Date(ev.indexed_at).toLocaleString()}
                </p>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <h2 className="text-xs font-bold mb-6 text-white uppercase tracking-widest border-b border-crucible-border pb-2">
            On-Chain Badges
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {ON_CHAIN_BADGES.map((badge) => {
              const Icon = badge.Mark;
              const tone =
                badge.tone === "gold"
                  ? "text-crucible-gold border-crucible-gold/25"
                  : "text-crucible-cyan border-crucible-cyan/25";
              const bar =
                badge.tone === "gold" ? "bg-crucible-gold" : "bg-crucible-cyan";
              return (
                <div
                  key={badge.label}
                  className="relative overflow-hidden border border-crucible-border bg-crucible-bg p-4 flex flex-col items-center text-center"
                >
                  <span className={`absolute inset-x-0 top-0 h-px ${bar} opacity-60`} />
                  <div
                    className={`mb-3 flex h-12 w-12 items-center justify-center border bg-black/40 ${tone}`}
                  >
                    {badge.brand ? (
                      <BrandIcon name={badge.brand} className="h-7 w-7" />
                    ) : Icon ? (
                      <Icon className="h-7 w-7" />
                    ) : null}
                  </div>
                  <p className="font-bold text-[10px] text-white tracking-[0.18em]">
                    {badge.label}
                  </p>
                  <p className="mt-1 text-[9px] uppercase tracking-widest text-zinc-600">
                    {badge.detail}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
