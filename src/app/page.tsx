import type { Metadata } from "next";

/**
 * Temporary: full-viewport raw display of the uploaded marketing image.
 * No overlays, gradients, filters, crop, or re-compression.
 * Source file used as-is: public/images/Landing page 1.png
 */

export const metadata: Metadata = {
  title: "EmaX — AI Assistant for Trades",
};

export default function LandingPage() {
  return (
    <div
      style={{
        margin: 0,
        padding: 0,
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#000",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- raw asset, no Next Image optimization */}
      <img
        src="/images/Landing%20page%201.png"
        alt="EmaX landing"
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
        }}
      />
    </div>
  );
}
