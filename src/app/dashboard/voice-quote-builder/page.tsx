import type { Metadata } from "next";
import { VoiceQuoteBuilder } from "@/components/quotes/voice-quote-builder";

export const metadata: Metadata = {
  title: "Voice Quote Builder",
};

export default function VoiceQuoteBuilderPage() {
  return <VoiceQuoteBuilder />;
}
