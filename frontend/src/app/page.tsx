"use client";

import { motion, Variants } from "framer-motion";
import { ArrowRight, Bot, ShieldCheck, Zap, Activity } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
      },
    },
  };

  return (
    <div className="min-h-screen flex flex-col font-mono relative overflow-hidden text-zinc-400">
      
      {/* Background elements */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none opacity-20">
         <div className="w-[600px] h-[600px] border border-crucible-border rounded-full absolute mix-blend-overlay"></div>
         <div className="w-[800px] h-[800px] border border-crucible-border rounded-full absolute mix-blend-overlay"></div>
      </div>

      <main className="flex-grow flex flex-col items-center justify-center pt-20 pb-32 px-4 relative z-10">
        
        {/* Hero Section */}
        <motion.div
          className="max-w-4xl w-full text-center flex flex-col items-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="mb-8 flex items-center gap-2 px-4 py-1.5 rounded-sm border border-crucible-border bg-crucible-bg text-xs font-bold tracking-widest text-zinc-300">
            <Zap className="w-3 h-3 text-crucible-gold" />
            <span>BUILT ON STELLAR & SOROBAN</span>
          </motion.div>

          <motion.h1 
            variants={itemVariants}
            className="text-5xl md:text-7xl font-bold mb-6 tracking-tight text-white uppercase"
          >
            AI-Powered<br />
            Milestone <span className="text-crucible-gold">Verification</span>
          </motion.h1>

          <motion.p 
            variants={itemVariants}
            className="text-lg md:text-xl mb-12 max-w-2xl text-zinc-500 font-sans"
          >
            Automate project reviews, enable transparent milestone-based payouts on Stellar, and build an on-chain Builder Passport.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 w-full justify-center">
            <Link
              href="/dashboard"
              className="px-8 py-4 bg-crucible-gold hover:brightness-110 text-black font-bold tracking-wide uppercase text-sm flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(222,255,59,0.3)] hover:shadow-[0_0_25px_rgba(222,255,59,0.5)] rounded-sm"
            >
              Start Verifying <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/builder/me"
              className="px-8 py-4 rounded-sm border border-crucible-border bg-crucible-surface hover:bg-white/5 text-zinc-300 font-bold tracking-wide uppercase text-sm transition-colors flex items-center justify-center"
            >
              View Builder Passport
            </Link>
          </motion.div>
        </motion.div>

        {/* Features Section */}
        <motion.div 
          className="max-w-6xl w-full mt-32"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 text-white uppercase tracking-wider">How it Works</h2>
            <p className="text-zinc-500 text-sm">The future of grant distribution and hackathon payouts.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Feature 1 */}
            <div className="p-8 rounded-md panel-border relative group overflow-hidden">
              <div className="w-12 h-12 rounded-sm bg-[#1a2332] flex items-center justify-center mb-6">
                <Bot className="w-6 h-6 text-[#4d88ff]" />
              </div>
              <h3 className="text-lg font-bold mb-3 text-white uppercase tracking-wider">AI Analysis</h3>
              <p className="text-zinc-500 text-sm font-sans leading-relaxed">
                Our AI analyzes GitHub repos, deployed apps, and smart contracts to generate detailed verification reports and completion scores.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-md panel-border relative group overflow-hidden">
              <div className="w-12 h-12 rounded-sm flex items-center justify-start mb-6">
                <ShieldCheck className="w-6 h-6 text-zinc-300" />
              </div>
              <h3 className="text-lg font-bold mb-3 text-white uppercase tracking-wider">Stellar Payouts</h3>
              <p className="text-zinc-500 text-sm font-sans leading-relaxed">
                Funds are locked and automatically released in stages on Stellar after milestone approval, ensuring transparent funding.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-md panel-border relative group overflow-hidden">
              <div className="w-12 h-12 rounded-sm bg-[#221533] flex items-center justify-center mb-6">
                <Activity className="w-6 h-6 text-[#9955ff]" />
              </div>
              <h3 className="text-lg font-bold mb-3 text-white uppercase tracking-wider">Builder Passport</h3>
              <p className="text-zinc-500 text-sm font-sans leading-relaxed">
                Every completed milestone builds your on-chain reputation. Carry your verified track record across grant programs and hackathons.
              </p>
            </div>

          </div>
        </motion.div>
        
      </main>
    </div>
  );
}
