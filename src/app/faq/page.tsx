import LandingPlaceholder, {
  buildPlaceholderMetadata,
} from "@/components/landing/LandingPlaceholder";

export const metadata = buildPlaceholderMetadata(
  "FAQ",
  "Frequently asked questions about EmaX."
);

export default function FaqPage() {
  return (
    <LandingPlaceholder
      eyebrow="FAQ"
      title="FAQ"
      description="Common questions about getting started with EmaX, how voice quotes work, and how projects stay connected to customers and suppliers will live here. For now, sign in to explore the product directly."
    />
  );
}
