import { Suspense } from "react";
import LoginClient from "./LoginClient";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="h-full w-full min-h-screen flex items-center justify-center bg-crucible-bg text-[10px] uppercase tracking-widest text-zinc-500">
          Loading…
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
