"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, FileSearch, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { api, type Grant, type Milestone } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { shortAddress, stroopsToXlm } from "@/lib/config";
import PageHeader from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonCard } from "@/components/ui/Skeleton";

type Submission = Milestone & {
  grant_title?: string | null;
  builder_address?: string;
  grant_db_id?: number;
};

export default function ReviewPage() {
  const { isAdmin } = useAuth();
  const [grants, setGrants] = useState<Grant[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [g, pending] = await Promise.all([
        api.listGrants().catch(() => [] as Grant[]),
        isAdmin
          ? api.listSubmittedMilestones().catch(() => [] as Submission[])
          : Promise.resolve([] as Submission[]),
      ]);
      setGrants(g);
      setSubmissions(pending);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!isAdmin) {
    return (
      <div className="page-shell">
        <EmptyState
          title="Admin only"
          description="Milestone review is for admins. Use Submit to deliver evidence."
          actionLabel="Go to Submit"
          actionHref="/submit"
        />
      </div>
    );
  }

  return (
    <div className="page-shell font-mono text-zinc-400">
      <PageHeader
        eyebrow="Admin"
        title="Review"
        description="Open submitted milestones, run AI verification, then release funds or reject."
      />

      {error && (
        <p className="text-xs text-crucible-red border border-crucible-red/40 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <section className="panel-static p-5 md:p-6 space-y-4">
        <h2 className="section-title">
          <FileSearch className="w-4 h-4 text-crucible-cyan" />
          Incoming submissions ({submissions.length})
        </h2>
        {loading ? (
          <div className="grid md:grid-cols-2 gap-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : submissions.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No milestones waiting"
            description="When builders submit evidence, they’ll show up here for review."
          />
        ) : (
          <div className="space-y-3">
            {submissions.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link
                  href={`/verification/${s.grant_db_id || s.grant_id}`}
                  className="block panel-border p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-white font-bold uppercase tracking-widest">
                        {s.grant_title || `Grant #${s.grant_id}`} ·{" "}
                        {s.title || `Milestone #${s.id}`}
                      </p>
                      <p className="text-[10px] text-zinc-500 mt-1 break-all">
                        {s.evidence_json?.repoUrl || "No repo URL"}
                      </p>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>
                  <p className="mt-3 text-[10px] uppercase tracking-widest text-crucible-gold inline-flex items-center gap-1">
                    Open review <ArrowRight className="w-3 h-3" />
                  </p>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      <section className="panel-static p-5 md:p-6 space-y-4">
        <h2 className="section-title">All grants ({grants.length})</h2>
        {loading ? (
          <SkeletonCard />
        ) : grants.length === 0 ? (
          <EmptyState
            title="No grants yet"
            description="Create a grant first, then review submissions here."
            actionLabel="Create grant"
            actionHref="/grants"
          />
        ) : (
          <div className="space-y-3">
            {grants.map((grant) => (
              <div
                key={grant.id}
                className="panel-border p-4 flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <p className="text-xs text-white font-bold uppercase tracking-widest">
                    {grant.title || `Grant #${grant.id}`}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-widest">
                    {stroopsToXlm(grant.total_budget_stroops)} XLM · Escrow{" "}
                    {stroopsToXlm(
                      grant.live_escrow_stroops ?? grant.escrowed_stroops
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={grant.status} />
                  <Link
                    href={`/verification/${grant.id}`}
                    className="btn btn-secondary btn-sm"
                  >
                    Open review <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
