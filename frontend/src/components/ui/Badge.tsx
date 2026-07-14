"use client";

import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Wallet,
  XCircle,
} from "lucide-react";

type Tone = "gold" | "cyan" | "red" | "zinc";

const TONE_CLASS: Record<Tone, string> = {
  gold: "badge-gold",
  cyan: "badge-cyan",
  red: "badge-red",
  zinc: "badge-zinc",
};

export function Badge({
  children,
  tone = "zinc",
  icon: Icon,
  className = "",
}: {
  children: React.ReactNode;
  tone?: Tone;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <span className={`badge ${TONE_CLASS[tone]} ${className}`}>
      {Icon ? <Icon className="w-3 h-3" aria-hidden /> : null}
      {children}
    </span>
  );
}

const STATUS_MAP: Record<
  string,
  { label: string; tone: Tone; icon: LucideIcon }
> = {
  pending: { label: "Pending", tone: "zinc", icon: Clock },
  funded: { label: "Escrowed", tone: "cyan", icon: Wallet },
  active: { label: "Active", tone: "cyan", icon: BadgeCheck },
  submitted: { label: "Submitted", tone: "gold", icon: Clock },
  under_review: { label: "Under Review", tone: "cyan", icon: ShieldAlert },
  approved: { label: "Approved", tone: "gold", icon: CheckCircle2 },
  paid: { label: "Paid", tone: "gold", icon: Wallet },
  rejected: { label: "Rejected", tone: "red", icon: XCircle },
  cancelled: { label: "Cancelled", tone: "red", icon: XCircle },
  ai_verified: { label: "AI Verified", tone: "cyan", icon: BadgeCheck },
  escrowed: { label: "Escrowed", tone: "cyan", icon: Wallet },
};

export function StatusBadge({
  status,
  className = "",
}: {
  status?: string | null;
  className?: string;
}) {
  const key = (status || "").toLowerCase().replace(/\s+/g, "_");
  const meta = STATUS_MAP[key] || {
    label: status || "Unknown",
    tone: "zinc" as Tone,
    icon: Clock,
  };
  return (
    <Badge tone={meta.tone} icon={meta.icon} className={className}>
      {meta.label}
    </Badge>
  );
}
