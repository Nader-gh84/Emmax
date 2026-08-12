import type { Metadata } from "next";
import LandingInteractive from "@/components/landing/LandingInteractive";
import MarketingMockupStage from "@/components/landing/MarketingMockupStage";

/**
 * Landing: raw Landing page 1.png + transparent hit targets.
 * Stage sizing shared via MarketingMockupStage (PR #98 pattern).
 */

export const metadata: Metadata = {
  title: "EmaX — AI Assistant for Trades",
  description:
    "Work smarter, not harder. Plan, quote, manage, and get paid with EmaX.",
};

export default function LandingPage() {
  return (
    <MarketingMockupStage
      src="/images/Landing%20page%201.png"
      alt="EmaX — AI assistant for trades"
      widthPx={1536}
      heightPx={1024}
    >
      <LandingInteractive />
    </MarketingMockupStage>
  );
}
