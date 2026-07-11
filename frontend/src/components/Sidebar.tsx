"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Terminal, 
  Activity, 
  Users, 
  ShieldCheck, 
  Database,
  HelpCircle,
  Code
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const navLinks = [
    { name: "DASHBOARD", href: "/dashboard", icon: Terminal },
    { name: "GRANTS", href: "/grants", icon: Database },
    { name: "BUILDERS", href: "/builder/me", icon: Users },
    { name: "VERIFICATION", href: "/verification/1", icon: ShieldCheck },
  ];

  return (
    <div className="w-64 h-full bg-crucible-surface border-r border-crucible-border flex flex-col z-20 shrink-0">
      
      {/* Logo Area */}
      <div className="h-16 flex items-center px-6 border-b border-crucible-border">
        <div className="flex items-center gap-3">
           <div className="w-8 h-8 flex items-center justify-center text-crucible-gold border border-crucible-gold/30 rotate-45 rounded-sm">
              <div className="-rotate-45 font-bold text-lg">E</div>
           </div>
           <div className="flex flex-col justify-center">
             <span className="font-bold text-white tracking-widest text-lg leading-none mt-1">EQUIDOX</span>
             <span className="text-[10px] text-crucible-gold font-bold uppercase tracking-[0.2em] opacity-80 mt-1">Trust Layer</span>
           </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-2 px-3">
        {navLinks.map((link) => {
          const isActive = pathname.startsWith(link.href) || (pathname === '/' && link.href === '/dashboard');
          
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`flex items-center gap-4 px-4 py-3 rounded-md transition-all text-sm font-bold tracking-wider ${
                isActive 
                  ? "bg-white/5 text-crucible-gold border-l-2 border-crucible-gold" 
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border-l-2 border-transparent"
              }`}
            >
              <link.icon className={`w-4 h-4 ${isActive ? 'text-crucible-gold' : 'text-zinc-600'}`} />
              {link.name}
            </Link>
          );
        })}
      </div>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-crucible-border flex flex-col gap-2">
        <button className="flex items-center gap-4 px-4 py-2 text-xs font-bold tracking-wider text-zinc-500 hover:text-zinc-300 uppercase transition-colors">
          <HelpCircle className="w-4 h-4 text-zinc-600" />
          Support
        </button>
        <button className="flex items-center gap-4 px-4 py-2 text-xs font-bold tracking-wider text-zinc-500 hover:text-zinc-300 uppercase transition-colors">
          <Code className="w-4 h-4 text-zinc-600" />
          System Log
        </button>
      </div>

    </div>
  );
}
