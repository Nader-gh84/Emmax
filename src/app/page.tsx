import type { Metadata } from "next";
import HomePage from "@/components/marketing/home/HomePage";

/**
 * Public landing — exact port of public/Home.html (approved design).
 */

export const metadata: Metadata = {
  title: "EmaX — AI Assistant for Trades",
  description:
    "Work smarter, not harder. Plan, quote, manage, and get paid with EmaX.",
};

export default function LandingPage() {
  return <HomePage />;
}
