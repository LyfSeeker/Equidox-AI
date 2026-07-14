"use client";

import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthShell = pathname === "/login" || pathname === "/admin";

  if (isAuthShell) {
    return <div className="flex-1 w-full h-full min-h-0">{children}</div>;
  }

  return (
    <>
      <Sidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden relative min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="min-h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        <footer className="h-9 border-t border-crucible-border bg-crucible-bg/90 flex items-center justify-between px-4 text-[10px] uppercase font-bold text-zinc-500 z-10 shrink-0 gap-4 backdrop-blur">
          <span className="truncate">© 2026 Equidox Industrial Agents</span>
          <div className="flex items-center gap-4 md:gap-6 shrink-0">
            <span className="hidden sm:inline">Network: Stellar Testnet</span>
            <span className="hidden md:inline">Protocol: Soroban</span>
            <span className="flex items-center gap-2 text-crucible-cyan">
              <span className="w-2 h-2 rounded-full bg-crucible-cyan shadow-[0_0_8px_#00E5FF]" />
              Operational
            </span>
          </div>
        </footer>
      </div>
    </>
  );
}
