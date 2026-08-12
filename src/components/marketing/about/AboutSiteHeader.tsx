"use client";

import Link from "next/link";
import { useState } from "react";
import { ABOUT } from "@/lib/about-design-tokens";
import { TriangleLogo } from "@/components/marketing/marketing-icons";

const NAV: Array<{ label: string; href: string; active?: boolean }> = [
  { label: "HOME", href: "/" },
  { label: "ABOUT", href: "/about", active: true },
  { label: "FEATURES", href: "/features" },
  { label: "PRICING", href: "/pricing" },
  { label: "FAQ", href: "/faq" },
];

export default function AboutSiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header
      className="relative z-30 border-b border-[rgba(65,105,225,0.08)] bg-white/75 backdrop-blur-sm"
      style={{ minHeight: 96 }}
    >
      <div className="mx-auto flex h-24 max-w-[1440px] items-center justify-between px-5 md:px-8 lg:px-[72px]">
        <Link href="/" className="flex items-center gap-2.5">
          <TriangleLogo className="text-[#122A5A]" />
          <span
            className="text-[22px] font-semibold tracking-tight"
            style={{ color: ABOUT.textPrimary }}
          >
            Ema<span style={{ color: ABOUT.blueLight }}>X</span>
          </span>
        </Link>

        <nav className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-8 lg:flex xl:gap-10">
          {NAV.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="relative text-[11px] font-medium tracking-[0.28em] transition hover:opacity-80"
              style={{
                color: item.active ? ABOUT.blue : ABOUT.textPrimary,
                textShadow: item.active
                  ? "0 0 18px rgba(36,99,255,0.25)"
                  : undefined,
              }}
            >
              {item.label}
              {item.active ? (
                <span
                  className="absolute -bottom-2.5 left-1/2 block h-px w-8 -translate-x-1/2"
                  style={{ backgroundColor: ABOUT.blue }}
                />
              ) : null}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden h-[44px] items-center rounded-full border px-6 text-[11px] font-medium tracking-[0.2em] transition hover:-translate-y-px hover:bg-[#EDF4FF] hover:shadow-sm sm:inline-flex lg:h-[46px] lg:px-7"
            style={{ borderColor: ABOUT.blue, color: ABOUT.textPrimary }}
          >
            SIGN IN&nbsp;&nbsp;→
          </Link>
          <button
            type="button"
            className="inline-flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-lg border lg:hidden"
            style={{ borderColor: ABOUT.border }}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="block h-0.5 w-5 bg-[#122A5A]" />
            <span className="block h-0.5 w-5 bg-[#122A5A]" />
            <span className="block h-0.5 w-5 bg-[#122A5A]" />
          </button>
        </div>
      </div>

      {open ? (
        <nav
          className="border-t px-5 py-4 lg:hidden"
          style={{
            borderColor: ABOUT.border,
            backgroundColor: ABOUT.bgSoft,
          }}
        >
          <ul className="space-y-3">
            {NAV.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className="block py-1 text-sm font-medium tracking-[0.2em]"
                  style={{ color: item.active ? ABOUT.blue : ABOUT.textPrimary }}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/login"
                className="mt-2 inline-flex h-11 items-center rounded-full border px-6 text-[11px] font-medium tracking-[0.2em]"
                style={{ borderColor: ABOUT.blue, color: ABOUT.textPrimary }}
                onClick={() => setOpen(false)}
              >
                SIGN IN →
              </Link>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
