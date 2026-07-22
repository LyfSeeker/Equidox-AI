"use client";

import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { Lock, ShieldCheck } from "lucide-react";

type LoginPanelProps = {
  onSubmit: (username: string, password: string) => Promise<void>;
  usernamePlaceholder?: string;
  footerHint?: string;
  defaultUsername?: string;
  defaultPassword?: string;
};

export default function LoginPanel({
  onSubmit,
  usernamePlaceholder = "Enter your username",
  footerHint,
  defaultUsername = "",
  defaultPassword = "",
}: LoginPanelProps) {
  const [username, setUsername] = useState(defaultUsername);
  const [password, setPassword] = useState(defaultPassword);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="h-full w-full min-h-screen flex items-center justify-center bg-grid-pattern relative overflow-hidden px-4">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[720px] h-[420px] bg-crucible-gold/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[480px] h-[320px] bg-crucible-cyan/5 blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md panel-border p-8 md:p-10"
      >
        <div className="flex items-center gap-2 mb-8">
          <ShieldCheck className="w-5 h-5 text-crucible-gold" />
          <span className="text-2xl md:text-3xl font-bold tracking-widest text-white uppercase">
            Equidox
          </span>
        </div>

        <h1 className="text-lg font-bold text-zinc-200 uppercase tracking-wider mb-2">
          Sign in to continue
        </h1>
        <p className="text-sm text-zinc-500 font-sans mb-8">
          Authenticate with Keycloak, then connect Freighter for on-chain
          actions.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="field">
            <span className="field-label">Username</span>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="field-input"
              placeholder={usernamePlaceholder}
            />
          </label>

          <label className="field">
            <span className="field-label">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="field-input"
              placeholder="Enter your password"
            />
          </label>

          {error && (
            <p className="text-xs text-crucible-red font-sans" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary w-full h-12"
          >
            <Lock className="w-4 h-4" />
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {footerHint ? (
          <p className="mt-6 text-[10px] uppercase tracking-widest text-zinc-600 text-center">
            {footerHint}
          </p>
        ) : null}
      </motion.div>
    </div>
  );
}
