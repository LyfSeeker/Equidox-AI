"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Terminal,
  ShieldCheck,
  Database,
  PanelLeftClose,
  PanelLeft,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import { useAuth } from "@/context/AuthContext";
import BrandIcon from "@/components/BrandIcon";

type NavLink = {
  name: string;
  href: string;
  hint: string;
  icon?: LucideIcon;
  brand?: "builder";
};

export default function Sidebar() {
  const pathname = usePathname();
  const { address } = useWallet();
  const { isAdmin } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const builderHref = address ? `/builder/${address}` : "/builder/me";

  const navLinks: NavLink[] = [
    { name: "HOME", href: "/home", icon: Home, hint: "Landing" },
    { name: "DASHBOARD", href: "/dashboard", icon: Terminal, hint: "Overview" },
    { name: "GRANTS", href: "/grants", icon: Database, hint: "Create & manage grants" },
    {
      name: "BUILDERS",
      href: builderHref,
      brand: "builder",
      hint: "Builder passport",
    },
    isAdmin
      ? {
          name: "REVIEW",
          href: "/review",
          icon: ShieldCheck,
          hint: "Review submissions",
        }
      : {
          name: "SUBMIT",
          href: "/submit",
          icon: Upload,
          hint: "Submit evidence",
        },
  ];

  return (
    <aside
      className={`h-full bg-crucible-surface/95 border-r border-crucible-border flex flex-col z-20 shrink-0 backdrop-blur-md transition-[width] duration-300 ${
        collapsed ? "w-16 md:w-[72px]" : "w-16 md:w-64"
      }`}
    >
      <div className="h-16 flex items-center justify-center md:justify-between px-2 md:px-3 border-b border-crucible-border gap-2">
        <Link href="/home" className="flex items-center gap-1 min-w-0 overflow-hidden">
          <img
            src="/logo.png"
            alt="Equidox"
            className="w-9 h-9 md:w-10 md:h-10 object-contain shrink-0"
          />
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="hidden md:flex items-center overflow-hidden whitespace-nowrap"
              >
                <span className="font-logo text-2xl font-medium text-white tracking-tight">
                  equidox&nbsp;
                </span>
                <span className="font-logo text-2xl font-light text-crucible-gold tracking-tight">
                  ai
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="btn btn-ghost btn-icon shrink-0 h-9 w-9 hidden md:inline-flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? (
            <PanelLeft className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 md:py-5 flex flex-col gap-1 px-1.5 md:px-2">
        {navLinks.map((link) => {
          let isActive = false;
          if (link.name === "HOME")
            isActive = pathname === "/home" || pathname === "/";
          else if (link.name === "BUILDERS")
            isActive = pathname.startsWith("/builder");
          else if (link.name === "REVIEW")
            isActive =
              pathname.startsWith("/review") ||
              pathname.startsWith("/verification");
          else if (link.name === "SUBMIT")
            isActive =
              pathname.startsWith("/submit") ||
              pathname.startsWith("/verification");
          else isActive = pathname.startsWith(link.href);

          return (
            <Link
              key={link.name}
              href={link.href}
              title={link.hint}
              className={`group relative flex items-center gap-3 px-3 py-3 rounded-lg transition-all text-xs font-bold tracking-wider ${
                isActive
                  ? "bg-white/[0.06] text-crucible-gold"
                  : "text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]"
              } justify-center ${collapsed ? "md:justify-center" : "md:justify-start"}`}
            >
              {isActive && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-crucible-gold shadow-[0_0_12px_rgba(222,255,59,0.5)]"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              {link.brand ? (
                <BrandIcon
                  name={link.brand}
                  className={`w-4 h-4 shrink-0 ${
                    isActive
                      ? "text-crucible-gold"
                      : "text-zinc-600 group-hover:text-zinc-400"
                  }`}
                />
              ) : link.icon ? (
                <link.icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive
                      ? "text-crucible-gold"
                      : "text-zinc-600 group-hover:text-zinc-400"
                  }`}
                />
              ) : null}
              {!collapsed && <span className="hidden md:inline">{link.name}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-2 md:p-3 border-t border-crucible-border space-y-1">
        {!collapsed && (
          <div className="hidden md:block px-3 py-2 text-[10px] font-bold tracking-widest uppercase text-crucible-gold">
            Role · {isAdmin ? "Admin" : "User"}
          </div>
        )}
      </div>
    </aside>
  );
}
