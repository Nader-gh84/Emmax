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
 * Hit targets for public/images/Features.png (1024×1536 portrait).
 * Nav mirrors landing; FEATURES is the active baked-in state in the asset.
 * Coming Soon cards stay non-interactive.
 */
const HITS: HitLink[] = [
  {
    href: "/",
    label: "EmaX home",
    style: { left: "3.5%", top: "1.6%", width: "14%", height: "3.2%" },
  },
  {
    href: "/",
    label: "Home",
    style: { left: "42%", top: "1.8%", width: "7%", height: "2.8%" },
  },
  {
    href: "/about",
    label: "About",
    style: { left: "49.5%", top: "1.8%", width: "7.5%", height: "2.8%" },
  },
  {
    href: "/features",
    label: "Features",
    style: { left: "57.5%", top: "1.8%", width: "9%", height: "2.8%" },
  },
  {
    href: "/pricing",
    label: "Pricing",
    style: { left: "67%", top: "1.8%", width: "8%", height: "2.8%" },
  },
  {
    href: "/faq",
    label: "FAQ",
    style: { left: "75.5%", top: "1.8%", width: "6%", height: "2.8%" },
  },
  {
    href: "/login",
    label: "Sign in",
    style: { left: "85%", top: "1.3%", width: "12%", height: "3.4%" },
  },
  // Available Now — 8 feature cards (2×4)
  {
    href: "/login",
    label: "01 Voice Material List",
    style: { left: "5%", top: "40%", width: "20.5%", height: "10%" },
  },
  {
    href: "/login",
    label: "02 Send to Suppliers",
    style: { left: "27%", top: "40%", width: "20.5%", height: "10%" },
  },
  {
    href: "/login",
    label: "03 Supplier Inbox",
    style: { left: "49%", top: "40%", width: "20.5%", height: "10%" },
  },
  {
    href: "/login",
    label: "04 Confirm & Create Pre-Invoice",
    style: { left: "71%", top: "40%", width: "22%", height: "10%" },
  },
  {
    href: "/login",
    label: "05 Send to Customer",
    style: { left: "5%", top: "50.5%", width: "20.5%", height: "10%" },
  },
  {
    href: "/login",
    label: "06 Customer Confirm",
    style: { left: "27%", top: "50.5%", width: "20.5%", height: "10%" },
  },
  {
    href: "/login",
    label: "07 Project Created",
    style: { left: "49%", top: "50.5%", width: "20.5%", height: "10%" },
  },
  {
    href: "/login",
    label: "08 Track & Complete",
    style: { left: "71%", top: "50.5%", width: "22%", height: "10%" },
  },
  // Available Now — 4 horizontal capabilities
  {
    href: "/login",
    label: "Employees & Hours",
    style: { left: "5%", top: "67.5%", width: "20.5%", height: "5%" },
  },
  {
    href: "/login",
    label: "Supplier Accounting",
    style: { left: "27%", top: "67.5%", width: "20.5%", height: "5%" },
  },
  {
    href: "/login",
    label: "Customer & Payments",
    style: { left: "49%", top: "67.5%", width: "20.5%", height: "5%" },
  },
  {
    href: "/login",
    label: "Today - Your Day",
    style: { left: "71%", top: "67.5%", width: "22%", height: "5%" },
  },
  // Bottom banner logo
  {
    href: "/",
    label: "EmaX home",
    style: { left: "9%", top: "91.5%", width: "8%", height: "5%" },
  },
];

export default function FeaturesInteractive() {
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
