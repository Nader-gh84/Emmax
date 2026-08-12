import type { Metadata } from "next";
import LandingInteractive from "@/components/landing/LandingInteractive";

/**
 * Landing: raw Landing page 1.png (object-fit: contain) + transparent hit targets.
 * Baked-in mockup UI stays visible; interactive layer handles nav/CTA/voice only.
 */

export const metadata: Metadata = {
  title: "EmaX — AI Assistant for Trades",
  description:
    "Work smarter, not harder. Plan, quote, manage, and get paid with EmaX.",
};

/** Native mockup aspect ratio (1536 × 1024) */
const MOCKUP_ASPECT = "1536 / 1024";

export default function LandingPage() {
  return (
    <main
      className="box-border flex h-dvh min-h-dvh w-full items-center justify-center overflow-hidden bg-black"
      style={{ height: "100dvh", minHeight: "100dvh" }}
    >
      {/*
        Stage sized to the mockup aspect ratio inside the viewport so
        object-fit:contain letterboxing and hit-target % coords stay aligned.
      */}
      <div
        className="relative max-h-full max-w-full"
        style={{
          aspectRatio: MOCKUP_ASPECT,
          width: "min(100vw, calc(100dvh * 1536 / 1024))",
          height: "min(100dvh, calc(100vw * 1024 / 1536))",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- raw mockup asset, no optimization */}
        <img
          src="/images/Landing%20page%201.png"
          alt="EmaX — AI assistant for trades"
          className="absolute inset-0 z-0 box-border h-full w-full object-contain object-center select-none"
          draggable={false}
        />

        <LandingInteractive />
      </div>
    </main>
  );
}
