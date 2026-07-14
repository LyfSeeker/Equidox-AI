"use client";

import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import Link from "next/link";

export default function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}) {
  return (
    <div className="panel-static p-10 md:p-12 flex flex-col items-center text-center gap-4">
      <div className="w-14 h-14 rounded-xl border border-crucible-border bg-black/40 flex items-center justify-center shadow-[0_0_24px_rgba(222,255,59,0.08)]">
        <Icon className="w-6 h-6 text-crucible-gold" aria-hidden />
      </div>
      <div className="space-y-2 max-w-sm">
        <h3 className="text-sm font-bold text-white uppercase tracking-widest">
          {title}
        </h3>
        {description ? (
          <p className="text-sm text-zinc-500 font-sans leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>
      {actionLabel && actionHref ? (
        <Link href={actionHref} className="btn btn-primary btn-sm mt-2">
          {actionLabel}
        </Link>
      ) : null}
      {actionLabel && onAction ? (
        <button type="button" onClick={onAction} className="btn btn-primary btn-sm mt-2">
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
