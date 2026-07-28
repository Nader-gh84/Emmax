import Image from "next/image";
import Link from "next/link";
import { BuildVersionIndicator } from "@/components/layout/build-version-indicator";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-navy/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex shrink-0 flex-col items-start gap-0.5">
          <Image
            src="/images/logo-v2.png"
            alt="EmaX"
            width={120}
            height={36}
            className="h-9 w-auto"
            priority
          />
          <BuildVersionIndicator />
        </Link>
        <nav className="hidden items-center gap-8 sm:flex">
          <Link
            href="#how-it-works"
            className="text-sm font-medium text-slate-300 transition hover:text-white"
          >
            How It Works
          </Link>
          <Link
            href="#pricing"
            className="text-sm font-medium text-slate-300 transition hover:text-white"
          >
            Pricing
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-medium text-slate-300 transition hover:text-white"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </header>
  );
}
