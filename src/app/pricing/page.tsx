import type { Metadata } from "next";
import PricingInteractive from "@/components/landing/PricingInteractive";
import MarketingMockupStage from "@/components/landing/MarketingMockupStage";

/**
 * Pricing: raw Pricing.png (same stage sizing as landing / PR #98) + hit targets.
 * Asset is portrait 1024×1536 — stage math uses native aspect.
 *
 * Plan CTAs currently route to /signup as placeholders until billing exists.
 */

export const metadata: Metadata = {
  title: "Pricing — EmaX",
  description:
    "Less paperwork. More time to build. Simple plans for trade businesses using EmaX.",
};

export default function PricingPage() {
  return (
    <MarketingMockupStage
      src="/images/Pricing.png"
      alt="EmaX Pricing — Less paperwork. More time to build."
      widthPx={1024}
      heightPx={1536}
    >
      <PricingInteractive />
    </MarketingMockupStage>
  );
}
