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
    <div className="panel-static p-5 md:p-6">
      <h3 className="section-title mb-1">{title}</h3>
      {subtitle ? (
        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-6">
          {subtitle}
        </p>
      ) : (
        <div className="mb-6" />
      )}
      <ol className="space-y-0">
        {steps.map((step, idx) => {
          const connectorDone = step.done;
          return (
            <li key={step.id} className="relative flex gap-4 pb-7 last:pb-0">
              {idx < steps.length - 1 && (
                <span
                  className={`absolute left-[13px] top-7 w-[2px] h-[calc(100%-10px)] rounded-full ${
                    connectorDone
                      ? "bg-gradient-to-b from-crucible-gold to-crucible-gold/20"
                      : "bg-crucible-border"
                  }`}
                />
              )}
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: idx * 0.04, type: "spring", stiffness: 320 }}
                className="relative z-10"
              >
                {step.done ? (
                  <CheckCircle2
                    className="w-7 h-7 text-crucible-gold drop-shadow-[0_0_8px_rgba(222,255,59,0.55)]"
                    aria-label="Completed"
                  />
                ) : (
                  <Circle
                    className={`w-7 h-7 ${
                      step.active
                        ? "text-crucible-cyan drop-shadow-[0_0_10px_rgba(0,229,255,0.55)]"
                        : "text-zinc-600"
                    }`}
                    aria-label={step.active ? "Current" : "Pending"}
                  />
                )}
              </motion.div>
              <div className="pt-0.5">
                <p
                  className={`text-xs font-bold uppercase tracking-widest ${
                    step.done
                      ? "text-white"
                      : step.active
                        ? "text-crucible-cyan text-cyan-glow"
                        : "text-zinc-600"
                  }`}
                >
                  {step.label}
                </p>
                {step.detail && (
                  <p className="text-[10px] text-zinc-500 mt-1 font-sans">
                    {step.detail}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
