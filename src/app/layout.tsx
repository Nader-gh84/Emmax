import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "EmaX — AI Quotes for Canadian Trades",
    template: "%s | EmaX",
  },
  description:
    "EmaX turns your voice into professional quotes in seconds. Built for Canadian electricians, plumbers, HVAC techs, and carpenters.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
