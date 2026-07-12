"use client";

import { usePathname } from "next/navigation";
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
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>

        <div className="h-8 border-t border-crucible-border bg-crucible-bg flex items-center justify-between px-4 text-[10px] uppercase font-bold text-zinc-500 z-10 shrink-0 gap-4">
          <span className="truncate">© 2026 EQUIDOX INDUSTRIAL AGENTS</span>
          <div className="flex items-center gap-4 md:gap-6 shrink-0">
            <span className="hidden sm:inline">NETWORK: STELLAR TESTNET</span>
            <span className="hidden md:inline">PROTOCOL: SOROBAN</span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-crucible-cyan"></span>
              OPERATIONAL
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
