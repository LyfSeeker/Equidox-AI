"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  ArrowRight,
  Bot,
  ShieldCheck,
  Activity,
  ChevronDown,
  Zap,
  Wallet,
  FileText,
  Fingerprint,
} from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

const heroContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.09, delayChildren: 0.06 },
  },
};

const heroItem: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease },
  },
};

const TECH = [
  "Milestone escrow",
  "AI verification",
  "Stellar payouts",
  "On-chain reputation",
  "Grant reviews",
  "Transparent funding",
  "Testnet live",
];

const AGENT_TYPES = [
  "Ship · Verify · Get paid",
  "No blind grants",
  "Evidence before escrow",
  "Review with confidence",
  "Reputation that travels",
  "Built for builders",
  "Designed for reviewers",
];

const PILLARS = [
  {
    icon: Bot,
    title: "AI Analysis",
    body: "Repos, docs, and deploys scored into a structured verification report before anyone touches escrow.",
    tone: "cyan" as const,
  },
  {
    icon: ShieldCheck,
    title: "Stellar Payouts",
    body: "Milestone amounts lock on-chain. Release only after AI hash + reviewer approval - never a blind wire.",
    tone: "gold" as const,
  },
  {
    icon: Fingerprint,
    title: "On-chain Reputation",
    body: "Every paid milestone updates verified delivery history you can carry across grants and hackathons.",
    tone: "gold" as const,
  },
];

const FAQ = [
  {
    q: "Do I need mainnet funds to try Equidox?",
    a: "No. Equidox runs on Stellar Testnet. Fund your Freighter wallet with Friendbot, then create grants, deliver milestones, and run the full verify → approve → release loop.",
  },
  {
    q: "What does the AI actually review?",
    a: "Builders provide a GitHub repo, optional demo/docs URLs, and delivery notes. The verifier pulls repository evidence and scores quality, security, docs, coverage, and architecture.",
  },
  {
    q: "When do builders get paid?",
    a: "After delivery details are on-chain, AI verification is anchored, and an admin reviews and approves. Funds then release from grant escrow on Soroban to the builder address.",
  },
  {
    q: "How does reputation work?",
    a: "Completed milestones, funding received, and verification history stay linked to the builder’s Stellar address for a verifiable track record.",
  },
  {
    q: "Who can approve and release funds?",
    a: "Admins / grant reviewers using the Freighter wallet set as the grant reviewer. Builders deliver milestones; admins run AI review then Approve & Release or Reject.",
  },
];

