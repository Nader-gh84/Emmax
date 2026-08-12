import Link from "next/link";
import {
  MARKETING_ACCENT_SOFT,
  MARKETING_NAV,
  type MarketingPage,
} from "@/lib/marketing-tokens";
import { TriangleLogo } from "./marketing-icons";

type MarketingNavProps = {
  activePage: MarketingPage;
};

export default function MarketingNav({ activePage }: MarketingNavProps) {
  return (
    <header className="relative flex h-14 items-center justify-between lg:h-16">
      <Link href="/" className="flex items-center gap-2.5 text-slate-900">
        <TriangleLogo className="text-slate-800" />
        <span className="text-xl font-semibold tracking-tight">
          Ema<span style={{ color: MARKETING_ACCENT_SOFT }}>X</span>
        </span>
      </Link>

      <nav className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-6 md:flex lg:gap-8">
        {MARKETING_NAV.map((link) => {
          const active = link.key === activePage;
          return (
            <Link
              key={link.label}
              href={link.href}
              className={`relative text-[10px] font-medium tracking-[0.28em] transition hover:text-sky-500 lg:text-[11px] lg:tracking-[0.32em] ${
                active ? "text-sky-500" : "text-slate-700"
              }`}
            >
              {link.label}
              {active ? (
                <span className="absolute -bottom-2 left-1/2 block h-px w-7 -translate-x-1/2 bg-sky-400" />
              ) : null}
            </Link>
          );
        })}
      </nav>

      <Link
        href="/login"
        className="inline-flex h-9 items-center rounded-full border border-sky-400/80 px-4 text-[10px] font-medium tracking-[0.2em] text-slate-800 transition hover:bg-sky-50 lg:h-10 lg:px-6 lg:text-[11px]"
      >
        SIGN IN&nbsp;&nbsp;→
      </Link>
    </header>
  );
}
