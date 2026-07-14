import { Suspense } from "react";
import AdminClient from "./AdminClient";

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="h-full w-full min-h-screen flex items-center justify-center bg-crucible-bg text-[10px] uppercase tracking-widest text-zinc-500">
          Loading…
        </div>
      }
    >
      <AdminClient />
    </Suspense>
  );
}
