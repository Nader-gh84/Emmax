import type { Metadata } from "next";
import Link from "next/link";

type PlaceholderPageProps = {
  title: string;
  description: string;
  eyebrow: string;
};

export function buildPlaceholderMetadata(
  title: string,
  description: string
): Metadata {
  return {
    title: `${title} — EmaX`,
    description,
  };
}

export default function LandingPlaceholder({
  title,
  description,
  eyebrow,
}: PlaceholderPageProps) {
  return (
    <main className="box-border flex min-h-dvh flex-col bg-[#020617] px-6 py-10 text-white sm:px-12">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-white hover:opacity-90"
        >
          Ema<span className="text-sky-300">X</span>
        </Link>
        <Link
          href="/login"
          className="rounded-full border border-white/70 px-4 py-1.5 text-xs tracking-[0.2em] hover:bg-white/10"
        >
          SIGN IN
        </Link>
      </header>

      <section className="mx-auto mt-24 w-full max-w-3xl">
        <p className="text-[11px] font-medium tracking-[0.35em] text-sky-300/90">
          {eyebrow}
        </p>
        <h1 className="mt-4 text-4xl font-medium tracking-tight sm:text-5xl">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">
          {description}
        </p>
        <p className="mt-8 text-sm text-white/45">
          Placeholder page — full content coming soon.
        </p>
        <Link
          href="/"
          className="mt-10 inline-flex items-center gap-2 text-sm tracking-[0.18em] text-white/90 hover:text-white"
        >
          ← BACK TO HOME
        </Link>
      </section>
    </main>
  );
}
