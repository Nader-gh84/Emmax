import Link from "next/link";
import type { ReactNode } from "react";
import { MARKETING_ACCENT } from "@/lib/marketing-tokens";

type MarketingButtonProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "outline" | "ghost";
  className?: string;
};

export function MarketingButton({
  href,
  children,
  variant = "primary",
  className = "",
}: MarketingButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full text-[11px] font-medium tracking-[0.18em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400";
  const variants = {
    primary:
      "bg-sky-500 px-6 py-3 text-white shadow-md shadow-sky-500/25 hover:bg-sky-600",
    outline:
      "border border-sky-400/80 px-6 py-3 text-slate-800 hover:bg-sky-50",
    ghost: "text-sky-500 hover:text-sky-600",
  };

  return (
    <Link href={href} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </Link>
  );
}

export function MarketingCard({
  children,
  className = "",
  href,
}: {
  children: ReactNode;
  className?: string;
  href?: string;
}) {
  const inner = (
    <div
      className={`relative flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-200/60 transition hover:shadow-md ${className}`}
    >
      {children}
      <span
        aria-hidden
        className="absolute bottom-4 left-6 h-0.5 w-8 rounded-full"
        style={{ backgroundColor: MARKETING_ACCENT }}
      />
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full hover:opacity-95">
        {inner}
      </Link>
    );
  }

  return inner;
}

export function MarketingCheckList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-500">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M5 12l4 4L19 6"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}
