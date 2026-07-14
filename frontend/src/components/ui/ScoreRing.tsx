"use client";

import { motion, useReducedMotion } from "framer-motion";

const COLORS = {
  gold: "#DEFF3B",
  cyan: "#00E5FF",
  red: "#f87171",
  lime: "#a3e635",
  zinc: "#a1a1aa",
} as const;

export default function ScoreRing({
  value,
  label,
  size = 112,
  stroke = 8,
  tone = "gold",
  delay = 0,
}: {
  value: number;
  label: string;
  size?: number;
  stroke?: number;
  tone?: keyof typeof COLORS;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  const clamped = Math.max(0, Math.min(100, Math.round(value || 0)));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;
  const color = COLORS[tone];

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#2a2a2d"
            strokeWidth={stroke}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: reduce ? offset : offset }}
            transition={{
              duration: reduce ? 0 : 1.1,
              delay: reduce ? 0 : delay,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{
              filter: `drop-shadow(0 0 6px ${color}66)`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-2xl font-bold text-white tabular-nums"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: delay + 0.2 }}
          >
            {clamped}
          </motion.span>
        </div>
      </div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-center">
        {label}
      </p>
    </div>
  );
}
