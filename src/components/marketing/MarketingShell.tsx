import type { ReactNode } from "react";
import { Space_Grotesk } from "next/font/google";
import MarketingNav from "./MarketingNav";
import type { MarketingPage } from "@/lib/marketing-tokens";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

type MarketingShellProps = {
  activePage: MarketingPage;
  children: ReactNode;
  className?: string;
};

export default function MarketingShell({
  activePage,
  children,
  className = "",
}: MarketingShellProps) {
  return (
    <div
      className={`${spaceGrotesk.className} min-h-dvh bg-white text-slate-900 antialiased ${className}`}
    >
      <div className="mx-auto w-full max-w-6xl px-5 pb-16 pt-6 sm:px-8 lg:px-10 lg:pb-20 lg:pt-8">
        <MarketingNav activePage={activePage} />
        {children}
      </div>
    </div>
  );
}

export function MarketingEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-medium tracking-[0.35em] text-sky-500">
      {children}
    </p>
  );
}

export function MarketingSectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-3 py-8">
      <span className="flex gap-1.5">
        <i className="h-1.5 w-1.5 rounded-full bg-sky-400" />
        <i className="h-1.5 w-1.5 rounded-full bg-sky-300" />
        <i className="h-1.5 w-1.5 rounded-full bg-sky-300" />
      </span>
      <span className="text-[11px] font-medium tracking-[0.32em] text-slate-500">
        {children}
      </span>
      <span className="flex gap-1.5">
        <i className="h-1.5 w-1.5 rounded-full bg-sky-300" />
        <i className="h-1.5 w-1.5 rounded-full bg-sky-300" />
        <i className="h-1.5 w-1.5 rounded-full bg-sky-400" />
      </span>
    </div>
  );
}

export function MarketingHeroPhoto({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-slate-100 ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- hero photo asset only */}
      <img
        src="/images/hero-landing-page3.jpg"
        alt=""
        className="h-full w-full object-cover object-[58%_center]"
        draggable={false}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-l from-white/10 via-transparent to-white/40"
      />
    </div>
  );
}
