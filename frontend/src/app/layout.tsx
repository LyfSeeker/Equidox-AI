import type { Metadata } from "next";
import { Space_Mono, Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  variable: "--font-space-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Equidox | Platform Validation",
  description: "AI-powered milestone verification and grant distribution on Stellar",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceMono.variable} ${inter.variable} h-full antialiased dark`}
    >
      <body className="h-full flex bg-grid-pattern text-foreground font-mono overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-4 md:p-8">
            {children}
          </main>
          
          {/* Footer Bar */}
          <div className="h-8 border-t border-crucible-border bg-crucible-bg flex items-center justify-between px-4 text-[10px] uppercase font-bold text-zinc-500 z-10 shrink-0">
             <span>© 2026 EQUIDOX INDUSTRIAL AGENTS</span>
             <div className="flex items-center gap-6">
                <span>NETWORK: 42.5K TPS</span>
                <span>PROTOCOL: V4.0.2</span>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-crucible-cyan"></span>
                  STATUS: OPERATIONAL
                </span>
             </div>
          </div>
        </div>
      </body>
    </html>
  );
}
