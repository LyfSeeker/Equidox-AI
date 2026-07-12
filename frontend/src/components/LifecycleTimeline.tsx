"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Circle } from "lucide-react";

export type TimelineStep = {
  id: string;
  label: string;
  done: boolean;
  active?: boolean;
  detail?: string;
  href?: string;
};

const DEFAULT_STEPS: Omit<TimelineStep, "done" | "active">[] = [
  { id: "created", label: "Grant Created" },
  { id: "deposited", label: "Funds Deposited" },
  { id: "milestone", label: "Milestone Added" },
  { id: "submitted", label: "Evidence Submitted" },
  { id: "verified", label: "AI Verified" },
  { id: "approved", label: "Reviewer Approved" },
  { id: "released", label: "Funds Released" },
  { id: "passport", label: "Passport Updated" },
];

function finalizeSteps(
  doneMap: Record<string, boolean>,
  hasGrant: boolean
): TimelineStep[] {
  let foundActive = false;
  return DEFAULT_STEPS.map((step) => {
    const done = Boolean(doneMap[step.id]);
    let active = false;
    if (!done && !foundActive && hasGrant) {
      active = true;
      foundActive = true;
    }
    return { ...step, done, active };
  });
}

export function buildGrantTimeline(opts: {
  hasGrant: boolean;
  escrowed: number;
  milestoneCount: number;
  statuses: string[];
}): TimelineStep[] {
  const { hasGrant, escrowed, milestoneCount, statuses } = opts;
  const has = (s: string) => statuses.some((x) => x === s);

  return finalizeSteps(
    {
      created: hasGrant,
      deposited: escrowed > 0 || has("funded"),
      milestone: milestoneCount > 0,
      submitted:
        has("submitted") ||
        has("under_review") ||
        has("approved") ||
        has("paid"),
      verified: has("under_review") || has("approved") || has("paid"),
      approved: has("approved") || has("paid"),
      released: has("paid"),
      passport: has("paid"),
    },
    hasGrant
  );
}

/** Per-milestone lifecycle for the Review page selection. */
export function buildMilestoneTimeline(opts: {
  hasGrant: boolean;
  escrowed: number;
  grantStatus?: string | null;
  milestone: { status: string; title?: string | null } | null | undefined;
}): TimelineStep[] {
  const { hasGrant, escrowed, grantStatus, milestone } = opts;
  const status = (milestone?.status || "").toLowerCase();
  const advancedPast = (...states: string[]) => states.includes(status);

  return finalizeSteps(
    {
      created: hasGrant,
      deposited:
        escrowed > 0 ||
        grantStatus === "funded" ||
        advancedPast("paid", "approved", "under_review", "submitted"),
      milestone: Boolean(milestone),
      submitted: advancedPast(
        "submitted",
        "under_review",
        "approved",
        "paid"
      ),
      verified: advancedPast("under_review", "approved", "paid"),
      approved: advancedPast("approved", "paid"),
      released: advancedPast("paid"),
      passport: advancedPast("paid"),
    },
    hasGrant
  );
}

export default function LifecycleTimeline({
  steps,
  title = "Lifecycle Timeline",
  subtitle,
}: {
  steps: TimelineStep[];
  title?: string;
  subtitle?: string | null;
}) {
  return (
    <div className="panel-border p-5">
      <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-1">
        {title}
      </h3>
      {subtitle ? (
        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-6">
          {subtitle}
        </p>
      ) : (
        <div className="mb-6" />
      )}
      <ol className="space-y-0">
        {steps.map((step, idx) => (
          <li key={step.id} className="relative flex gap-4 pb-6 last:pb-0">
            {idx < steps.length - 1 && (
              <span
                className={`absolute left-[11px] top-6 w-px h-[calc(100%-8px)] ${
                  step.done ? "bg-crucible-cyan/50" : "bg-crucible-border"
                }`}
              />
            )}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: idx * 0.05 }}
              className="relative z-10"
            >
              {step.done ? (
                <CheckCircle2 className="w-6 h-6 text-crucible-cyan" />
              ) : (
                <Circle
                  className={`w-6 h-6 ${
                    step.active ? "text-crucible-gold" : "text-zinc-600"
                  }`}
                />
              )}
            </motion.div>
            <div>
              <p
                className={`text-xs font-bold uppercase tracking-widest ${
                  step.done
                    ? "text-white"
                    : step.active
                      ? "text-crucible-gold"
                      : "text-zinc-600"
                }`}
              >
                {step.label}
              </p>
              {step.detail && (
                <p className="text-[10px] text-zinc-500 mt-1">{step.detail}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
