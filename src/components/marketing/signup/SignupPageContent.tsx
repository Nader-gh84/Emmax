/* eslint-disable @next/next/no-img-element -- approved static marketing assets */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AuthToast, useComingSoonToast } from "@/components/auth/auth-ui";
import { marketingFont } from "@/lib/marketing-font";
import { createClient } from "@/lib/supabase";
import styles from "./signup.module.css";

const STRENGTH_COPY = [
  "Use 8+ characters with a number or symbol.",
  "Weak password",
  "Fair password",
  "Good password",
  "Strong password",
] as const;

function passwordScore(value: string): number {
  if (!value) return 0;
  let score = 0;
  if (value.length >= 8) score++;
  if (/[A-Z]/.test(value)) score++;
  if (/[0-9]/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;
  return score;
}

/**
 * Exact port of public/Signup.html, wired to existing Supabase signUp.
 * Google / Microsoft OAuth: Coming soon toast (not configured).
 */
export default function SignupPageContent() {
  const router = useRouter();
  const { toast, showComingSoon, dismissToast } = useComingSoonToast();
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const score = useMemo(() => passwordScore(password), [password]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!agreedToTerms) {
      setError("Please agree to the Terms of Service to continue.");
      return;
    }

    setLoading(true);

    const trimmed = fullName.trim();
    const parts = trimmed.split(/\s+/).filter(Boolean);
    const firstName = parts[0] ?? "";
    const lastName = parts.slice(1).join(" ");

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: trimmed,
          first_name: firstName,
          last_name: lastName,
          business_name: businessName.trim(),
        },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div
      className={`${styles.root} ${marketingFont.variable} ${marketingFont.className}`}
    >
      <div className={styles.page}>
        <img
          className={styles.pageBg}
          src="/Background.png"
          alt=""
          aria-hidden="true"
        />
        <div className={styles.veil} aria-hidden="true" />
        <div className={styles.wave} aria-hidden="true" />

        <header className={styles.siteHeader}>
          <div className={styles.shell}>
            <Link className={styles.logo} href="/" aria-label="EmaX home">
              <img src="/Logo.png" alt="EmaX" />
            </Link>

            <div className={styles.headerRight}>
              <span className={styles.prompt}>Already have an account?</span>
              <Link className={styles.createBtn} href="/login">
                Sign in
                <svg viewBox="0 0 18 12" fill="none" aria-hidden="true">
                  <path
                    d="M1 6h15m0 0-5-5m5 5-5 5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </header>

        <div className={styles.main}>
          <div className={styles.shell}>
            <section className={styles.welcome}>
              <h1>
                Start <span className={styles.accent}>free</span>
              </h1>
              <p className={styles.lede}>Your first project is minutes away.</p>

              <div className={styles.perks}>
                <div className={styles.perk}>
                  <span className={styles.perkIcon} aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none">
                      <rect
                        x="9"
                        y="2.5"
                        width="6"
                        height="11"
                        rx="3"
                        stroke="currentColor"
                        strokeWidth="1.7"
                      />
                      <path
                        d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                  <div>
                    <h3>Speak your first list</h3>
                    <p>
                      Say what you need and I&apos;ll build the material list.
                    </p>
                  </div>
                </div>

                <div className={styles.perk}>
                  <span className={styles.perkIcon} aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none">
                      <path
                        d="M5.5 2.5h8L18.5 7.5v14h-13v-19Z"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M13.5 2.5v5h5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <path
                        d="m8.5 14.5 2 2 4-4"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <div>
                    <h3>Quote in minutes</h3>
                    <p>Supplier prices in, professional quote out.</p>
                  </div>
                </div>

                <div className={styles.perk}>
                  <span className={styles.perkIcon} aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 2.8 4.8 5.6v6c0 4.3 3 7.9 7.2 9.1 4.2-1.2 7.2-4.8 7.2-9.1v-6L12 2.8Z"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinejoin="round"
                      />
                      <path
                        d="m9 11.9 2.1 2.1 4-4"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <div>
                    <h3>Nothing to lose</h3>
                    <p>No credit card. Cancel whenever you want.</p>
                  </div>
                </div>
              </div>

              <span className={styles.trialNote}>
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <circle
                    cx="10"
                    cy="10"
                    r="8.4"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                  <path
                    d="m6.5 10.2 2.3 2.3 4.7-4.7"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                14-day free trial · No credit card required
              </span>
            </section>

            <section className={styles.authCard}>
              <h2>Create your account</h2>
              <p className={styles.sub}>
                Set up EmaX for your trades business.
              </p>

              <form onSubmit={handleSubmit}>
                {error && (
                  <div
                    role="alert"
                    style={{
                      marginBottom: "16px",
                      padding: "12px 14px",
                      borderRadius: "11px",
                      border: "1px solid rgba(248, 113, 113, 0.35)",
                      background: "rgba(248, 113, 113, 0.1)",
                      color: "#fca5a5",
                      fontSize: "14px",
                    }}
                  >
                    {error}
                  </div>
                )}

                <div className={styles.field}>
                  <label htmlFor="name">Full name</label>
                  <div className={styles.inputWrap}>
                    <span className={styles.leadIcon} aria-hidden="true">
                      <svg viewBox="0 0 20 20" fill="none">
                        <circle
                          cx="10"
                          cy="7"
                          r="3.2"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        />
                        <path
                          d="M3.8 17c0-3.2 2.8-5.6 6.2-5.6s6.2 2.4 6.2 5.6"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                    <input
                      id="name"
                      type="text"
                      placeholder="Your name"
                      autoComplete="name"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <label htmlFor="business">Business name</label>
                  <div className={styles.inputWrap}>
                    <span className={styles.leadIcon} aria-hidden="true">
                      <svg viewBox="0 0 20 20" fill="none">
                        <rect
                          x="2.6"
                          y="6"
                          width="14.8"
                          height="11"
                          rx="2.2"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        />
                        <path
                          d="M7 6V4.6a1.8 1.8 0 0 1 1.8-1.8h2.4A1.8 1.8 0 0 1 13 4.6V6"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                    <input
                      id="business"
                      type="text"
                      placeholder="e.g. Klein Electric"
                      autoComplete="organization"
                      required
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <label htmlFor="email">Email</label>
                  <div className={styles.inputWrap}>
                    <span className={styles.leadIcon} aria-hidden="true">
                      <svg viewBox="0 0 20 20" fill="none">
                        <rect
                          x="2"
                          y="4"
                          width="16"
                          height="12"
                          rx="2.4"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        />
                        <path
                          d="m2.8 5.5 7.2 5.2 7.2-5.2"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <label htmlFor="password">Password</label>
                  <div className={styles.inputWrap}>
                    <span className={styles.leadIcon} aria-hidden="true">
                      <svg viewBox="0 0 20 20" fill="none">
                        <rect
                          x="3.6"
                          y="8.4"
                          width="12.8"
                          height="9"
                          rx="2.2"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        />
                        <path
                          d="M6.6 8.4V6a3.4 3.4 0 0 1 6.8 0v2.4"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      className={styles.toggleEye}
                      type="button"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? (
                        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                          <path
                            d="M3.2 3.2 16.8 16.8M8.4 8.5A2.6 2.6 0 0 0 11.5 11.6M6.1 6.3C4.2 7.4 2.7 9.1 1.8 10S4.9 15.4 10 15.4c1.3 0 2.5-.3 3.5-.8M9.1 5C9.4 4.7 9.7 4.6 10 4.6 15.1 4.6 18.2 10 18.2 10c-.4.6-1 1.4-1.8 2.2"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                          <path
                            d="M1.8 10S4.9 4.6 10 4.6 18.2 10 18.2 10 15.1 15.4 10 15.4 1.8 10 1.8 10Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinejoin="round"
                          />
                          <circle
                            cx="10"
                            cy="10"
                            r="2.6"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                        </svg>
                      )}
                    </button>
                  </div>

                  <div className={styles.strength}>
                    <div className={styles.strengthBars} aria-hidden="true">
                      {[0, 1, 2, 3].map((i) => (
                        <i
                          key={i}
                          className={i < score ? styles.on : undefined}
                        />
                      ))}
                    </div>
                    <small>{STRENGTH_COPY[score]}</small>
                  </div>
                </div>

                <label className={styles.terms}>
                  <input
                    type="checkbox"
                    id="terms"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    required
                  />
                  <span>
                    I agree to the{" "}
                    <Link href="/terms">Terms of Service</Link> and{" "}
                    <Link href="/privacy">Privacy Policy</Link>.
                  </span>
                </label>

                <button
                  className={styles.btnSignup}
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Creating account..." : "Create account"}
                </button>
              </form>

              <div className={styles.divider}>or continue with</div>

              <div className={styles.oauth}>
                <button
                  type="button"
                  aria-label="Continue with Google"
                  onClick={() => showComingSoon("Google")}
                >
                  <svg viewBox="0 0 20 20" aria-hidden="true">
                    <path
                      d="M19.6 10.2c0-.7-.06-1.35-.18-2H10v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.75 3-4.3 3-7.3Z"
                      fill="#4285F4"
                    />
                    <path
                      d="M10 20c2.7 0 4.96-.9 6.6-2.4l-3.2-2.5c-.9.6-2.05.95-3.4.95-2.6 0-4.8-1.75-5.6-4.1H1.1v2.6A10 10 0 0 0 10 20Z"
                      fill="#34A853"
                    />
                    <path
                      d="M4.4 11.9a6 6 0 0 1 0-3.83V5.47H1.1a10 10 0 0 0 0 9.06l3.3-2.6Z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M10 3.98c1.47 0 2.79.5 3.83 1.5l2.84-2.84C14.96.99 12.7 0 10 0A10 10 0 0 0 1.1 5.47l3.3 2.6C5.2 5.73 7.4 3.98 10 3.98Z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </button>

                <button
                  type="button"
                  aria-label="Continue with Microsoft"
                  onClick={() => showComingSoon("Microsoft")}
                >
                  <svg viewBox="0 0 20 20" aria-hidden="true">
                    <rect x="1" y="1" width="8.4" height="8.4" fill="#F25022" />
                    <rect
                      x="10.6"
                      y="1"
                      width="8.4"
                      height="8.4"
                      fill="#7FBA00"
                    />
                    <rect
                      x="1"
                      y="10.6"
                      width="8.4"
                      height="8.4"
                      fill="#00A4EF"
                    />
                    <rect
                      x="10.6"
                      y="10.6"
                      width="8.4"
                      height="8.4"
                      fill="#FFB900"
                    />
                  </svg>
                  Continue with Microsoft
                </button>
              </div>

              <p className={styles.cardFoot}>
                Already have an account? <Link href="/login">Sign in</Link>
              </p>
            </section>
          </div>
        </div>

        <footer className={styles.siteFooter}>
          <div className={styles.shell}>
            <div className={styles.footItem}>
              <span className={styles.ic} aria-hidden="true">
                <svg viewBox="0 0 20 20" fill="none">
                  <rect
                    x="3.6"
                    y="8.4"
                    width="12.8"
                    height="9"
                    rx="2.2"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M6.6 8.4V6a3.4 3.4 0 0 1 6.8 0v2.4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <p>
                <strong>Your data is safe with us.</strong>
                We never share your information.
              </p>
            </div>

            <div className={styles.footItem}>
              <span className={styles.ic} aria-hidden="true">
                <svg viewBox="0 0 20 20" fill="none">
                  <path
                    d="M3.2 12.4V10a6.8 6.8 0 0 1 13.6 0v2.4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <rect
                    x="1.8"
                    y="11.6"
                    width="3.9"
                    height="5.6"
                    rx="1.7"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <rect
                    x="14.3"
                    y="11.6"
                    width="3.9"
                    height="5.6"
                    rx="1.7"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>
              </span>
              <p>
                <strong>Need help?</strong>
                <Link href="/support">
                  Contact support
                  <svg viewBox="0 0 14 10" fill="none" aria-hidden="true">
                    <path
                      d="M0 5h12m0 0L8.5 1.5M12 5 8.5 8.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
              </p>
            </div>

            <div className={styles.footCopy}>
              <p>
                © 2024 EmaX Inc.
                <br />
                All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>

      <AuthToast message={toast} onDismiss={dismissToast} />
    </div>
  );
}
