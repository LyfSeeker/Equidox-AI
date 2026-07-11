"use client";

import { User, Settings, Wallet } from "lucide-react";

export default function Topbar() {
  return (
    <div className="h-16 flex items-center justify-between px-6 border-b border-crucible-border bg-crucible-bg/80 backdrop-blur-md z-10 shrink-0">
      
      {/* Network Status */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 border border-white/5">
         <div className="w-1.5 h-1.5 rounded-full bg-crucible-cyan"></div>
         <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
           Stellar Testnet
         </span>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4">
        <button className="w-10 h-10 flex items-center justify-center rounded-full border border-crucible-border hover:bg-white/5 text-zinc-400 hover:text-white transition-colors">
          <User className="w-4 h-4" />
        </button>
        <button className="w-10 h-10 flex items-center justify-center rounded-full border border-transparent hover:bg-white/5 text-zinc-400 hover:text-white transition-colors">
          <Settings className="w-4 h-4" />
        </button>
        
        <button className="h-10 px-6 rounded-md bg-crucible-gold hover:bg-yellow-400 text-black font-bold tracking-wide uppercase text-sm flex items-center gap-2 transition-colors shadow-[0_0_15px_rgba(255,176,0,0.3)] hover:shadow-[0_0_25px_rgba(255,176,0,0.5)]">
          Connect Wallet
        </button>
      </div>

    </div>
  );
}
