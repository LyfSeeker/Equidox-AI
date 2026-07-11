"use client";

import { motion } from "framer-motion";
import { CheckCircle, Trophy, DollarSign, Package, Globe, Shield, Award, Calendar, Activity } from "lucide-react";
import { useParams } from "next/navigation";

export default function BuilderPassport() {
  const params = useParams();
  
  // Mock data for the passport
  const passportData = {
    id: params.id,
    address: "0x2FEC...DE3B",
    reputationScore: 96.4,
    milestonesCompleted: 14,
    totalFunding: "$45,000",
    hackathonsWon: 3,
    projectsDeployed: 2,
    githubHealth: "Excellent",
    securityScore: "98/100"
  };

  return (
    <div className="max-w-5xl mx-auto py-8 font-mono text-zinc-400">
      
      {/* Header Profile */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-sm bg-crucible-bg border border-crucible-border flex items-center justify-center text-4xl shadow-[0_0_20px_rgba(255,176,0,0.15)] relative overflow-hidden">
             <div className="absolute inset-0 bg-crucible-gold/10"></div>
             🚀
          </div>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-white uppercase tracking-widest">Builder Passport</h1>
              <span className="px-2 py-1 rounded border border-crucible-cyan text-crucible-cyan bg-crucible-cyan/10 text-xs font-bold">VERIFIED</span>
            </div>
            <p className="text-zinc-500 font-bold tracking-widest">{passportData.address}</p>
          </div>
        </div>
        
        <div className="panel-border px-6 py-4 flex items-center gap-6">
          <div className="text-right">
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Reputation Score</p>
            <p className="text-3xl font-bold text-crucible-gold">{passportData.reputationScore}<span className="text-sm text-zinc-600">/100</span></p>
          </div>
          <div className="h-12 w-px bg-crucible-border"></div>
          <Activity className="w-8 h-8 text-crucible-gold opacity-50" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        
        {/* Stats Grid */}
        <div className="panel-border p-6 col-span-1 md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-6">
          
          <div className="flex flex-col">
             <CheckCircle className="w-5 h-5 text-crucible-cyan mb-3" />
             <p className="text-2xl font-bold text-white mb-1">{passportData.milestonesCompleted}</p>
             <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Milestones</p>
          </div>
          
          <div className="flex flex-col">
             <DollarSign className="w-5 h-5 text-crucible-gold mb-3" />
             <p className="text-2xl font-bold text-white mb-1">{passportData.totalFunding}</p>
             <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Funding</p>
          </div>
          
          <div className="flex flex-col">
             <Trophy className="w-5 h-5 text-crucible-gold mb-3" />
             <p className="text-2xl font-bold text-white mb-1">{passportData.hackathonsWon}</p>
             <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Hackathons</p>
          </div>
          
          <div className="flex flex-col">
             <Package className="w-5 h-5 text-crucible-cyan mb-3" />
             <p className="text-2xl font-bold text-white mb-1">{passportData.projectsDeployed}</p>
             <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Deployments</p>
          </div>
          
        </div>

        {/* AI Health Profile */}
        <div className="panel-border p-6 col-span-1">
          <h3 className="text-xs font-bold mb-6 flex items-center gap-2 text-white tracking-widest uppercase">
            <Activity className="w-4 h-4 text-crucible-cyan" />
            AI Health Profile
          </h3>
          <div className="space-y-6">
            
            <div>
               <div className="flex justify-between items-center mb-2">
                 <div className="flex items-center gap-2">
                   <Globe className="w-4 h-4 text-zinc-500" />
                   <span className="text-[10px] font-bold tracking-widest text-zinc-400">GITHUB HEALTH</span>
                 </div>
                 <span className="text-crucible-cyan font-bold text-xs">EXCELLENT</span>
               </div>
               <div className="w-full h-1 bg-black rounded-full overflow-hidden border border-crucible-border">
                  <div className="h-full bg-crucible-cyan w-[95%]"></div>
               </div>
            </div>

            <div>
               <div className="flex justify-between items-center mb-2">
                 <div className="flex items-center gap-2">
                   <Shield className="w-4 h-4 text-zinc-500" />
                   <span className="text-[10px] font-bold tracking-widest text-zinc-400">SECURITY SCORE</span>
                 </div>
                 <span className="text-crucible-gold font-bold text-xs">98/100</span>
               </div>
               <div className="w-full h-1 bg-black rounded-full overflow-hidden border border-crucible-border">
                  <div className="h-full bg-crucible-gold w-[98%]"></div>
               </div>
            </div>

          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Milestone History */}
        <div className="lg:col-span-2">
          <h2 className="text-xs font-bold mb-6 text-white uppercase tracking-widest border-b border-crucible-border pb-2">
            Verified Milestone History
          </h2>
          <div className="space-y-4">
            {[
              { title: "Core Protocol V1", project: "DeFi Swap Platform", date: "Oct 2026", status: "VERIFIED" },
              { title: "Smart Contract Audit Fixes", project: "NFT Marketplace", date: "Aug 2026", status: "VERIFIED" },
              { title: "Initial Prototype", project: "Stellar Bridge", date: "Jun 2026", status: "VERIFIED" }
            ].map((milestone, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="panel-border p-5 flex items-center justify-between group hover:bg-white/5 transition-colors"
              >
                <div>
                  <h4 className="font-bold text-sm text-white mb-1 uppercase tracking-wider">{milestone.title}</h4>
                  <p className="text-xs text-zinc-500">{milestone.project}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2 text-crucible-cyan text-[10px] font-bold">
                    <CheckCircle className="w-3 h-3" />
                    {milestone.status}
                  </div>
                  <div className="flex items-center gap-1 text-zinc-600 text-[10px] font-bold">
                    <Calendar className="w-3 h-3" />
                    {milestone.date}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Badges */}
        <div className="lg:col-span-1">
          <h2 className="text-xs font-bold mb-6 text-white uppercase tracking-widest border-b border-crucible-border pb-2">
            On-Chain Badges
          </h2>
          <div className="grid grid-cols-2 gap-4">
            
            <div className="panel-border p-4 text-center flex flex-col items-center">
               <div className="w-10 h-10 bg-crucible-bg border border-crucible-cyan/50 flex items-center justify-center mb-3 text-lg">
                 🛡️
               </div>
               <p className="font-bold text-[10px] text-white tracking-widest">0 VULNS</p>
               <p className="text-[9px] text-zinc-500 mt-1">Perfect Audit</p>
            </div>
            
            <div className="panel-border p-4 text-center flex flex-col items-center">
               <div className="w-10 h-10 bg-crucible-bg border border-crucible-gold/50 flex items-center justify-center mb-3 text-lg">
                 ⚡
               </div>
               <p className="font-bold text-[10px] text-white tracking-widest">SHIPPER</p>
               <p className="text-[9px] text-zinc-500 mt-1">&lt;2wk Delivery</p>
            </div>
            
            <div className="panel-border p-4 text-center flex flex-col items-center">
               <div className="w-10 h-10 bg-crucible-bg border border-zinc-500 flex items-center justify-center mb-3 text-lg">
                 🥇
               </div>
               <p className="font-bold text-[10px] text-white tracking-widest">TOP 1%</p>
               <p className="text-[9px] text-zinc-500 mt-1">Hackathon</p>
            </div>
            
            <div className="panel-border p-4 text-center flex flex-col items-center">
               <div className="w-10 h-10 bg-crucible-bg border border-crucible-cyan/50 flex items-center justify-center mb-3 text-lg">
                 🔐
               </div>
               <p className="font-bold text-[10px] text-white tracking-widest">SOROBAN</p>
               <p className="text-[9px] text-zinc-500 mt-1">Expert</p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
