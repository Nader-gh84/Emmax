import { Inter } from "next/font/google";
import { ABOUT } from "@/lib/about-design-tokens";
import AboutFeatureGrid from "./AboutFeatureGrid";
import AboutHero from "./AboutHero";
import AboutMission from "./AboutMission";
import AboutSiteHeader from "./AboutSiteHeader";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export default function AboutPageContent() {
  return (
    <div
      className={`${inter.className} min-h-dvh antialiased`}
      style={{ backgroundColor: ABOUT.bgSoft, color: ABOUT.textPrimary }}
    >
      <AboutSiteHeader />
      <main>
        <AboutHero />
        <AboutMission />
        <AboutFeatureGrid />
      </main>
    </div>
  );
}
