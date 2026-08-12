import type { Metadata } from "next";
import AboutPageContent from "@/components/marketing/AboutPageContent";

export const metadata: Metadata = {
  title: "About — EmaX",
  description:
    "Built for trades. Backed by AI. EmaX helps you plan, quote, manage, and get paid.",
};

export default function AboutPage() {
  return <AboutPageContent />;
}
