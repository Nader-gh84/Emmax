import Link from "next/link";
import { marketingFont } from "@/lib/marketing-font";
import styles from "./about.module.css";

/**
 * Exact port of public/About.html body markup into Next.js.
 * Styles: about.module.css (scoped). No client scripts in the source HTML.
 */
export default function AboutPageContent() {
  return (
    <div
      className={`${styles.root} ${marketingFont.variable} ${marketingFont.className}`}
    >
      <header className={styles.siteHeader}>
        <div className={styles.shell}>
          <Link className={styles.logo} href="/" aria-label="EmaX home">
            {/* eslint-disable-next-line @next/next/no-img-element -- approved static marketing assets */}
            <img src="/Logo.png" alt="EmaX" />
          </Link>

          <nav className={styles.nav} aria-label="Main">
            <Link href="/">Home</Link>
            <Link href="/about" className={styles.isActive} aria-current="page">
              About
            </Link>
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

      <section className={styles.hero}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={styles.heroBg}
          src="/Background.png"
          alt=""
          aria-hidden="true"
        />
        <div className={styles.veil} aria-hidden="true" />

        <div className={styles.shell}>
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>About EmaX</p>

              <h1 className={styles.heroTitle}>
                Built for trades.
                <br />
                Backed by <span className={styles.accent}>AI.</span>
              </h1>

              <p className={styles.heroLede}>
                EmaX is an AI assistant designed specifically for trades
                professionals. I help you plan, quote, manage and get paid — all
                in one smart place.
              </p>

              <Link className={styles.cta} href="/login">
                <svg
                  className={styles.play}
                  viewBox="0 0 22 22"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    cx="11"
                    cy="11"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M9 7.5v7l5.5-3.5L9 7.5Z"
                    fill="currentColor"
                  />
                </svg>
                See EmaX in action
              </Link>
            </div>

            <div className={styles.heroFigure}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={styles.heroPhoto}
                src="/Emmax.png"
                alt="Ema, the EmaX AI assistant, working at a laptop"
              />
            </div>
          </div>
        </div>
      </section>

      <section className={styles.mission}>
        <div className={styles.shell}>
          <p>
            <span className={styles.spark} aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M9 1.5 10.3 6 14.5 7.3 10.3 8.6 9 13 7.7 8.6 3.5 7.3 7.7 6 9 1.5Z"
                  fill="currentColor"
                />
                <path
                  d="M14.6 11.6l.5 1.7 1.6.5-1.6.5-.5 1.7-.5-1.7-1.6-.5 1.6-.5.5-1.7Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            I combine AI power with real-world trade experience
            <br />
            to <span className={styles.hl}>save you time, reduce mistakes</span>{" "}
            and <span className={styles.hl}>grow your business.</span>
          </p>
        </div>
      </section>

      <section className={styles.cardsSection}>
        <div className={styles.shell}>
          <div className={styles.cards}>
            <article className={styles.card}>
              <div className={styles.cardHead}>
                <span className={styles.cardIcon}>
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2Z"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <h3>Made for Trades</h3>
              </div>
              <p>
                Built for electricians, plumbers, HVAC pros, carpenters and
                general contractors.
              </p>
            </article>

            <article className={styles.card}>
              <div className={styles.cardHead}>
                <span className={styles.cardIcon}>
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M12 4.5v15M12 6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 2.8 2.8 0 0 0-1.5 5A3 3 0 0 0 6 16.5a3 3 0 0 0 3 3 3 3 0 0 0 3-2.6M12 6a3 3 0 0 1 3-3 3 3 0 0 1 3 3 2.8 2.8 0 0 1 1.5 5A3 3 0 0 1 18 16.5a3 3 0 0 1-3 3 3 3 0 0 1-3-2.6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <h3>AI That Works</h3>
              </div>
              <p>
                I understand your workflow and turn your voice and data into
                action.
              </p>
            </article>

            <article className={styles.card}>
              <div className={styles.cardHead}>
                <span className={styles.cardIcon}>
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M12 2.8 4.5 5.8v6c0 4.4 3.1 8.1 7.5 9.4 4.4-1.3 7.5-5 7.5-9.4v-6L12 2.8Z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                    <path
                      d="m8.8 11.9 2.2 2.2 4.2-4.2"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <h3>All in One Place</h3>
              </div>
              <p>
                Projects, suppliers, customers, quotes, tasks and payments —
                everything connected.
              </p>
            </article>

            <article className={styles.card}>
              <div className={styles.cardHead}>
                <span className={styles.cardIcon}>
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M4 20V13M9.3 20V8.5M14.7 20v-6M20 20V4"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <h3>Focus on Growth</h3>
              </div>
              <p>
                I take care of the busy work so you can focus on what really
                matters.
              </p>
            </article>
          </div>
        </div>
      </section>

      <div className={styles.footerStrip}>
        <div className={styles.shell}>
          <div className={styles.dotGrid} aria-hidden="true">
            {Array.from({ length: 18 }).map((_, i) => (
              <span key={i} />
            ))}
          </div>

          <Link
            className={styles.nextArrow}
            href="/features"
            aria-label="Next: Features"
          >
            <svg viewBox="0 0 22 16" fill="none" aria-hidden="true">
              <path
                d="M1 8h19m0 0-6-6m6 6-6 6"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
