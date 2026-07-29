import type { Metadata } from "next";
import { Suspense } from "react";
import { VoiceQuoteBuilder } from "@/components/quotes/voice-quote-builder";

export const metadata: Metadata = {
  title: "Voice Quote Builder",
};

export default function VoiceQuoteBuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full flex-1 items-center justify-center text-sm text-slate-400">
          Loading Voice Quote Builder…
        </div>
      }
    >
      <VoiceQuoteBuilder />
    </Suspense>
  );
}
