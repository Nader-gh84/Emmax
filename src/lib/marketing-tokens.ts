/** Marketing site design tokens (light theme, landing accent family) */
export const MARKETING_ACCENT = "#38BDF8";
export const MARKETING_ACCENT_SOFT = "#7DD3FC";
export const MARKETING_NAVY = "#0F172A";
export const MARKETING_MUTED = "#64748B";

export type MarketingPage =
  | "home"
  | "about"
  | "features"
  | "pricing"
  | "faq";

export const MARKETING_NAV: Array<{
  label: string;
  href: string;
  key: MarketingPage;
}> = [
  { label: "HOME", href: "/", key: "home" },
  { label: "ABOUT", href: "/about", key: "about" },
  { label: "FEATURES", href: "/features", key: "features" },
  { label: "PRICING", href: "/pricing", key: "pricing" },
  { label: "FAQ", href: "/faq", key: "faq" },
];
