import { Suspense } from "react";
import SettingsClientPage from "./settings-client";

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 flex-col items-center justify-center p-6 lg:p-8">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-accent" />
          <p className="mt-4 text-base text-slate-400">Loading settings...</p>
        </main>
      }
    >
      <SettingsClientPage />
    </Suspense>
  );
}
