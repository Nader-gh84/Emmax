import Link from "next/link";
import { marketingFont } from "@/lib/marketing-font";
import HomeVoiceTopics from "./HomeVoiceTopics";
import styles from "./home.module.css";

/**
 * Exact port of public/Home.html body markup into Next.js.
 * Styles: home.module.css (scoped). Voice: HomeVoiceTopics client component.
 */
export default function HomePage() {
  return (
    <div
      className={`${styles.root} ${marketingFont.variable} ${marketingFont.className}`}
    >
      <div className={styles.stage}>
        {/* eslint-disable-next-line @next/next/no-img-element -- approved static marketing assets */}
        <img
          className={styles.stageBg}
          src="/Background.png"
          alt=""
          aria-hidden="true"
        />
        <div className={styles.veil} aria-hidden="true" />

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={styles.ema}
          src="/Emmax.png"
          alt="Ema, the EmaX AI assistant"
          aria-hidden="true"
        />

        <header className={styles.siteHeader}>
          <div className={styles.shell}>
            <Link className={styles.logo} href="/" aria-label="EmaX home">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/Logo.png" alt="EmaX" />
            </Link>

            <nav className={styles.nav} aria-label="Main">
              <Link href="/" className={styles.isActive} aria-current="page">
                Home
              </Link>
              <Link href="/about">About</Link>
              <Link href="/features">Features</Link>
              <Link href="/pricing">Pricing</Link>
              <Link href="/faq">FAQ</Link>
            </nav>

            <Link className={styles.signin} href="/login">
              Sign in
              <svg viewBox="0 0 18 12" fill="none" aria-hidden="true">
                <path
                  d="M1 6h15m0 0-5-5m5 5-5 5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>

            <button
              type="button"
              className={styles.menuBtn}
              aria-label="Open menu"
            >
              <svg viewBox="0 0 20 14" fill="none" aria-hidden="true">
                <path
                  d="M0 1h20M0 7h20M0 13h20"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </header>

        <div className={styles.centre}>
          <p className={styles.kicker}>AI Assistant for Trades</p>

          <div className={styles.markStack}>
            <h1 className={styles.wordmark}>
              E M Λ <span className={styles.x}>X</span>
            </h1>

            <Link className={styles.enter} href="/login">
              <span className={styles.enterCircle}>
                <svg viewBox="0 0 26 26" fill="none" aria-hidden="true">
                  <path
                    d="M9 3.5 19 13 9 22.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className={styles.enterLabel}>Click to enter</span>
            </Link>
          </div>
        </div>

        <div className={styles.tagline}>
          <h2>
            Work <span className={styles.u}>smarter,</span>
            <br />
            not harder.
          </h2>
          <p className={styles.steps}>
            Plan <i>/</i> Quote <i>/</i> Manage <i>/</i> Get Paid
          </p>
        </div>

        <div className={styles.bottom}>
          <div className={styles.shell}>
            <div className={styles.dots} aria-hidden="true">
              <span className={styles.bar} />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>

            <HomeVoiceTopics />

            <Link className={styles.next} href="/login" aria-label="Enter EmaX">
              <span className={styles.line} aria-hidden="true" />
              <svg viewBox="0 0 24 14" fill="none" aria-hidden="true">
                <path
                  d="M0 7h21m0 0-6-6m6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
