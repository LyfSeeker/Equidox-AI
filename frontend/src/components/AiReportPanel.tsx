"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  FileText,
  ShieldAlert,
} from "lucide-react";
import type { Analysis } from "@/lib/api";
import ScoreRing from "@/components/ui/ScoreRing";
import { Badge } from "@/components/ui/Badge";

function ListBlock({
  title,
  items,
  tone = "neutral",
}: {
  title: string;
  items?: string[];
  tone?: "good" | "bad" | "warn" | "neutral";
}) {
  if (!items?.length) return null;
  const color =
    tone === "good"
      ? "text-crucible-cyan"
      : tone === "bad"
        ? "text-crucible-red"
        : tone === "warn"
          ? "text-crucible-gold"
          : "text-zinc-300";
  return (
    <div className="panel-static p-4 space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
        {title}
      </p>
      <ul className={`space-y-1.5 text-[11px] ${color} list-disc pl-4 font-sans leading-relaxed`}>
        {items.map((item, i) => (
          <li key={`${title}-${i}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function MetricBar({
  label,
  value,
  color,
  delay = 0,
}: {
  label: string;
  value: number;
  color: string;
  delay?: number;
}) {
  const v = Math.min(100, Math.max(0, Number(value) || 0));
  return (
    <div>
      <div className="flex justify-between text-[10px] mb-1.5 uppercase tracking-widest">
        <span className="text-zinc-500">{label}</span>
        <span className="text-white font-bold tabular-nums">{v}</span>
      </div>
      <div className="progress-track">
        <motion.div
          className="progress-fill"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${v}%` }}
          transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}

export default function AiReportPanel({
  analysis,
  milestoneTitle,
  milestoneStatus,
}: {
  analysis: Analysis;
  milestoneTitle?: string | null;
  milestoneStatus?: string | null;
}) {
  const [openReasoning, setOpenReasoning] = useState(false);
  const overall =
    analysis.score ??
    analysis.overall_score ??
    analysis.trust_score ??
    Math.round(
      (analysis.completion_score +
        analysis.confidence_score +
        (100 - analysis.risk_score)) /
        3
    );
  const recommendation =
    analysis.recommendation || analysis.recommended_action || "review";
  const approve =
    String(recommendation).toLowerCase().includes("approve") &&
    !String(recommendation).toLowerCase().includes("manual");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="panel-static panel-glow-cyan p-5 md:p-6 space-y-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="section-title">
          <FileText className="w-4 h-4 text-crucible-cyan" />
          AI Verification Report
        </h3>
        <div className="flex flex-wrap gap-2">
          <Badge tone="zinc">{milestoneTitle || "Milestone"}</Badge>
          <Badge tone="zinc">Status · {milestoneStatus || "—"}</Badge>
          <Badge tone="cyan">
            {(analysis.provider || analysis.source || "ai").toUpperCase()}
            {analysis.model ? ` · ${analysis.model}` : ""}
          </Badge>
        </div>
      </div>

      {/* Hero rings */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 place-items-center py-2">
        <ScoreRing value={overall} label="Trust Score" tone="lime" size={128} stroke={9} />
        <ScoreRing
          value={analysis.feature_completion_score ?? analysis.completion_score}
          label="Completion"
          tone="cyan"
          delay={0.1}
        />
        <ScoreRing
          value={analysis.confidence_score}
          label="Confidence"
          tone="gold"
          delay={0.15}
        />
        <ScoreRing
          value={analysis.risk_score}
          label="Risk"
          tone="red"
          delay={0.2}
        />
        <ScoreRing
          value={analysis.code_quality_score ?? 0}
          label="Code Quality"
          tone="cyan"
          delay={0.25}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge tone={approve ? "gold" : "red"} icon={approve ? CheckCircle2 : AlertTriangle}>
          Recommend · {recommendation}
        </Badge>
        {analysis.risk_level && (
          <Badge tone="zinc" icon={ShieldAlert}>
            Risk · {analysis.risk_level}
          </Badge>
        )}
        {analysis.prompt_version && (
          <Badge tone="zinc">Prompt · {analysis.prompt_version}</Badge>
        )}
        {analysis.latency_ms != null && (
          <Badge tone="zinc">{analysis.latency_ms} ms</Badge>
        )}
      </div>

      <p className="text-sm text-zinc-300 font-sans leading-relaxed">
        {analysis.executive_summary || analysis.summary}
      </p>

      {/* Quality breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="panel-static p-4 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            Repository health
          </p>
          <MetricBar
            label="Security"
            value={analysis.security_score ?? 0}
            color="#f87171"
          />
          <MetricBar
            label="GitHub Health"
            value={analysis.github_health_score ?? analysis.architecture_score ?? 0}
            color="#DEFF3B"
            delay={0.05}
          />
          <MetricBar
            label="Testing"
            value={analysis.test_coverage_score ?? 0}
            color="#00E5FF"
            delay={0.1}
          />
          <MetricBar
            label="Innovation"
            value={analysis.innovation_score ?? 0}
            color="#a3e635"
            delay={0.15}
          />
        </div>
        <div className="panel-static p-4 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            Delivery quality
          </p>
          <MetricBar
            label="Documentation"
            value={analysis.documentation_score ?? 0}
            color="#DEFF3B"
          />
          <MetricBar
            label="Deployment"
            value={analysis.deployment_score ?? 0}
            color="#00E5FF"
            delay={0.05}
          />
          <MetricBar
            label="Feature Completion"
            value={
              analysis.feature_completion_score ?? analysis.completion_score
            }
            color="#a3e635"
            delay={0.1}
          />
          <MetricBar
            label="Code Quality"
            value={analysis.code_quality_score ?? 0}
            color="#DEFF3B"
            delay={0.15}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ListBlock title="Strengths" items={analysis.strengths} tone="good" />
        <ListBlock title="Weaknesses" items={analysis.weaknesses} tone="bad" />
        <ListBlock
          title="Missing Evidence"
          items={analysis.missing_evidence}
          tone="warn"
        />
        <ListBlock
          title="Security Findings"
          items={analysis.security_findings || analysis.fraud_signals}
          tone="bad"
        />
        <ListBlock
          title="Recommendations"
          items={analysis.recommendations || analysis.suggestions}
          tone="neutral"
        />
      </div>

      {(analysis.criteria_checklist?.length || 0) > 0 && (
        <div className="panel-static p-4 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            Criteria checklist
          </p>
          <ul className="space-y-2">
            {analysis.criteria_checklist!.map((row, i) => {
              const status = String(
                row.status || (row.met ? "PASS" : "FAIL")
              ).toUpperCase();
              const tone =
                status === "PASS"
                  ? "text-crucible-cyan"
                  : status === "PARTIAL"
                    ? "text-crucible-gold"
                    : status === "NOT_VERIFIED"
                      ? "text-zinc-400"
                      : "text-crucible-red";
              const detail = row.reason || row.notes;
              return (
                <li
                  key={`${row.criterion}-${i}`}
                  className="text-[11px] border border-crucible-border bg-black/30 px-3 py-2"
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`font-bold uppercase tracking-widest text-[9px] shrink-0 ${tone}`}
                    >
                      {status.replace("_", " ")}
                    </span>
                    <div className="min-w-0">
                      <p className="text-zinc-200 font-sans">{row.criterion}</p>
                      {detail ? (
                        <p className="text-zinc-500 font-sans mt-1">{detail}</p>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpenReasoning((v) => !v)}
        className="w-full flex items-center justify-between text-[10px] uppercase tracking-widest text-zinc-400 border border-crucible-border rounded-lg px-4 py-3 hover:bg-white/[0.03] transition-colors"
      >
        Expandable reasoning
        <ChevronDown
          className={`w-4 h-4 transition-transform ${openReasoning ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence>
        {openReasoning && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="text-[12px] text-zinc-400 font-sans leading-relaxed border border-crucible-border/60 rounded-lg p-4 bg-black/30 whitespace-pre-wrap">
              {analysis.reviewer_notes ||
                analysis.reasoning ||
                analysis.executive_summary ||
                analysis.summary ||
                "No detailed reasoning stored."}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
