import Image from "next/image";
import Link from "next/link";

export function AuthSplitLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-navy text-white">
      <aside className="relative hidden w-1/2 overflow-hidden lg:flex">
        <Image
          src="/images/hero-assistant-v2.png"
          alt=""
          fill
          priority
          sizes="50vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/75 to-navy/35" />
        <div className="absolute inset-0 bg-gradient-to-r from-navy/50 via-transparent to-navy/20" />

        <div className="relative z-10 flex w-full flex-col justify-between p-10 xl:p-14">
          <Link href="/" className="inline-flex w-fit">
            <Image
              src="/images/logo-v2.png"
              alt="EmaX"
              width={140}
              height={42}
              className="h-10 w-auto"
              priority
            />
          </Link>

          <div>
            <h2 className="max-w-md text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
              <span className="block text-white">Speak.</span>
              <span className="block text-white">
                Ema builds the{" "}
                <span className="text-accent">quote.</span>
              </span>
            </h2>

            <div
              className="mt-10 flex items-center gap-2"
              aria-hidden="true"
            >
              <span className="h-2 w-2 rounded-full bg-accent" />
              <span className="h-2 w-2 rounded-full bg-white/30" />
              <span className="h-2 w-2 rounded-full bg-white/30" />
            </div>
          </div>
        </div>
      </aside>

      <div className="flex w-full flex-1 flex-col justify-center px-6 py-10 sm:px-10 lg:w-1/2 lg:px-12 xl:px-16">
        <div className="mb-8 flex justify-center lg:hidden">
          <Link href="/">
            <Image
              src="/images/logo-v2.png"
              alt="EmaX"
              width={120}
              height={36}
              className="h-9 w-auto"
              priority
            />
          </Link>
        </div>
        <div className="mx-auto w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
