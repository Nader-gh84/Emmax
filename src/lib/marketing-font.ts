import { DM_Sans } from "next/font/google";

/**
 * DM Sans — marketing pages and (progressively) the in-app dashboard.
 * Exposes `--font-marketing` for CSS token wiring; also use `.className`.
 */
export const marketingFont = DM_Sans({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700"],
  style: ["normal"],
  display: "swap",
  variable: "--font-marketing",
});
