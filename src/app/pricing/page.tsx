import type { Metadata } from "next";
import PricingPageContent from "@/components/marketing/pricing/PricingPageContent";

/**
 * Pricing — exact port of public/Pricing.html (approved design).
 */

export const metadata: Metadata = {
  title: "Pricing — EmaX",
  description:
    "Less paperwork. More time to build. Simple plans for trade businesses using EmaX.",
};

export default function PricingPage() {
  return <PricingPageContent />;
}
