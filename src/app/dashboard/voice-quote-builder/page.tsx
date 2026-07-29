import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Voice Quote Builder",
};

export default function VoiceQuoteBuilderPage({
  searchParams,
}: {
  searchParams?: { id?: string };
}) {
  const draftId = searchParams?.id;

  return (
    <main className="flex flex-1 flex-col p-6 lg:p-8">
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-12 text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent">
          Beta
        </p>
        <h1 className="mt-4 text-2xl font-bold text-white sm:text-3xl">
          Voice Quote Builder
        </h1>
        <p className="mt-2 text-sm text-slate-400 sm:text-base">
          Speak naturally and Ema will build the pre-invoice for you.
        </p>
        <p className="mt-6 text-sm text-slate-500">
          Layout coming next
          {draftId ? ` · loading draft ${draftId.slice(0, 8)}…` : ""}.
        </p>
      </div>
    </main>
  );
}
