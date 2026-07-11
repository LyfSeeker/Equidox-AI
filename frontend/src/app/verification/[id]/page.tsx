"use client";

import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, ShieldAlert, Bot, ArrowRight, Globe, FileText, Code2, Link as LinkIcon, DollarSign, Activity } from "lucide-react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function VerificationView() {
  const params = useParams();

  // Mock verification report data
  const aiReport = {
    projectId: params.id,
    milestone: "Core Smart Contracts",
    completionScore: 92,
    confidenceScore: 88,
    riskLevel: "Low",
    evidence: [
      { type: 'github', url: "github.com/project/core", commit: "a1b2c3d" },
      { type: 'contract', url: "stellar.expert/contract/...", address: "CAJ...3F2" },
      { type: 'docs', url: "docs.project.com/v1", title: "API Specs" }
    ],
    summary: "The submitted smart contracts implement all requirements specified in the milestone description. Test coverage is at 94%. No high-severity vulnerabilities found by static analysis.",
    flags: [
      "Minor gas optimization possible in transfer function.",
      "Documentation missing for one internal helper function."
    ]
  };

  return (
    <div className="max-w-6xl mx-auto py-8 font-mono text-zinc-400">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
           <div className="flex items-center gap-3 mb-2">
             <Link href="/dashboard" className="text-zinc-500 hover:text-white transition-colors uppercase text-[10px] tracking-widest font-bold">
               &larr; BACK TO DASHBOARD
             </Link>
           </div>
           <h1 className="text-3xl font-bold text-white uppercase tracking-widest flex items-center gap-3">
             Milestone Review
             <span className="px-2 py-1 rounded bg-black border border-crucible-border text-zinc-500 text-xs font-bold tracking-widest">
               ID: {aiReport.projectId}
             </span>
           </h1>
           <p className="text-zinc-500 mt-2 font-bold tracking-widest">Target: {aiReport.milestone}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* AI Scores - Linear Progress Bars instead of circular */}
          <div className="panel-border p-8 grid grid-cols-1 md:grid-cols-2 gap-8 relative overflow-hidden">
            
            {/* Completion Score */}
            <div className="flex flex-col">
               <div className="flex justify-between items-end mb-2">
                 <div className="flex items-center gap-2">
                   <CheckCircle2 className="w-4 h-4 text-crucible-cyan" />
                   <span className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase">Completion Index</span>
                 </div>
                 <span className="text-2xl font-bold text-crucible-cyan">{aiReport.completionScore}%</span>
               </div>
               <div className="w-full h-1.5 bg-black rounded-full overflow-hidden border border-crucible-border">
                  <div className="h-full bg-crucible-cyan" style={{ width: `${aiReport.completionScore}%` }}></div>
               </div>
            </div>

            {/* Confidence Score */}
            <div className="flex flex-col">
               <div className="flex justify-between items-end mb-2">
                 <div className="flex items-center gap-2">
                   <Bot className="w-4 h-4 text-crucible-gold" />
                   <span className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase">AI Confidence</span>
                 </div>
                 <span className="text-2xl font-bold text-crucible-gold">{aiReport.confidenceScore}%</span>
               </div>
               <div className="w-full h-1.5 bg-black rounded-full overflow-hidden border border-crucible-border">
                  <div className="h-full bg-crucible-gold" style={{ width: `${aiReport.confidenceScore}%` }}></div>
               </div>
            </div>

          </div>

          {/* AI Summary */}
          <div className="panel-border p-8 border-t-2 border-t-crucible-cyan relative overflow-hidden">
            <h2 className="text-sm font-bold mb-6 flex items-center gap-2 text-white uppercase tracking-widest">
              <Bot className="w-5 h-5 text-crucible-cyan" />
              AI Analysis Summary
            </h2>
            <p className="text-zinc-300 leading-relaxed font-sans mb-6 text-sm">
              {aiReport.summary}
            </p>
            
            <div className="space-y-3 mt-6 border-t border-crucible-border pt-6">
              <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle className="w-3 h-3 text-crucible-gold" /> Minor Flags
              </h3>
              <ul className="space-y-2">
                {aiReport.flags.map((flag, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-xs text-zinc-400 font-sans">
                    <span className="text-crucible-gold mt-1">&bull;</span>
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Evidence Analyzed */}
          <div className="panel-border p-8">
             <h2 className="text-sm font-bold mb-6 text-white uppercase tracking-widest">Evidence Trace</h2>
             <div className="grid grid-cols-1 gap-4">
               {aiReport.evidence.map((item, idx) => (
                 <a key={idx} href={`https://${item.url}`} target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 bg-black/40 border border-crucible-border hover:border-zinc-500 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-crucible-bg border border-crucible-border flex items-center justify-center text-zinc-500 group-hover:text-white transition-colors">
                        {item.type === 'github' && <Globe className="w-5 h-5" />}
                        {item.type === 'contract' && <Code2 className="w-5 h-5" />}
                        {item.type === 'docs' && <FileText className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-white text-xs font-bold uppercase tracking-widest mb-1 group-hover:text-crucible-gold transition-colors">{item.url}</p>
                        <p className="text-[10px] text-zinc-500">
                          {item.commit ? `Commit: ${item.commit}` : item.address ? `Address: ${item.address}` : `Title: ${item.title}`}
                        </p>
                      </div>
                    </div>
                    <LinkIcon className="w-4 h-4 text-zinc-600 group-hover:text-crucible-gold transition-colors" />
                 </a>
               ))}
             </div>
          </div>

        </div>

        {/* Sidebar Actions */}
        <div className="lg:col-span-1 space-y-6">
           <div className="panel-border p-6 sticky top-24">
             <h3 className="font-bold mb-6 text-white uppercase tracking-widest border-b border-crucible-border pb-4">Escrow Actions</h3>
             
             <div className="space-y-4 mb-8">
               <button className="w-full py-4 bg-crucible-cyan/10 hover:bg-crucible-cyan border border-crucible-cyan text-crucible-cyan hover:text-black font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 group">
                 <CheckCircle2 className="w-4 h-4 group-hover:animate-pulse" /> Approve & Release
               </button>
               
               <button className="w-full py-4 bg-transparent hover:bg-crucible-red/10 border border-crucible-border hover:border-crucible-red text-zinc-400 hover:text-crucible-red font-bold uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2">
                 <ShieldAlert className="w-4 h-4" /> Flag for Review
               </button>
             </div>

             <div className="pt-6 border-t border-crucible-border">
               <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Deep Dive Required?</h4>
               <button className="w-full py-3 bg-crucible-gold/5 hover:bg-crucible-gold/20 border border-crucible-gold/30 text-crucible-gold text-[10px] font-bold uppercase tracking-widest transition-colors flex flex-col items-center gap-2 rounded">
                 <span className="flex items-center gap-2"><DollarSign className="w-3 h-3" /> UNLOCK PREMIUM</span>
                 <span className="text-[9px] text-zinc-500">Requires 100 XLM</span>
               </button>
             </div>
           </div>
        </div>

      </div>
    </div>
  );
}
