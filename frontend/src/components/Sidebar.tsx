"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Terminal,
  Users,
  ShieldCheck,
  Database,
  HelpCircle,
  Code,
} from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import { useAuth } from "@/context/AuthContext";

export default function Sidebar() {
  const pathname = usePathname();
  const { address } = useWallet();
  const { isAdmin } = useAuth();

  const builderHref = address ? `/builder/${address}` : "/builder/me";

  const navLinks = [
    { name: "DASHBOARD", href: "/dashboard", icon: Terminal },
    { name: "GRANTS", href: "/grants", icon: Database },
    { name: "BUILDERS", href: builderHref, icon: Users },
    {
      name: isAdmin ? "REVIEW" : "SUBMIT",
      href: "/grants",
      icon: ShieldCheck,
      hint: isAdmin
        ? "Review grant submissions"
        : "Submit documents for a grant",
    },
  ];

  return (
    <div className="w-56 md:w-64 h-full bg-crucible-surface border-r border-crucible-border flex flex-col z-20 shrink-0">
      <div className="h-16 flex items-center px-6 border-b border-crucible-border">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center text-crucible-gold border border-crucible-gold/30 rotate-45 rounded-sm">
            <div className="-rotate-45 font-bold text-lg">E</div>
          </div>
          <div className="flex flex-col justify-center">
            <span className="font-bold text-white tracking-widest text-lg leading-none mt-1">
              EQUIDOX
            </span>
            <span className="text-[10px] text-crucible-gold font-bold uppercase tracking-[0.2em] opacity-80 mt-1">
              {isAdmin ? "Admin Layer" : "Trust Layer"}
            </span>
          </div>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-2 px-3">
        {navLinks.map((link) => {
          const isActive =
            pathname.startsWith(link.href) ||
            (pathname === "/" && link.href === "/dashboard") ||
            (link.name === "BUILDERS" && pathname.startsWith("/builder")) ||
            ((link.name === "REVIEW" || link.name === "SUBMIT") &&
              pathname.startsWith("/verification"));

          return (
            <Link
              key={link.name}
              href={link.href}
              title={link.hint}
              className={`flex items-center gap-4 px-4 py-3 rounded-md transition-all text-sm font-bold tracking-wider ${
                isActive
                  ? "bg-white/5 text-crucible-gold border-l-2 border-crucible-gold"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border-l-2 border-transparent"
              }`}
            >
              <link.icon
                className={`w-4 h-4 ${isActive ? "text-crucible-gold" : "text-zinc-600"}`}
              />
              {link.name}
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-crucible-border space-y-2">
        <div className="px-3 py-2 text-[10px] font-bold tracking-widest uppercase text-crucible-gold">
          Role · {isAdmin ? "Admin" : "User"}
        </div>
        <div className="flex items-center gap-3 px-3 py-2 text-zinc-600 text-xs font-bold tracking-widest">
          <HelpCircle className="w-4 h-4" /> SUPPORT
        </div>
        <div className="flex items-center gap-3 px-3 py-2 text-zinc-600 text-xs font-bold tracking-widest">
          <Code className="w-4 h-4" /> SYSTEM LOG
        </div>
      </div>
    </div>
  );
}
