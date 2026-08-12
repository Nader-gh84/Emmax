"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

type HitLink = {
  href: string;
  label: string;
  style: CSSProperties;
  className?: string;
};

/**
 * Hit targets for public/images/Pricing.png (1024×1536 portrait).
 * Nav mirrors landing; PRICING is the active baked-in state in the asset.
 *
 * Plan / founding CTAs currently point at /signup as placeholders until
 * real billing / plan-selection logic exists.
 */
const HITS: HitLink[] = [
  {
    href: "/",
    label: "EmaX home",
    style: { left: "3%", top: "1.5%", width: "14%", height: "3.2%" },
  },
  {
    href: "/",
    label: "Home",
    style: { left: "35%", top: "1.8%", width: "7%", height: "2.8%" },
  },
  {
    href: "/about",
    label: "About",
    style: { left: "42.5%", top: "1.8%", width: "7.5%", height: "2.8%" },
  },
  {
    href: "/features",
    label: "Features",
    style: { left: "50.5%", top: "1.8%", width: "9%", height: "2.8%" },
  },
  {
    href: "/pricing",
    label: "Pricing",
    style: { left: "60%", top: "1.8%", width: "8%", height: "2.8%" },
  },
  {
    href: "/faq",
    label: "FAQ",
    style: { left: "68.5%", top: "1.8%", width: "6%", height: "2.8%" },
  },
  {
    href: "/login",
    label: "Sign in",
    style: { left: "85%", top: "1.3%", width: "12%", height: "3.4%" },
  },
  // Founding Crew
  {
    href: "/about",
    label: "How it works",
    style: { left: "14%", top: "44%", width: "14%", height: "2%" },
  },
  {
    href: "/signup",
    label: "Get started free",
    // PLACEHOLDER: founding join → signup until waitlist/billing exists
    style: { left: "80.5%", top: "42%", width: "13.5%", height: "3.5%" },
    className: "landing-cta-hit",
  },
  // Plan cards
  {
    href: "/signup",
    label: "Start free trial — EmaX Pro",
    // PLACEHOLDER: plan selection → signup until billing exists
    style: { left: "13%", top: "74%", width: "38%", height: "3.5%" },
    className: "landing-cta-hit",
  },
  {
    href: "/faq",
    label: "Talk to us — EmaX Teams",
    style: { left: "58%", top: "74%", width: "32%", height: "3.5%" },
    className: "landing-cta-hit",
  },
  {
    href: "/signup",
    label: "Request founding access",
    // PLACEHOLDER: waitlist → signup until dedicated flow exists
    style: { left: "62%", top: "79.5%", width: "28%", height: "3%" },
  },
  {
    href: "/faq",
    label: "View FAQ",
    style: { left: "70%", top: "93%", width: "22%", height: "3.5%" },
  },
];
export default function PricingInteractive() {
  return (
    <div className="absolute inset-0 z-10">
      {HITS.map((hit) => (
        <Link
          key={`${hit.href}-${hit.label}`}
          href={hit.href}
          aria-label={hit.label}
          className={`absolute rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 ${hit.className ?? ""}`}
          style={hit.style}
        />
      ))}
    </div>
  );
}