function Marquee({
  items,
  className = "",
  reverse = false,
}: {
  items: string[];
  className?: string;
  reverse?: boolean;
}) {
  const loop = [...items, ...items];
  return (
    <div
      className={`overflow-hidden border-y border-crucible-border bg-crucible-bg/80 ${className}`}
    >
      <div
        className={`eq-marquee eq-marquee-slow ${reverse ? "eq-marquee-reverse" : ""} gap-10 py-4`}
      >
        {loop.map((label, i) => (
          <span
            key={`${label}-${i}`}
            className="text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-500 whitespace-nowrap"
          >
            <span className="text-crucible-gold/80">✦</span> {label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [role, setRole] = useState<"builder" | "admin">("builder");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-full flex flex-col font-mono relative text-zinc-400 -mx-4 md:-mx-8 -my-4 md:-my-8">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 md:px-8 pt-16 md:pt-24 pb-16 md:pb-24">
        <div className="pointer-events-none absolute inset-0 opacity-[0.12]">
          <div className="absolute left-1/2 top-1/3 -translate-x-1/2 w-[520px] h-[520px] border border-crucible-border rounded-full" />
          <div className="absolute left-1/2 top-1/3 -translate-x-1/2 w-[760px] h-[760px] border border-crucible-border rounded-full" />
        </div>

        <motion.div
          variants={heroContainer}
          initial="hidden"
          animate="visible"
          className="relative z-0 max-w-3xl mx-auto text-center"
        >
          <motion.div
            variants={heroItem}
            className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 border border-crucible-border bg-crucible-bg text-[10px] font-bold uppercase tracking-widest text-zinc-300"
          >
            <Zap className="w-3 h-3 text-crucible-gold" />
            Stellar · Soroban
          </motion.div>

          <motion.h1
            variants={heroItem}
            className="text-4xl md:text-6xl font-bold text-white uppercase tracking-tight leading-[1.05] mb-5"
          >
            Let milestones{" "}
            <span className="text-crucible-gold italic font-serif normal-case tracking-normal">
              prove
            </span>{" "}
            themselves.
          </motion.h1>

          <motion.p
            variants={heroItem}
            className="text-base md:text-lg text-zinc-500 font-sans max-w-xl mx-auto mb-8 leading-relaxed"
          >
            AI verifies delivery, escrow pays in stages on Stellar, and every
            builder earns verified on-chain reputation - never all-or-nothing
            funding.
          </motion.p>

          <motion.div
            variants={heroItem}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Link href="/dashboard" className="btn btn-primary px-8 py-3.5">
              Start Verifying <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/grants" className="btn btn-secondary px-8 py-3.5">
              Browse Grants
            </Link>
          </motion.div>

        </motion.div>
      </section>

      <Marquee items={TECH} />

      {/* Why */}
      <section className="px-4 md:px-8 py-20 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease }}
          className="max-w-3xl mx-auto text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white uppercase tracking-tight mb-4">
            Because blind grants shouldn&apos;t be the default
          </h2>
          <p className="text-zinc-500 font-sans text-base md:text-lg leading-relaxed">
            We&apos;ve watched teams submit vaporware and get paid anyway. Equidox
            puts analysis, escrow, and reputation in one industrial loop - on
            Stellar.
          </p>
        </motion.div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
          {PILLARS.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.08, ease }}
                className="panel-border p-7"
              >
                <div
                  className={`w-11 h-11 border border-crucible-border bg-black/40 flex items-center justify-center mb-5 ${
                    p.tone === "cyan"
                      ? "text-crucible-cyan"
                      : "text-crucible-gold"
                  }`}
                >
                  <Icon className="w-5 h-5" strokeWidth={1.6} />
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-3">
                  {p.title}
                </h3>
                <p className="text-sm text-zinc-500 font-sans leading-relaxed">
                  {p.body}
                </p>
              </motion.div>
            );
          })}
        </div>
      </section>

      <Marquee items={AGENT_TYPES} reverse className="bg-crucible-surface/40" />

      {/* Roles */}
      <section className="px-4 md:px-8 py-20 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease }}
          className="max-w-2xl mx-auto text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white uppercase tracking-tight mb-4">
            We handle verification. You ship.
          </h2>
          <p className="text-zinc-500 font-sans mb-8 leading-relaxed">
            Whether you&apos;re delivering a milestone or reviewing one, every
            step stays inside the grant loop - escrow, AI hash, and on-chain
            payouts are strictly linked.
          </p>

          <div className="inline-flex border border-crucible-border p-1 mb-8">
            {(
              [
                {
                  id: "builder" as const,
                  label: "For the builder",
                  icon: FileText,
                },
                { id: "admin" as const, label: "For the admin", icon: Wallet },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRole(tab.id)}
                className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-colors ${
                  role === tab.id
                    ? "bg-crucible-gold text-black"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.ul
              key={role}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease }}
              className="space-y-3 text-[11px] uppercase tracking-widest text-zinc-500 text-left max-w-md mx-auto"
            >
              {role === "builder" ? (
                <>
                  <li className="flex gap-2">
                    <Activity className="w-3.5 h-3.5 text-crucible-gold shrink-0 mt-0.5" />
                    Connect Freighter &amp; open your grant
                  </li>
                  <li className="flex gap-2">
                    <Activity className="w-3.5 h-3.5 text-crucible-gold shrink-0 mt-0.5" />
                    Share repo, demo, docs, and delivery notes
                  </li>
                  <li className="flex gap-2">
                    <Activity className="w-3.5 h-3.5 text-crucible-gold shrink-0 mt-0.5" />
                    Wait for AI + admin — release updates reputation
                  </li>
                </>
              ) : (
                <>
                  <li className="flex gap-2">
                    <Activity className="w-3.5 h-3.5 text-crucible-cyan shrink-0 mt-0.5" />
                    Fund escrow, then open Review
                  </li>
                  <li className="flex gap-2">
                    <Activity className="w-3.5 h-3.5 text-crucible-cyan shrink-0 mt-0.5" />
                    Run AI report and inspect the full delivery
                  </li>
                  <li className="flex gap-2">
                    <Activity className="w-3.5 h-3.5 text-crucible-cyan shrink-0 mt-0.5" />
                    Approve &amp; release — or reject for resubmit
                  </li>
                </>
              )}
            </motion.ul>
          </AnimatePresence>
        </motion.div>
      </section>

      {/* FAQ */}
      <section className="px-4 md:px-8 py-16 md:py-24 border-t border-crucible-border bg-crucible-surface/30">
        <div className="max-w-3xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-bold text-white uppercase tracking-tight text-center mb-10"
          >
            Quick answers before you start
          </motion.h2>
          <div className="space-y-2">
            {FAQ.map((item, i) => {
              const open = openFaq === i;
              return (
                <motion.div
                  key={item.q}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04 }}
                  className="border border-crucible-border bg-crucible-bg"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="w-full flex items-center justify-between gap-4 px-4 py-4 text-left"
                    aria-expanded={open}
                  >
                    <span className="text-xs md:text-sm font-bold text-white uppercase tracking-wide">
                      {item.q}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-crucible-gold shrink-0 transition-transform ${
                        open ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease }}
                        className="overflow-hidden"
                      >
                        <p className="px-4 pb-4 text-sm text-zinc-500 font-sans leading-relaxed border-t border-crucible-border pt-3">
                          {item.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 md:px-8 py-20 md:py-28 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(222,255,59,0.08),transparent_60%)]" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease }}
          className="relative max-w-3xl mx-auto text-center"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white uppercase tracking-tight mb-5">
            Ready to let milestones pay,{" "}
            <span className="text-crucible-gold">safely</span>?
          </h2>
          <p className="text-zinc-500 font-sans mb-8 max-w-xl mx-auto">
            Testnet is live. Connect Freighter, deliver or review a milestone, and
            watch escrow move on-chain.
          </p>
          <Link
            href="/dashboard"
            className="btn btn-primary px-8 py-3.5 inline-flex"
          >
            Get Started <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
