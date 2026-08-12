import type { Metadata } from "next";
import AboutInteractive from "@/components/landing/AboutInteractive";
import MarketingMockupStage from "@/components/landing/MarketingMockupStage";

/**
 * About: raw About.png (same stage sizing as landing / PR #98) + hit targets.
 */

export const metadata: Metadata = {
  title: "About — EmaX",
  description:
    "Built for trades. Backed by AI. EmaX helps you plan, quote, manage, and get paid.",
};

export default function AboutPage() {
  return (
    <MarketingMockupStage
      src="/images/About.png"
      alt="About EmaX — Built for trades. Backed by AI."
      widthPx={1536}
      heightPx={1024}
    >
      <AboutInteractive />
    </MarketingMockupStage>
  );
}
