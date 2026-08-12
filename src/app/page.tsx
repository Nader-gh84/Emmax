import type { Metadata } from "next";
import LandingInteractive from "@/components/landing/LandingInteractive";

/**
 * Landing: raw Landing page 1.png + transparent hit targets.
 *
 * Scale rule (no letterboxing, no cropping of the asset):
 * - Stage is always at least as wide as the viewport AND at least as tall
 *   as the viewport, while keeping the native 1536×1024 aspect ratio.
 * - Typical wide screens → width: 100vw, page scrolls vertically a bit.
 * - Tall/narrow screens → height: 100dvh, page may scroll horizontally.
 * - Full mockup remains in the document; nothing is clipped by object-fit.
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
    <main className="box-border min-h-dvh w-full bg-black">
      {/*
        Fill the limiting viewport edge without contain-letterboxing.
        width = max(100vw, 100dvh × aspect) keeps both axes covering the
        visible window; overflow scrolls so the full image stays reachable.
      */}
      <div
        className="relative mx-auto"
        style={{
          aspectRatio: MOCKUP_ASPECT,
          width: "max(100vw, calc(100dvh * 1536 / 1024))",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- raw mockup asset, no optimization */}
        <img
          src="/images/Landing%20page%201.png"
          alt="EmaX — AI assistant for trades"
          className="pointer-events-none absolute inset-0 z-0 box-border h-full w-full select-none object-fill"
          draggable={false}
        />

        <LandingInteractive />
      </div>
    </main>
  );
}
