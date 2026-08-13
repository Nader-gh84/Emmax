import { DM_Sans } from "next/font/google";

/**
 * DM Sans for marketing pages (matches approved HTML designs).
 * Apply className on the marketing page root — do not put on <body>
 * so the dashboard keeps Inter from the root layout.
 */
export const marketingFont = DM_Sans({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600"],
  style: ["normal"],
  display: "swap",
  variable: "--font-marketing",
});
