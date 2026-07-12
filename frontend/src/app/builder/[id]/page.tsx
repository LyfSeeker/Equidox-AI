"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle,
  Trophy,
  DollarSign,
  Package,
  Globe,
  Shield,
  Calendar,
  Activity,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useWallet } from "@/context/WalletContext";
import { api } from "@/lib/api";
import { shortAddress, stroopsToXlm } from "@/lib/config";

type PassportView = {
  builder: string;
  reputation_score: number;
  completed_milestones: number;
  completed_grants: number;
  total_funds_received: string | number;
  badges: number;
  verification_count: number;
  source: string;
  recent_payments?: { id: number; event_name: string; tx_hash: string | null; indexed_at: string }[];
  verification_history?: { id: number; event_name: string; indexed_at: string }[];
};

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
          setError(err instanceof Error ? err.message : "Failed to load passport");
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
          <div className="w-24 h-24 rounded-sm bg-crucible-bg border border-crucible-border flex items-center justify-center text-4xl shadow-[0_0_20px_rgba(255,176,0,0.15)] relative overflow-hidden">
            <div className="absolute inset-0 bg-crucible-gold/10"></div>
            🚀
          </div>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-white uppercase tracking-widest">
                Builder Passport
              </h1>
              <span className="px-2 py-1 rounded border border-crucible-cyan text-crucible-cyan bg-crucible-cyan/10 text-xs font-bold">
                {passport?.source === "on-chain" ? "ON-CHAIN" : "SYNCED"}
              </span>
            </div>
            <p className="text-zinc-500 font-bold tracking-widest">
              {targetAddress ? shortAddress(targetAddress, 6) : "Connect wallet to load"}
            </p>
          </div>
        </div>

        <div className="panel-border px-6 py-4 flex items-center gap-6">
          <div className="text-right">
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">
              Reputation Score
            </p>
            <p className="text-3xl font-bold text-crucible-gold">
              {loading ? "…" : displayScore}
              <span className="text-sm text-zinc-600">/1000</span>
            </p>
          </div>
          <div className="h-12 w-px bg-crucible-border"></div>
          <Activity className="w-8 h-8 text-crucible-gold opacity-50" />
        </div>
      </div>

      {!address && routeId === "me" && (
        <div className="panel-border p-6 mb-8 flex items-center justify-between gap-4">
          <p className="text-sm text-zinc-500">
            Connect Freighter to load your on-chain Builder Passport.
          </p>
          <button
            onClick={() => connect().catch(() => undefined)}
            className="px-4 py-2 bg-crucible-gold text-black text-xs font-bold uppercase tracking-widest"
          >
            Connect Wallet
          </button>
        </div>
      )}

      {error && (
        <div className="panel-border p-4 mb-6 text-[10px] text-crucible-gold">
          {error} — showing available passport data.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="panel-border p-6 col-span-1 md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="flex flex-col">
            <CheckCircle className="w-5 h-5 text-crucible-cyan mb-3" />
            <p className="text-2xl font-bold text-white mb-1">
              {passport?.completed_milestones ?? 0}
            </p>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Milestones
            </p>
          </div>
          <div className="flex flex-col">
            <DollarSign className="w-5 h-5 text-crucible-gold mb-3" />
            <p className="text-2xl font-bold text-white mb-1">
              {stroopsToXlm(passport?.total_funds_received)} XLM
            </p>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Funding
            </p>
          </div>
          <div className="flex flex-col">
            <Trophy className="w-5 h-5 text-crucible-gold mb-3" />
            <p className="text-2xl font-bold text-white mb-1">
              {passport?.completed_grants ?? 0}
            </p>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Grants
            </p>
          </div>
          <div className="flex flex-col">
            <Package className="w-5 h-5 text-crucible-cyan mb-3" />
            <p className="text-2xl font-bold text-white mb-1">
              {passport?.verification_count ?? 0}
            </p>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Verifications
            </p>
          </div>
        </div>

        <div className="panel-border p-6 col-span-1">
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
                <span className="text-crucible-cyan font-bold text-xs">
                  {passport?.badges ?? 0}
                </span>
              </div>
              <div className="w-full h-1 bg-black rounded-full overflow-hidden border border-crucible-border">
                <div
                  className="h-full bg-crucible-cyan"
                  style={{ width: `${Math.min(100, (passport?.badges || 0) * 10 + 20)}%` }}
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
                <span className="text-crucible-gold font-bold text-xs">
                  {displayScore}/1000
                </span>
              </div>
              <div className="w-full h-1 bg-black rounded-full overflow-hidden border border-crucible-border">
                <div
                  className="h-full bg-crucible-gold"
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
          <div className="panel-border p-5 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm text-white mb-1 uppercase tracking-wider">
                Builder Passport Contract
              </h4>
              <p className="text-xs text-zinc-500">
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
            <div className="mt-4 panel-border p-4 space-y-2">
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
            <div className="mt-4 panel-border p-4 space-y-2">
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
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "SOROBAN", detail: "Builder" },
              { label: "SHIPPER", detail: "Milestones" },
              { label: "FUNDED", detail: "Escrow" },
              { label: "VERIFIED", detail: "AI Hash" },
            ].map((badge) => (
              <div
                key={badge.label}
                className="panel-border p-4 text-center flex flex-col items-center opacity-80"
              >
                <div className="w-10 h-10 bg-crucible-bg border border-crucible-gold/50 flex items-center justify-center mb-3 text-lg">
                  ⚡
                </div>
                <p className="font-bold text-[10px] text-white tracking-widest">
                  {badge.label}
                </p>
                <p className="text-[9px] text-zinc-500 mt-1">{badge.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
