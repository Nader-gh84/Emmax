import LandingPlaceholder, {
  buildPlaceholderMetadata,
} from "@/components/landing/LandingPlaceholder";

export const metadata = buildPlaceholderMetadata(
  "About EmaX",
  "EmaX is your AI assistant for trades — plan, quote, manage, and get paid."
);

export default function AboutPage() {
  return (
    <LandingPlaceholder
      eyebrow="ABOUT"
      title="About EmaX"
      description="EmaX is a personal AI assistant built for trade businesses. She helps you turn customer conversations into quotes, run projects from start to finish, and keep suppliers, customers, and money organized — so you can work smarter, not harder."
    />
  );
}
