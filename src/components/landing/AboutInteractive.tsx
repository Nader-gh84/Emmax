"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import MarketingOverlay from "@/components/landing/MarketingOverlay";

type HitLink = {
  href: string;
  label: string;
  style: CSSProperties;
  className?: string;
};

/**
 * Hit targets for public/images/About.png (1536×1024).
 * Nav mirrors landing; ABOUT is the active baked-in state in the asset.
 */
const HITS: HitLink[] = [
  {
    href: "/",
    label: "EmaX home",
    style: { left: "4%", top: "3%", width: "12%", height: "5.5%" },
  },
  {
    href: "/",
    label: "Home",
    style: { left: "45.5%", top: "3.4%", width: "5.5%", height: "4.6%" },
  },
  {
    href: "/about",
    label: "About",
    style: { left: "51.5%", top: "3.4%", width: "6%", height: "4.6%" },
  },
  {
    href: "/features",
    label: "Features",
    style: { left: "58.5%", top: "3.4%", width: "7.2%", height: "4.6%" },
  },
  {
    href: "/pricing",
    label: "Pricing",
    style: { left: "66.5%", top: "3.4%", width: "6.5%", height: "4.6%" },
  },
  {
    href: "/faq",
    label: "FAQ",
    style: { left: "74%", top: "3.4%", width: "4.5%", height: "4.6%" },
  },
  {
    href: "/login",
    label: "Sign in",
    style: { left: "85.5%", top: "2.6%", width: "11.5%", height: "5.8%" },
  },
  {
    href: "/login",
    label: "See EmaX in action",
    style: { left: "8%", top: "45.5%", width: "24%", height: "7%" },
    className: "landing-cta-hit",
  },
  {
    href: "/features",
    label: "Made for Trades",
    style: { left: "5.5%", top: "72%", width: "20%", height: "20%" },
  },
  {
    href: "/features",
    label: "AI That Works",
    style: { left: "28.5%", top: "72%", width: "20%", height: "20%" },
  },
  {
    href: "/features",
    label: "All in One Place",
    style: { left: "51.5%", top: "72%", width: "20%", height: "20%" },
  },
  {
    href: "/features",
    label: "Focus on Growth",
    style: { left: "74.5%", top: "72%", width: "20%", height: "20%" },
  },
  {
    href: "/features",
    label: "Continue to Features",
    style: { left: "91%", top: "91%", width: "6.5%", height: "7%" },
    className: "landing-cta-hit",
  },
];

export default function AboutInteractive() {
  return (
    <MarketingOverlay>
      {HITS.map((hit) => (
        <Link
          key={`${hit.href}-${hit.label}`}
          href={hit.href}
          aria-label={hit.label}
          className={`absolute rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 ${hit.className ?? ""}`}
          style={hit.style}
        />
      ))}
    </MarketingOverlay>
  );
}
