"use client";

import { FormEvent, useState } from "react";
import { Bot, Send } from "lucide-react";
import { api, type Analysis } from "@/lib/api";
import { useToast } from "@/context/ToastContext";

type ChatMsg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Why this score?",
  "Summarize the repository",
  "What evidence is missing?",
  "Would you approve?",
  "Explain the risks",
];

export default function AiCopilot({
  analysis,
  milestone,
}: {
  analysis: Analysis | null;
  milestone?: { title?: string | null; description?: string | null; status?: string } | null;
}) {
  const toast = useToast();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function ask(question: string) {
    if (!question.trim() || !analysis) return;
    const nextHistory = [...messages, { role: "user" as const, content: question }];
    setMessages(nextHistory);
    setInput("");
    setBusy(true);
    try {
      const result = await api.aiChat({
        message: question,
        milestone: milestone || null,
        githubData: analysis.github || null,
        analysis,
        history: messages,
      });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.reply || "No reply." },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Copilot failed";
      toast.error("AI Copilot", msg);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${msg}` },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void ask(input);
  }

  return (
    <div className="panel-border p-5 space-y-4">
      <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
        <Bot className="w-4 h-4 text-crucible-cyan" /> AI Copilot
      </h3>
      <p className="text-[10px] text-zinc-500">
        Ask about this milestone report. AI advises only — you decide approval.
      </p>

      {!analysis ? (
        <p className="text-[11px] text-zinc-600">Run AI analysis first to enable chat.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                disabled={busy}
                onClick={() => void ask(s)}
                className="text-[9px] uppercase tracking-widest px-2 py-1 border border-crucible-border text-zinc-400 hover:text-white hover:border-crucible-cyan/50 disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>

          <div className="max-h-56 overflow-y-auto space-y-2 border border-crucible-border bg-black/30 p-3">
            {messages.length === 0 && (
              <p className="text-[10px] text-zinc-600">No messages yet.</p>
            )}
            {messages.map((m, i) => (
              <div
                key={`${m.role}-${i}`}
                className={`text-[11px] font-sans leading-relaxed ${
                  m.role === "user" ? "text-crucible-gold" : "text-zinc-300"
                }`}
              >
                <span className="text-[9px] uppercase tracking-widest text-zinc-500 mr-2">
                  {m.role === "user" ? "You" : "AI"}
                </span>
                {m.content}
              </div>
            ))}
          </div>

          <form onSubmit={onSubmit} className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about risks, evidence, scores…"
              disabled={busy}
              className="flex-1 bg-black border border-crucible-border px-3 py-2 text-xs text-white"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="px-3 border border-crucible-cyan text-crucible-cyan hover:bg-crucible-cyan/10 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </>
      )}
    </div>
  );
}
