import LandingPlaceholder, {
  buildPlaceholderMetadata,
} from "@/components/landing/LandingPlaceholder";

export const metadata = buildPlaceholderMetadata(
  "Features",
  "Key capabilities of EmaX for projects, suppliers, and customers."
);

export default function FeaturesPage() {
  return (
    <LandingPlaceholder
      eyebrow="FEATURES"
      title="What Ema can do"
      description="From voice-powered quotes to project tracking, supplier pricing, and customer payments — EmaX connects the work you already do into one clear flow. Tap Projects, Suppliers, or Customers on the landing page to hear Ema explain each area."
    />
  );
}
