"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Upload } from "lucide-react";
import { motion } from "framer-motion";
import { api, type Grant } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { shortAddress, stroopsToXlm } from "@/lib/config";
import PageHeader from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonCard } from "@/components/ui/Skeleton";

export default function SubmitPage() {
  const { isAdmin } = useAuth();
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
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
    void load();
  }, [load]);

  if (isAdmin) {
    return (
      <div className="page-shell">
        <EmptyState
          title="Builder action"
          description="Admins review on Review. Create grants on Grants."
          actionLabel="Go to Review"
          actionHref="/review"
        />
      </div>
    );
  }

  return (
    <div className="page-shell font-mono text-zinc-400">
      <PageHeader
        eyebrow="Builder"
        title="Submit"
        description="Open a grant and submit your GitHub repo and delivery evidence for milestone review."
      />

      {error && (
        <p className="text-xs text-crucible-red border border-crucible-red/40 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <section className="panel-static p-5 md:p-6 space-y-4">
        <h2 className="section-title">Available grants ({grants.length})</h2>
        {loading ? (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : grants.length === 0 ? (
          <EmptyState
            icon={Upload}
            title="No grants published yet"
            description="Once an admin creates a grant, you can submit milestone evidence here."
          />
        ) : (
          <div className="space-y-3">
            {grants.map((grant, i) => (
              <motion.div
                key={grant.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="panel-border p-4 flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <p className="text-xs text-white font-bold uppercase tracking-widest">
                    {grant.title || `Grant #${grant.id}`}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-widest">
                    {stroopsToXlm(grant.total_budget_stroops)} XLM
                    {grant.builder_address
                      ? ` · Builder ${shortAddress(grant.builder_address)}`
                      : ""}
                  </p>
                  {grant.description && (
                    <p className="text-[11px] text-zinc-400 mt-2 font-sans line-clamp-2">
                      {grant.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={grant.status} />
                  <Link
                    href={`/verification/${grant.id}`}
                    className="btn btn-primary btn-sm"
                  >
                    View & submit <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
