/* eslint-disable @next/next/no-img-element -- approved static marketing assets */
import Link from "next/link";
import { marketingFont } from "@/lib/marketing-font";
import styles from "./pricing.module.css";

/**
 * Exact port of public/Pricing.html body markup into Next.js.
 * Styles: pricing.module.css (scoped). No client scripts in the source HTML.
 */
export default function PricingPageContent() {
  return (
    <div
      className={`${styles.root} ${marketingFont.variable} ${marketingFont.className}`}
    >

      <header className={styles.siteHeader}>
        <div className={styles.shell}>
          <Link className={styles.logo} href="/" aria-label="EmaX home">
      
            <img src="/Logo.png" alt="EmaX" />
          </Link>

          <nav className={styles.nav} aria-label="Main">
            <Link href="/">Home</Link>
            <Link href="/about">About</Link>
            <Link href="/features">Features</Link>
            <Link href="/pricing" className={styles.isActive} aria-current="page">Pricing</Link>
          </nav>

          <Link className={styles.signin} href="/login">
            Sign in
            <svg viewBox="0 0 18 12" fill="none" aria-hidden="true">
              <path d="M1 6h15m0 0-5-5m5 5-5 5" stroke="currentColor" strokeWidth="1.5"
                    strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>

          <button type="button" className={styles.menuBtn} aria-label="Open menu">
            <svg viewBox="0 0 20 14" fill="none" aria-hidden="true">
              <path d="M0 1h20M0 7h20M0 13h20" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </header>


      <section className={styles.hero}>
  
        <img className={styles.heroBg} src="/Background.png" alt="" aria-hidden="true" />
        <div className={styles.veil} aria-hidden="true"></div>

        <div className={styles.shell}>
          <div className={styles.heroInner}>

            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>Pricing</p>

              <h1 className={styles.heroTitle}>
                Less paperwork.<br />
                More time to <span className={styles.accent}>build.</span>
              </h1>

              <p className={styles.heroLede}>
                I handle the busy work so you can focus on what really matters.
              </p>

              <div className={styles.benefits}>
                <div className={styles.benefit}>
                  <span className={styles.benefitIcon}>
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2Z"
                            stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  <h4>Quick setup</h4>
                  <p>Get started in minutes</p>
                </div>

                <div className={styles.benefit}>
                  <span className={styles.benefitIcon}>
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <rect x="9" y="2.5" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.7"/>
                      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"
                            stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
                    </svg>
                  </span>
                  <h4>Voice-first</h4>
                  <p>Talk, I&apos;ll handle the rest</p>
                </div>

                <div className={styles.benefit}>
                  <span className={styles.benefitIcon}>
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M12 2.8 4.8 5.6v6c0 4.3 3 7.9 7.2 9.1 4.2-1.2 7.2-4.8 7.2-9.1v-6L12 2.8Z"
                            stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
                      <path d="m9 11.9 2.1 2.1 4-4"
                            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  <h4>Secure & Private</h4>
                  <p>Your data stays yours</p>
                </div>
              </div>
            </div>

            <div className={styles.heroFigure}>
        
              <img className={styles.heroPhoto} src="/Emmax.png"
                   alt="Ema, the EmaX AI assistant, working at a laptop" />
            </div>

          </div>
        </div>
      </section>

      <div className={styles.pageBody}>
      <main className={styles.shell}>

  
        <section className={styles.founding}>

          <div className={styles.foundingLead}>
            <span className={styles.crownBadge} aria-hidden="true">
              <svg viewBox="0 0 32 32" fill="none">
                <path d="M6 12.5 9.6 16l3.2-5.2L16 15l3.2-4.2L22.4 16 26 12.5v7.2H6v-7.2Z"
                      stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
                <circle cx="16" cy="7" r="1.7" fill="currentColor"/>
                <path d="M9.5 23.5c1.6-1.9 3.9-2.9 6.5-2.9s4.9 1 6.5 2.9"
                      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </span>

            <div>
              <p className={styles.foundingKicker}>FOUNDING CREW · 20 SPOTS ONLY</p>
              <h2>Help shape EmaX.<br />Get EmaX free for life.</h2>
              <p>Join my early user program, use EmaX on real jobs and help me improve through regular feedback.</p>
              <Link className={styles.howLink} href="/about">
                How it works
                <svg viewBox="0 0 18 12" fill="none" aria-hidden="true">
                  <path d="M1 6h15m0 0-5-5m5 5-5 5" stroke="currentColor" strokeWidth="1.6"
                        strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            </div>
          </div>

          <div className={styles.foundingProgress}>
            <p className={styles.claimed}><strong>18 / 20</strong> spots claimed</p>

            <div className={styles.pips} aria-hidden="true">
              <i className={styles.on}></i><i className={styles.on}></i><i className={styles.on}></i><i className={styles.on}></i><i className={styles.on}></i>
              <i className={styles.on}></i><i className={styles.on}></i><i className={styles.on}></i><i className={styles.on}></i><i className={styles.on}></i>
              <i className={styles.on}></i><i className={styles.on}></i><i className={styles.on}></i><i className={styles.on}></i><i className={styles.on}></i>
              <i className={styles.on}></i><i className={styles.on}></i><i className={styles.on}></i><i></i><i></i>
            </div>

            <p className={styles.onList}>
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <circle cx="10" cy="10" r="8.6" stroke="currentColor" strokeWidth="1.6"/>
                <path d="m6.4 10.2 2.4 2.4 4.8-4.8" stroke="currentColor" strokeWidth="1.8"
                      strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              You&apos;re #18 on the list!
            </p>

            <p className={styles.secured}>You&apos;ve secured your spot in the EmaX Founding Crew.</p>
            <p className={styles.note}>Your EmaX access stays free as long as you remain an active Founding Crew member and provide regular product feedback.</p>
          </div>

          <div className={styles.spotsCard}>
            <p className={styles.label}>Spots left</p>
            <p className={styles.count}>2</p>
            <p className={styles.urge}>Don&apos;t miss it!</p>
            <Link className={styles.btnSolid} href="/signup">GET STARTED FREE</Link>
          </div>

        </section>

  
        <section className={styles.plans}>

          <article className={[ styles.plan, styles.planFeatured ].join(' ')}>
            <span className={styles.planBadge}>Full EmaX Experience</span>
            <h3>EmaX Pro</h3>
            <p className={styles.sub}>Everything you need to run your jobs smarter.</p>

            <div className={styles.price}>
              <span className={styles.amount}>$29</span>
              <span className={styles.period}>CAD / month</span>
            </div>

            <div className={styles.planBody}>
              <ul className={styles.featureList}>
                <li><svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8.4" stroke="currentColor" strokeWidth="1.5"/><path d="m6.5 10.2 2.3 2.3 4.7-4.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>Voice material lists</li>
                <li><svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8.4" stroke="currentColor" strokeWidth="1.5"/><path d="m6.5 10.2 2.3 2.3 4.7-4.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>Supplier RFQ & pricing</li>
                <li><svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8.4" stroke="currentColor" strokeWidth="1.5"/><path d="m6.5 10.2 2.3 2.3 4.7-4.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>Smart inbox for all replies</li>
                <li><svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8.4" stroke="currentColor" strokeWidth="1.5"/><path d="m6.5 10.2 2.3 2.3 4.7-4.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>Quotes & pre-invoices</li>
                <li><svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8.4" stroke="currentColor" strokeWidth="1.5"/><path d="m6.5 10.2 2.3 2.3 4.7-4.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>Customer management</li>
                <li><svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8.4" stroke="currentColor" strokeWidth="1.5"/><path d="m6.5 10.2 2.3 2.3 4.7-4.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>Project management</li>
                <li><svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8.4" stroke="currentColor" strokeWidth="1.5"/><path d="m6.5 10.2 2.3 2.3 4.7-4.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>Employees & work hours</li>
                <li><svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8.4" stroke="currentColor" strokeWidth="1.5"/><path d="m6.5 10.2 2.3 2.3 4.7-4.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>Project financial tracking</li>
                <li><svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8.4" stroke="currentColor" strokeWidth="1.5"/><path d="m6.5 10.2 2.3 2.3 4.7-4.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>Today – daily assistant</li>
                <li><svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8.4" stroke="currentColor" strokeWidth="1.5"/><path d="m6.5 10.2 2.3 2.3 4.7-4.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>Email & in-app notifications</li>
                <li><svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8.4" stroke="currentColor" strokeWidth="1.5"/><path d="m6.5 10.2 2.3 2.3 4.7-4.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>Continuous updates</li>
              </ul>

              <div className={styles.trialBox}>
                <span className={styles.ico} aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <rect x="3.5" y="5" width="17" height="15.5" rx="3" stroke="currentColor" strokeWidth="1.6"/>
                    <path d="M3.5 9.5h17M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                    <path d="M12 12.5v4.5M9.75 14.75h4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                  </svg>
                </span>
                <h4>14-Day Free Trial</h4>
                <p>No credit card required.</p>
              </div>
            </div>

            <Link className={styles.btnPrimary} href="/signup">START FREE TRIAL</Link>
            <p className={styles.planFoot}>Cancel anytime. No commitment.</p>
          </article>

          <article className={styles.plan}>
            <div className={styles.teamsHead}>
              <span className={styles.teamsIcon} aria-hidden="true">
                <svg viewBox="0 0 28 28" fill="none">
                  <circle cx="10.5" cy="9.5" r="3.6" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M3.5 21c0-3.6 3.1-6.2 7-6.2s7 2.6 7 6.2"
                        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M18.5 7.2a3.4 3.4 0 0 1 0 6.6M20 14.9c2.6.6 4.5 2.9 4.5 5.7"
                        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </span>
              <div>
                <h3>EmaX Teams</h3>
                <p className={styles.sub}>For growing crews and businesses.</p>
              </div>
            </div>

            <div className={[ styles.price, styles.priceCustom ].join(' ')}>
              <span className={styles.amount}>Custom</span>
            </div>
            <p className={styles.sub}>Flexible plans for teams of any size.</p>

            <ul className={styles.featureList} style={{marginTop: '22px'}}>
              <li><svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8.4" stroke="currentColor" strokeWidth="1.5"/><path d="m6.5 10.2 2.3 2.3 4.7-4.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>Everything in Pro</li>
              <li><svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8.4" stroke="currentColor" strokeWidth="1.5"/><path d="m6.5 10.2 2.3 2.3 4.7-4.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>Multiple team members</li>
              <li><svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8.4" stroke="currentColor" strokeWidth="1.5"/><path d="m6.5 10.2 2.3 2.3 4.7-4.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>Advanced permissions</li>
              <li><svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8.4" stroke="currentColor" strokeWidth="1.5"/><path d="m6.5 10.2 2.3 2.3 4.7-4.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>Priority support</li>
              <li><svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8.4" stroke="currentColor" strokeWidth="1.5"/><path d="m6.5 10.2 2.3 2.3 4.7-4.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>Custom onboarding</li>
            </ul>

            <div style={{marginTop: '56px'}}>
              <Link className={styles.btnOutline} href="/signup">TALK TO US</Link>
              <p className={styles.planFoot}>We&apos;ll help you find the right plan.</p>
            </div>
          </article>

        </section>

  
        <section className={styles.waitlist}>
          <span className={styles.hourglass} aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none">
              <path d="M9 4h14M9 28h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
              <path d="M10.5 4v4.2c0 2.4 1.4 4.5 3.5 5.5l2 1 2-1c2.1-1 3.5-3.1 3.5-5.5V4M10.5 28v-4.2c0-2.4 1.4-4.5 3.5-5.5l2-1 2 1c2.1 1 3.5 3.1 3.5 5.5V28"
                    stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
            </svg>
          </span>

          <div className={styles.waitlistCopy}>
            <p className={styles.k}>Missed the first 20?</p>
            <h3>You may still have a chance.</h3>
            <p>We occasionally open additional Founding Crew spots for active tradespeople who can help us improve EmaX through real-world use and feedback.</p>
          </div>

          <div className={styles.waitlistCta}>
            <Link className={styles.btnOutline} href="/signup">REQUEST FOUNDING ACCESS</Link>
            <small>We&apos;ll review your request and get back to you.</small>
          </div>
        </section>

  
        <section className={styles.trust}>
          <div className={styles.trustItem}>
            <span className={styles.ic} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
                <path d="M20.5 3.5V9H15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <div>
              <h4>Cancel Anytime</h4>
              <p>You&apos;re in control. Cancel whenever you want.</p>
            </div>
          </div>

          <div className={styles.trustItem}>
            <span className={styles.ic} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <rect x="4.5" y="10" width="15" height="11" rx="2.6" stroke="currentColor" strokeWidth="1.7"/>
                <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
              </svg>
            </span>
            <div>
              <h4>Safe & Secure</h4>
              <p>Bank-level security for your business data.</p>
            </div>
          </div>

          <div className={styles.trustItem}>
            <span className={styles.ic} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M4 15v-3a8 8 0 0 1 16 0v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
                <rect x="2.5" y="14" width="4.5" height="6.5" rx="2" stroke="currentColor" strokeWidth="1.7"/>
                <rect x="17" y="14" width="4.5" height="6.5" rx="2" stroke="currentColor" strokeWidth="1.7"/>
              </svg>
            </span>
            <div>
              <h4>Real Human Support</h4>
              <p>We&apos;re here when you need us.</p>
            </div>
          </div>

          <div className={styles.trustItem}>
            <span className={styles.ic} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2Z"
                      stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
              </svg>
            </span>
            <div>
              <h4>Always Improving</h4>
              <p>New features, fixes and improvements – always.</p>
            </div>
          </div>
        </section>

      </main>
      </div>
    </div>
  );
}
