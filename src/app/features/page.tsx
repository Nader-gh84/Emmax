import type { Metadata } from "next";
import FeaturesPageContent from "@/components/marketing/FeaturesPageContent";

export const metadata: Metadata = {
  title: "Features — EmaX",
  description:
    "One assistant. Your whole workflow. From the first material list to the final payment.",
};

export default function FeaturesPage() {
  return <FeaturesPageContent />;
}
