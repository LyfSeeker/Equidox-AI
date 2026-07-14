"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

export type WorkflowStep = {
  id: string;
  label: string;
  description?: string;
};

export default function WorkflowStepper({
  steps,
  currentIndex,
}: {
  steps: WorkflowStep[];
  currentIndex: number;
}) {
  return (
    <div className="panel-static p-4 md:p-5 overflow-x-auto">
      <ol className="flex items-start gap-2 md:gap-0 min-w-[640px] md:min-w-0">
        {steps.map((step, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          return (
            <li key={step.id} className="flex-1 flex items-start gap-2">
              <div className="flex flex-col items-center gap-2 flex-1">
                <div className="flex items-center w-full">
                  {i > 0 && (
                    <div
                      className={`h-[2px] flex-1 rounded-full ${
                        done || active
                          ? "bg-crucible-gold/60"
                          : "bg-crucible-border"
                      }`}
                    />
                  )}
                  <motion.div
                    animate={
                      active
                        ? {
                            boxShadow: [
                              "0 0 0 rgba(0,229,255,0)",
                              "0 0 16px rgba(0,229,255,0.45)",
                              "0 0 0 rgba(0,229,255,0)",
                            ],
                          }
                        : {}
                    }
                    transition={{ repeat: Infinity, duration: 2.2 }}
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 text-[10px] font-bold ${
                      done
                        ? "border-crucible-gold bg-crucible-gold text-black"
                        : active
                          ? "border-crucible-cyan text-crucible-cyan bg-crucible-cyan/10"
                          : "border-crucible-border text-zinc-600"
                    }`}
                  >
                    {done ? <Check className="w-4 h-4" /> : i + 1}
                  </motion.div>
                  {i < steps.length - 1 && (
                    <div
                      className={`h-[2px] flex-1 rounded-full ${
                        done ? "bg-crucible-gold/60" : "bg-crucible-border"
                      }`}
                    />
                  )}
                </div>
                <div className="text-center px-1">
                  <p
                    className={`text-[10px] font-bold uppercase tracking-widest ${
                      done
                        ? "text-crucible-gold"
                        : active
                          ? "text-crucible-cyan"
                          : "text-zinc-600"
                    }`}
                  >
                    {step.label}
                  </p>
                  {step.description && (
                    <p className="text-[9px] text-zinc-600 mt-1 hidden lg:block font-sans normal-case tracking-normal">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
