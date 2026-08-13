import type { Metadata } from "next";
import FeaturesPageContent from "@/components/marketing/features/FeaturesPageContent";

/**
 * Features — exact port of public/Features.html (approved design).
 */

export const metadata: Metadata = {
  title: "Features — EmaX",
  description:
    "One assistant. Your whole workflow. From the first material list to the final payment.",
};

export default function FeaturesPage() {
  return <FeaturesPageContent />;
}
