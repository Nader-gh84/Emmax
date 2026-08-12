import type { Metadata } from "next";
import FeaturesInteractive from "@/components/landing/FeaturesInteractive";
import MarketingMockupStage from "@/components/landing/MarketingMockupStage";

/**
 * Features: raw Features.png (same stage sizing as landing / PR #98) + hit targets.
 * Asset is portrait 1024×1536 — stage math uses native aspect.
 */

export const metadata: Metadata = {
  title: "Features — EmaX",
  description:
    "One assistant. Your whole workflow. From the first material list to the final payment.",
};

export default function FeaturesPage() {
  return (
    <MarketingMockupStage
      src="/images/Features.png"
      alt="EmaX Features — One assistant. Your whole workflow."
      widthPx={1024}
      heightPx={1536}
    >
      <FeaturesInteractive />
    </MarketingMockupStage>
  );
}
