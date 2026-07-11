"use client";

import { motion } from "framer-motion";
import { Activity, Shield, Code, GitMerge, ShieldCheck, HelpCircle, Terminal } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col gap-6 font-mono text-zinc-400">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white uppercase tracking-wider mb-2">Verification Dashboard</h1>
        <p className="text-sm">Live view of registered projects, verification activity, and risk health across Equidox.</p>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left/Main Column - Trust Mesh */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="panel-border p-5 h-[500px] flex flex-col relative overflow-hidden group">
            
            <div className="flex items-center justify-between mb-8 z-10">
              <h2 className="text-crucible-gold font-bold flex items-center gap-2 tracking-widest text-sm">
                <GitMerge className="w-4 h-4" /> PROJECT VERIFICATION MESH
              </h2>
              <div className="flex gap-3 text-[10px] font-bold">
                <span className="px-3 py-1 rounded-full border border-crucible-cyan text-crucible-cyan bg-crucible-cyan/10">TOP BUILDERS: 5/5</span>
                <span className="px-3 py-1 rounded-full border border-crucible-gold text-crucible-gold bg-crucible-gold/10">REGISTERED: 42</span>
              </div>
            </div>

            {/* Mesh Background Grid & Lines */}
            <div className="absolute inset-0 top-16 opacity-30 flex items-center justify-center pointer-events-none">
                <div className="w-[400px] h-[400px] rounded-full border border-crucible-border border-dashed absolute"></div>
                <div className="w-[300px] h-[300px] rounded-full border border-crucible-border border-dashed absolute"></div>
                <div className="w-[200px] h-[200px] rounded-full border border-crucible-border border-dashed absolute"></div>
                {/* Connecting lines */}
                <svg className="w-full h-full absolute inset-0">
                  <line x1="50%" y1="50%" x2="30%" y2="60%" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                  <line x1="50%" y1="50%" x2="70%" y2="60%" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                  <line x1="50%" y1="50%" x2="50%" y2="30%" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                  <line x1="30%" y1="60%" x2="40%" y2="80%" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                  <line x1="70%" y1="60%" x2="60%" y2="80%" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                </svg>
            </div>

            {/* Mesh Nodes */}
            <div className="relative flex-1 z-10 flex items-center justify-center">
               
               {/* Center Node (Active/Verified) */}
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                  <span className="text-crucible-cyan font-bold text-xs tracking-widest mb-2">#1 CORE_DAPP</span>
                  <div className="w-20 h-20 rounded-full border border-crucible-cyan shadow-[0_0_30px_rgba(74,222,128,0.2)] flex items-center justify-center bg-crucible-bg mb-2">
                     <div className="w-16 h-16 rounded-sm border-2 border-crucible-cyan rotate-45 flex items-center justify-center bg-crucible-cyan/10">
                        <div className="w-4 h-4 bg-crucible-cyan rounded-full -rotate-45 shadow-[0_0_10px_rgba(74,222,128,1)]"></div>
                     </div>
                  </div>
                  <div className="bg-black/60 border border-crucible-border px-3 py-1.5 rounded text-center">
                     <p className="text-white text-xs font-bold font-mono tracking-widest">0x2FEC...DE3B</p>
                     <p className="text-crucible-cyan text-[10px] font-bold">96.4% / M3</p>
                  </div>
               </div>

               {/* Left Node */}
               <div className="absolute top-[45%] left-[20%] flex flex-col items-center opacity-70 hover:opacity-100 transition-opacity">
                  <span className="text-crucible-gold font-bold text-xs tracking-widest mb-2">#2 DEFI_SWAP</span>
                  <div className="w-16 h-16 rounded-full border border-crucible-gold flex items-center justify-center bg-crucible-bg mb-2">
                     <div className="w-12 h-12 rounded-sm border border-crucible-gold rotate-45 flex items-center justify-center bg-crucible-gold/10">
                        <div className="w-2 h-2 bg-crucible-gold rounded-full -rotate-45"></div>
                     </div>
                  </div>
                  <div className="bg-black/60 border border-crucible-border px-2 py-1 rounded text-center">
                     <p className="text-white text-[10px] font-bold font-mono tracking-widest">0x614C...78C9</p>
                     <p className="text-crucible-gold text-[9px] font-bold">83.0% / M2</p>
                  </div>
               </div>

               {/* Right Node */}
               <div className="absolute top-[45%] right-[20%] flex flex-col items-center opacity-70 hover:opacity-100 transition-opacity">
                  <span className="text-crucible-red font-bold text-xs tracking-widest mb-2">#3 NFT_MKT</span>
                  <div className="w-16 h-16 rounded-full border border-crucible-red flex items-center justify-center bg-crucible-bg mb-2">
                     <div className="w-12 h-12 rounded-sm border border-crucible-red rotate-45 flex items-center justify-center bg-crucible-red/10">
                        <div className="w-2 h-2 bg-crucible-red rounded-full -rotate-45"></div>
                     </div>
                  </div>
                  <div className="bg-black/60 border border-crucible-border px-2 py-1 rounded text-center">
                     <p className="text-white text-[10px] font-bold font-mono tracking-widest">0x8856...2ABA</p>
                     <p className="text-crucible-red text-[9px] font-bold">47.7% / M1</p>
                  </div>
               </div>

               {/* Bottom Nodes */}
               <div className="absolute top-[85%] left-[30%] flex flex-col items-center opacity-50">
                  <span className="text-crucible-gold font-bold text-[10px] tracking-widest mb-1">#4 WALLET</span>
                  <div className="w-10 h-10 rounded-full border border-crucible-gold flex items-center justify-center bg-crucible-bg">
                     <div className="w-6 h-6 rounded-sm border border-crucible-gold rotate-45 flex items-center justify-center bg-crucible-gold/10">
                        <div className="w-1 h-1 bg-crucible-gold rounded-full -rotate-45"></div>
                     </div>
                  </div>
               </div>

               <div className="absolute top-[85%] right-[30%] flex flex-col items-center opacity-50">
                  <span className="text-zinc-500 font-bold text-[10px] tracking-widest mb-1">#5 BRIDGE</span>
                  <div className="w-10 h-10 rounded-full border border-zinc-500 flex items-center justify-center bg-crucible-bg">
                     <div className="w-6 h-6 rounded-sm border border-zinc-500 rotate-45 flex items-center justify-center bg-zinc-500/10">
                        <div className="w-1 h-1 bg-zinc-500 rounded-full -rotate-45"></div>
                     </div>
                  </div>
               </div>

            </div>
          </div>
        </div>

        {/* Right Column - Stats */}
        <div className="col-span-1 flex flex-col gap-6">
          
          <div className="panel-border p-5 relative overflow-hidden">
             <div className="flex justify-between items-start mb-6">
                <p className="text-[10px] font-bold tracking-widest uppercase">Average AI Score</p>
                <Activity className="w-4 h-4 text-zinc-500" />
             </div>
             <p className="text-4xl font-bold text-white tracking-tighter mb-4 text-gold-glow">89.4%</p>
             <div className="w-full h-2 bg-black rounded-full overflow-hidden border border-crucible-border">
                <div className="h-full bg-crucible-gold shadow-[0_0_10px_rgba(255,176,0,0.8)]" style={{ width: '89.4%' }}></div>
             </div>
          </div>

          <div className="panel-border p-5 relative overflow-hidden">
             <div className="flex justify-between items-start mb-6">
                <p className="text-[10px] font-bold tracking-widest uppercase">Active Grants</p>
                <Code className="w-4 h-4 text-crucible-cyan" />
             </div>
             <p className="text-4xl font-bold text-crucible-cyan tracking-tighter mb-4 text-cyan-glow">42</p>
             <div className="flex gap-2">
                <div className="flex-1 h-1 bg-crucible-cyan rounded-full"></div>
                <div className="flex-1 h-1 bg-crucible-cyan rounded-full"></div>
                <div className="flex-1 h-1 bg-crucible-cyan rounded-full"></div>
                <div className="flex-1 h-1 bg-crucible-cyan/30 rounded-full"></div>
             </div>
          </div>

          <div className="panel-border p-5 relative overflow-hidden flex-1">
             <div className="flex justify-between items-start mb-6">
                <p className="text-[10px] font-bold tracking-widest uppercase">System Risk Status</p>
                <Shield className="w-4 h-4 text-crucible-red" />
             </div>
             <p className="text-3xl font-bold text-crucible-red tracking-tight mb-4 text-shadow-sm">Elevated</p>
             <p className="text-xs italic text-zinc-500 leading-relaxed font-sans">
               Based on recent GitHub commit analysis, missing test coverage, and 3 high-risk milestone submissions.
             </p>
          </div>

        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Protocol Events */}
        <div className="panel-border p-5 lg:col-span-1">
           <div className="flex justify-between items-center mb-6 border-b border-crucible-border pb-3">
              <h3 className="text-xs font-bold flex items-center gap-2 tracking-widest text-white">
                <Terminal className="w-4 h-4 text-zinc-400" /> VERIFICATION LOGS
              </h3>
              <span className="flex items-center gap-1 text-[9px] text-crucible-cyan font-bold uppercase"><span className="w-1.5 h-1.5 rounded-full bg-crucible-cyan animate-pulse"></span> Watching</span>
           </div>
           
           <div className="space-y-4 font-mono text-[10px]">
              <div className="flex gap-3 text-zinc-300">
                <span className="text-crucible-gold">14:02:11</span>
                <span>[AI_VALIDATOR] M2 Core Contracts Scanned. Score: 94%</span>
              </div>
              <div className="flex gap-3 text-zinc-500">
                <span className="text-zinc-600">13:45:00</span>
                <span>[GITHUB_HOOK] New commit detected on BridgeUI</span>
              </div>
              <div className="flex gap-3 text-crucible-red">
                <span>13:30:22</span>
                <span>[RISK_ALERT] Missing test coverage on NFT Mint</span>
              </div>
              <div className="flex gap-3 text-zinc-300">
                <span className="text-crucible-gold">12:15:09</span>
                <span>[SOROBAN] Milestone funds locked in escrow #92</span>
              </div>
           </div>
        </div>

        {/* Top Reliability Agents */}
        <div className="panel-border p-5 lg:col-span-2">
           <div className="flex justify-between items-center mb-6 border-b border-crucible-border pb-3">
              <h3 className="text-xs font-bold tracking-widest text-white uppercase">
                Top Verified Builders
              </h3>
              <button className="text-[10px] text-crucible-gold font-bold uppercase hover:text-yellow-400 transition-colors flex items-center gap-1">
                Open Builder Registry <span className="text-lg leading-none">&rsaquo;</span>
              </button>
           </div>
           
           <div className="space-y-6">
              {[
                { name: "0X2FEC...DE3B", type: "Core Protocol / Tier 3", score: 96.4, status: "ACTIVE" },
                { name: "0X614C...78C9", type: "DeFi DApp / Tier 2", score: 83.0, status: "ACTIVE" },
                { name: "0X8856...2ABA", type: "NFT Marketplace / Tier 1", score: 47.7, status: "WARNING" },
              ].map((builder, i) => (
                <div key={i} className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded bg-black border border-crucible-border flex items-center justify-center">
                     <Activity className={`w-5 h-5 ${builder.status === 'WARNING' ? 'text-crucible-red' : 'text-crucible-gold'}`} />
                   </div>
                   <div className="flex-1">
                      <div className="flex justify-between mb-1">
                         <div className="flex items-baseline gap-4">
                           <span className="text-sm font-bold text-white">{builder.name}</span>
                           <span className="text-[10px] text-zinc-500">{builder.type}</span>
                         </div>
                         <div className="flex items-center gap-6">
                           <span className="text-[10px] text-zinc-400 tracking-widest">REPUTATION INDEX</span>
                           <span className="text-[10px] font-bold text-white w-12 text-right">{builder.score}%</span>
                         </div>
                      </div>
                      <div className="w-full h-1.5 bg-black rounded-full overflow-hidden border border-crucible-border">
                          <div className={`h-full ${builder.status === 'WARNING' ? 'bg-crucible-red' : 'bg-crucible-gold'}`} style={{ width: `${builder.score}%` }}></div>
                      </div>
                   </div>
                   <div className="w-20 text-right">
                      <span className={`text-[10px] font-bold tracking-widest ${builder.status === 'WARNING' ? 'text-crucible-red' : 'text-crucible-gold'}`}>{builder.status}</span>
                   </div>
                </div>
              ))}
           </div>
        </div>

      </div>
    </div>
  );
}
