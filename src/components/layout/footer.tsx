import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-navy px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <Link href="/" className="text-lg font-bold text-white">
          Ema<span className="text-accent">X</span>
        </Link>
        <p className="text-sm text-slate-400">
          &copy; 2024 EmaX. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
