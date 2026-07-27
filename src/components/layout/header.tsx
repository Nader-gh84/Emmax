import Image from "next/image";
import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-navy/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="shrink-0">
          <Image
            src="/images/logo.png"
            alt="EmaX"
            width={120}
            height={36}
            className="h-9 w-auto"
            priority
          />
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
            className="hidden text-sm font-medium text-slate-300 transition hover:text-white sm:inline"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600"
          >
            Start Free Trial
          </Link>
        </div>
      </div>
    </header>
  );
}
