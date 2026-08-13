/* eslint-disable @next/next/no-img-element -- approved static marketing assets */
import Link from "next/link";
import { marketingFont } from "@/lib/marketing-font";
import styles from "./features.module.css";

/**
 * Exact port of public/Features.html body markup into Next.js.
 * Styles: features.module.css (scoped). No client scripts in the source HTML.
 */
export default function FeaturesPageContent() {
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
            <Link href="/features" className={styles.isActive} aria-current="page">Features</Link>
            <Link href="/pricing">Pricing</Link>
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
              <p className={styles.eyebrow}>Features</p>

              <h1 className={styles.heroTitle}>
                One assistant.<br />
                Your whole <span className={styles.accent}>workflow.</span>
              </h1>

              <p className={styles.heroLede}>
                From the first material list to the final payment,<br />
                I handle everything for your trades business.
              </p>

              <div className={styles.flow}>
                <div className={styles.flowStep}>
                  <span className={styles.flowIcon}>
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <rect x="9" y="2.5" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.6"/>
                      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                    </svg>
                  </span>
                  <span>Voice List</span>
                </div>

                <div className={styles.flowArrow}><svg viewBox="0 0 14 9" fill="none"><path d="M0 4.5h12m0 0L8.5 1M12 4.5 8.5 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg></div>

                <div className={styles.flowStep}>
                  <span className={styles.flowIcon}>
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M2.5 6.5h10v9h-10v-9ZM12.5 9.5h4l3 3.2v2.8h-7v-6Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                      <circle cx="6" cy="17.5" r="1.9" stroke="currentColor" strokeWidth="1.5"/>
                      <circle cx="16.5" cy="17.5" r="1.9" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  </span>
                  <span>Supplier Pricing</span>
                </div>

                <div className={styles.flowArrow}><svg viewBox="0 0 14 9" fill="none"><path d="M0 4.5h12m0 0L8.5 1M12 4.5 8.5 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg></div>

                <div className={styles.flowStep}>
                  <span className={styles.flowIcon}>
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M5.5 2.5h8L18.5 7.5v14h-13v-19Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                      <path d="M13.5 2.5v5h5M8.5 12h7M8.5 16h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                  </span>
                  <span>Pre-Invoice</span>
                </div>

                <div className={styles.flowArrow}><svg viewBox="0 0 14 9" fill="none"><path d="M0 4.5h12m0 0L8.5 1M12 4.5 8.5 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg></div>

                <div className={styles.flowStep}>
                  <span className={styles.flowIcon}>
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="m7.8 12.2 2.7 2.7 5.5-5.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  <span>Customer Confirm</span>
                </div>

                <div className={styles.flowArrow}><svg viewBox="0 0 14 9" fill="none"><path d="M0 4.5h12m0 0L8.5 1M12 4.5 8.5 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg></div>

                <div className={styles.flowStep}>
                  <span className={styles.flowIcon}>
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M5.5 2.5h8L18.5 7.5v14h-13v-19Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                      <path d="M13.5 2.5v5h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                  </span>
                  <span>Project Created</span>
                </div>

                <div className={styles.flowArrow}><svg viewBox="0 0 14 9" fill="none"><path d="M0 4.5h12m0 0L8.5 1M12 4.5 8.5 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg></div>

                <div className={styles.flowStep}>
                  <span className={styles.flowIcon}>
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M3.5 19.5h17M6 16V9M11 16V5.5M16 16v-4.5M20.5 4.5 15 10l-3-2.6L7 12"
                            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  <span>Done</span>
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

  
        <div className={styles.sectionLabel}>
          <i aria-hidden="true"><em></em></i>
          <span>Available Now</span>
          <i aria-hidden="true"><em></em></i>
        </div>

        <section className={styles.featureGrid}>

          <article className={styles.fcard}>
            <div className={styles.fcardTop}>
              <span className={styles.fcardIcon}>
                <svg viewBox="0 0 24 24" fill="none"><rect x="9" y="2.5" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.6"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
              </span>
              <span className={styles.fcardNum}>01</span>
            </div>
            <h3>Voice Material List</h3>
            <p>Just speak and I&apos;ll capture your material list with part number, description, brand and quantity.</p>
            <span className={styles.tag}>
              <svg viewBox="0 0 14 14" fill="none"><path d="M2 7v0M4.5 4.5v5M7 2.5v9M9.5 4.5v5M12 7v0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              Voice Powered
            </span>
          </article>

          <article className={styles.fcard}>
            <div className={styles.fcardTop}>
              <span className={styles.fcardIcon}>
                <svg viewBox="0 0 24 24" fill="none"><path d="M21 3 10.5 13.5M21 3l-6.8 18-3.7-7.5L3 9.8 21 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
              </span>
              <span className={styles.fcardNum}>02</span>
            </div>
            <h3>Send to Suppliers</h3>
            <p>I send your list to suppliers instantly and track every request for you.</p>
            <span className={styles.tag}>
              <svg viewBox="0 0 14 14" fill="none"><path d="M2 7v0M4.5 4.5v5M7 2.5v9M9.5 4.5v5M12 7v0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              Automated
            </span>
          </article>

          <article className={styles.fcard}>
            <div className={styles.fcardTop}>
              <span className={styles.fcardIcon}>
                <svg viewBox="0 0 24 24" fill="none"><path d="M3 13.5 5.5 4.5h13L21 13.5v6H3v-6Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M3 13.5h5l1 2.5h6l1-2.5h5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
              </span>
              <span className={styles.fcardNum}>03</span>
            </div>
            <h3>Supplier Inbox</h3>
            <p>Supplier pricing comes to your inbox inside the app. No more emails to search.</p>
            <span className={styles.tag}>
              <svg viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.4" stroke="currentColor" strokeWidth="1.3"/><path d="M7 4.2v3l2 1.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
              Organized
            </span>
          </article>

          <article className={styles.fcard}>
            <div className={styles.fcardTop}>
              <span className={styles.fcardIcon}>
                <svg viewBox="0 0 24 24" fill="none"><path d="M5.5 2.5h8L18.5 7.5v14h-13v-19Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M13.5 2.5v5h5" stroke="currentColor" strokeWidth="1.4"/><path d="m8.5 14.5 2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
              <span className={styles.fcardNum}>04</span>
            </div>
            <h3>Confirm & Create<br />Pre-Invoice</h3>
            <p>Review, confirm and I&apos;ll create a professional pre-invoice with one click.</p>
            <span className={styles.tag}>
              <svg viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.4" stroke="currentColor" strokeWidth="1.3"/><circle cx="7" cy="7" r="1.8" fill="currentColor"/></svg>
              One Click
            </span>
          </article>

          <article className={styles.fcard}>
            <div className={styles.fcardTop}>
              <span className={styles.fcardIcon}>
                <svg viewBox="0 0 24 24" fill="none"><path d="M21 3 10.5 13.5M21 3l-6.8 18-3.7-7.5L3 9.8 21 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
              </span>
              <span className={styles.fcardNum}>05</span>
            </div>
            <h3>Send to Customer</h3>
            <p>Pre-invoice is sent to your customer by email in seconds. You look professional.</p>
            <span className={styles.tag}>
              <svg viewBox="0 0 14 14" fill="none"><path d="M2 7v0M4.5 4.5v5M7 2.5v9M9.5 4.5v5M12 7v0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              Easy Share
            </span>
          </article>

          <article className={styles.fcard}>
            <div className={styles.fcardTop}>
              <span className={styles.fcardIcon}>
                <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/><path d="m7.8 12.2 2.7 2.7 5.5-5.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
              <span className={styles.fcardNum}>06</span>
            </div>
            <h3>Customer Confirm</h3>
            <p>Customer confirmation comes back to your inbox. Everything stays connected.</p>
            <span className={styles.tag}>
              <svg viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.4" stroke="currentColor" strokeWidth="1.3"/><path d="M7 4.2v3l2 1.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
              Real-Time
            </span>
          </article>

          <article className={styles.fcard}>
            <div className={styles.fcardTop}>
              <span className={styles.fcardIcon}>
                <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="7" width="18" height="13" rx="2.4" stroke="currentColor" strokeWidth="1.5"/><path d="M8.5 7V5.4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </span>
              <span className={styles.fcardNum}>07</span>
            </div>
            <h3>Project Created</h3>
            <p>Project is created automatically. Crew, tasks, schedule and details are ready to go.</p>
            <span className={styles.tag}>
              <svg viewBox="0 0 14 14" fill="none"><path d="M7 1.5 8 5l3.5 1L8 7l-1 3.5L6 7 2.5 6 6 5l1-3.5Z" fill="currentColor"/></svg>
              Auto Setup
            </span>
          </article>

          <article className={styles.fcard}>
            <div className={styles.fcardTop}>
              <span className={styles.fcardIcon}>
                <svg viewBox="0 0 24 24" fill="none"><path d="M4 20V13M9.3 20V8.5M14.7 20v-6M20 20V4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/></svg>
              </span>
              <span className={styles.fcardNum}>08</span>
            </div>
            <h3>Track & Complete</h3>
            <p>Track work hours, costs and payments. Finish the job and mark it done with success.</p>
            <span className={styles.tag}>
              <svg viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.4" stroke="currentColor" strokeWidth="1.3"/><circle cx="7" cy="7" r="1.8" fill="currentColor"/></svg>
              Stay in Control
            </span>
          </article>

        </section>

  
        <section className={styles.capability}>
          <div className={styles.capItem}>
            <span className={styles.capIcon} aria-hidden="true">
              <svg viewBox="0 0 30 30" fill="none">
                <circle cx="11" cy="10.5" r="3.8" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M3.5 23c0-3.8 3.3-6.6 7.5-6.6s7.5 2.8 7.5 6.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M19.5 8a3.5 3.5 0 0 1 0 6.9M21 16c2.8.7 4.8 3.1 4.8 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </span>
            <div>
              <h4>Employees & Hours</h4>
              <p>Assign your crew and track work hours on every project.</p>
            </div>
          </div>

          <div className={styles.capItem}>
            <span className={styles.capIcon} aria-hidden="true">
              <svg viewBox="0 0 30 30" fill="none">
                <circle cx="15" cy="15" r="11" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M18.4 11.2c-.7-1-2-1.6-3.4-1.6-2 0-3.4 1-3.4 2.5s1.3 2.2 3.4 2.6c2.1.4 3.6 1.1 3.6 2.7 0 1.6-1.6 2.6-3.6 2.6-1.6 0-3-.6-3.7-1.7M15 7.5v15"
                      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </span>
            <div>
              <h4>Supplier Accounting</h4>
              <p>Track purchases, payments and balances per supplier.</p>
            </div>
          </div>

          <div className={styles.capItem}>
            <span className={styles.capIcon} aria-hidden="true">
              <svg viewBox="0 0 30 30" fill="none">
                <path d="M7 3.5h10L23 9.5v17H7v-23Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M17 3.5v6h6" stroke="currentColor" strokeWidth="1.4"/>
                <path d="m11 18.5 2.4 2.4 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <div>
              <h4>Customer & Payments</h4>
              <p>Track customer payments, outstanding balances and history.</p>
            </div>
          </div>

          <div className={styles.capItem}>
            <span className={styles.capIcon} aria-hidden="true">
              <svg viewBox="0 0 30 30" fill="none">
                <rect x="5.5" y="4.5" width="19" height="21" rx="2.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M10 10.5h2M10 15h2M10 19.5h2M15 10.5h5M15 15h5M15 19.5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </span>
            <div>
              <h4>Today – Your Day</h4>
              <p>All your tasks, pickups, site visits, payments and reminders in one place.</p>
            </div>
          </div>
        </section>

  
        <div className={styles.sectionLabel}>
          <i aria-hidden="true"><em></em></i>
          <span>Coming Next</span>
          <i aria-hidden="true"><em></em></i>
        </div>

        <section className={styles.comingGrid}>

          <article className={styles.ccard}>
            <span className={styles.ccardIcon} aria-hidden="true">
              <svg viewBox="0 0 26 26" fill="none">
                <path d="M5 9.5h16v12H5v-12ZM5 9.5 8 4.5h10l3 5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M15.5 15.5a3 3 0 1 1-.9-2.2m0 0V11m0 2.3H12.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <div>
              <h3>Smart Material Returns</h3>
              <p>I&apos;ll help you identify and return unused materials so you don&apos;t lose money.</p>
              <span className={[ styles.tag, styles.tagSoon ].join(' ')}>
                <svg viewBox="0 0 14 14" fill="none"><path d="M7 2.5v9M2.5 7h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                Coming Soon
              </span>
            </div>
          </article>

          <article className={styles.ccard}>
            <span className={styles.ccardIcon} aria-hidden="true">
              <svg viewBox="0 0 26 26" fill="none">
                <path d="M3 13v0M6.5 9v8M10 5.5v15M13.5 8v10M17 4.5v17M20.5 9.5v7M24 13v0"
                      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </span>
            <div>
              <h3>Smarter Voice Assistant</h3>
              <p>More natural conversations and even more control with your voice.</p>
              <span className={[ styles.tag, styles.tagSoon ].join(' ')}>
                <svg viewBox="0 0 14 14" fill="none"><path d="M7 2.5v9M2.5 7h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                Coming Soon
              </span>
            </div>
          </article>

          <article className={styles.ccard}>
            <span className={styles.ccardIcon} aria-hidden="true">
              <svg viewBox="0 0 26 26" fill="none">
                <circle cx="13" cy="13" r="10" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M13 3v10h10" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
            </span>
            <div>
              <h3>Advanced Business Insights</h3>
              <p>Deeper insights into your projects, costs and performance to grow your profit.</p>
              <span className={[ styles.tag, styles.tagSoon ].join(' ')}>
                <svg viewBox="0 0 14 14" fill="none"><path d="M7 2.5v9M2.5 7h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                Coming Soon
              </span>
            </div>
          </article>

        </section>

  
        <section className={styles.roadmap}>
          <div className={styles.roadmapWave} aria-hidden="true"></div>

          <span className={styles.roadmapMark} aria-hidden="true">
            <img src="/Logo.png" alt="" />
          </span>

          <div className={styles.roadmapCopy}>
            <h2>And I&apos;m just getting started.</h2>
            <p>
              <span className={styles.num}>20+</span> more capabilities are already on my roadmap.<br />
              More automation. More intelligence. Less work for you.
            </p>
          </div>
        </section>

      </main>
      </div>
    </div>
  );
}
