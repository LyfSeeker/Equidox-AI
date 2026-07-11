"use client";

import { motion } from "framer-motion";
import { Filter, Sparkles, ArrowRight, Zap, Target, Search } from "lucide-react";
import Link from "next/link";

export default function GrantMatching() {
  const recommendedGrants = [
    {
      id: 1,
      title: "Stellar Community Fund",
      provider: "Stellar Development Foundation",
      amount: "Up to $50,000 XLM",
      matchScore: 98,
      tags: ["DeFi", "Core Infrastructure"],
      deadline: "2026-11-15",
    },
    {
      id: 2,
      title: "Soroban Early Adopter Grant",
      provider: "Soroban Ecosystem",
      amount: "Up to $25,000 XLM",
      matchScore: 92,
      tags: ["Smart Contracts", "Tooling"],
      deadline: "2026-10-30",
    },
    {
      id: 3,
      title: "Web3 Identity Initiative",
      provider: "Equidox Partners",
      amount: "Up to $15,000 XLM",
      matchScore: 85,
      tags: ["Identity", "Social"],
      deadline: "2026-12-01",
    }
  ];

  return (
    <div className="max-w-6xl mx-auto py-8 font-mono text-zinc-400">
      
      {/* Header Banner */}
      <div className="panel-border p-8 mb-12 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-crucible-gold/10 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-3 mb-3">
             <div className="w-8 h-8 rounded-sm bg-crucible-gold/20 border border-crucible-gold flex items-center justify-center">
               <Sparkles className="w-4 h-4 text-crucible-gold" />
             </div>
             <h1 className="text-2xl font-bold text-white uppercase tracking-widest">AI Grant Matching</h1>
          </div>
          <p className="text-zinc-500 font-sans">
            Based on your Builder Passport reputation score (96.4) and past Soroban deployments, our AI has identified <strong className="text-crucible-gold">3 high-probability</strong> grant opportunities.
          </p>
        </div>
        <div className="relative z-10 hidden md:block">
           <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase mb-1">Passport Sync</span>
              <span className="text-crucible-cyan font-bold tracking-widest text-sm">UP TO DATE</span>
           </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Filters Sidebar */}
        <div className="w-full md:w-64 space-y-6">
          <div className="panel-border p-5">
            <h3 className="text-xs font-bold mb-4 flex items-center gap-2 text-white uppercase tracking-widest border-b border-crucible-border pb-2">
              <Filter className="w-4 h-4 text-crucible-gold" /> FILTERS
            </h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Ecosystem</label>
                <div className="space-y-2 text-xs">
                  <label className="flex items-center gap-3 text-zinc-300 hover:text-white cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded-sm bg-crucible-bg border-crucible-border text-crucible-gold focus:ring-crucible-gold" />
                    Stellar (12)
                  </label>
                  <label className="flex items-center gap-3 text-zinc-300 hover:text-white cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded-sm bg-crucible-bg border-crucible-border text-crucible-gold focus:ring-crucible-gold" />
                    Soroban (8)
                  </label>
                  <label className="flex items-center gap-3 text-zinc-500 hover:text-zinc-300 cursor-pointer">
                    <input type="checkbox" className="rounded-sm bg-crucible-bg border-crucible-border text-crucible-gold focus:ring-crucible-gold" />
                    Other (4)
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Funding Type</label>
                <div className="space-y-2 text-xs">
                  <label className="flex items-center gap-3 text-zinc-300 hover:text-white cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded-sm bg-crucible-bg border-crucible-border text-crucible-gold focus:ring-crucible-gold" />
                    Grants (15)
                  </label>
                  <label className="flex items-center gap-3 text-zinc-500 hover:text-zinc-300 cursor-pointer">
                    <input type="checkbox" className="rounded-sm bg-crucible-bg border-crucible-border text-crucible-gold focus:ring-crucible-gold" />
                    Hackathons (3)
                  </label>
                  <label className="flex items-center gap-3 text-zinc-500 hover:text-zinc-300 cursor-pointer">
                    <input type="checkbox" className="rounded-sm bg-crucible-bg border-crucible-border text-crucible-gold focus:ring-crucible-gold" />
                    Bounties (6)
                  </label>
                </div>
              </div>
              
              <button className="w-full py-2 bg-crucible-surface hover:bg-white/5 border border-crucible-border rounded-sm text-xs font-bold text-white tracking-widest uppercase transition-colors">
                Apply Filters
              </button>
            </div>
          </div>
        </div>

        {/* Grants List */}
        <div className="flex-1 space-y-4">
          
          <div className="flex justify-between items-center mb-2 px-2">
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Recommended Matches (3)</h2>
            <div className="flex items-center gap-2">
               <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Sort:</span>
               <span className="text-[10px] font-bold text-crucible-gold uppercase tracking-widest cursor-pointer">Match Score</span>
            </div>
          </div>

          {recommendedGrants.map((grant, idx) => (
            <motion.div 
              key={grant.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="panel-border p-6 group hover:border-crucible-gold/50 transition-all duration-300 relative overflow-hidden"
            >
              {/* Highlight match score bar */}
              <div className="absolute top-0 left-0 h-1 bg-crucible-gold" style={{ width: `${grant.matchScore}%` }}></div>

              <div className="flex flex-col md:flex-row justify-between gap-6">
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-white uppercase tracking-wider group-hover:text-crucible-gold transition-colors">{grant.title}</h3>
                    <span className="px-2 py-0.5 rounded-sm bg-crucible-gold/10 border border-crucible-gold text-[10px] font-bold text-crucible-gold tracking-widest flex items-center gap-1">
                      <Target className="w-3 h-3" /> {grant.matchScore}% MATCH
                    </span>
                  </div>
                  
                  <p className="text-sm text-zinc-500 mb-4">{grant.provider}</p>
                  
                  <div className="flex flex-wrap items-center gap-4 mb-4">
                    <div className="flex items-center gap-2 text-crucible-cyan text-sm font-bold">
                      <Zap className="w-4 h-4" />
                      {grant.amount}
                    </div>
                    <div className="w-px h-4 bg-crucible-border"></div>
                    <div className="text-xs text-zinc-500 font-bold uppercase tracking-widest">
                      Deadline: {grant.deadline}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {grant.tags.map(tag => (
                      <span key={tag} className="px-2 py-1 bg-white/5 border border-crucible-border text-zinc-400 text-[10px] uppercase font-bold tracking-widest rounded-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end md:border-l md:border-crucible-border md:pl-6">
                  <Link 
                    href={`/grants/${grant.id}`}
                    className="px-6 py-3 bg-white/5 hover:bg-crucible-gold hover:text-black border border-crucible-border hover:border-crucible-gold rounded-sm text-xs font-bold text-white uppercase tracking-widest transition-all flex items-center gap-2"
                  >
                    Apply Now <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
