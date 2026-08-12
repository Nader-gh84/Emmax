import LandingPlaceholder, {
  buildPlaceholderMetadata,
} from "@/components/landing/LandingPlaceholder";

export const metadata = buildPlaceholderMetadata(
  "Pricing",
  "Simple pricing plans for trade businesses using EmaX."
);

export default function PricingPage() {
  return (
    <LandingPlaceholder
      eyebrow="PRICING"
      title="Pricing"
      description="Plans and packaging for EmaX are being finalized. Check back soon for clear options that fit solo trades and growing crews — no surprise add-ons baked into the story."
    />
  );
}
