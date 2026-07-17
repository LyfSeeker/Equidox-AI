import type { Metadata } from "next";
import { Space_Mono, Inter, Outfit } from "next/font/google";
import "./globals.css";
import AppChrome from "@/components/AppChrome";
import AuthGate from "@/components/AuthGate";
import ParticleBackground from "@/components/ParticleBackground";
import { AuthProvider } from "@/context/AuthContext";
import { WalletProvider } from "@/context/WalletContext";
import { ToastProvider } from "@/context/ToastContext";

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  variable: "--font-space-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Equidox AI | Milestone Verification",
  description: "AI-powered milestone verification and grant distribution on Stellar",
  icons: {
    icon: "/icon.png?v=2",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceMono.variable} ${inter.variable} ${outfit.variable} h-full antialiased dark`}
    >
      <body className="h-full flex bg-crucible-bg text-foreground font-mono overflow-hidden relative">
        <ParticleBackground />
        <AuthProvider>
          <WalletProvider>
            <ToastProvider>
              <AppChrome>
                <AuthGate>{children}</AuthGate>
              </AppChrome>
            </ToastProvider>
          </WalletProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
